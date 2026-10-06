-- 0011_checklist.sql
-- C2B: actionable checklist and recovery. Adds the bounded action-history batches, the
-- revision-checked replay-safe confirmation / cancellation / undo commands, and extends the
-- backup envelope to carry retained undo history.
-- Traceability: C0B-v2 §3 (differences derive from baseline vs plan), §4 (whole ordered list
-- is the action unit; prerequisite-ordered atomic reviewed batch; cancel; bounded undo =
-- most recent 50 batches AND 30 days; undo corrects app records only), §5 (one revision bump,
-- idempotent request replay), §8 (backup round trip includes retained history), §9 (read models).
-- Provisional rules: this schema stores the exact reviewed scope, but game legality still lives in
-- lib/depth-chart.ts / lib/checklist.ts and remains labeled provisional until the D113 supplement.
-- Owner applies to the live project per D088/D119; never during a build.

-- ---------------------------------------------------------------------------
-- Bounded action history (C0B-v2 §4). One row per consequential batch, holding
-- only minimal deltas (scope + before/after), never full snapshots. Pruned by
-- app.prune_action_batches to the most recent 50 batches and 30 days.
-- ---------------------------------------------------------------------------
create table app.action_batches (
  id            uuid primary key default gen_random_uuid(),
  franchise_id  uuid not null references app.franchises (id) on delete cascade,
  command       text not null,
  summary       jsonb not null default '{}'::jsonb,
  before_state  jsonb not null default '{}'::jsonb,
  after_state   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  undone_at     timestamptz
);

comment on table app.action_batches is
  'Bounded undo history for checklist confirmations (C0B-v2 §4): minimal before/after deltas, retained while within the most recent 50 batches and 30 days. Undo corrects app records only and never reverses a real game action.';

create index action_batches_franchise_idx on app.action_batches (franchise_id, created_at desc);

alter table app.action_batches enable row level security;

create policy action_batches_select_own on app.action_batches
  for select to authenticated
  using (exists (
    select 1 from app.franchises f
     where f.id = app.action_batches.franchise_id and f.owner_uid = auth.uid()
  ));

create policy action_batches_insert_own on app.action_batches
  for insert to authenticated
  with check (exists (
    select 1 from app.franchises f
     where f.id = franchise_id and f.owner_uid = auth.uid()
  ) and app.is_allowlisted_owner());

create policy action_batches_update_own on app.action_batches
  for update to authenticated
  using (exists (
    select 1 from app.franchises f
     where f.id = app.action_batches.franchise_id and f.owner_uid = auth.uid()
  ));

create policy action_batches_delete_own on app.action_batches
  for delete to authenticated
  using (exists (
    select 1 from app.franchises f
     where f.id = app.action_batches.franchise_id and f.owner_uid = auth.uid()
  ));

grant select, insert, update, delete on app.action_batches to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers.
-- ---------------------------------------------------------------------------

/** Ordered uuid[] from a JSON array of id strings (missing -> empty, never null). */
create or replace function app.uuid_array_from_jsonb(p_values jsonb) returns uuid[]
  language sql
  immutable
  set search_path = app, pg_catalog
as $$
  select coalesce(array_agg(value::uuid order by ordinality), '{}'::uuid[])
    from jsonb_array_elements_text(coalesce(p_values, '[]'::jsonb)) with ordinality as t(value, ordinality)
$$;

/** Enforce the declared retention constants (C0B-v2 §4): most recent 50 batches and 30 days. */
create or replace function app.prune_action_batches(p_franchise_id uuid) returns void
  language sql
  security definer
  set search_path = app, pg_catalog
as $$
  delete from app.action_batches b
   where b.franchise_id = p_franchise_id
     and (
       b.created_at < now() - interval '30 days'
       or b.id in (
         select id from app.action_batches
          where franchise_id = p_franchise_id
          order by created_at desc, id desc
          offset 50
       )
     )
$$;

