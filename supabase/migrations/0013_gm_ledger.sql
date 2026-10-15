-- 0013_gm_ledger.sql
-- C4A: manually maintained cap/contract summary, explicit known draft-pick assets,
-- owner-entered roster/pick proposals, and separately attested completion.
-- No generated deals, acceptance prediction, cap calculations, or annual rollover.
-- Owner applies to the live project as a separately reviewed migration; never at build/startup.

-- C4A proposals must be able to move a player into/out of the application roster.
create or replace function public.set_player_roster_status(
  p_franchise_player_id uuid, p_status text, p_expected_revision integer, p_request_id uuid
) returns app.franchise_players language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_player app.franchise_players; v_franchise_id uuid;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then return jsonb_populate_record(null::app.franchise_players, v_prior); end if;
  if p_status not in ('active', 'practice_squad') then raise exception 'validation_failed: status must be active or practice_squad' using errcode = 'P0006'; end if;
  select p.franchise_id into v_franchise_id from app.franchise_players p join app.franchises f on f.id=p.franchise_id
   where p.id=p_franchise_player_id and f.owner_uid=v_uid and p.roster_status in ('active','practice_squad');
  if v_franchise_id is null then raise exception 'cross_franchise_reference' using errcode = 'P0004'; end if;
  if exists(select 1 from app.transaction_asset_claims where franchise_id=v_franchise_id and asset_kind='player' and asset_id=p_franchise_player_id) then
    raise exception 'dependency_blocked: player is reserved by an open transaction proposal' using errcode = 'P0008';
  end if;
  perform public.touch_franchise(v_franchise_id,p_expected_revision);
  update app.franchise_players set roster_status=p_status,updated_at=now() where id=p_franchise_player_id returning * into v_player;
  perform app.record_outcome(v_uid,p_request_id,'set_player_roster_status',to_jsonb(v_player));
  return v_player;
end $$;

revoke all on function public.set_player_roster_status(uuid,text,integer,uuid) from public,anon;
grant execute on function public.set_player_roster_status(uuid,text,integer,uuid) to authenticated,service_role;

-- Reinstall the latest formation-aware confirmation routine after the expanded roster
-- states are present. Older implementations used app.assert_chart_players as an
-- availability check, which masked the ordered promotion prerequisite branch.
create or replace function app.assert_chart_players(p_franchise_id uuid, p_player_ids uuid[]) returns void
language plpgsql security definer set search_path = app, pg_catalog as $$
declare v_len integer := coalesce(array_length(p_player_ids,1),0); v_count integer; v_distinct integer;
begin
  if v_len > 12 then raise exception 'validation_failed: at most 12 entries per position list' using errcode = 'P0006'; end if;
  if exists(select 1 from unnest(p_player_ids) as x where x is null) then raise exception 'validation_failed: a player id is missing' using errcode = 'P0006'; end if;
  select count(distinct x) into v_distinct from unnest(p_player_ids) as x;
  if coalesce(v_distinct,0)<>v_len then raise exception 'validation_failed: the same player cannot appear twice in one position list' using errcode = 'P0006'; end if;
  if v_len>0 then
    -- This is an identity check, not availability policy: practice-squad references
    -- must reach the ordered prerequisite check in confirm_checklist_units.
    select count(*) into v_count from app.franchise_players p
     where p.franchise_id=p_franchise_id and p.id=any(p_player_ids);
    if v_count<>v_len then raise exception 'cross_franchise_reference' using errcode = 'P0004'; end if;
  end if;
end $$;
revoke all on function app.assert_chart_players(uuid,uuid[]) from public,anon,authenticated;

-- Extend the existing checklist command (including its formation handling and bounded undo)
-- so proposed incoming assets cannot masquerade as active or satisfy dependencies.

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
        raise exception 'dependency_blocked: a planned player is pending incoming, inactive, or remains on the practice squad; complete the transaction or repair the placement first' using errcode = 'P0008';
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
        raise exception 'dependency_blocked: the override target is pending incoming, inactive, or remains on the practice squad; complete the transaction or repair the placement first' using errcode = 'P0008';
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


-- A franchise can explicitly mark a player inactive after a completed transaction.
-- Keep the player row and chart references so affected lineup/formation plans remain
-- visible for repair instead of disappearing through a cascading delete.
alter table app.franchise_players
  drop constraint franchise_players_roster_status_check;
alter table app.franchise_players
  add constraint franchise_players_roster_status_check
  check (roster_status in ('active', 'practice_squad', 'pending_incoming', 'traded', 'released'));
comment on column app.franchise_players.roster_status is
  'C2A roster status plus C4A pending_incoming/traded/released transaction states. Inactive references are retained and surfaced for explicit lineup repair.';

create table app.franchise_contract_settings (
  franchise_id uuid primary key references app.franchises(id) on delete cascade,
  team_cap numeric(12,2) check (team_cap is null or team_cap >= 0),
  available_cap numeric(12,2) check (available_cap is null or available_cap >= 0),
  expiry_threshold_years integer check (expiry_threshold_years is null or expiry_threshold_years between 0 and 20),
  updated_at timestamptz not null default now()
);
alter table app.franchise_contract_settings enable row level security;
create policy franchise_contract_settings_owner on app.franchise_contract_settings
  for all to authenticated
  using (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()))
  with check (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid())
    and app.is_allowlisted_owner());
