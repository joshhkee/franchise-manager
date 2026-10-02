-- 0006_source_import.sql
-- Owner-run source import (C0B-v2 §2, C0A player-source feasibility).
--
-- The client roles can only read the catalog; the import runs with the secret key
-- (service_role) so a browser session can never write a published revision. Both
-- commands are retry-safe: re-running an import reuses the revision and skips the
-- records it already has, so a lost response never duplicates the catalog.
-- Owner applies to the live project per D088/D119; never during a build.

-- ---------------------------------------------------------------------------
-- Record a versioned revision. Idempotent on (source, revision_key): a retry
-- returns the existing revision instead of creating a second one.
-- ---------------------------------------------------------------------------
create or replace function public.begin_source_revision(
  p_source text,
  p_revision_key text,
  p_coverage_status text,
  p_missing_field_report jsonb,
  p_provenance jsonb,
  p_access_basis text,
  p_captured_at timestamptz default now()
) returns app.source_revisions
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_revision app.source_revisions;
begin
  if p_coverage_status not in ('complete_as_imported', 'partial', 'unsupported') then
    raise exception 'validation_failed: unknown coverage status %', coalesce(p_coverage_status, '(null)')
      using errcode = 'P0006';
  end if;

  if coalesce(btrim(p_source), '') = '' or coalesce(btrim(p_revision_key), '') = '' then
    raise exception 'validation_failed: source and revision key are required' using errcode = 'P0006';
  end if;

  select * into v_revision
    from app.source_revisions r
   where r.source = btrim(p_source)
     and r.revision_key = btrim(p_revision_key);

  if found then
    return v_revision;
  end if;

  insert into app.source_revisions
    (source, revision_key, captured_at, coverage_status, missing_field_report, provenance, access_basis)
  values (
    btrim(p_source),
    btrim(p_revision_key),
    coalesce(p_captured_at, now()),
    p_coverage_status,
    coalesce(p_missing_field_report, '[]'::jsonb),
    coalesce(p_provenance, '{}'::jsonb),
    p_access_basis
  )
  returning * into v_revision;

  return v_revision;
end
$$;

comment on function public.begin_source_revision(text, text, text, jsonb, jsonb, text, timestamptz) is
  'Create (or reuse) a published source revision. service_role only; coverage is a label, never a complete-game claim (C0B-v2 §2, IR-3).';

-- ---------------------------------------------------------------------------
-- Append a batch of already-normalized records. The caller classifies identity
-- with lib/identity.ts (CB-1) before calling, so the database stores the
-- declared outcome rather than re-deriving it.
-- ---------------------------------------------------------------------------
create or replace function public.append_source_records(
  p_revision_id uuid,
  p_records jsonb
) returns jsonb
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_attempted integer;
  v_distinct integer;
  v_inserted integer;
begin
  if jsonb_typeof(p_records) <> 'array' then
    raise exception 'validation_failed: records must be a JSON array' using errcode = 'P0006';
  end if;

  if not exists (select 1 from app.source_revisions r where r.id = p_revision_id) then
    raise exception 'source_revision_unavailable' using errcode = 'P0005';
  end if;

  v_attempted := jsonb_array_length(p_records);

  -- One sourceId identifies one record inside a revision; a duplicated id in a
  -- single batch is a malformed import, not something to silently drop.
  select count(distinct rec->>'sourceId')
    into v_distinct
    from jsonb_array_elements(p_records) as rec;

  if v_distinct <> v_attempted then
    raise exception 'validation_failed: duplicate sourceId inside one batch' using errcode = 'P0006';
  end if;

  insert into app.source_player_records (
    revision_id, source_id, full_name, normalized_name, birthdate, team, listed_position,
    measurements, ratings, archetype, abilities, provenance, reconciliation_outcome, reconciliation_reason
  )
  select
    p_revision_id,
    rec->>'sourceId',
    rec->>'fullName',
    rec->>'normalizedName',
    case
      when coalesce(btrim(rec->>'birthdate'), '') = '' then null
      when btrim(rec->>'birthdate') ~ '^\d{4}-\d{2}-\d{2}$' then (rec->>'birthdate')::date
      else null
    end,
    nullif(btrim(coalesce(rec->>'team', '')), ''),
    nullif(btrim(coalesce(rec->>'listedPosition', '')), ''),
    coalesce(rec->'measurements', '{}'::jsonb),
    coalesce(rec->'ratings', '{}'::jsonb),
    nullif(btrim(coalesce(rec->>'archetype', '')), ''),
    coalesce(rec->'abilities', '[]'::jsonb),
    coalesce(rec->'provenance', '{}'::jsonb),
    coalesce(nullif(btrim(coalesce(rec->>'reconciliationOutcome', '')), ''), 'new'),
    nullif(btrim(coalesce(rec->>'reconciliationReason', '')), '')
  from jsonb_array_elements(p_records) as rec
  on conflict (revision_id, source_id) do nothing;

  get diagnostics v_inserted = row_count;

  return jsonb_build_object(
    'attempted', v_attempted,
    'inserted', v_inserted,
    'skipped', v_attempted - v_inserted
  );
end
$$;

comment on function public.append_source_records(uuid, jsonb) is
  'Append one batch of normalized records to a revision. Retry-safe: records already present are skipped, so a repeated import never duplicates the catalog.';

-- ---------------------------------------------------------------------------
-- Privileges: the secret key only. No client role may write a published
-- revision, and the import commands are not reachable with a browser session.
-- ---------------------------------------------------------------------------
revoke all on function public.begin_source_revision(text, text, text, jsonb, jsonb, text, timestamptz)
  from public, anon, authenticated;
revoke all on function public.append_source_records(uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.begin_source_revision(text, text, text, jsonb, jsonb, text, timestamptz)
  to service_role;
grant execute on function public.append_source_records(uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- Read model for the catalog. PostgREST exposes `public` only, and an import
-- must be able to see what a previous revision already holds so CB-1 can
-- classify across revisions. Row level security still applies (allowlisted
-- owners only), and the view is read-only. Insert/update/delete stay revoked.
-- ---------------------------------------------------------------------------
create view public.source_player_records_view
with (security_invoker = on) as
select
  r.id,
  r.revision_id,
  r.source_id,
  r.full_name,
  r.normalized_name,
  r.birthdate,
  r.team,
  r.listed_position,
  r.archetype,
  r.measurements,
  r.ratings,
  r.abilities,
  r.reconciliation_outcome,
  r.reconciliation_reason,
  s.source,
  s.revision_key
from app.source_player_records r
join app.source_revisions s on s.id = r.revision_id;

comment on view public.source_player_records_view is
  'Read-only catalog records with their revision identity. A missing value is absent, never zero (C0B-v2 §2/§3).';

grant select on public.source_player_records_view to authenticated;
revoke all on public.source_player_records_view from anon;
