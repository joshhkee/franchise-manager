-- 0015_c5b_gameday.sql
-- C5B franchise-owned Gameday drive-plan customizations. App preferences only;
-- never game state/checklist actions. Owner applies separately after review.
create table app.franchise_gameday_plans (
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  theme_id text not null check (char_length(btrim(theme_id)) between 1 and 64),
  custom_name text check (custom_name is null or char_length(btrim(custom_name)) between 1 and 80),
  custom_notes text check (custom_notes is null or char_length(custom_notes) <= 1000),
  updated_at timestamptz not null default now(),
  primary key (franchise_id, theme_id)
);

create table app.franchise_gameday_pins (
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  theme_id text not null check (char_length(btrim(theme_id)) between 1 and 64),
  target_kind text not null check (target_kind in ('play', 'formation')),
  target_id text not null check (char_length(btrim(target_id)) between 1 and 200),
  pin_rank integer not null default 1 check (pin_rank between 1 and 100),
  created_at timestamptz not null default now(),
  primary key (franchise_id, theme_id, target_kind, target_id),
  unique (franchise_id, theme_id, target_kind, pin_rank)
);
create index franchise_gameday_pins_lookup on app.franchise_gameday_pins(franchise_id, theme_id, pin_rank);

alter table app.franchise_gameday_plans enable row level security;
alter table app.franchise_gameday_pins enable row level security;
create policy gameday_plans_select_own on app.franchise_gameday_plans for select to authenticated
  using (exists(select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()));
create policy gameday_plans_write_own on app.franchise_gameday_plans for all to authenticated
  using (exists(select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()))
  with check (exists(select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()) and app.is_allowlisted_owner());
create policy gameday_pins_select_own on app.franchise_gameday_pins for select to authenticated
  using (exists(select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()));
create policy gameday_pins_write_own on app.franchise_gameday_pins for all to authenticated
  using (exists(select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()))
  with check (exists(select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()) and app.is_allowlisted_owner());
grant select,insert,update,delete on app.franchise_gameday_plans,app.franchise_gameday_pins to authenticated;

create view public.franchise_gameday_plans_view with (security_invoker=on) as select * from app.franchise_gameday_plans;
create view public.franchise_gameday_pins_view with (security_invoker=on) as select * from app.franchise_gameday_pins;
grant select on public.franchise_gameday_plans_view,public.franchise_gameday_pins_view to authenticated;
revoke all on public.franchise_gameday_plans_view,public.franchise_gameday_pins_view from anon;

-- One atomic, owner/revision/idempotency-guarded upsert for a plan and ordered pins.
create or replace function public.save_gameday_plan(
  p_franchise_id uuid, p_theme_id text, p_custom_name text, p_custom_notes text,
  p_pins jsonb, p_expected_revision integer, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path=app,public,pg_catalog as $$
declare v_uid uuid:=app.require_owner(); v_prior jsonb; v_revision integer; v_item jsonb; v_kind text; v_id text; v_rank integer:=0; v_seen text[]:='{}';
begin
  v_prior:=app.replay_outcome(v_uid,p_request_id);
  if v_prior is not null then return v_prior; end if;
  if not exists(select 1 from app.franchises where id=p_franchise_id and owner_uid=v_uid) then
    raise exception 'cross_franchise_reference' using errcode='P0004';
  end if;
  if coalesce(btrim(p_theme_id),'')='' or length(btrim(p_theme_id))>64 or jsonb_typeof(p_pins)<>'array' or
     coalesce(length(p_custom_name),0)>80 or coalesce(length(p_custom_notes),0)>1000 or jsonb_array_length(p_pins)>100 then
    raise exception 'validation_failed: invalid Gameday plan' using errcode='P0006';
  end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_pins,'[]'::jsonb)) loop
    v_kind:=v_item->>'kind'; v_id:=btrim(coalesce(v_item->>'id',''));
    if v_kind not in ('play','formation') or v_id='' or length(v_id)>200 or
       (v_kind||':'||v_id)=any(v_seen) then
      raise exception 'validation_failed: invalid or duplicate Gameday pin' using errcode='P0006';
    end if;
    v_seen:=array_append(v_seen,v_kind||':'||v_id);
  end loop;
  v_revision:=public.touch_franchise(p_franchise_id,p_expected_revision);
  insert into app.franchise_gameday_plans(franchise_id,theme_id,custom_name,custom_notes)
    values(p_franchise_id,btrim(p_theme_id),nullif(btrim(p_custom_name),''),nullif(btrim(p_custom_notes),''))
    on conflict(franchise_id,theme_id) do update set custom_name=excluded.custom_name,custom_notes=excluded.custom_notes,updated_at=now();
  delete from app.franchise_gameday_pins where franchise_id=p_franchise_id and theme_id=btrim(p_theme_id);
  for v_item in select * from jsonb_array_elements(coalesce(p_pins,'[]'::jsonb)) loop
    v_rank:=v_rank+1;
    insert into app.franchise_gameday_pins(franchise_id,theme_id,target_kind,target_id,pin_rank)
      values(p_franchise_id,btrim(p_theme_id),v_item->>'kind',btrim(v_item->>'id'),v_rank);
  end loop;
  v_prior:=jsonb_build_object('franchiseId',p_franchise_id,'themeId',p_theme_id,'revision',v_revision);
  perform app.record_outcome(v_uid,p_request_id,'save_gameday_plan',v_prior);
  return v_prior;
end $$;
revoke all on function public.save_gameday_plan(uuid,text,text,text,jsonb,integer,uuid) from public,anon;
grant execute on function public.save_gameday_plan(uuid,text,text,text,jsonb,integer,uuid) to authenticated;
