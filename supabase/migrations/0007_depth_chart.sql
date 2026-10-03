-- 0007_depth_chart.sql
-- C2A: depth-chart planning state (per-position ordered lists, planned vs recorded baseline,
-- active/practice-squad separation) plus the C0B-v2 backup extension for that state.
-- Traceability: C0B-v2 §3 (baseline/plan layers, provisional vs owner_confirmed labels,
-- intent-aware edits), §4 (one position's ordered list is the action unit; rank ticks are not),
-- §5 (revision + request-outcome retry safety), §8 (backup round trip), §9 (read models).
-- Provisional rules: this schema stores position keys, ranks, and layers, but the exact Madden 27
-- labels, order, rank limits, and eligibility are NOT encoded here — they live in lib/depth-chart.ts
-- and remain labeled provisional until the D113 evidence supplement lands (D123). The database-level
-- rank bound of 12 is a structural sanity cap, not a claimed game limit.
-- Owner applies to the live project per D088/D119; never during a build.

-- ---------------------------------------------------------------------------
-- Depth-chart entries. Two explicit layers per (franchise, position):
--   baseline — the reference state (provisional suggestion or owner-recorded reality)
--   plan     — intended state; pending differences derive from baseline vs plan
-- A player may appear in more than one position list (legal cross-position and
-- specialist reuse as verified; provisional rules decide disclosure), but never
-- twice in the same position list.
-- ---------------------------------------------------------------------------
create table app.depth_chart_entries (
  id                  uuid primary key default gen_random_uuid(),
  franchise_id        uuid not null references app.franchises (id) on delete cascade,
  position            text not null check (char_length(btrim(position)) between 1 and 12),
  layer               text not null check (layer in ('baseline', 'plan')),
  depth_rank          integer not null check (depth_rank between 1 and 12),
  franchise_player_id uuid not null references app.franchise_players (id) on delete cascade,
  created_at          timestamptz not null default now(),
  unique (franchise_id, position, layer, depth_rank),
  unique (franchise_id, position, layer, franchise_player_id)
);

comment on table app.depth_chart_entries is
  'Per-position ordered depth-chart lists in two layers (C0B-v2 §3/§4). One position list is the action unit; per-rank rows are never independent units.';

create index depth_chart_entries_franchise_idx
  on app.depth_chart_entries (franchise_id, position, layer);

-- ---------------------------------------------------------------------------
-- Slice verification labels. The depth chart is a slice: an auto-generated
-- provisional list must never read as an owner-confirmed game fact (D096/D107).
-- ---------------------------------------------------------------------------
create table app.depth_chart_state (
  franchise_id  uuid not null references app.franchises (id) on delete cascade,
  position      text not null check (char_length(btrim(position)) between 1 and 12),
  verification  text not null default 'provisional_published'
                check (verification in ('provisional_published', 'owner_confirmed')),
  updated_at    timestamptz not null default now(),
  primary key (franchise_id, position)
);

comment on table app.depth_chart_state is
  'Verification label per position slice (C0B-v2 §3): provisional_published until the owner records reality, then owner_confirmed. Confirming one position never verifies the franchise.';

-- ---------------------------------------------------------------------------
-- Roster availability: active roster vs practice squad (D023). Practice-squad
-- membership is recorded reality, not a plan; promotion stays a C4A transaction.
-- ---------------------------------------------------------------------------
alter table app.franchise_players
  add column roster_status text not null default 'active'
  check (roster_status in ('active', 'practice_squad'));

comment on column app.franchise_players.roster_status is
  'Active roster vs practice squad (D023). A practice-squad player cannot silently enter a plan: the app discloses a promotion prerequisite, and the owner may record a roster correction (C2A) until the C4A promotion tools exist.';

-- ---------------------------------------------------------------------------
-- Row level security: owner-scoped exactly like the other C1B entities.
-- ---------------------------------------------------------------------------
alter table app.depth_chart_entries enable row level security;
alter table app.depth_chart_state enable row level security;

create policy depth_chart_entries_select_own on app.depth_chart_entries
  for select to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.depth_chart_entries.franchise_id and f.owner_uid = auth.uid()
  ));

create policy depth_chart_entries_insert_own on app.depth_chart_entries
  for insert to authenticated
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ) and app.is_allowlisted_owner());

create policy depth_chart_entries_update_own on app.depth_chart_entries
  for update to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.depth_chart_entries.franchise_id and f.owner_uid = auth.uid()
  ))
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ));

