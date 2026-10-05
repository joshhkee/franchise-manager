-- 0010_depth_chart_generate.sql
-- C2A follow-up (D126): one-shot provisional depth-chart generation.
-- The owner asked for a single button that generates every position's
-- provisional list instead of suggesting/seeding one position at a time. This
-- command applies a whole set of position lists atomically: either every
-- position in the request is written or none is, and the franchise revision is
-- bumped at most once. It seeds a provisional baseline for positions that have
-- none (exactly like the per-position "seed provisional list" action), stores a
-- plan only when it differs from the baseline, and never touches manual
-- secondary/specialist slots — those are the app's provisional rules (D107)
-- and are not encoded in the database.
-- Owner applies to the live project per D088/D119; never during a build.

create or replace function public.generate_depth_chart(
  p_franchise_id uuid,
  p_plans jsonb,
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
  v_entries jsonb := '[]'::jsonb;
  v_plan jsonb;
  v_position text;
  v_ids uuid[];
  v_seen_positions text[] := '{}';
  v_entry_count integer;
  v_baseline_ids uuid[];
  v_plan_ids uuid[];
  v_effective_before uuid[];
  v_baseline_seeded boolean;
  v_noop boolean;
  v_results jsonb := '[]'::jsonb;
  v_wrote boolean := false;
  v_revision integer;
begin
  v_prior := app.replay_outcome(v_uid, p_request_id);
  if v_prior is not null then
    return v_prior;
  end if;

  if not exists (select 1 from app.franchises f where f.id = p_franchise_id and f.owner_uid = v_uid) then
    raise exception 'cross_franchise_reference' using errcode = 'P0004';
  end if;

  if jsonb_typeof(p_plans) <> 'array' then
    raise exception 'validation_failed: plans must be an array' using errcode = 'P0006';
  end if;

  v_entry_count := jsonb_array_length(p_plans);
  if v_entry_count = 0 then
    raise exception 'validation_failed: no positions to generate' using errcode = 'P0006';
  end if;
  if v_entry_count > 40 then
    raise exception 'validation_failed: at most 40 positions per request' using errcode = 'P0006';
  end if;

  -- Validate the whole request before writing anything: a failure anywhere
  -- leaves every position untouched (C0B-v2 §5).
  for v_plan in select value from jsonb_array_elements(p_plans) loop
    if jsonb_typeof(v_plan) <> 'object' then
      raise exception 'validation_failed: each plan must be an object' using errcode = 'P0006';
    end if;

    v_position := btrim(coalesce(v_plan->>'position', ''));
    if v_position = '' or char_length(v_position) > 12 then
      raise exception 'validation_failed: a position is required' using errcode = 'P0006';
    end if;
    if v_position = any (v_seen_positions) then
      raise exception 'validation_failed: position % appears twice', v_position using errcode = 'P0006';
    end if;
    v_seen_positions := v_seen_positions || v_position;

    if jsonb_typeof(v_plan->'playerIds') <> 'array' then
      raise exception 'validation_failed: % player ids must be an array', v_position using errcode = 'P0006';
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_plan->'playerIds') e where jsonb_typeof(e) <> 'string'
    ) then
      raise exception 'validation_failed: % contains a non-player id', v_position using errcode = 'P0006';
    end if;

    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_ids
      from jsonb_array_elements_text(v_plan->'playerIds') as t(value);

    if coalesce(array_length(v_ids, 1), 0) = 0 then
      raise exception 'validation_failed: % has no players to generate', v_position using errcode = 'P0006';
    end if;

    perform app.assert_chart_players(p_franchise_id, v_ids);
    v_entries := v_entries || jsonb_build_object('position', v_position, 'playerIds', to_jsonb(v_ids));
  end loop;

  -- Apply every validated position. A position whose effective list (stored
  -- plan, else baseline) already equals the requested list is a no-op: no rows
  -- are rewritten and no revision is bumped for it.
  for v_plan in select value from jsonb_array_elements(v_entries) loop
    v_position := v_plan->>'position';
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_ids
      from jsonb_array_elements_text(v_plan->'playerIds') as t(value);

    select array_agg(e.franchise_player_id order by e.depth_rank)
      into v_baseline_ids
      from app.depth_chart_entries e
     where e.franchise_id = p_franchise_id and e.position = v_position and e.layer = 'baseline';

    select array_agg(e.franchise_player_id order by e.depth_rank)
      into v_plan_ids
      from app.depth_chart_entries e
     where e.franchise_id = p_franchise_id and e.position = v_position and e.layer = 'plan';

    v_effective_before := coalesce(v_plan_ids, v_baseline_ids);
    v_baseline_seeded := false;

    if v_effective_before = v_ids then
      v_noop := true;
    else
      v_noop := false;
      v_wrote := true;

      delete from app.depth_chart_entries
       where franchise_id = p_franchise_id and position = v_position and layer = 'plan';

      if v_baseline_ids is null then
        -- No recorded or provisional baseline exists: seed a provisional one,
        -- labeled unverified exactly like the per-position seed action. Never
        -- flip an existing owner_confirmed label.
        insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
        select p_franchise_id, v_position, 'baseline', ordinality::integer, player_id
          from unnest(v_ids) with ordinality as t(player_id, ordinality);

        insert into app.depth_chart_state (franchise_id, position, verification, updated_at)
        values (p_franchise_id, v_position, 'provisional_published', now())
        on conflict (franchise_id, position) do nothing;

        v_baseline_seeded := true;
      elsif v_baseline_ids <> v_ids then
        -- A plan equal to the baseline is consolidated away, not stored.
        insert into app.depth_chart_entries (franchise_id, position, layer, depth_rank, franchise_player_id)
        select p_franchise_id, v_position, 'plan', ordinality::integer, player_id
          from unnest(v_ids) with ordinality as t(player_id, ordinality);
      end if;
    end if;

    v_results := v_results || jsonb_build_object(
      'position', v_position,
      'playerIds', to_jsonb(v_ids),
      'baselineSeeded', v_baseline_seeded,
      'noop', v_noop
    );
  end loop;

  if v_wrote then
    v_revision := public.touch_franchise(p_franchise_id, p_expected_revision);
  end if;

  v_prior := jsonb_build_object(
    'plans', v_results,
    'wrote', v_wrote,
    'revision', to_jsonb(v_revision)
  );
  perform app.record_outcome(v_uid, p_request_id, 'generate_depth_chart', v_prior);
  return v_prior;
end
$$;

comment on function public.generate_depth_chart(uuid, jsonb, integer, uuid) is
  'Generate provisional depth-chart lists for many positions in one atomic request (D126). Seeds a provisional baseline where none exists (never overriding owner_confirmed), stores plans only when they differ from the baseline, and bumps the franchise revision once when anything changed.';

revoke all on function public.generate_depth_chart(uuid, jsonb, integer, uuid) from public, anon;
grant execute on function public.generate_depth_chart(uuid, jsonb, integer, uuid) to authenticated, service_role;
