-- 0003_franchise_players.sql
-- Franchise lifecycle, franchise players (source-backed and custom), grouped editable fields with
-- planned-vs-recorded intent, and retry-safe idempotent commands.
-- Traceability: C0B-v2 §2 (custom ID namespace, isolation), §3 (baseline/plan, unknown ≠ zero, app facts
-- vs game actions), §5 (revision, idempotent retries, declared retention constants), §9 (commands and
-- error outcomes such as cross_franchise_reference), §11 (archive/resume semantics).
-- Owner applies to the live project per D088/D119; never during a build.

-- ---------------------------------------------------------------------------
-- Franchise players: source-backed rows link a pinned source record; custom
-- players get an app-generated key in a distinct namespace.
-- ---------------------------------------------------------------------------
create table app.franchise_players (
  id                     uuid primary key default gen_random_uuid(),
  franchise_id           uuid not null references app.franchises (id) on delete cascade,
  origin                 text not null check (origin in ('source', 'custom')),
  source_player_record_id uuid references app.source_player_records (id) on delete restrict,
  custom_key             text,
  full_name              text not null check (char_length(btrim(full_name)) between 1 and 120),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint franchise_players_origin_shape check (
    (origin = 'source' and source_player_record_id is not null and custom_key is null)
    or (origin = 'custom' and custom_key is not null)
  ),
  constraint franchise_players_custom_key_namespace check (
    custom_key is null or custom_key like 'c\_%' escape '\'
  ),
  unique (franchise_id, source_player_record_id),
  unique (franchise_id, custom_key)
);

comment on table app.franchise_players is
  'Franchise-scoped players (C0B-v2 §2). Custom players carry an app-generated c_* key in a namespace distinct from revision-scoped source ids, and restore into new franchises with remapped mutable ids.';

create index franchise_players_franchise_idx on app.franchise_players (franchise_id);

create or replace function app.assign_custom_key() returns trigger
  language plpgsql
as $$
begin
  if new.origin = 'custom' and new.custom_key is null then
    new.custom_key := 'c_' || replace(gen_random_uuid()::text, '-', '');
  end if;
  return new;
end
$$;

create trigger franchise_players_assign_custom_key
  before insert on app.franchise_players
  for each row execute function app.assign_custom_key();

-- ---------------------------------------------------------------------------
-- Grouped editable fields. Unknown is the absence of a value, never zero; a
-- plan equal to the baseline is not a pending change and is not stored.
-- ---------------------------------------------------------------------------
create table app.franchise_player_fields (
  franchise_player_id uuid not null references app.franchise_players (id) on delete cascade,
  field_key           text not null check (field_key in (
                        'listed_position', 'jersey_number', 'team', 'archetype', 'overall',
                        'contract_years', 'contract_value', 'notes'
                      )),
  baseline_value      jsonb,
  plan_value          jsonb,
  field_class         text not null default 'app_fact' check (field_class in ('game_edit_action', 'app_fact')),
  updated_at          timestamptz not null default now(),
  primary key (franchise_player_id, field_key),
  constraint franchise_player_fields_pending check (baseline_value is distinct from plan_value)
);

comment on column app.franchise_player_fields.field_class is
  'Defaults to app_fact (unverified): an unverified field never yields a game instruction, and a missing value must never be read as zero (C0B-v2 §3).';

-- ---------------------------------------------------------------------------
-- Retry-safety ledger. One owner in this app, so the declared 200-record bound
-- (CB-3) is applied per owner; a replay returns the stored result unchanged.
-- ---------------------------------------------------------------------------
create table app.request_outcomes (
  owner_uid   uuid not null references app.owners (uid) on delete cascade,
  request_id  uuid not null,
  command     text not null,
  result      jsonb not null,
  created_at  timestamptz not null default now(),
  primary key (owner_uid, request_id)
);

comment on table app.request_outcomes is
  'Applied consequential-command outcomes for lost-response replays (C0B-v2 §5). Bounded to the most recent 200 per owner; once pruned a stale replay still fails safely on the revision check.';