/** The current ordered player ids for one layer of one position (empty when none). */
create or replace function app.chart_layer_ids(
  p_franchise_id uuid,
  p_position text,
  p_layer text
) returns uuid[]
  language sql
  stable
  security definer
  set search_path = app, pg_catalog
as $$
  select coalesce(array_agg(e.franchise_player_id order by e.depth_rank), '{}'::uuid[])
    from app.depth_chart_entries e
   where e.franchise_id = p_franchise_id and e.position = p_position and e.layer = p_layer
$$;

/** Remap mutable player ids inside a stored history changes[] array during restore. */
create or replace function app.remap_batch_changes(p_changes jsonb, p_map jsonb) returns jsonb
  language plpgsql
  immutable
  set search_path = app, pg_catalog
as $$
declare
  v_change jsonb;
  v_new jsonb;
  v_result jsonb := '[]'::jsonb;
begin
  for v_change in select * from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb))
  loop
    if v_change->>'kind' = 'roster_status' then
      v_new := jsonb_set(
        v_change,
        '{playerId}',
        coalesce(to_jsonb(p_map->>(v_change->>'playerId')), to_jsonb(v_change->>'playerId'))
      );
    else
      v_new := jsonb_set(
        v_change,
        '{baseline}',
        coalesce(
          (select jsonb_agg(coalesce(to_jsonb(p_map->>v), to_jsonb(v)))
             from jsonb_array_elements_text(coalesce(v_change->'baseline', '[]'::jsonb)) as t(v)),
          '[]'::jsonb
        )
      );
      v_new := jsonb_set(
        v_new,
        '{plan}',
        coalesce(
          (select jsonb_agg(coalesce(to_jsonb(p_map->>v), to_jsonb(v)))
             from jsonb_array_elements_text(coalesce(v_change->'plan', '[]'::jsonb)) as t(v)),
          '[]'::jsonb
        )
      );
    end if;
    v_result := v_result || jsonb_build_array(v_new);
  end loop;
  return v_result;
end
$$;