grant select, insert, update, delete on app.franchise_contract_settings to authenticated;

create view public.franchise_contract_settings_view with (security_invoker = on) as
select franchise_id, team_cap, available_cap, expiry_threshold_years, updated_at
from app.franchise_contract_settings;
grant select on public.franchise_contract_settings_view to authenticated;
revoke all on public.franchise_contract_settings_view from anon;

create table app.franchise_draft_picks (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  draft_year integer not null check (draft_year between 2000 and 2200),
  draft_round integer not null check (draft_round between 1 and 7),
  original_team text not null check (char_length(btrim(original_team)) between 1 and 80),
  current_owner text not null check (char_length(btrim(current_owner)) between 1 and 80),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franchise_id, draft_year, draft_round, original_team)
);
create index franchise_draft_picks_owner_idx on app.franchise_draft_picks(franchise_id, current_owner, draft_year, draft_round);
alter table app.franchise_draft_picks enable row level security;
create policy franchise_draft_picks_owner on app.franchise_draft_picks
  for all to authenticated
  using (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()))
  with check (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid())
    and app.is_allowlisted_owner());
grant select, insert, update, delete on app.franchise_draft_picks to authenticated;

create table app.transaction_proposals (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  kind text not null check (kind in ('trade', 'sign', 'cut', 'promotion')),
  counterparty text not null check (char_length(btrim(counterparty)) between 1 and 80),
  note text check (note is null or char_length(note) <= 1000),
  status text not null default 'proposed' check (status in ('proposed', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index transaction_proposals_franchise_idx on app.transaction_proposals(franchise_id, created_at desc);
alter table app.transaction_proposals enable row level security;
create policy transaction_proposals_owner on app.transaction_proposals
  for all to authenticated
  using (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()))
  with check (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid())
    and app.is_allowlisted_owner());
grant select on app.transaction_proposals to authenticated;

create table app.transaction_player_moves (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references app.transaction_proposals(id) on delete cascade,
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing', 'promotion')),
  player_id uuid references app.franchise_players(id) on delete restrict,
  source_player_record_id uuid references app.source_player_records(id) on delete restrict,
  check (
    (direction = 'incoming' and player_id is not null and source_player_record_id is not null)
    or (direction = 'outgoing' and player_id is not null and source_player_record_id is null)
    or (direction = 'promotion' and player_id is not null and source_player_record_id is null)
  )
);

-- Partial unique indexes enforce logical movement identity whether the row
-- references a local player or an incoming source record.
create unique index transaction_player_moves_local_unique
  on app.transaction_player_moves(proposal_id, direction, player_id) where player_id is not null;
create unique index transaction_player_moves_source_unique
  on app.transaction_player_moves(proposal_id, direction, source_player_record_id) where source_player_record_id is not null;
create index transaction_player_moves_franchise_idx on app.transaction_player_moves(franchise_id, player_id);
alter table app.transaction_player_moves enable row level security;
create policy transaction_player_moves_owner on app.transaction_player_moves
  for all to authenticated
  using (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()))
  with check (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid())
    and app.is_allowlisted_owner());
grant select on app.transaction_player_moves to authenticated;

create table app.transaction_pick_moves (
  proposal_id uuid not null references app.transaction_proposals(id) on delete cascade,
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  direction text not null check (direction in ('incoming', 'outgoing')),
  pick_asset_id uuid not null references app.franchise_draft_picks(id) on delete restrict,
  primary key (proposal_id, pick_asset_id)
);
alter table app.transaction_pick_moves enable row level security;
create policy transaction_pick_moves_owner on app.transaction_pick_moves
  for all to authenticated
  using (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()))
  with check (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid())
    and app.is_allowlisted_owner());
grant select on app.transaction_pick_moves to authenticated;

-- Pending proposals reserve exact, typed assets across all open deals in this
-- franchise. Inbound catalog records are also reserved to prevent a duplicate
-- acquisition; reservations are released only on explicit cancel or completion.
create table app.transaction_asset_claims (
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('player', 'source_player', 'pick')),
  asset_id uuid not null,
  proposal_id uuid not null references app.transaction_proposals(id) on delete cascade,
  primary key (franchise_id, asset_kind, asset_id)
);
alter table app.transaction_asset_claims enable row level security;
create policy transaction_asset_claims_owner on app.transaction_asset_claims
  for all to authenticated
  using (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()))
  with check (exists (select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid())
    and app.is_allowlisted_owner());
grant select on app.transaction_asset_claims to authenticated;

create view public.franchise_draft_picks_view with (security_invoker = on) as
select p.id, p.franchise_id, p.draft_year, p.draft_round, p.original_team, p.current_owner, p.note,
       exists (select 1 from app.transaction_asset_claims c where c.franchise_id = p.franchise_id and c.asset_kind = 'pick' and c.asset_id = p.id) as reserved
from app.franchise_draft_picks p;
grant select on public.franchise_draft_picks_view to authenticated;
revoke all on public.franchise_draft_picks_view from anon;

