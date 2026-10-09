-- 0012_formations.sql
-- C3A: verified-dynamic formation substitutions — book-scoped slot state and checklist
-- integration. Adds formation overrides (two layers like the depth chart), formation
-- favorites, and extends the C2B confirmation/cancellation/undo machinery so explicit
-- formation-override set/reset units confirm atomically alongside chart units.
-- Traceability: C0B-v2 §6 (formation identity is book+formation, never a name alone;
-- inherited slots recompute from plan edits; explicit overrides persist until reset;
-- slot identifiers stay configurable and evidence-versioned until the D113 supplement),
-- §4 (atomic reviewed batches, bounded undo), §5 (revision + request replay), §8 (backup).
-- Evidence basis (D128): the formation catalog and slot mappings are OWNER-ATTESTED
-- (Madden 27 recollection) plus Civil.GG observed public data; nothing here is presented
-- as in-game verified. The database stores book/formation/slot identity strings and player
-- references only — every mapping's meaning and confidence lives in lib/formations/*.
-- Owner applies to the live project per D088/D119; never during a build.

-- ---------------------------------------------------------------------------
-- Formation overrides. Two explicit layers per (franchise, book, formation, slot):
--   baseline — the recorded reality for that slot (absent = the slot still inherits
--              from the depth chart under the catalog's provisional mapping)
--   plan     — the owner's explicit pending override for that slot
-- A slot with a plan row equal to its effective baseline produces NO checklist unit,
-- but the row persists: same-player override-vs-inheritance equality never erases the
-- override's persistence intent (ACCEPTANCE A32).
-- ---------------------------------------------------------------------------
create table app.formation_overrides (
  id           uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references app.franchises (id) on delete cascade,
  book_id      text not null check (char_length(btrim(book_id)) between 1 and 64),
  formation_id text not null check (char_length(btrim(formation_id)) between 1 and 128),
  slot_id      text not null check (char_length(btrim(slot_id)) between 1 and 24),
  layer        text not null check (layer in ('baseline', 'plan')),
  player_id    uuid not null references app.franchise_players (id) on delete cascade,
  updated_at   timestamptz not null default now(),
  unique (franchise_id, book_id, formation_id, slot_id, layer)
);

comment on table app.formation_overrides is
  'Book-scoped explicit formation-slot overrides in two layers (C0B-v2 §6). Identity is (book, formation, slot) — a formation name alone is never identity. Absent rows mean the slot inherits from the depth chart.';

create index formation_overrides_franchise_idx
  on app.formation_overrides (franchise_id, book_id, formation_id);

-- ---------------------------------------------------------------------------
-- Favorite formations. App preference only (like theme): never a checklist item,
-- never game state. Shared with Coach/Gameday later via the same stable
-- (book_id, formation_id) identity, not a duplicate collection.
-- ---------------------------------------------------------------------------
create table app.formation_favorites (
  franchise_id uuid not null references app.franchises (id) on delete cascade,
  book_id      text not null check (char_length(btrim(book_id)) between 1 and 64),
  formation_id text not null check (char_length(btrim(formation_id)) between 1 and 128),
  created_at   timestamptz not null default now(),
  primary key (franchise_id, book_id, formation_id)
);

comment on table app.formation_favorites is
  'Favorite formations per franchise and book (C3A). App preference only; the stable (book_id, formation_id) identity is what Coach/Gameday will reuse.';

-- ---------------------------------------------------------------------------
-- Row level security: owner-scoped exactly like the other C1B entities.
-- ---------------------------------------------------------------------------
alter table app.formation_overrides enable row level security;
alter table app.formation_favorites enable row level security;

create policy formation_overrides_select_own on app.formation_overrides
  for select to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.formation_overrides.franchise_id and f.owner_uid = auth.uid()
  ));

create policy formation_overrides_write_own on app.formation_overrides
  for all to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.formation_overrides.franchise_id and f.owner_uid = auth.uid()
  ))
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ) and app.is_allowlisted_owner());

create policy formation_favorites_select_own on app.formation_favorites
  for select to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.formation_favorites.franchise_id and f.owner_uid = auth.uid()
  ));

create policy formation_favorites_write_own on app.formation_favorites
  for all to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.formation_favorites.franchise_id and f.owner_uid = auth.uid()
  ))
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ) and app.is_allowlisted_owner());