-- ---------------------------------------------------------------------------
-- Row level security: everything is reachable only through the owner's own
-- franchises. request_outcomes is internal (no client policies at all).
-- ---------------------------------------------------------------------------
alter table app.franchise_players enable row level security;
alter table app.franchise_player_fields enable row level security;
alter table app.request_outcomes enable row level security;

create policy franchise_players_select_own on app.franchise_players
  for select to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.franchise_players.franchise_id and f.owner_uid = auth.uid()
  ));

create policy franchise_players_insert_own on app.franchise_players
  for insert to authenticated
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ) and app.is_allowlisted_owner());

create policy franchise_players_update_own on app.franchise_players
  for update to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.franchise_players.franchise_id and f.owner_uid = auth.uid()
  ))
  with check (exists (
    select 1 from app.franchises f where f.id = franchise_id and f.owner_uid = auth.uid()
  ));

create policy franchise_players_delete_own on app.franchise_players
  for delete to authenticated
  using (exists (
    select 1 from app.franchises f where f.id = app.franchise_players.franchise_id and f.owner_uid = auth.uid()
  ));

create policy franchise_player_fields_select_own on app.franchise_player_fields
  for select to authenticated
  using (exists (
    select 1
      from app.franchise_players p
      join app.franchises f on f.id = p.franchise_id
     where p.id = app.franchise_player_fields.franchise_player_id
       and f.owner_uid = auth.uid()
  ));

create policy franchise_player_fields_write_own on app.franchise_player_fields
  for all to authenticated
  using (exists (
    select 1
      from app.franchise_players p
      join app.franchises f on f.id = p.franchise_id
     where p.id = app.franchise_player_fields.franchise_player_id
       and f.owner_uid = auth.uid()
  ))
  with check (exists (
    select 1
      from app.franchise_players p
      join app.franchises f on f.id = p.franchise_id
     where p.id = franchise_player_id
       and f.owner_uid = auth.uid()
  ));

grant usage on schema app to authenticated, service_role;
grant select, insert, update, delete on app.franchise_players to authenticated;
grant select, insert, update, delete on app.franchise_player_fields to authenticated;
grant select, insert, update, delete on app.request_outcomes to service_role;
revoke all on app.request_outcomes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Shared helpers for the command layer.
-- ---------------------------------------------------------------------------
create or replace function app.require_owner() returns uuid
  language plpgsql
  stable
  security definer
  set search_path = app, pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not exists (select 1 from app.owners o where o.uid = v_uid) then
    raise exception 'unauthorized' using errcode = 'P0001';
  end if;
  return v_uid;
end
$$;

/** Returns the stored result of an already-applied request, or null to proceed. */
create or replace function app.replay_outcome(p_owner uuid, p_request_id uuid) returns jsonb
  language sql
  stable
  security definer
  set search_path = app, pg_catalog
as $$
  select result from app.request_outcomes
   where owner_uid = p_owner and request_id = p_request_id
$$;

create or replace function app.record_outcome(
  p_owner uuid,
  p_request_id uuid,
  p_command text,
  p_result jsonb
) returns void
  language plpgsql
  security definer
  set search_path = app, pg_catalog
as $$
declare
  v_max constant integer := 200; -- CB-3 declared retention constant (per owner in this single-owner app)
begin
  if p_request_id is null then
    return;
  end if;

  -- A command with no stored row (for example clearing a field to unknown) still
  -- records an applied outcome; the jsonb literal 'null' keeps the ledger column
  -- NOT NULL and makes the replay distinguishable from "never applied".
  insert into app.request_outcomes (owner_uid, request_id, command, result)
  values (p_owner, p_request_id, p_command, coalesce(p_result, 'null'::jsonb))
  on conflict (owner_uid, request_id) do nothing;

  delete from app.request_outcomes
   where owner_uid = p_owner
     and request_id in (
       select request_id from app.request_outcomes
        where owner_uid = p_owner
        order by created_at desc, request_id desc
        offset v_max
     );