create view public.transaction_proposals_view with (security_invoker = on) as
select t.id, t.franchise_id, t.kind, t.counterparty, t.note, t.status, t.created_at, t.completed_at,
       coalesce((select jsonb_agg(jsonb_build_object('direction', m.direction, 'playerId', m.player_id,
         'sourceRecordId', m.source_player_record_id, 'playerName', coalesce(fp.full_name, sp.full_name))
         order by m.direction, coalesce(fp.full_name, sp.full_name))
         from app.transaction_player_moves m
         left join app.franchise_players fp on fp.id = m.player_id
         left join app.source_player_records sp on sp.id = m.source_player_record_id
         where m.proposal_id = t.id), '[]'::jsonb) as player_moves,
       coalesce((select jsonb_agg(jsonb_build_object('direction', pm.direction, 'pickId', p.id,
         'year', p.draft_year, 'round', p.draft_round, 'originalTeam', p.original_team)
         order by p.draft_year, p.draft_round, p.original_team)
         from app.transaction_pick_moves pm join app.franchise_draft_picks p on p.id = pm.pick_asset_id
         where pm.proposal_id = t.id), '[]'::jsonb) as pick_moves
from app.transaction_proposals t;
grant select on public.transaction_proposals_view to authenticated;
revoke all on public.transaction_proposals_view from anon;

-- Inactive/pending roster transitions are owned by the transaction RPCs, never a
-- direct table write or generic checklist correction. The cancellation/completion
-- token is transaction-local and the trigger re-validates its proposal relationship.
create or replace function app.guard_transaction_roster_status() returns trigger
language plpgsql security definer set search_path = app, pg_catalog as $$
declare v_proposal_id uuid; v_allowed boolean := false;
begin
  if new.roster_status = old.roster_status then return new; end if;
  if old.roster_status in ('pending_incoming','traded','released') or new.roster_status in ('pending_incoming','traded','released') then
    begin v_proposal_id := nullif(current_setting('app.c4a_proposal_id', true),'')::uuid; exception when others then v_proposal_id := null; end;
    if v_proposal_id is not null then
      select exists(
        select 1 from app.transaction_proposals t
        join app.transaction_player_moves m on m.proposal_id=t.id
        where t.id=v_proposal_id and t.franchise_id=old.franchise_id and t.status='proposed'
          and m.franchise_id=old.franchise_id and m.player_id=old.id
          and ((old.roster_status='pending_incoming' and new.roster_status in ('active','released') and m.direction='incoming')
            or (old.roster_status in ('active','practice_squad') and new.roster_status='traded' and m.direction='outgoing')
            or (old.roster_status in ('active','practice_squad') and new.roster_status='released' and m.direction='outgoing' and t.kind='cut'))
      ) into v_allowed;
    end if;
    if not v_allowed then raise exception 'dependency_blocked: only the matching open transaction can change this roster status' using errcode='P0008'; end if;
  end if;
  return new;
end $$;
create trigger guard_transaction_roster_status before update of roster_status on app.franchise_players
for each row execute function app.guard_transaction_roster_status();
revoke all on function app.guard_transaction_roster_status() from public,anon,authenticated;