-- ---------------------------------------------------------------------------
-- Confirmation. Applies the exact reviewed scope atomically in the order given:
-- roster-status (promotion) prerequisites first, then their dependent lists.
-- Validation runs fully before any mutation: a changed revision, a plan that no
-- longer matches the reviewed value, a missing prerequisite, or a duplicate unit
-- applies NONE of the request (C0B-v2 §4; ACCEPTANCE A12/A31).
-- ---------------------------------------------------------------------------
create or replace function public.confirm_checklist_units(
  p_franchise_id uuid,
  p_units jsonb,
  p_expected_revision integer,
  p_request_id uuid
) returns jsonb
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_units jsonb := coalesce(p_units, '[]'::jsonb);
  v_unit jsonb;
  v_type text;
  v_position text;
  v_player_ids uuid[];
  v_player_id uuid;
  v_status text;
  v_plan_ids uuid[];
  v_applied jsonb := '[]'::jsonb;
  v_before jsonb := '[]'::jsonb;
  v_after jsonb := '[]'::jsonb;
  v_batch_id uuid;
  v_revision integer;
  v_active uuid[] := '{}'::uuid[];
  v_seen_positions text[] := '{}'::text[];
  v_seen_players uuid[] := '{}'::uuid[];
  v_blocked uuid[];
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  if jsonb_typeof(v_units) <> 'array' or jsonb_array_length(v_units) = 0 then
    raise exception 'validation_failed: at least one checklist unit is required' using errcode = 'P0006';
  end if;

  -- Validation pass: nothing is mutated, and later units may satisfy an earlier
  -- unit's practice-squad prerequisite, so ordering is enforced here.
  for v_unit in select * from jsonb_array_elements(v_units)
  loop
    v_type := v_unit->>'type';

    if v_type = 'roster_status' then
      v_player_id := nullif(v_unit->>'playerId', '')::uuid;
      v_status := v_unit->>'status';
      if v_player_id is null or v_status not in ('active', 'practice_squad') then
        raise exception 'validation_failed: invalid roster-status unit' using errcode = 'P0006';
      end if;
      if v_player_id = any (v_seen_players) then
        raise exception 'validation_failed: the same player appears twice in one confirmation' using errcode = 'P0006';
      end if;
      v_seen_players := v_seen_players || v_player_id;
      if not exists (
        select 1 from app.franchise_players p
         where p.id = v_player_id and p.franchise_id = p_franchise_id
      ) then
        raise exception 'cross_franchise_reference' using errcode = 'P0004';
      end if;
      if v_status = 'active' then
        v_active := v_active || v_player_id;
      end if;

    elsif v_type = 'depth_chart_list' then
      v_position := btrim(coalesce(v_unit->>'position', ''));
      v_player_ids := app.uuid_array_from_jsonb(v_unit->'playerIds');
      if v_position = '' then
        raise exception 'validation_failed: a position is required' using errcode = 'P0006';
      end if;
      if v_position = any (v_seen_positions) then
        raise exception 'validation_failed: the same position appears twice in one confirmation' using errcode = 'P0006';
      end if;
      v_seen_positions := v_seen_positions || v_position;
      perform app.assert_chart_players(p_franchise_id, v_player_ids);

      v_plan_ids := app.chart_layer_ids(p_franchise_id, v_position, 'plan');
      if v_plan_ids <> v_player_ids then
        raise exception 'validation_failed: this reviewed change is no longer pending; reload and review the current checklist' using errcode = 'P0006';
      end if;

      select array_agg(pid) into v_blocked
        from unnest(v_player_ids) as pid
       where not exists (
               select 1 from app.franchise_players p
                where p.id = pid and p.franchise_id = p_franchise_id and p.roster_status = 'active'
             )
         and not (pid = any (v_active));
      if v_blocked is not null and array_length(v_blocked, 1) > 0 then
        raise exception 'dependency_blocked: a planned player is still on the practice squad; confirm its promotion prerequisite first' using errcode = 'P0008';
      end if;

    else
      raise exception 'validation_failed: unknown checklist unit type' using errcode = 'P0006';
    end if;
  end loop;

  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);

  -- Apply pass, in the reviewed order.
  v_active := '{}'::uuid[];
  for v_unit in select * from jsonb_array_elements(v_units)
  loop
    v_type := v_unit->>'type';

    if v_type = 'roster_status' then
      v_player_id := nullif(v_unit->>'playerId', '')::uuid;
      v_status := v_unit->>'status';
      v_before := v_before || jsonb_build_array(jsonb_build_object(
        'kind', 'roster_status',
        'playerId', v_player_id,
        'rosterStatus', (select p.roster_status from app.franchise_players p where p.id = v_player_id)
      ));
      update app.franchise_players p
         set roster_status = v_status, updated_at = now()
       where p.id = v_player_id;
      v_after := v_after || jsonb_build_array(jsonb_build_object(
        'kind', 'roster_status',
        'playerId', v_player_id,
        'rosterStatus', v_status
      ));
      v_applied := v_applied || to_jsonb(coalesce(nullif(v_unit->>'unitId', ''), format('roster_status:%s', v_player_id)));
      if v_status = 'active' then
        v_active := v_active || v_player_id;
      end if;

    else
      v_position := btrim(v_unit->>'position');
      v_player_ids := app.uuid_array_from_jsonb(v_unit->'playerIds');
      v_before := v_before || jsonb_build_array(jsonb_build_object(
        'kind', 'depth_chart_list',
        'position', v_position,
        'baseline', to_jsonb(app.chart_layer_ids(p_franchise_id, v_position, 'baseline')),
        'plan', to_jsonb(app.chart_layer_ids(p_franchise_id, v_position, 'plan')),
        'verification', coalesce(
          (select st.verification from app.depth_chart_state st
            where st.franchise_id = p_franchise_id and st.position = v_position),
          'provisional_published'
        )
      ));

      delete from app.depth_chart_entries
       where franchise_id = p_franchise_id and position = v_position and layer = 'baseline';
      insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
      select p_franchise_id, v_position, 'baseline', ordinality::integer, pid
        from unnest(v_player_ids) with ordinality as t(pid, ordinality);
      delete from app.depth_chart_entries
       where franchise_id = p_franchise_id and position = v_position and layer = 'plan';

      insert into app.depth_chart_state (franchise_id, position, verification, updated_at)
      values (p_franchise_id, v_position, 'owner_confirmed', now())
      on conflict (franchise_id, position) do update
        set verification = 'owner_confirmed', updated_at = now();

      v_after := v_after || jsonb_build_array(jsonb_build_object(
        'kind', 'depth_chart_list',
        'position', v_position,
        'baseline', to_jsonb(v_player_ids),
        'plan', '[]'::jsonb,
        'verification', 'owner_confirmed'
      ));
      v_applied := v_applied || to_jsonb(coalesce(nullif(v_unit->>'unitId', ''), format('depth_chart_list:%s', v_position)));
    end if;
  end loop;

  insert into app.action_batches (franchise_id, command, summary, before_state, after_state)
  values (
    p_franchise_id,
    'confirm_checklist_units',
    jsonb_build_object('label', 'Confirmed checklist units', 'units', v_applied),
    jsonb_build_object('changes', v_before),
    jsonb_build_object('changes', v_after)
  )
  returning id into v_batch_id;

  perform app.prune_action_batches(p_franchise_id);

  v_prior := jsonb_build_object(
    'applied', v_applied,
    'batchId', v_batch_id,
    'revision', v_revision,
    'excluded', '[]'::jsonb
  );
  perform app.record_outcome(v_uid, p_request_id, 'confirm_checklist_units', v_prior);
  return v_prior;