end
$$;

-- ---------------------------------------------------------------------------
-- Commands. All are security definer, scope every write by auth.uid(), and
-- carry request ids so a lost-response retry never double-applies.
-- ---------------------------------------------------------------------------
create or replace function public.create_franchise(
  p_name text,
  p_request_id uuid
) returns app.franchises
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_franchise app.franchises;
  v_name text := coalesce(nullif(btrim(coalesce(p_name, '')), ''), 'Atlanta Falcons');
  v_is_default boolean;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return jsonb_populate_record(null::app.franchises, v_prior);
  end if;

  select not exists (
    select 1 from app.franchises f where f.owner_uid = v_uid and f.archived_at is null
  ) into v_is_default;

  insert into app.franchises (owner_uid, name, is_default)
  values (v_uid, v_name, v_is_default)
  returning * into v_franchise;

  perform app.record_outcome(v_uid, p_request_id, 'create_franchise', to_jsonb(v_franchise));
  return v_franchise;
end
$$;

create or replace function public.set_franchise_archived(
  p_franchise_id uuid,
  p_archived boolean,
  p_request_id uuid
) returns app.franchises
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_franchise app.franchises;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return jsonb_populate_record(null::app.franchises, v_prior);
  end if;

  update app.franchises f
     set archived_at = case when p_archived then now() else null end,
         updated_at = now()
   where f.id = p_franchise_id
     and f.owner_uid = v_uid
  returning * into v_franchise;

  if v_franchise.id is null then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform app.record_outcome(v_uid, p_request_id, 'set_franchise_archived', to_jsonb(v_franchise));
  return v_franchise;
end
$$;

create or replace function public.set_franchise_name(
  p_franchise_id uuid,
  p_name text,
  p_expected_revision integer,
  p_request_id uuid
) returns app.franchises
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_franchise app.franchises;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return jsonb_populate_record(null::app.franchises, v_prior);
  end if;

  perform public.touch_franchise(p_franchise_id, p_expected_revision);

  update app.franchises f
     set name = btrim(p_name), updated_at = now()
   where f.id = p_franchise_id
     and f.owner_uid = v_uid
  returning * into v_franchise;

  perform app.record_outcome(v_uid, p_request_id, 'set_franchise_name', to_jsonb(v_franchise));
  return v_franchise;
end
$$;