grant select, insert, update, delete on app.formation_overrides to authenticated;
grant select, insert, update, delete on app.formation_favorites to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers.
-- ---------------------------------------------------------------------------

/** The stored player for one slot/layer, or null when the slot has no override there. */
create or replace function app.formation_slot_player(
  p_franchise_id uuid,
  p_book_id text,
  p_formation_id text,
  p_slot_id text,
  p_layer text
) returns uuid
  language sql
  stable
  security definer
  set search_path = app, pg_catalog
as $$
  select o.player_id
    from app.formation_overrides o
   where o.franchise_id = p_franchise_id
     and o.book_id = p_book_id
     and o.formation_id = p_formation_id
     and o.slot_id = p_slot_id
     and o.layer = p_layer
   limit 1
$$;

/** Set (or clear, with a null player) the plan-layer override for one formation slot. */
create or replace function public.set_formation_override(
  p_franchise_id uuid,
  p_book_id text,
  p_formation_id text,
  p_slot_id text,
  p_player_id uuid,
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
  v_revision integer;
  v_effective uuid;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  if coalesce(btrim(p_book_id), '') = '' or coalesce(btrim(p_formation_id), '') = '' or coalesce(btrim(p_slot_id), '') = '' then
    raise exception 'validation_failed: book, formation, and slot are required' using errcode = 'P0006';
  end if;

  if p_player_id is not null and not exists (
    select 1 from app.franchise_players p
     where p.id = p_player_id and p.franchise_id = p_franchise_id
  ) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  -- Effective baseline: a recorded baseline override, else the inherited chart player
  -- (computed by the app resolver; the database only needs the stored layers).
  v_effective := app.formation_slot_player(p_franchise_id, p_book_id, p_formation_id, p_slot_id, 'baseline');

  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);

  if p_player_id is null then
    delete from app.formation_overrides
     where franchise_id = p_franchise_id and book_id = p_book_id
       and formation_id = p_formation_id and slot_id = p_slot_id and layer = 'plan';
  else
    -- A differing plan row is the pending unit; a same-player set stores the row too
    -- (override intent is never erased) but derives no checklist unit (ACCEPTANCE A32).
    delete from app.formation_overrides
     where franchise_id = p_franchise_id and book_id = p_book_id
       and formation_id = p_formation_id and slot_id = p_slot_id and layer = 'plan';
    insert into app.formation_overrides (franchise_id, book_id, formation_id, slot_id, layer, player_id)
    values (p_franchise_id, btrim(p_book_id), btrim(p_formation_id), btrim(p_slot_id), 'plan', p_player_id);
    delete from app.formation_overrides
     where franchise_id = p_franchise_id and book_id = p_book_id
       and formation_id = p_formation_id and slot_id = p_slot_id and layer = 'plan';
    insert into app.formation_overrides (franchise_id, book_id, formation_id, slot_id, layer, player_id)
    values (p_franchise_id, btrim(p_book_id), btrim(p_formation_id), btrim(p_slot_id), 'plan', p_player_id);
  end if;

  v_prior := jsonb_build_object(
    'slot', btrim(p_slot_id),
    'playerId', p_player_id,
    'revision', v_revision
  );
  perform app.record_outcome(v_uid, p_request_id, 'set_formation_override', v_prior);
  return v_prior;
end
$$;