end
$$;

-- ---------------------------------------------------------------------------
-- Cancel pending scope. Reverts each selected position's plan back to its
-- recorded baseline and reports which other pending positions referenced the
-- same players (dependent consequences, C0B-v2 §4).
-- ---------------------------------------------------------------------------
create or replace function public.cancel_checklist_units(
  p_franchise_id uuid,
  p_units jsonb,
  p_expected_revision integer,
  p_request_id uuid
) returns jsonb
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_units jsonb := coalesce(p_units, '[]'::jsonb);
  v_unit jsonb;
  v_type text;
  v_position text;
  v_plan_ids uuid[];
  v_affected uuid[] := '{}'::uuid[];
  v_cancelled jsonb := '[]'::jsonb;
  v_dependent jsonb := '[]'::jsonb;
  v_dep record;
  v_batch_id uuid;
  v_revision integer;
  v_seen text[] := '{}'::text[];
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  if jsonb_typeof(v_units) <> 'array' or jsonb_array_length(v_units) = 0 then
    raise exception 'validation_failed: at least one unit is required' using errcode = 'P0006';
  end if;

  for v_unit in select * from jsonb_array_elements(v_units)
  loop
    v_type := v_unit->>'type';
    if v_type <> 'depth_chart_list' then
      raise exception 'validation_failed: only pending lineup differences can be cancelled' using errcode = 'P0006';
    end if;
    v_position := btrim(coalesce(v_unit->>'position', ''));
    if v_position = '' or v_position = any (v_seen) then
      raise exception 'validation_failed: invalid or duplicate position' using errcode = 'P0006';
    end if;
    v_seen := v_seen || v_position;

    v_plan_ids := app.chart_layer_ids(p_franchise_id, v_position, 'plan');
    if array_length(v_plan_ids, 1) is null or array_length(v_plan_ids, 1) = 0 then
      raise exception 'validation_failed: that position has no pending plan to cancel' using errcode = 'P0006';
    end if;
    v_affected := v_affected || v_plan_ids;
  end loop;

  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);

  for v_unit in select * from jsonb_array_elements(v_units)
  loop
    v_position := btrim(v_unit->>'position');
    delete from app.depth_chart_entries
     where franchise_id = p_franchise_id and position = v_position and layer = 'plan';
    v_cancelled := v_cancelled || to_jsonb(v_position);
  end loop;

  -- Dependent consequences: other positions whose pending plan uses a player that
  -- was just cancelled. They are not modified; the owner is told to review them.
  for v_dep in
    select distinct e.position
      from app.depth_chart_entries e
     where e.franchise_id = p_franchise_id
       and e.layer = 'plan'
       and e.franchise_player_id = any (v_affected)
  loop
    v_dependent := v_dependent || to_jsonb(v_dep.position);
  end loop;

  insert into app.action_batches (franchise_id, command, summary, before_state, after_state)
  values (
    p_franchise_id,
    'cancel_checklist_units',
    jsonb_build_object('label', 'Cancelled pending lineup differences', 'positions', v_cancelled),
    jsonb_build_object('changes', '[]'::jsonb),
    jsonb_build_object('changes', '[]'::jsonb)
  )
  returning id into v_batch_id;

  perform app.prune_action_batches(p_franchise_id);

  v_prior := jsonb_build_object(
    'cancelled', v_cancelled,
    'dependent', v_dependent,
    'batchId', v_batch_id,
    'revision', v_revision
  );
  perform app.record_outcome(v_uid, p_request_id, 'cancel_checklist_units', v_prior);
  return v_prior;
