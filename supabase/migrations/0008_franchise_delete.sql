-- 0008_franchise_delete.sql
-- Owner-requested permanent franchise deletion (D124, 2026-10-04).
--
-- Archive/resume remains the normal franchise lifecycle; this command exists for
-- franchises created by accident. It is owner-scoped, refuses the default
-- franchise, and requires the caller to repeat the exact franchise name, so a
-- stray click cannot destroy a franchise. Deleting cascades every franchise row
-- (players, grouped fields, chart entries, chart state) and records its outcome
-- in the owner-scoped request ledger, so a lost-response retry replays instead
-- of failing on an already-deleted row.
-- Owner applies to the live project per D088/D119; never during a build.

create or replace function public.delete_franchise(
  p_franchise_id uuid,
  p_confirm_name text,
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

  select * into v_franchise
    from app.franchises f
   where f.id = p_franchise_id
     and f.owner_uid = v_uid;

  if v_franchise.id is null then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  if v_franchise.is_default then
    raise exception 'unsupported_operation: the default franchise cannot be deleted; archive it instead'
      using errcode = 'P0007';
  end if;

  if btrim(coalesce(p_confirm_name, '')) is distinct from v_franchise.name then
    raise exception 'validation_failed: the typed name does not match this franchise'
      using errcode = 'P0006';
  end if;

  delete from app.franchises f where f.id = v_franchise.id;

  perform app.record_outcome(v_uid, p_request_id, 'delete_franchise', to_jsonb(v_franchise));
  return v_franchise;
end
$$;

comment on function public.delete_franchise(uuid, text, uuid) is
  'Permanently delete one non-default franchise and all of its rows. Owner only; the exact name must be repeated; retry-safe through the request ledger (D124).';

revoke all on function public.delete_franchise(uuid, text, uuid) from public, anon;
grant execute on function public.delete_franchise(uuid, text, uuid) to authenticated, service_role;