-- ---------------------------------------------------------------------------
-- Confirmation (C0B-v2 §4). Replaces the C2B function, adding the formation_slot
-- unit type so one reviewed batch can mix depth-chart and formation units atomically.
-- Validation runs fully before any mutation; ordering is prerequisites first.
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
  v_book_id text;
  v_formation_id text;
  v_slot_id text;
  v_applied jsonb := '[]'::jsonb;
  v_before jsonb := '[]'::jsonb;
  v_after jsonb := '[]'::jsonb;
  v_batch_id uuid;
  v_revision integer;
  v_active uuid[] := '{}'::uuid[];
  v_seen_positions text[] := '{}'::text[];
  v_seen_slots text[] := '{}'::text[];
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

    elsif v_type = 'formation_slot' then
      v_book_id := btrim(coalesce(v_unit->>'bookId', ''));
      v_formation_id := btrim(coalesce(v_unit->>'formationId', ''));
      v_slot_id := btrim(coalesce(v_unit->>'slotId', ''));
      v_player_id := nullif(v_unit->>'playerId', '')::uuid;
      if v_book_id = '' or v_formation_id = '' or v_slot_id = '' or v_player_id is null then
        raise exception 'validation_failed: a formation unit needs book, formation, slot, and player' using errcode = 'P0006';
      end if;
      if (v_book_id || ':' || v_formation_id || ':' || v_slot_id) = any (v_seen_slots) then
        raise exception 'validation_failed: the same formation slot appears twice in one confirmation' using errcode = 'P0006';
      end if;
      v_seen_slots := v_seen_slots || (v_book_id || ':' || v_formation_id || ':' || v_slot_id);
      if not exists (
        select 1 from app.franchise_players p
         where p.id = v_player_id and p.franchise_id = p_franchise_id
      ) then
        raise exception 'cross_franchise_reference' using errcode = 'P0004';
      end if;
      v_plan_ids := app.uuid_array_from_jsonb(v_unit->'planPlayerIds');
      if coalesce(app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'plan'), null::uuid)
         is distinct from v_player_id
         or (v_plan_ids <> '{}'::uuid[] and v_plan_ids <> array[v_player_id]) then
        raise exception 'validation_failed: this reviewed formation change is no longer pending; reload and review again' using errcode = 'P0006';
      end if;
      if not exists (
        select 1 from app.franchise_players p
         where p.id = v_player_id and p.franchise_id = p_franchise_id and p.roster_status = 'active'
      ) and not (v_player_id = any (v_active)) then
        raise exception 'dependency_blocked: the override target is still on the practice squad; confirm its promotion prerequisite first' using errcode = 'P0008';
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

    elsif v_type = 'formation_slot' then
      v_book_id := btrim(v_unit->>'bookId');
      v_formation_id := btrim(v_unit->>'formationId');
      v_slot_id := btrim(v_unit->>'slotId');
      v_player_id := nullif(v_unit->>'playerId', '')::uuid;
      v_before := v_before || jsonb_build_array(jsonb_build_object(
        'kind', 'formation_slot',
        'bookId', v_book_id,
        'formationId', v_formation_id,
        'slotId', v_slot_id,
        'baselinePlayerId', app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'baseline'),
        'planPlayerId', app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'plan')
      ));

      delete from app.formation_overrides
       where franchise_id = p_franchise_id and book_id = v_book_id
         and formation_id = v_formation_id and slot_id = v_slot_id and layer = 'plan';
      insert into app.formation_overrides (franchise_id, book_id, formation_id, slot_id, layer, player_id)
      values (p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'baseline', v_player_id)
      on conflict (franchise_id, book_id, formation_id, slot_id, layer)
      do update set player_id = excluded.player_id, updated_at = now();

      v_after := v_after || jsonb_build_array(jsonb_build_object(
        'kind', 'formation_slot',
        'bookId', v_book_id,
        'formationId', v_formation_id,
        'slotId', v_slot_id,
        'baselinePlayerId', v_player_id,
        'planPlayerId', null::text
      ));
      v_applied := v_applied || to_jsonb(coalesce(nullif(v_unit->>'unitId', ''), format('formation_slot:%s:%s:%s', v_book_id, v_formation_id, v_slot_id)));

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
-- same players. Formation slots are now cancellable too: the formation UI owns
-- the explicit reset scope (slot or whole reviewed formation), and cancel is
-- the mechanism — a cancelled formation plan removes the pending override only.
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
  v_book_id text;
  v_formation_id text;
  v_slot_id text;
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
    if v_type = 'depth_chart_list' then
      v_position := btrim(coalesce(v_unit->>'position', ''));
      if v_position = '' or v_position = any (v_seen) then
        raise exception 'validation_failed: invalid or duplicate position' using errcode = 'P0006';
      end if;
      v_seen := v_seen || ('chart:' || v_position);
      v_plan_ids := app.chart_layer_ids(p_franchise_id, v_position, 'plan');
      if array_length(v_plan_ids, 1) is null or array_length(v_plan_ids, 1) = 0 then
        raise exception 'validation_failed: that position has no pending plan to cancel' using errcode = 'P0006';
      end if;
      v_affected := v_affected || v_plan_ids;
    elsif v_type = 'formation_slot' then
      v_book_id := btrim(coalesce(v_unit->>'bookId', ''));
      v_formation_id := btrim(coalesce(v_unit->>'formationId', ''));
      v_slot_id := btrim(coalesce(v_unit->>'slotId', ''));
      if v_book_id = '' or v_formation_id = '' or v_slot_id = '' then
        raise exception 'validation_failed: a formation unit needs book, formation, and slot' using errcode = 'P0006';
      end if;
      if (v_book_id || ':' || v_formation_id || ':' || v_slot_id) = any (v_seen) then
        raise exception 'validation_failed: the same formation slot appears twice' using errcode = 'P0006';
      end if;
      v_seen := v_seen || (v_book_id || ':' || v_formation_id || ':' || v_slot_id);
      if app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'plan') is null then
        raise exception 'validation_failed: that formation slot has no pending override to cancel' using errcode = 'P0006';
      end if;
      v_affected := v_affected || array[app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'plan')];
    else
      raise exception 'validation_failed: only pending lineup or formation differences can be cancelled' using errcode = 'P0006';
    end if;
  end loop;

  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);

  for v_unit in select * from jsonb_array_elements(v_units)
  loop
    v_type := v_unit->>'type';
    if v_type = 'depth_chart_list' then
      v_position := btrim(v_unit->>'position');
      delete from app.depth_chart_entries
       where franchise_id = p_franchise_id and position = v_position and layer = 'plan';
      v_cancelled := v_cancelled || to_jsonb(v_position);
    else
      v_book_id := btrim(v_unit->>'bookId');
      v_formation_id := btrim(v_unit->>'formationId');
      v_slot_id := btrim(v_unit->>'slotId');
      delete from app.formation_overrides
       where franchise_id = p_franchise_id and book_id = v_book_id
         and formation_id = v_formation_id and slot_id = v_slot_id and layer = 'plan';
      v_cancelled := v_cancelled || to_jsonb(v_book_id || ':' || v_formation_id || ':' || v_slot_id);
    end if;
  end loop;

  -- Dependent consequences: other pending scopes that reference the same players.
  for v_dep in
    select distinct ('chart:' || e.position) as ref
      from app.depth_chart_entries e
     where e.franchise_id = p_franchise_id
       and e.layer = 'plan'
       and e.franchise_player_id = any (v_affected)
    union
    select distinct ('formation:' || o.book_id || ':' || o.formation_id || ':' || o.slot_id) as ref
      from app.formation_overrides o
     where o.franchise_id = p_franchise_id
       and o.layer = 'plan'
       and o.player_id = any (v_affected)
  loop
    v_dependent := v_dependent || to_jsonb(v_dep.ref);
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
-- dependent change conflicts. Extended for formation_slot changes: the stored
-- after-state must still be the current layers of that slot.
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
  v_book_id text;
  v_formation_id text;
  v_slot_id text;
  v_baseline_player uuid;
  v_plan_player uuid;
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
    elsif v_change->>'kind' = 'formation_slot' then
      v_book_id := v_change->>'bookId';
      v_formation_id := v_change->>'formationId';
      v_slot_id := v_change->>'slotId';
      v_baseline_player := nullif(v_change->>'baselinePlayerId', '')::uuid;
      v_plan_player := nullif(v_change->>'planPlayerId', '')::uuid;
      if app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'baseline')
           is distinct from v_baseline_player
         or app.formation_slot_player(p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'plan')
           is distinct from v_plan_player then
        v_conflict := v_conflict || jsonb_build_object('kind', 'formation_slot', 'slotId', v_slot_id);
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
    elsif v_change->>'kind' = 'formation_slot' then
      v_book_id := v_change->>'bookId';
      v_formation_id := v_change->>'formationId';
      v_slot_id := v_change->>'slotId';
      v_baseline_player := nullif(v_change->>'baselinePlayerId', '')::uuid;
      v_plan_player := nullif(v_change->>'planPlayerId', '')::uuid;

      delete from app.formation_overrides
       where franchise_id = p_franchise_id and book_id = v_book_id
         and formation_id = v_formation_id and slot_id = v_slot_id
         and layer in ('baseline', 'plan');
      if v_baseline_player is not null then
        insert into app.formation_overrides (franchise_id, book_id, formation_id, slot_id, layer, player_id)
        values (p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'baseline', v_baseline_player);
      end if;
      if v_plan_player is not null then
        insert into app.formation_overrides (franchise_id, book_id, formation_id, slot_id, layer, player_id)
        values (p_franchise_id, v_book_id, v_formation_id, v_slot_id, 'plan', v_plan_player);
      end if;
      v_restored := v_restored || jsonb_build_object('kind', 'formation_slot', 'bookId', v_book_id, 'formationId', v_formation_id, 'slotId', v_slot_id);
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

