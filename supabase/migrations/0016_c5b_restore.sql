-- 0016_c5b_restore.sql
-- C5B wrapper around the accepted C4B restore. All nested functions execute in
-- this one transaction; any invalid Gameday customization rolls back everything.
create or replace function public.restore_gameday_state(p_franchise_id uuid, p_state jsonb)
returns void language plpgsql security definer set search_path=app,pg_catalog as $$
declare v_plan jsonb; v_pin jsonb; v_theme text; v_id text; v_rank integer;
begin
  if coalesce(jsonb_typeof(p_state->'plans'),'array') <> 'array' then
    raise exception 'backup_invalid: Gameday plans are invalid' using errcode='P0007';
  end if;
  for v_plan in select * from jsonb_array_elements(coalesce(p_state->'plans','[]'::jsonb)) loop
    v_theme:=btrim(coalesce(v_plan->>'themeId',''));
    if jsonb_typeof(v_plan)<>'object' or v_theme='' or length(v_theme)>64 or
       coalesce(length(v_plan->>'customName'),0)>80 or coalesce(length(v_plan->>'customNotes'),0)>1000 or
       jsonb_typeof(v_plan->'pinnedPlayIds')<>'array' or jsonb_typeof(v_plan->'pinnedFormationIds')<>'array' or
       jsonb_array_length(v_plan->'pinnedPlayIds')+jsonb_array_length(v_plan->'pinnedFormationIds')>100 or
       exists(select 1 from app.franchise_gameday_plans where franchise_id=p_franchise_id and theme_id=v_theme) then
      raise exception 'backup_invalid: Gameday plan is invalid' using errcode='P0007';
    end if;
    insert into app.franchise_gameday_plans(franchise_id,theme_id,custom_name,custom_notes)
      values(p_franchise_id,v_theme,nullif(btrim(v_plan->>'customName'),''),nullif(btrim(v_plan->>'customNotes'),''));
    v_rank:=0;
    for v_pin in select * from jsonb_array_elements(v_plan->'pinnedPlayIds') loop
      if jsonb_typeof(v_pin)<>'string' or coalesce(btrim(v_pin #>> '{}'),'')='' or length(v_pin #>> '{}')>200 then raise exception 'backup_invalid: Gameday play pin is invalid' using errcode='P0007'; end if;
      v_rank:=v_rank+1;
      insert into app.franchise_gameday_pins(franchise_id,theme_id,target_kind,target_id,pin_rank) values(p_franchise_id,v_theme,'play',v_pin #>> '{}',v_rank);
    end loop;
    for v_pin in select * from jsonb_array_elements(v_plan->'pinnedFormationIds') loop
      if jsonb_typeof(v_pin)<>'string' or coalesce(btrim(v_pin #>> '{}'),'')='' or length(v_pin #>> '{}')>200 then raise exception 'backup_invalid: Gameday formation pin is invalid' using errcode='P0007'; end if;
      v_rank:=v_rank+1;
      insert into app.franchise_gameday_pins(franchise_id,theme_id,target_kind,target_id,pin_rank) values(p_franchise_id,v_theme,'formation',v_pin #>> '{}',v_rank);
    end loop;
  end loop;
end $$;
revoke all on function public.restore_gameday_state(uuid,jsonb) from public,anon,authenticated;

create or replace function public.restore_new_franchise_c5b(p_payload jsonb, p_request_id uuid)
returns uuid language plpgsql security definer set search_path=app,public,pg_catalog as $$
declare v_uid uuid:=app.require_owner(); v_prior jsonb; v_franchise_id uuid; v_inner_request uuid;
begin
  -- Replay only after the complete C5B transaction succeeded. Checking this
  -- exact outer request avoids re-running the non-idempotent preference inserts.
  v_prior:=app.replay_outcome(v_uid,p_request_id);
  if v_prior is not null then
    return (v_prior->>'franchiseId')::uuid;
  end if;
  v_inner_request:=md5(p_request_id::text||':c5b-c4b-restore')::uuid;
  v_franchise_id:=public.restore_new_franchise_c4b(p_payload,v_inner_request);
  perform public.restore_gameday_state(v_franchise_id,coalesce(p_payload->'gamedayState',p_payload->'franchise'->'gamedayState','{"plans":[]}'::jsonb));
  perform app.record_outcome(v_uid,p_request_id,'restore_new_franchise_c5b',jsonb_build_object('franchiseId',v_franchise_id));
  return v_franchise_id;
end $$;
revoke all on function public.restore_new_franchise_c5b(jsonb,uuid) from public,anon;
grant execute on function public.restore_new_franchise_c5b(jsonb,uuid) to authenticated;
