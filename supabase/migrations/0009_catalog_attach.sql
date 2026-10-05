-- 0009_catalog_attach.sql
-- Catalog-to-franchise attachment (the C1B/C2A gap recorded in
-- docs/checkpoints/C2A-IMPORT-DELETE-FIX.md §2; ACCEPTANCE A38 "catalog-backed path").
--
-- The imported catalog is global and immutable; a franchise's players are
-- attached from it explicitly. These commands attach whole published club
-- rosters or an explicit record selection, label nothing as confirmed, refuse
-- duplicate identity instead of silently duplicating it, and vote atomically:
-- a validation failure writes nothing.
-- Owner applies to the live project per D088/D119; never during a build.

-- ---------------------------------------------------------------------------
-- Club coverage per revision, so the attach UI can offer honest club choices
-- (team is null for unsigned players; that group is never presented as a club).
-- ---------------------------------------------------------------------------
create or replace view public.source_team_summaries
with (security_invoker = on) as
select
  r.revision_id,
  s.source,
  s.revision_key,
  r.team,
  count(*) as player_count,
  count(*) filter (where r.listed_position is null) as missing_position_count
from app.source_player_records r
join app.source_revisions s on s.id = r.revision_id
group by r.revision_id, s.source, s.revision_key, r.team;

comment on view public.source_team_summaries is
  'Published records per revision and team. A null team is the unsigned group, never a club (C0B-v2 §2). Coverage is a count of imported records, not a complete-game claim.';

grant select on public.source_team_summaries to authenticated;
revoke all on public.source_team_summaries from anon;

-- ---------------------------------------------------------------------------
-- Shared attachment helper. Validates one selection, inserts only records this
-- franchise does not already hold, bumps the revision once when something was
-- actually attached, and returns counted facts. Internal: no client grant.
-- ---------------------------------------------------------------------------
create or replace function app.apply_source_attachment(
  p_franchise_id uuid,
  p_expected_revision integer,
  p_record_ids uuid[]
) returns jsonb
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_uid uuid := app.require_owner();
  v_requested integer := coalesce(array_length(p_record_ids, 1), 0);
  v_distinct integer;
  v_found integer;
  v_revisions integer;
  v_already_attached integer;
  v_already_present integer;
  v_inserted integer := 0;
  v_revision integer;
begin
  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  if v_requested = 0 then
    raise exception 'validation_failed: no source records were selected' using errcode = 'P0006';
  end if;

  if v_requested > 100 then
    raise exception 'validation_failed: attach at most 100 records per request' using errcode = 'P0006';
  end if;

  -- One selection must name each record at most once; a repeated id is a
  -- malformed request, not something to silently drop.
  select count(distinct ids.id) into v_distinct from unnest(p_record_ids) as ids(id);
  if v_distinct <> v_requested then
    raise exception 'validation_failed: the request repeats a source record' using errcode = 'P0006';
  end if;

  select count(*), count(distinct r.revision_id)
    into v_found, v_revisions
    from app.source_player_records r
   where r.id = any(p_record_ids);

  if v_found <> v_requested then
    raise exception 'source_revision_unavailable' using errcode = 'P0005';
  end if;

  -- One attachment request draws from one published revision; mixing revisions
  -- would silently blend snapshots (C0B-v2 §2: a franchise pins one baseline).
  if v_revisions <> 1 then
    raise exception 'validation_failed: one request must use a single source revision' using errcode = 'P0006';
  end if;

  -- Identical record already on this franchise.
  select count(*) into v_already_attached
    from app.franchise_players fp
   where fp.franchise_id = p_franchise_id
     and fp.source_player_record_id = any(p_record_ids);

  -- Same published identity (source_id) already on this franchise through a
  -- different revision's record. A later revision never replaces or duplicates
  -- an attached player automatically; the skip is reported.
  select count(distinct candidate.id) into v_already_present
    from app.source_player_records candidate
    join app.franchise_players fp on fp.franchise_id = p_franchise_id
    join app.source_player_records held on held.id = fp.source_player_record_id
   where candidate.id = any(p_record_ids)
     and held.source_id = candidate.source_id
     and held.revision_id <> candidate.revision_id;

  -- Attach only records whose published identity is not already held. The
  -- unique (franchise_id, source_player_record_id) constraint is the backstop,
  -- not the primary duplicate rule.
  insert into app.franchise_players (franchise_id, origin, source_player_record_id, full_name)
  select p_franchise_id, 'source', candidate.id, candidate.full_name
    from app.source_player_records candidate
   where candidate.id = any(p_record_ids)
     and not exists (
       select 1
         from app.franchise_players fp
         join app.source_player_records held on held.id = fp.source_player_record_id
        where fp.franchise_id = p_franchise_id
          and held.source_id = candidate.source_id
     )
  on conflict (franchise_id, source_player_record_id) do nothing;

  get diagnostics v_inserted = row_count;

  -- A no-op re-run (everything already held) changes nothing and does not bump
  -- the revision, so a stale page is never blamed for a write it did not make.
  if v_inserted > 0 then
    v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  end if;

  return jsonb_build_object(
    'requested', v_requested,
    'attached', v_inserted,
    'alreadyAttached', v_already_attached,
    'alreadyPresent', v_already_present,
    'revision', v_revision
  );