-- ---------------------------------------------------------------------------
-- Remap mutable player ids inside stored history changes during restore.
-- Extended for formation_slot changes.
-- ---------------------------------------------------------------------------
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
    elsif v_change->>'kind' = 'formation_slot' then
      v_new := jsonb_set(
        v_change,
        '{baselinePlayerId}',
        coalesce(to_jsonb(p_map->>(v_change->>'baselinePlayerId')), to_jsonb(v_change->>'baselinePlayerId'))
      );
      v_new := jsonb_set(
        v_new,
        '{planPlayerId}',
        coalesce(to_jsonb(p_map->>(v_change->>'planPlayerId')), to_jsonb(v_change->>'planPlayerId'))
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
-- Backup extension (C0B-v2 §8): restore also carries formation overrides and
-- favorites, remapping mutable player ids. A failure anywhere leaves nothing
-- written (one transaction). Older envelopes without the arrays restore fine.
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
  v_override jsonb;
  v_favorite jsonb;
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

  for v_override in select * from jsonb_array_elements(coalesce(p_payload->'formationOverrides', '[]'::jsonb))
  loop
    insert into app.formation_overrides
      (franchise_id, book_id, formation_id, slot_id, layer, player_id)
    values (
      v_franchise_id,
      btrim(v_override->>'bookId'),
      btrim(v_override->>'formationId'),
      btrim(v_override->>'slotId'),
      coalesce(v_override->>'layer', 'baseline'),
      (v_map ->> (v_override->>'playerId'))::uuid
    );
  end loop;

  for v_favorite in select * from jsonb_array_elements(coalesce(p_payload->'formationFavorites', '[]'::jsonb))
  loop
    insert into app.formation_favorites (franchise_id, book_id, formation_id)
    values (
      v_franchise_id,
      btrim(v_favorite->>'bookId'),
      btrim(v_favorite->>'formationId')
    ) on conflict do nothing;
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

revoke all on function app.formation_slot_player(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.set_formation_override(uuid, text, text, text, uuid, integer, uuid) from public, anon;
revoke all on function public.confirm_checklist_units(uuid, jsonb, integer, uuid) from public, anon;
revoke all on function public.cancel_checklist_units(uuid, jsonb, integer, uuid) from public, anon;
revoke all on function public.undo_action_batch(uuid, uuid, integer, uuid) from public, anon;
revoke all on function public.restore_new_franchise(jsonb, uuid) from public, anon;

grant execute on function public.set_formation_override(uuid, text, text, text, uuid, integer, uuid) to authenticated, service_role;
grant execute on function public.confirm_checklist_units(uuid, jsonb, integer, uuid) to authenticated, service_role;
grant execute on function public.cancel_checklist_units(uuid, jsonb, integer, uuid) to authenticated, service_role;
grant execute on function public.undo_action_batch(uuid, uuid, integer, uuid) to authenticated, service_role;
grant execute on function public.restore_new_franchise(jsonb, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Read model for the formation UI: the stored layers for one franchise.
-- ---------------------------------------------------------------------------
create view public.formation_overrides_view
with (security_invoker = on) as
select
  o.franchise_id,
  o.book_id,
  o.formation_id,
  o.slot_id,
  o.layer,
  o.player_id,
  o.updated_at
from app.formation_overrides o;

create view public.formation_favorites_view
with (security_invoker = on) as
select
  fv.franchise_id,
  fv.book_id,
  fv.formation_id,
  fv.created_at
from app.formation_favorites fv;

grant select on public.formation_overrides_view to authenticated;
grant select on public.formation_favorites_view to authenticated;
revoke all on public.formation_overrides_view from anon;
revoke all on public.formation_favorites_view from anon;