create policy depth_chart_entries_delete_own on app.depth_chart_entries
  for delete to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.depth_chart_entries.franchise_id and f.owner_uid = auth.uid()
  ));

create policy depth_chart_state_select_own on app.depth_chart_state
  for select to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.depth_chart_state.franchise_id and f.owner_uid = auth.uid()
  ));

create policy depth_chart_state_write_own on app.depth_chart_state
  for all to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.depth_chart_state.franchise_id and f.owner_uid = auth.uid()
  ))
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ) and app.is_allowlisted_owner());

grant select, insert, update, delete on app.depth_chart_entries to authenticated;
grant select, insert, update, delete on app.depth_chart_state to authenticated;

-- ---------------------------------------------------------------------------
-- Command-layer helper: a whole position list must contain unique players that
-- belong to the franchise. Structural cap only; the actual per-position limits
-- are provisional rules in the app module.
-- ---------------------------------------------------------------------------
create or replace function app.assert_chart_players(
  p_franchise_id uuid,
  p_player_ids uuid[]
) returns void
  language plpgsql
  security definer
  set search_path = app, pg_catalog
as $$
declare
  v_len integer := coalesce(array_length(p_player_ids, 1), 0);
  v_count integer;
  v_distinct integer;
begin
  if v_len > 12 then
    raise exception 'validation_failed: at most 12 entries per position list' using errcode = 'P0006';
  end if;

  if exists (select 1 from unnest(p_player_ids) as x where x is null) then
    raise exception 'validation_failed: a player id is missing' using errcode = 'P0006';
  end if;

  select count(distinct x) into v_distinct from unnest(p_player_ids) as x;
  if coalesce(v_distinct, 0) <> v_len then
    raise exception 'validation_failed: the same player cannot appear twice in one position list' using errcode = 'P0006';
  end if;

  if v_len > 0 then
    select count(*) into v_count
      from app.franchise_players p
     where p.franchise_id = p_franchise_id
       and p.id = any (p_player_ids);
    if v_count <> v_len then
      raise exception 'cross_franchise_reference' using errcode = 'P0004';
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Commands. Every write is revision-checked, request-id replay-safe, and scoped
-- to the caller's own franchise.
-- ---------------------------------------------------------------------------

