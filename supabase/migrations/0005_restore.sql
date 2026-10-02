-- 0005_restore.sql
-- Atomic restore-new (C0B-v2 §8) and the source-revision read model export needs.
-- Restore is one command, so a validation or reference failure leaves no partial franchise.

-- Source revision summaries for export and coverage display (read-only to the owner).
create view public.source_revision_summaries
with (security_invoker = on) as
select
  s.id,
  s.source,
  s.revision_key,
  s.captured_at,
  s.coverage_status,
  s.missing_field_report,
  s.access_basis,
  count(r.id) as record_count
from app.source_revisions s
left join app.source_player_records r on r.revision_id = s.id
group by s.id;

comment on view public.source_revision_summaries is
  'Coverage labels are labels only: imported-as-reported coverage is never presented as complete game coverage (C0B-v2 §2, IR-3).';

grant select on public.source_revision_summaries to authenticated;
revoke all on public.source_revision_summaries from anon;

-- Players view gains the pinned revision key so an export can preserve source
-- references by key instead of by database id.
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
  s.revision_key as source_revision_key
from app.franchise_players fp
left join app.source_player_records sp on sp.id = fp.source_player_record_id
left join app.source_revisions s on s.id = sp.revision_id;

grant select on public.franchise_players_view to authenticated;

/**
 * Restore an already-validated envelope payload into a NEW franchise.
 * Mutable ids are regenerated, custom-player keys are preserved, and source
 * players are re-bound by (source_id, revision_key). A missing revision raises
 * `source_revision_unavailable` and nothing is written.
 */
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

    insert into app.franchise_players (franchise_id, origin, source_player_record_id, custom_key, full_name)
    values (
      v_franchise_id,
      coalesce(v_player->>'origin', 'custom'),
      v_source_id,
      case
        when v_player->>'origin' = 'source' then null
        else coalesce(nullif(v_player->>'customKey', ''), 'c_' || replace(gen_random_uuid()::text, '-', ''))
      end,
      btrim(v_player->>'fullName')
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

  perform app.record_outcome(v_uid, p_request_id, 'restore_new_franchise', to_jsonb(v_franchise_id::text));
  return v_franchise_id;
end
$$;

revoke all on function public.restore_new_franchise(jsonb, uuid) from public, anon;
grant execute on function public.restore_new_franchise(jsonb, uuid) to authenticated, service_role;