end
$$;

-- ---------------------------------------------------------------------------
-- Bounded undo. Reverses a retained confirmation batch only when no later
-- dependent change conflicts; otherwise it refuses with a resolution message
-- and mutates nothing. Undo corrects app records only (C0B-v2 §4).
-- ---------------------------------------------------------------------------
create or replace function public.undo_action_batch(
  p_franchise_id uuid,
  p_batch_id uuid,
  p_expected_revision integer,
  p_request_id uuid
) returns jsonb
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_batch app.action_batches;
  v_change jsonb;
  v_position text;
  v_player_id uuid;
  v_status text;
  v_conflict jsonb := '[]'::jsonb;
  v_restored jsonb := '[]'::jsonb;
  v_baseline uuid[];
  v_plan uuid[];
  v_revision integer;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  select * into v_batch
    from app.action_batches b
   where b.id = p_batch_id
     and b.franchise_id = p_franchise_id
     and exists (select 1 from app.franchises f where f.id = b.franchise_id and f.owner_uid = v_uid);

  if v_batch.id is null then
    raise exception 'validation_failed: that action is not available to undo' using errcode = 'P0006';
  end if;
  if v_batch.undone_at is not null then
    raise exception 'validation_failed: that action was already undone' using errcode = 'P0006';
  end if;
  if v_batch.command <> 'confirm_checklist_units' then
    raise exception 'unsupported_operation: only confirmations can be undone' using errcode = 'P0009';
  end if;

  -- Dependency check: the stored after-state must still be the current state.
  for v_change in select * from jsonb_array_elements(coalesce(v_batch.after_state->'changes', '[]'::jsonb))
  loop
    if v_change->>'kind' = 'roster_status' then
      v_player_id := (v_change->>'playerId')::uuid;
      if not exists (
        select 1 from app.franchise_players p
         where p.id = v_player_id and p.roster_status = (v_change->>'rosterStatus')
      ) then
        v_conflict := v_conflict || jsonb_build_object('kind', 'roster_status', 'playerId', v_player_id);
      end if;
    else
      v_position := v_change->>'position';
      v_baseline := app.uuid_array_from_jsonb(v_change->'baseline');
      v_plan := app.uuid_array_from_jsonb(v_change->'plan');
      if app.chart_layer_ids(p_franchise_id, v_position, 'baseline') <> v_baseline
         or app.chart_layer_ids(p_franchise_id, v_position, 'plan') <> v_plan then
        v_conflict := v_conflict || jsonb_build_object('kind', 'depth_chart_list', 'position', v_position);
      end if;
    end if;
  end loop;

  if jsonb_array_length(v_conflict) > 0 then
    raise exception 'dependency_blocked: a later change touched this scope; resolve it instead of rolling back (conflicts: %)',
      v_conflict using errcode = 'P0008';
  end if;

  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);

  for v_change in select * from jsonb_array_elements(coalesce(v_batch.before_state->'changes', '[]'::jsonb))
  loop
    if v_change->>'kind' = 'roster_status' then
      v_player_id := (v_change->>'playerId')::uuid;
      v_status := v_change->>'rosterStatus';
      update app.franchise_players p
         set roster_status = v_status, updated_at = now()
       where p.id = v_player_id;
      v_restored := v_restored || jsonb_build_object('kind', 'roster_status', 'playerId', v_player_id, 'rosterStatus', v_status);
    else
      v_position := v_change->>'position';
      v_baseline := app.uuid_array_from_jsonb(v_change->'baseline');
      v_plan := app.uuid_array_from_jsonb(v_change->'plan');

      delete from app.depth_chart_entries
       where franchise_id = p_franchise_id and position = v_position and layer in ('baseline', 'plan');
      insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
      select p_franchise_id, v_position, 'baseline', ordinality::integer, pid
        from unnest(v_baseline) with ordinality as t(pid, ordinality);
      insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
      select p_franchise_id, v_position, 'plan', ordinality::integer, pid
        from unnest(v_plan) with ordinality as t(pid, ordinality);

      insert into app.depth_chart_state (franchise_id, position, verification, updated_at)
      values (p_franchise_id, v_position, coalesce(v_change->>'verification', 'provisional_published'), now())
      on conflict (franchise_id, position) do update
        set verification = excluded.verification, updated_at = now();

      v_restored := v_restored || jsonb_build_object('kind', 'depth_chart_list', 'position', v_position);
    end if;
  end loop;

  update app.action_batches set undone_at = now() where id = p_batch_id;

  v_prior := jsonb_build_object(
    'restored', v_restored,
    'batchId', p_batch_id,
    'revision', v_revision
  );
  perform app.record_outcome(v_uid, p_request_id, 'undo_action_batch', v_prior);
  return v_prior;