create or replace function public.set_franchise_contract_settings(
  p_franchise_id uuid, p_team_cap numeric, p_available_cap numeric, p_expiry_threshold_years integer,
  p_expected_revision integer, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_revision integer;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then return v_prior; end if;
  if not exists(select 1 from app.franchises f where f.id=p_franchise_id and f.owner_uid=v_uid) then raise exception 'cross_franchise_reference' using errcode='P0004'; end if;
  if (p_team_cap is not null and p_team_cap < 0) or (p_available_cap is not null and p_available_cap < 0) or p_expiry_threshold_years is null or p_expiry_threshold_years < 0 or p_expiry_threshold_years > 20 then
    raise exception 'validation_failed: cap values must be non-negative and threshold must be 0 to 20 years' using errcode = 'P0006';
  end if;
  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  insert into app.franchise_contract_settings(franchise_id, team_cap, available_cap, expiry_threshold_years, updated_at)
  values (p_franchise_id, p_team_cap, p_available_cap, p_expiry_threshold_years, now())
  on conflict (franchise_id) do update set team_cap = excluded.team_cap, available_cap = excluded.available_cap,
    expiry_threshold_years = excluded.expiry_threshold_years, updated_at = now();
  v_prior := jsonb_build_object('revision', v_revision);
  perform app.record_outcome(v_uid, p_request_id, 'set_franchise_contract_settings', v_prior);
  return v_prior;
end $$;

create or replace function public.add_franchise_draft_pick(
  p_franchise_id uuid, p_draft_year integer, p_draft_round integer, p_original_team text,
  p_current_owner text, p_note text, p_expected_revision integer, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_revision integer; v_id uuid;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then return v_prior; end if;
  if not exists(select 1 from app.franchises f where f.id=p_franchise_id and f.owner_uid=v_uid) then raise exception 'cross_franchise_reference' using errcode='P0004'; end if;
  if p_draft_year not between 2000 and 2200 or p_draft_round not between 1 and 7
     or coalesce(btrim(p_original_team), '') = '' or coalesce(btrim(p_current_owner), '') = ''
     or char_length(coalesce(p_note, '')) > 500 then
    raise exception 'validation_failed: enter a year, round, original team, current owner, and a note under 500 characters' using errcode = 'P0006';
  end if;
  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  insert into app.franchise_draft_picks(franchise_id, draft_year, draft_round, original_team, current_owner, note)
  values (p_franchise_id, p_draft_year, p_draft_round, btrim(p_original_team), btrim(p_current_owner), nullif(btrim(p_note), ''))
  returning id into v_id;
  v_prior := jsonb_build_object('id', v_id, 'revision', v_revision);
  perform app.record_outcome(v_uid, p_request_id, 'add_franchise_draft_pick', v_prior);
  return v_prior;
end $$;

create or replace function public.save_transaction_proposal(
  p_franchise_id uuid, p_kind text, p_counterparty text, p_note text,
  p_player_moves jsonb, p_pick_moves jsonb, p_expected_revision integer, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_franchise app.franchises; v_revision integer;
  v_id uuid;  v_move jsonb; v_pick jsonb; v_player_id uuid; v_source_id uuid; v_pick_id uuid;
  v_direction text; v_incoming integer := 0; v_outgoing integer := 0; v_promotions integer := 0;
  v_seen_players uuid[] := '{}'::uuid[]; v_seen_picks uuid[] := '{}'::uuid[]; v_asset_id uuid;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then return v_prior; end if;
  select * into v_franchise from app.franchises where id = p_franchise_id and owner_uid = v_uid;
  if v_franchise.id is null then raise exception 'cross_franchise_reference' using errcode = 'P0004'; end if;
  if p_kind not in ('trade', 'sign', 'cut', 'promotion') or coalesce(btrim(p_counterparty), '') = ''
     or (p_note is not null and char_length(p_note) > 1000)
     or jsonb_typeof(coalesce(p_player_moves, '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_pick_moves, '[]'::jsonb)) <> 'array' then
    raise exception 'validation_failed: proposal fields are incomplete or malformed' using errcode = 'P0006';
  end if;
  if p_kind = 'trade' and lower(btrim(p_counterparty)) = lower(btrim(v_franchise.name)) then
    raise exception 'validation_failed: a trade counterparty must be another team' using errcode = 'P0006';
  end if;
  if p_kind = 'promotion' and (jsonb_array_length(coalesce(p_player_moves, '[]'::jsonb)) <> 1 or jsonb_array_length(coalesce(p_pick_moves, '[]'::jsonb)) <> 0) then
    raise exception 'validation_failed: a promotion selects exactly one practice-squad player' using errcode = 'P0006';
  end if;
  if p_kind <> 'promotion' and jsonb_array_length(coalesce(p_player_moves, '[]'::jsonb)) + jsonb_array_length(coalesce(p_pick_moves, '[]'::jsonb)) = 0 then
    raise exception 'validation_failed: select at least one player or pick' using errcode = 'P0006';
  end if;

  for v_move in select value from jsonb_array_elements(coalesce(p_player_moves, '[]'::jsonb)) as t(value) loop
    v_direction := v_move->>'direction';
    v_player_id := nullif(v_move->>'playerId', '')::uuid;
    v_source_id := nullif(v_move->>'sourceRecordId', '')::uuid;
    v_asset_id := coalesce(v_player_id,v_source_id);
    if v_asset_id is not null and v_asset_id = any(v_seen_players) then raise exception 'validation_failed: duplicate player selection' using errcode='P0006'; end if;
    if v_asset_id is not null then v_seen_players := v_seen_players || v_asset_id; end if;
    if p_kind = 'promotion' then
      if v_direction <> 'promotion' or v_player_id is null or v_source_id is not null then raise exception 'validation_failed: invalid promotion selection' using errcode = 'P0006'; end if;
      if not exists (select 1 from app.franchise_players where id = v_player_id and franchise_id = p_franchise_id and roster_status = 'practice_squad') then raise exception 'validation_failed: only a practice-squad player can be promoted' using errcode = 'P0006'; end if;
      if exists(select 1 from app.transaction_asset_claims where franchise_id=p_franchise_id and asset_kind='player' and asset_id=v_player_id) then raise exception 'dependency_blocked: player is reserved by an open transaction proposal' using errcode = 'P0008'; end if;
      v_promotions := v_promotions + 1;
    elsif v_direction = 'outgoing' and v_player_id is not null and v_source_id is null then
      if not exists (select 1 from app.franchise_players where id = v_player_id and franchise_id = p_franchise_id and roster_status in ('active', 'practice_squad')) then raise exception 'cross_franchise_reference: outgoing player is not an available roster asset' using errcode = 'P0004'; end if;
      if exists(select 1 from app.transaction_asset_claims where franchise_id=p_franchise_id and asset_kind='player' and asset_id=v_player_id) then raise exception 'dependency_blocked: player is reserved by an open transaction proposal' using errcode = 'P0008'; end if;
      v_outgoing := v_outgoing + 1;
    elsif v_direction = 'incoming' and v_player_id is null and v_source_id is not null then
      if p_kind in ('cut', 'promotion') or not exists (select 1 from app.source_player_records where id = v_source_id) then raise exception 'source_revision_unavailable' using errcode = 'P0005'; end if;
      if p_kind = 'sign' and exists (select 1 from app.source_player_records where id = v_source_id and team is not null) then raise exception 'validation_failed: a signing must select an unsigned catalog player' using errcode = 'P0006'; end if;
      if exists(select 1 from app.transaction_asset_claims where franchise_id=p_franchise_id and asset_kind='source_player' and asset_id=v_source_id) then raise exception 'dependency_blocked: incoming player is reserved by an open transaction proposal' using errcode = 'P0008'; end if;
      if exists (
        select 1 from app.franchise_players held
        join app.source_player_records existing on existing.id=held.source_player_record_id
        join app.source_player_records selected on selected.id=v_source_id
        where held.franchise_id=p_franchise_id and existing.source_id=selected.source_id
          and held.roster_status in ('active','practice_squad','pending_incoming')
          and not (held.roster_status in ('traded','released') and existing.id=selected.id)
      ) then raise exception 'validation_failed: this source player is already attached to the franchise; use the existing roster player instead' using errcode='P0006'; end if;
      v_incoming := v_incoming + 1;
    else
      raise exception 'validation_failed: each player must be one local outgoing player or one catalog incoming player' using errcode = 'P0006';
    end if;
  end loop;

  for v_pick in select * from jsonb_array_elements(coalesce(p_pick_moves, '[]'::jsonb)) loop
    v_direction := v_pick->>'direction'; v_pick_id := nullif(v_pick->>'pickId', '')::uuid;
    if p_kind <> 'trade' or v_pick_id is null or v_direction not in ('incoming', 'outgoing') then raise exception 'validation_failed: picks can only be included in a trade' using errcode = 'P0006'; end if;
    if v_pick_id = any(v_seen_picks) then raise exception 'validation_failed: duplicate pick selection' using errcode='P0006'; end if;
    v_seen_picks := v_seen_picks || v_pick_id;
    if not exists (select 1 from app.franchise_draft_picks where id = v_pick_id and franchise_id = p_franchise_id) then raise exception 'cross_franchise_reference: pick is not in this franchise ledger' using errcode = 'P0004'; end if;
    if v_direction = 'outgoing' and not exists (select 1 from app.franchise_draft_picks where id = v_pick_id and franchise_id = p_franchise_id and lower(current_owner) = lower(v_franchise.name)) then raise exception 'validation_failed: only a pick recorded as owned by this franchise can be traded out' using errcode = 'P0006'; end if;
    if exists(select 1 from app.transaction_asset_claims where franchise_id=p_franchise_id and asset_kind='pick' and asset_id=v_pick_id) then raise exception 'dependency_blocked: pick is reserved by an open transaction proposal' using errcode = 'P0008'; end if;
    if v_direction = 'incoming' and exists (select 1 from app.franchise_draft_picks where id = v_pick_id and lower(current_owner) = lower(v_franchise.name)) then raise exception 'validation_failed: an already-owned pick cannot be traded in' using errcode = 'P0006'; end if;
    if v_direction = 'incoming' then v_incoming := v_incoming + 1; else v_outgoing := v_outgoing + 1; end if;
  end loop;

  if (p_kind = 'trade' and (v_incoming = 0 or v_outgoing = 0))
     or (p_kind = 'sign' and (v_incoming = 0 or v_outgoing > 0 or jsonb_array_length(coalesce(p_pick_moves, '[]'::jsonb)) > 0))
     or (p_kind = 'cut' and (v_outgoing = 0 or v_incoming > 0 or jsonb_array_length(coalesce(p_pick_moves, '[]'::jsonb)) > 0))
     or (p_kind = 'promotion' and v_promotions <> 1) then
    raise exception 'validation_failed: trade needs assets on both sides; signing and cutting require matching roster assets' using errcode = 'P0006';  end if;
  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  insert into app.transaction_proposals(franchise_id, kind, counterparty, note)
  values (p_franchise_id, p_kind, btrim(p_counterparty), nullif(btrim(p_note), '')) returning id into v_id;

  for v_move in select * from jsonb_array_elements(coalesce(p_player_moves, '[]'::jsonb)) loop
    v_direction := v_move->>'direction'; v_player_id := nullif(v_move->>'playerId', '')::uuid; v_source_id := nullif(v_move->>'sourceRecordId', '')::uuid;
    if v_direction = 'incoming' then
      select id into v_player_id from app.franchise_players where franchise_id = p_franchise_id and source_player_record_id = v_source_id;
      if v_player_id is null then
        insert into app.franchise_players(franchise_id, origin, source_player_record_id, full_name, roster_status)
        select p_franchise_id, 'source', id, full_name, 'pending_incoming' from app.source_player_records where id = v_source_id returning id into v_player_id;
      else
        update app.franchise_players set roster_status = 'pending_incoming', updated_at = now()
         where id = v_player_id and roster_status in ('released', 'traded');
        if not found and not exists(select 1 from app.franchise_players where id = v_player_id and roster_status = 'pending_incoming') then
          raise exception 'validation_failed: this player is already attached to the roster' using errcode = 'P0006';
        end if;
      end if;
      insert into app.transaction_player_moves(proposal_id, franchise_id, direction, player_id, source_player_record_id)
      values(v_id, p_franchise_id, v_direction, v_player_id, v_source_id);
      insert into app.transaction_asset_claims values(p_franchise_id, 'source_player', v_source_id, v_id);
      insert into app.transaction_asset_claims values(p_franchise_id, 'player', v_player_id, v_id);
    else
      insert into app.transaction_player_moves(proposal_id, franchise_id, direction, player_id)
      values(v_id, p_franchise_id, v_direction, v_player_id);
      insert into app.transaction_asset_claims values(p_franchise_id, 'player', v_player_id, v_id);
    end if;
  end loop;
  for v_pick in select * from jsonb_array_elements(coalesce(p_pick_moves, '[]'::jsonb)) loop
    v_pick_id := (v_pick->>'pickId')::uuid; v_direction := v_pick->>'direction';
    insert into app.transaction_pick_moves values(v_id, p_franchise_id, v_direction, v_pick_id);
    insert into app.transaction_asset_claims values(p_franchise_id, 'pick', v_pick_id, v_id);
  end loop;
  v_prior := jsonb_build_object('id', v_id, 'revision', v_revision, 'status', 'proposed');
  perform app.record_outcome(v_uid, p_request_id, 'save_transaction_proposal', v_prior);
  return v_prior;
end $$;

create or replace function public.finish_transaction_proposal(
  p_franchise_id uuid, p_proposal_id uuid, p_expected_revision integer, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_proposal app.transaction_proposals; v_franchise app.franchises;
  v_revision integer; v_move app.transaction_player_moves; v_pick app.transaction_pick_moves;
  v_active_chart_players uuid[];
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then return v_prior; end if;
  select * into v_proposal from app.transaction_proposals where id = p_proposal_id and franchise_id = p_franchise_id for update;
  if v_proposal.id is null then raise exception 'cross_franchise_reference' using errcode = 'P0004'; end if;
  if v_proposal.status <> 'proposed' then raise exception 'validation_failed: only a proposed deal can be confirmed' using errcode = 'P0006'; end if;
  select * into v_franchise from app.franchises where id = p_franchise_id and owner_uid = v_uid;
  if v_franchise.id is null then raise exception 'cross_franchise_reference' using errcode = 'P0004'; end if;
  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  select coalesce(array_agg(e.franchise_player_id), '{}'::uuid[]) into v_active_chart_players
    from app.depth_chart_entries e where e.franchise_id = p_franchise_id and e.layer = 'plan';
  if exists (
    select 1 from app.transaction_player_moves m
    where m.proposal_id = p_proposal_id and m.direction = 'outgoing'
      and m.player_id = any(v_active_chart_players)
  ) then
    raise exception 'dependency_blocked: outgoing players are still on a planned lineup; repair the affected charts before confirming this transaction' using errcode = 'P0008';
  end if;
  perform set_config('app.c4a_proposal_id', p_proposal_id::text, true);
  for v_move in select * from app.transaction_player_moves where proposal_id = p_proposal_id loop
    if v_move.direction = 'incoming' then
      update app.franchise_players set roster_status = 'active', updated_at = now()
       where id = v_move.player_id and franchise_id = p_franchise_id and roster_status = 'pending_incoming';
      if not found then raise exception 'validation_failed: incoming player is no longer awaiting this deal' using errcode = 'P0006'; end if;
    elsif v_move.direction = 'promotion' then
      update app.franchise_players set roster_status = 'active', updated_at = now()
       where id = v_move.player_id and franchise_id = p_franchise_id and roster_status = 'practice_squad';
      if not found then raise exception 'validation_failed: player is no longer on the practice squad' using errcode = 'P0006'; end if;
    else
      update app.franchise_players set roster_status = case when v_proposal.kind = 'cut' then 'released' else 'traded' end, updated_at = now()
       where id = v_move.player_id and franchise_id = p_franchise_id and roster_status in ('active', 'practice_squad');
      if not found then raise exception 'validation_failed: outgoing player is no longer available' using errcode = 'P0006'; end if;
    end if;
  end loop;
  for v_pick in select * from app.transaction_pick_moves where proposal_id = p_proposal_id loop
    update app.franchise_draft_picks set current_owner = case when v_pick.direction = 'incoming' then v_franchise.name else v_proposal.counterparty end, updated_at = now()
     where id = v_pick.pick_asset_id and franchise_id = p_franchise_id;
    if not found then raise exception 'validation_failed: pick is no longer in the ledger' using errcode = 'P0006'; end if;
  end loop;
  update app.transaction_proposals set status = 'completed', completed_at = now(), updated_at = now() where id = p_proposal_id;
  delete from app.transaction_asset_claims where proposal_id = p_proposal_id;
  v_prior := jsonb_build_object('id', p_proposal_id, 'revision', v_revision, 'status', 'completed');
  perform app.record_outcome(v_uid, p_request_id, 'finish_transaction_proposal', v_prior);
  return v_prior;
end $$;

create or replace function public.cancel_transaction_proposal(
  p_franchise_id uuid, p_proposal_id uuid, p_expected_revision integer, p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_proposal app.transaction_proposals; v_revision integer; v_move app.transaction_player_moves;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then return v_prior; end if;
  select * into v_proposal from app.transaction_proposals where id = p_proposal_id and franchise_id = p_franchise_id for update;
  if v_proposal.id is null then raise exception 'cross_franchise_reference' using errcode = 'P0004'; end if;
  if v_proposal.status <> 'proposed' then raise exception 'validation_failed: only a proposed deal can be cancelled' using errcode = 'P0006'; end if;
  v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  perform set_config('app.c4a_proposal_id', p_proposal_id::text, true);
  for v_move in select * from app.transaction_player_moves where proposal_id = p_proposal_id and direction = 'incoming' loop
    update app.franchise_players set roster_status = 'released', updated_at = now()
     where id = v_move.player_id and franchise_id = p_franchise_id and roster_status = 'pending_incoming';
  end loop;
  update app.transaction_proposals set status = 'cancelled', updated_at = now() where id = p_proposal_id;
  delete from app.transaction_asset_claims where proposal_id = p_proposal_id;
  v_prior := jsonb_build_object('id', p_proposal_id, 'revision', v_revision, 'status', 'cancelled');
  perform app.record_outcome(v_uid, p_request_id, 'cancel_transaction_proposal', v_prior);
  return v_prior;
end $$;

revoke all on function public.set_franchise_contract_settings(uuid,numeric,numeric,integer,integer,uuid) from public, anon;
revoke all on function public.add_franchise_draft_pick(uuid,integer,integer,text,text,text,integer,uuid) from public, anon;
revoke all on function public.save_transaction_proposal(uuid,text,text,text,jsonb,jsonb,integer,uuid) from public, anon;
revoke all on function public.finish_transaction_proposal(uuid,uuid,integer,uuid) from public, anon;
revoke all on function public.cancel_transaction_proposal(uuid,uuid,integer,uuid) from public, anon;
grant execute on function public.set_franchise_contract_settings(uuid,numeric,numeric,integer,integer,uuid) to authenticated;
grant execute on function public.add_franchise_draft_pick(uuid,integer,integer,text,text,text,integer,uuid) to authenticated;
grant execute on function public.save_transaction_proposal(uuid,text,text,text,jsonb,jsonb,integer,uuid) to authenticated;
grant execute on function public.finish_transaction_proposal(uuid,uuid,integer,uuid) to authenticated;
grant execute on function public.cancel_transaction_proposal(uuid,uuid,integer,uuid) to authenticated;

-- Restore extension, called in the same RPC transaction after the existing C1B–C3A
-- restore. It preserves both the old restore entry point and stable remapping of all
-- C4A entities. Derived ids make a retry idempotent without colliding with the inner
-- restore_new_franchise request outcome.
create or replace function public.restore_new_franchise_c4a(p_payload jsonb, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = app, public, pg_catalog as $$
declare
  v_uid uuid := app.require_owner(); v_prior jsonb; v_franchise_id uuid; v_c4a_request uuid;
  v_state jsonb := coalesce(p_payload->'franchise'->'gmState', '{}'::jsonb);
  v_item jsonb;  v_player jsonb; v_pick jsonb; v_proposal jsonb; v_move jsonb;
  v_pick_map jsonb := '{}'::jsonb; v_player_map jsonb := '{}'::jsonb;
  v_proposal_id uuid; v_pick_id uuid; v_player_id uuid; v_source_id uuid; v_original_id text;
  v_move_player_id uuid;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    v_franchise_id := coalesce(v_prior->>'franchiseId', v_prior #>> '{}')::uuid;
    v_c4a_request := md5(p_request_id::text || ':c4a-restore')::uuid;
    perform app.record_outcome(v_uid,v_c4a_request,'restore_new_franchise_c4a',jsonb_build_object('franchiseId',v_franchise_id));
    return v_franchise_id;
  else
    v_franchise_id := public.restore_new_franchise(p_payload->'franchise', p_request_id);
  end if;
  v_c4a_request := md5(p_request_id::text || ':c4a-restore')::uuid;
  v_prior := app.replay_outcome(v_uid, v_c4a_request);
  if v_prior is not null then return v_franchise_id; end if;

  -- Build old-player-id → restored-player-id mapping by stable custom/source identity.
  for v_player in select * from jsonb_array_elements(coalesce(p_payload->'franchise'->'players','[]'::jsonb)) loop
    v_original_id := v_player->>'mutableId';
    if v_player->>'origin' = 'custom' then
      select id into v_player_id from app.franchise_players
       where franchise_id = v_franchise_id and custom_key = v_player->>'customKey';
    else
      select fp.id into v_player_id from app.franchise_players fp
       join app.source_player_records sr on sr.id = fp.source_player_record_id
       join app.source_revisions r on r.id = sr.revision_id
       where fp.franchise_id = v_franchise_id and sr.source_id = v_player->'sourceReference'->>'sourceId'
         and r.revision_key = v_player->'sourceReference'->>'revisionKey';
    end if;
    if v_player_id is not null then v_player_map := v_player_map || jsonb_build_object(v_original_id,v_player_id::text); end if;
  end loop;

  if jsonb_typeof(coalesce(v_state->'settings', 'null'::jsonb)) = 'object' then
    insert into app.franchise_contract_settings(franchise_id, team_cap, available_cap, expiry_threshold_years)
    values(v_franchise_id, nullif(v_state->'settings'->>'teamCap','')::numeric,
      nullif(v_state->'settings'->>'availableCap','')::numeric,
      nullif(v_state->'settings'->>'expiryThresholdYears','')::integer);
  end if;

  for v_pick in select * from jsonb_array_elements(coalesce(v_state->'picks','[]'::jsonb)) loop
    insert into app.franchise_draft_picks(franchise_id,draft_year,draft_round,original_team,current_owner,note)
    values(v_franchise_id,(v_pick->>'year')::integer,(v_pick->>'round')::integer,
      v_pick->>'originalTeam',v_pick->>'currentOwner',nullif(v_pick->>'note','')) returning id into v_pick_id;
    v_pick_map := v_pick_map || jsonb_build_object(v_pick->>'mutableId',v_pick_id::text);
  end loop;

  for v_proposal in select * from jsonb_array_elements(coalesce(v_state->'proposals','[]'::jsonb)) loop
    v_proposal_id := gen_random_uuid();
    insert into app.transaction_proposals(id,franchise_id,kind,counterparty,note,status,created_at,completed_at)
    values(v_proposal_id,v_franchise_id,v_proposal->>'kind',v_proposal->>'counterparty',
      nullif(v_proposal->>'note',''),v_proposal->>'status',coalesce((v_proposal->>'createdAt')::timestamptz,now()),
      nullif(v_proposal->>'completedAt','')::timestamptz);
    for v_move in select * from jsonb_array_elements(coalesce(v_proposal->'playerMoves','[]'::jsonb)) loop
      v_original_id := v_move->>'mutablePlayerId';
      v_player_id := nullif(v_player_map->>v_original_id,'')::uuid;
      v_move_player_id := v_player_id;
      v_source_id := null;
      if v_move->>'direction' = 'incoming' and v_move_player_id is not null then
        select source_player_record_id into v_source_id from app.franchise_players where id=v_move_player_id and franchise_id=v_franchise_id;
      elsif v_move->>'direction' = 'incoming' then
        v_source_id := nullif(v_move->>'sourceRecordId','')::uuid;
        if v_source_id is null and jsonb_typeof(v_move->'sourceReference') = 'object' then
          select sr.id into v_source_id from app.source_player_records sr
          join app.source_revisions r on r.id=sr.revision_id
          where sr.source_id=v_move->'sourceReference'->>'sourceId'
            and r.revision_key=v_move->'sourceReference'->>'revisionKey';
        end if;
        if v_source_id is null then raise exception 'source_revision_unavailable' using errcode='P0005'; end if;
        if v_source_id is not null and v_move_player_id is null then
          insert into app.franchise_players(franchise_id,origin,source_player_record_id,full_name,roster_status)
          select v_franchise_id,'source',sr.id,sr.full_name,'pending_incoming'
          from app.source_player_records sr where sr.id=v_source_id
          on conflict(franchise_id,source_player_record_id) do update
            set roster_status=case when app.franchise_players.roster_status in ('traded','released') then 'pending_incoming' else app.franchise_players.roster_status end
          returning id into v_move_player_id;
          if v_move_player_id is null then raise exception 'source_revision_unavailable' using errcode='P0005'; end if;
        end if;
      elsif v_move->>'direction' in ('outgoing','promotion') and v_move_player_id is null then
        raise exception 'backup_invalid: proposal player is missing from restored roster' using errcode='P0007';
      end if;
      if v_move_player_id is not null or v_source_id is not null then
        insert into app.transaction_player_moves(proposal_id,franchise_id,direction,player_id,source_player_record_id)
        values(v_proposal_id,v_franchise_id,v_move->>'direction',v_move_player_id,v_source_id);
        if v_proposal->>'status'='proposed' then
          if v_move_player_id is not null then insert into app.transaction_asset_claims values(v_franchise_id,'player',v_move_player_id,v_proposal_id); end if;
          if v_source_id is not null then insert into app.transaction_asset_claims values(v_franchise_id,'source_player',v_source_id,v_proposal_id); end if;
        end if;
      end if;
    end loop;
    for v_move in select * from jsonb_array_elements(coalesce(v_proposal->'pickMoves','[]'::jsonb)) loop
      v_pick_id := nullif(v_pick_map->>(v_move->>'mutablePickId'),'')::uuid;
      if v_pick_id is null then raise exception 'backup_invalid: proposal pick is missing from restored ledger' using errcode='P0007'; end if;
      if v_pick_id is not null then
        insert into app.transaction_pick_moves values(v_proposal_id,v_franchise_id,v_move->>'direction',v_pick_id);
        if v_proposal->>'status'='proposed' then
          insert into app.transaction_asset_claims values(v_franchise_id,'pick',v_pick_id,v_proposal_id);
        end if;
      end if;
    end loop;
  end loop;
  perform app.record_outcome(v_uid,v_c4a_request,'restore_new_franchise_c4a',jsonb_build_object('franchiseId',v_franchise_id));
  return v_franchise_id;
end $$;
revoke all on function public.restore_new_franchise_c4a(jsonb,uuid) from public,anon;
grant execute on function public.restore_new_franchise_c4a(jsonb,uuid) to authenticated;