create or replace function public.add_custom_player(
  p_franchise_id uuid,
  p_full_name text,
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
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return jsonb_populate_record(null::app.franchise_players, v_prior);
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform public.touch_franchise(p_franchise_id, p_expected_revision);

  insert into app.franchise_players (franchise_id, origin, full_name)
  values (p_franchise_id, 'custom', btrim(p_full_name))
  returning * into v_player;

  perform app.record_outcome(v_uid, p_request_id, 'add_custom_player', to_jsonb(v_player));
  return v_player;
end
$$;

create or replace function public.attach_source_player(
  p_franchise_id uuid,
  p_source_player_record_id uuid,
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
  v_source app.source_player_records;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return jsonb_populate_record(null::app.franchise_players, v_prior);
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  select * into v_source from app.source_player_records r where r.id = p_source_player_record_id;
  if not found then
    raise exception 'source_revision_unavailable' using errcode = 'P0005';
  end if;

  perform public.touch_franchise(p_franchise_id, p_expected_revision);

  insert into app.franchise_players (franchise_id, origin, source_player_record_id, full_name)
  values (p_franchise_id, 'source', p_source_player_record_id, v_source.full_name)
  returning * into v_player;

  perform app.record_outcome(v_uid, p_request_id, 'attach_source_player', to_jsonb(v_player));
  return v_player;
end
$$;

/**
 * Set one grouped field either as a plan or as an already-happened record.
 * Recording updates that field's baseline and drops a now-redundant plan;
 * unrelated pending plans are preserved. Equal plan/baseline removes the row.
 */
create or replace function public.set_player_field(
  p_franchise_player_id uuid,
  p_field_key text,
  p_value jsonb,
  p_intent text,
  p_expected_revision integer,
  p_request_id uuid
) returns app.franchise_player_fields
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_prior jsonb;
  v_franchise_id uuid;
  v_row app.franchise_player_fields;
  v_baseline jsonb;
  v_plan jsonb;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    -- A cleared field stores a jsonb 'null' outcome; replay it as a null row.
    if v_prior = 'null'::jsonb then
      return null;
    end if;
    return jsonb_populate_record(null::app.franchise_player_fields, v_prior);
  end if;

  if p_intent not in ('plan', 'recorded') then
    raise exception 'validation_failed: intent must be plan or recorded' using errcode = 'P0006';
  end if;

  -- An explicit JSON null means "no value": unknown is the absence of a value,
  -- never a stored literal null. Clearing a field must delete the row.
  p_value := nullif(p_value, 'null'::jsonb);

  select p.franchise_id into v_franchise_id
    from app.franchise_players p
    join app.franchises f on f.id = p.franchise_id
   where p.id = p_franchise_player_id
     and f.owner_uid = v_uid;

  if v_franchise_id is null then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  perform public.touch_franchise(v_franchise_id, p_expected_revision);

  select baseline_value, plan_value into v_baseline, v_plan
    from app.franchise_player_fields
   where franchise_player_id = p_franchise_player_id and field_key = p_field_key;

  if p_intent = 'recorded' then
    v_baseline := p_value;
    if v_plan = p_value then
      v_plan := null;
    end if;
  else
    v_plan := p_value;
  end if;

  -- A plan equal to the baseline is not a pending change; the recorded
  -- baseline still persists so an edited fact is never forgotten.
  if v_baseline is not distinct from v_plan then
    v_plan := null;
  end if;

  if v_baseline is null and v_plan is null then
    delete from app.franchise_player_fields
     where franchise_player_id = p_franchise_player_id and field_key = p_field_key;
    v_row := null;
  else
    insert into app.franchise_player_fields
      (franchise_player_id, field_key, baseline_value, plan_value, updated_at)
    values (p_franchise_player_id, p_field_key, v_baseline, v_plan, now())
    on conflict (franchise_player_id, field_key) do update
      set baseline_value = excluded.baseline_value,
          plan_value = excluded.plan_value,
          updated_at = now()
    returning * into v_row;
  end if;

  perform app.record_outcome(v_uid, p_request_id, 'set_player_field', to_jsonb(v_row));
  return v_row;
end
$$;

-- Command privileges: callable by an authenticated owner, never by anon or the
-- generic PUBLIC role. Fixed for the C1B command layer.
revoke all on function public.create_franchise(text, uuid) from public, anon;
revoke all on function public.set_franchise_archived(uuid, boolean, uuid) from public, anon;
revoke all on function public.set_franchise_name(uuid, text, integer, uuid) from public, anon;
revoke all on function public.add_custom_player(uuid, text, integer, uuid) from public, anon;
revoke all on function public.attach_source_player(uuid, uuid, integer, uuid) from public, anon;
revoke all on function public.set_player_field(uuid, text, jsonb, text, integer, uuid) from public, anon;

grant execute on function public.create_franchise(text, uuid) to authenticated, service_role;
grant execute on function public.set_franchise_archived(uuid, boolean, uuid) to authenticated, service_role;
grant execute on function public.set_franchise_name(uuid, text, integer, uuid) to authenticated, service_role;
grant execute on function public.add_custom_player(uuid, text, integer, uuid) to authenticated, service_role;
grant execute on function public.attach_source_player(uuid, uuid, integer, uuid) to authenticated, service_role;
grant execute on function public.set_player_field(uuid, text, jsonb, text, integer, uuid) to authenticated, service_role;

revoke all on function app.require_owner() from public, anon, authenticated;
revoke all on function app.replay_outcome(uuid, uuid) from public, anon, authenticated;
revoke all on function app.record_outcome(uuid, uuid, text, jsonb) from public, anon, authenticated;