end
$$;

revoke all on function app.uuid_array_from_jsonb(jsonb) from public, anon, authenticated;
revoke all on function app.prune_action_batches(uuid) from public, anon, authenticated;
revoke all on function app.chart_layer_ids(uuid, text, text) from public, anon, authenticated;
revoke all on function app.remap_batch_changes(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.confirm_checklist_units(uuid, jsonb, integer, uuid) from public, anon;
revoke all on function public.cancel_checklist_units(uuid, jsonb, integer, uuid) from public, anon;
revoke all on function public.undo_action_batch(uuid, uuid, integer, uuid) from public, anon;

grant execute on function public.confirm_checklist_units(uuid, jsonb, integer, uuid) to authenticated, service_role;
grant execute on function public.cancel_checklist_units(uuid, jsonb, integer, uuid) to authenticated, service_role;
grant execute on function public.undo_action_batch(uuid, uuid, integer, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Read model: recent bounded history for the checklist UI. Undo availability
-- is re-checked at apply time; `undone_at` is null while a batch is retained.
-- ---------------------------------------------------------------------------
create view public.action_batches_view
with (security_invoker = on) as
select
  b.id,
  b.franchise_id,
  b.command,
  b.summary,
  b.before_state,
  b.after_state,
  b.created_at,
  b.undone_at
from app.action_batches b;

comment on view public.action_batches_view is
  'Bounded undo history (C0B-v2 §4). Any row returned is within the retention window; undo is re-validated for dependency conflicts when requested.';

grant select on public.action_batches_view to authenticated;
revoke all on public.action_batches_view from anon;

-- ---------------------------------------------------------------------------
-- Backup extension (C0B-v2 §8): restore keeps carrying C1B/C2A state and now
-- also restores retained action history with remapped mutable ids. A failure
-- anywhere leaves nothing written (one transaction).
-- ---------------------------------------------------------------------------
create or replace function public.restore_new_franchise(
  p_payload jsonb,
  p_request_id uuid
) returns uuid
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_franchise_id uuid;
  v_player jsonb;
  v_field jsonb;
  v_entry jsonb;
  v_batch jsonb;
  v_source_id uuid;
  v_new_player_id uuid;
  v_map jsonb := '{}'::jsonb;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return (v_prior #>> '{}')::uuid;
  end if;

  if jsonb_typeof(p_payload) <> 'object' or coalesce(btrim(p_payload->>'name'), '') = '' then
    raise exception 'backup_invalid' using errcode = 'P0007';
  end if;

  insert into app.franchises (owner_uid, name, is_default)
  values (v_uid, btrim(p_payload->>'name'), false)
  returning id into v_franchise_id;

  for v_player in select * from jsonb_array_elements(coalesce(p_payload->'players', '[]'::jsonb))
  loop
    v_source_id := null;

    if v_player->>'origin' = 'source' then
      select r.id into v_source_id
        from app.source_player_records r
        join app.source_revisions s on s.id = r.revision_id
       where r.source_id = v_player->'sourceReference'->>'sourceId'
         and s.revision_key = v_player->'sourceReference'->>'revisionKey';

      if v_source_id is null then
        raise exception 'source_revision_unavailable' using errcode = 'P0005';
      end if;
    end if;

    insert into app.franchise_players
      (franchise_id, origin, source_player_record_id, custom_key, full_name, roster_status)
    values (
      v_franchise_id,
      coalesce(v_player->>'origin', 'custom'),
      v_source_id,
      case
        when v_player->>'origin' = 'source' then null
        else coalesce(nullif(v_player->>'customKey', ''), 'c_' || replace(gen_random_uuid()::text, '-', ''))
      end,
      btrim(v_player->>'fullName'),
      coalesce(v_player->>'rosterStatus', 'active')
    )
    returning id into v_new_player_id;

    v_map := v_map || jsonb_build_object(v_player->>'mutableId', to_jsonb(v_new_player_id::text));
  end loop;

  for v_field in select * from jsonb_array_elements(coalesce(p_payload->'fields', '[]'::jsonb))
  loop
    insert into app.franchise_player_fields
      (franchise_player_id, field_key, baseline_value, plan_value, field_class)
    values (
      (v_map ->> (v_field->>'playerId'))::uuid,
      v_field->>'fieldKey',
      case
        when jsonb_typeof(v_field->'baselineValue') = 'null' then null
        else v_field->'baselineValue'
      end,
      case
        when jsonb_typeof(v_field->'planValue') = 'null' then null
        else v_field->'planValue'
      end,
      coalesce(v_field->>'fieldClass', 'app_fact')
    );
  end loop;

  for v_entry in select * from jsonb_array_elements(coalesce(p_payload->'depthChart', '[]'::jsonb))
  loop
    insert into app.depth_chart_entries
      (franchise_id, position, layer, depth_rank, franchise_player_id)
    values (
      v_franchise_id,
      btrim(v_entry->>'position'),
      coalesce(v_entry->>'layer', 'baseline'),
      (v_entry->>'rank')::integer,
      (v_map ->> (v_entry->>'playerId'))::uuid
    );
  end loop;

  for v_batch in select * from jsonb_array_elements(coalesce(p_payload->'history', '[]'::jsonb))
  loop
    insert into app.action_batches
      (franchise_id, command, summary, before_state, after_state, created_at)
    values (
      v_franchise_id,
      coalesce(nullif(v_batch->>'command', ''), 'restored_batch'),
      coalesce(v_batch->'summary', '{}'::jsonb),
      jsonb_build_object('changes', app.remap_batch_changes(v_batch#>'{beforeState,changes}', v_map)),
      jsonb_build_object('changes', app.remap_batch_changes(v_batch#>'{afterState,changes}', v_map)),
      coalesce((v_batch->>'createdAt')::timestamptz, now())
    );
  end loop;

  perform app.record_outcome(v_uid, p_request_id, 'restore_new_franchise', to_jsonb(v_franchise_id::text));
  return v_franchise_id;
end
$$;

revoke all on function public.restore_new_franchise(jsonb, uuid) from public, anon;
grant execute on function public.restore_new_franchise(jsonb, uuid) to authenticated, service_role;