/** Replace the planned list for one position. One call = one whole list (C0B-v2 §4). */
create or replace function public.set_depth_chart_plan(
  p_franchise_id uuid,
  p_position text,
  p_player_ids uuid[],
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
  v_position text := btrim(coalesce(p_position, ''));
  v_player_ids uuid[] := coalesce(p_player_ids, '{}'::uuid[]);
  v_baseline_ids uuid[];
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if v_position = '' then
    raise exception 'validation_failed: a position is required' using errcode = 'P0006';
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform app.assert_chart_players(p_franchise_id, v_player_ids);
  perform public.touch_franchise(p_franchise_id, p_expected_revision);

  select array_agg(e.franchise_player_id order by e.depth_rank)
    into v_baseline_ids
    from app.depth_chart_entries e
   where e.franchise_id = p_franchise_id and e.position = v_position and e.layer = 'baseline';

  delete from app.depth_chart_entries
   where franchise_id = p_franchise_id and position = v_position and layer = 'plan';

  -- A plan equal to the baseline is not a pending difference: the row is not
  -- stored (consolidation, C0B-v2 §3).
  if coalesce(v_baseline_ids, '{}'::uuid[]) <> v_player_ids then
    insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
    select p_franchise_id, v_position, 'plan', ordinality::integer, player_id
      from unnest(v_player_ids) with ordinality as t(player_id, ordinality);
  end if;

  v_prior := jsonb_build_object(
    'position', v_position,
    'layer', 'plan',
    'playerIds', to_jsonb(v_player_ids),
    'noop', coalesce(v_baseline_ids, '{}'::uuid[]) = v_player_ids
  );

  perform app.record_outcome(v_uid, p_request_id, 'set_depth_chart_plan', v_prior);
  return v_prior;
end
$$;

/**
 * Record a whole position list as the baseline.
 * - intent 'recorded': the owner says this is what the game now shows -> owner_confirmed.
 * - intent 'provisional': an auto-suggested planning baseline -> provisional_published (D096/D107).
 * Reconciles the plan without erasing it: an identical plan is removed as redundant; a
 * differing plan is kept and surfaced as a conflict for review (C0B-v2 §3).
 */
create or replace function public.record_depth_chart_baseline(
  p_franchise_id uuid,
  p_position text,
  p_player_ids uuid[],
  p_intent text,
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
  v_position text := btrim(coalesce(p_position, ''));
  v_player_ids uuid[] := coalesce(p_player_ids, '{}'::uuid[]);
  v_plan_ids uuid[];
  v_plan_kept boolean := false;
  v_verification text;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if v_position = '' then
    raise exception 'validation_failed: a position is required' using errcode = 'P0006';
  end if;
  if p_intent not in ('recorded', 'provisional') then
    raise exception 'validation_failed: intent must be recorded or provisional' using errcode = 'P0006';
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform app.assert_chart_players(p_franchise_id, v_player_ids);
  perform public.touch_franchise(p_franchise_id, p_expected_revision);

  select array_agg(e.franchise_player_id order by e.depth_rank)
    into v_plan_ids
    from app.depth_chart_entries e
   where e.franchise_id = p_franchise_id and e.position = v_position and e.layer = 'plan';

  delete from app.depth_chart_entries
   where franchise_id = p_franchise_id and position = v_position and layer = 'baseline';

  insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
  select p_franchise_id, v_position, 'baseline', ordinality::integer, player_id
    from unnest(v_player_ids) with ordinality as t(player_id, ordinality);

  if v_plan_ids is not null and v_plan_ids = v_player_ids then
    -- The plan is now redundant: it equals the recorded baseline.
    delete from app.depth_chart_entries
     where franchise_id = p_franchise_id and position = v_position and layer = 'plan';
  elsif v_plan_ids is not null then
    -- A differing plan is unrelated pending work; keep it and surface the conflict.
    v_plan_kept := true;
  end if;

  v_verification := case when p_intent = 'recorded' then 'owner_confirmed' else 'provisional_published' end;

  insert into app.depth_chart_state (franchise_id, position, verification, updated_at)
  values (p_franchise_id, v_position, v_verification, now())
  on conflict (franchise_id, position) do update
    set verification = excluded.verification,
        updated_at = now();

  v_prior := jsonb_build_object(
    'position', v_position,
    'layer', 'baseline',
    'playerIds', to_jsonb(v_player_ids),
    'verification', v_verification,
    'planKept', v_plan_kept
  );

  perform app.record_outcome(v_uid, p_request_id, 'record_depth_chart_baseline', v_prior);
  return v_prior;
end
$$;

/** Cancel the pending plan for one position: the plan returns to its baseline (C0B-v2 §4). */
create or replace function public.discard_depth_chart_plan(
  p_franchise_id uuid,
  p_position text,
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
  v_position text := btrim(coalesce(p_position, ''));
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if v_position = '' then
    raise exception 'validation_failed: a position is required' using errcode = 'P0006';
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform public.touch_franchise(p_franchise_id, p_expected_revision);

  delete from app.depth_chart_entries
   where franchise_id = p_franchise_id and position = v_position and layer = 'plan';

  v_prior := jsonb_build_object('position', v_position, 'layer', 'plan', 'playerIds', '[]'::jsonb);
  perform app.record_outcome(v_uid, p_request_id, 'discard_depth_chart_plan', v_prior);
  return v_prior;
end
$$;

/**
 * Record a roster correction: active roster vs practice squad (D023). This is a
 * reality update, not a promotion transaction — C4A owns real promotion tools.
 */
create or replace function public.set_player_roster_status(
  p_franchise_player_id uuid,
  p_status text,
  p_expected_revision integer,
  p_request_id uuid
) returns app.franchise_players
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_player app.franchise_players;
  v_franchise_id uuid;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return jsonb_populate_record(null::app.franchise_players, v_prior);
  end if;

  if p_status not in ('active', 'practice_squad') then
    raise exception 'validation_failed: status must be active or practice_squad' using errcode = 'P0006';
  end if;

  select p.franchise_id into v_franchise_id
    from app.franchise_players p
    join app.franchises f on f.id = p.franchise_id
   where p.id = p_franchise_player_id
     and f.owner_uid = v_uid;

  if v_franchise_id is null then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform public.touch_franchise(v_franchise_id, p_expected_revision);

  update app.franchise_players p
     set roster_status = p_status,
         updated_at = now()
   where p.id = p_franchise_player_id
  returning * into v_player;

  perform app.record_outcome(v_uid, p_request_id, 'set_player_roster_status', to_jsonb(v_player));
  return v_player;
end
$$;

revoke all on function app.assert_chart_players(uuid, uuid[]) from public, anon, authenticated;
revoke all on function public.set_depth_chart_plan(uuid, text, uuid[], integer, uuid) from public, anon;
revoke all on function public.record_depth_chart_baseline(uuid, text, uuid[], text, integer, uuid) from public, anon;
revoke all on function public.discard_depth_chart_plan(uuid, text, integer, uuid) from public, anon;
revoke all on function public.set_player_roster_status(uuid, text, integer, uuid) from public, anon;

grant execute on function public.set_depth_chart_plan(uuid, text, uuid[], integer, uuid) to authenticated, service_role;
grant execute on function public.record_depth_chart_baseline(uuid, text, uuid[], text, integer, uuid) to authenticated, service_role;
grant execute on function public.discard_depth_chart_plan(uuid, text, integer, uuid) to authenticated, service_role;
grant execute on function public.set_player_roster_status(uuid, text, integer, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Read models. Players view gains roster status and the published overall the
-- provisional suggestion reads; the depth-chart view joins display facts only.
-- ---------------------------------------------------------------------------
create or replace view public.franchise_players_view
with (security_invoker = on) as
select
  fp.id,
  fp.franchise_id,
  fp.origin,
  fp.custom_key,
  fp.full_name,
  fp.source_player_record_id,
  sp.source_id as source_id,
  sp.team,
  sp.listed_position,
  sp.archetype,
  sp.birthdate,
  s.revision_key as source_revision_key,
  fp.roster_status,
  sp.ratings ->> 'overallRating' as source_overall
from app.franchise_players fp
left join app.source_player_records sp on sp.id = fp.source_player_record_id
left join app.source_revisions s on s.id = sp.revision_id;

grant select on public.franchise_players_view to authenticated;
revoke all on public.franchise_players_view from anon;

create view public.depth_chart_view
with (security_invoker = on) as
select
  e.id,
  e.franchise_id,
  e.position,
  e.layer,
  e.depth_rank,
  e.franchise_player_id,
  fp.full_name,
  fp.origin,
  fp.custom_key,
  fp.roster_status,
  coalesce(st.verification, 'provisional_published') as verification,
  sp.listed_position as source_listed_position,
  sp.ratings ->> 'overallRating' as source_overall,
  f_listed.baseline_value #>> '{}' as recorded_listed_position,
  f_overall.baseline_value #>> '{}' as recorded_overall,
  f_overall.plan_value #>> '{}' as planned_overall,
  f_jersey.baseline_value #>> '{}' as recorded_jersey,
  f_jersey.plan_value #>> '{}' as planned_jersey
from app.depth_chart_entries e
join app.franchise_players fp on fp.id = e.franchise_player_id
left join app.source_player_records sp on sp.id = fp.source_player_record_id
left join app.depth_chart_state st on st.franchise_id = e.franchise_id and st.position = e.position
left join app.franchise_player_fields f_listed
  on f_listed.franchise_player_id = fp.id and f_listed.field_key = 'listed_position'
left join app.franchise_player_fields f_overall
  on f_overall.franchise_player_id = fp.id and f_overall.field_key = 'overall'
left join app.franchise_player_fields f_jersey
  on f_jersey.franchise_player_id = fp.id and f_jersey.field_key = 'jersey_number';

comment on view public.depth_chart_view is
  'Depth-chart entries with display facts only. verification is the slice label: provisional_published is never presented as a confirmed game chart (D096/D107).';

grant select on public.depth_chart_view to authenticated;
revoke all on public.depth_chart_view from anon;

-- ---------------------------------------------------------------------------
-- Backup extension (C0B-v2 §8): restore keeps carrying C1B state and now also
-- restores roster status and depth-chart entries. Mutable ids are remapped;
-- a failure anywhere leaves nothing written (one transaction).
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

  perform app.record_outcome(v_uid, p_request_id, 'restore_new_franchise', to_jsonb(v_franchise_id::text));
  return v_franchise_id;
end
$$;

revoke all on function public.restore_new_franchise(jsonb, uuid) from public, anon;
grant execute on function public.restore_new_franchise(jsonb, uuid) to authenticated, service_role;