end
$$;

revoke all on function app.apply_source_attachment(uuid, integer, uuid[])
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Attach one published club roster from one revision. This is the explicit
-- "start this franchise from the published snapshot" action; the result is the
-- provisional published baseline until the owner records reality.
-- ---------------------------------------------------------------------------
create or replace function public.attach_source_team(
  p_franchise_id uuid,
  p_revision_id uuid,
  p_team text,
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
  v_team text := nullif(btrim(coalesce(p_team, '')), '');
  v_ids uuid[];
  v_result jsonb;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if v_team is null then
    raise exception 'validation_failed: a club name is required' using errcode = 'P0006';
  end if;

  select array_agg(r.id order by r.full_name)
    into v_ids
    from app.source_player_records r
   where r.revision_id = p_revision_id
     and r.team = v_team;

  if v_ids is null then
    raise exception 'validation_failed: no published % records in that revision', v_team
      using errcode = 'P0006';
  end if;

  v_result := app.apply_source_attachment(p_franchise_id, p_expected_revision, v_ids);
  perform app.record_outcome(v_uid, p_request_id, 'attach_source_team', v_result);
  return v_result;
end
$$;

comment on function public.attach_source_team(uuid, uuid, text, integer, uuid) is
  'Attach one published club roster from one revision to one franchise as its provisional published baseline. Duplicate identity is skipped and reported; retry-safe through the request ledger.';

-- ---------------------------------------------------------------------------
-- Attach an explicit record selection (search results, free agents, individuals).
-- ---------------------------------------------------------------------------
create or replace function public.attach_source_records(
  p_franchise_id uuid,
  p_record_ids uuid[],
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
  v_result jsonb;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  v_result := app.apply_source_attachment(p_franchise_id, p_expected_revision, p_record_ids);
  perform app.record_outcome(v_uid, p_request_id, 'attach_source_records', v_result);
  return v_result;
end
$$;

comment on function public.attach_source_records(uuid, uuid[], integer, uuid) is
  'Attach an explicit catalog selection to one franchise. Validates before any write, refuses duplicate identity instead of duplicating it, and reports exactly what was attached or skipped.';

revoke all on function public.attach_source_team(uuid, uuid, text, integer, uuid) from public, anon;
revoke all on function public.attach_source_records(uuid, uuid[], integer, uuid) from public, anon;

grant execute on function public.attach_source_team(uuid, uuid, text, integer, uuid)
  to authenticated, service_role;
grant execute on function public.attach_source_records(uuid, uuid[], integer, uuid)
  to authenticated, service_role;
