-- 0014_c4b_scouting.sql
-- C4B: franchise-local scheme/book preferences and owner-curated scouting shortlist.
-- Scheme fit remains provisional until the D113 evidence supplement; preferences are app state,
-- never Madden checklist actions. Owner applies separately per D088/D119, never at build time.

create table app.franchise_scouting_preferences (
  franchise_id uuid primary key references app.franchises(id) on delete cascade,
  offensive_scheme text check (offensive_scheme is null or char_length(btrim(offensive_scheme)) between 1 and 80),
  defensive_scheme text check (defensive_scheme is null or char_length(btrim(defensive_scheme)) between 1 and 80),
  offensive_book_id text not null default 'nfl-off-falcons' check (char_length(btrim(offensive_book_id)) between 1 and 64),
  defensive_book_id text not null default 'nfl-def-falcons' check (char_length(btrim(defensive_book_id)) between 1 and 64),
  updated_at timestamptz not null default now()
);

create table app.franchise_scouting_shortlist (
  id uuid primary key default gen_random_uuid(),
  franchise_id uuid not null references app.franchises(id) on delete cascade,
  kind text not null check (kind in ('trade_block','trade_target')),
  player_id uuid,
  source_player_record_id uuid references app.source_player_records(id) on delete cascade,
  status text not null check (status in ('pinned','dismissed')),
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scouting_shortlist_identity check (
    (player_id is not null and source_player_record_id is null) or
    (player_id is null and source_player_record_id is not null)
  ),
  constraint scouting_shortlist_identity_unique
    unique nulls not distinct (franchise_id, kind, player_id, source_player_record_id)
);

create index franchise_scouting_shortlist_franchise_idx
  on app.franchise_scouting_shortlist(franchise_id, kind, status);

alter table app.franchise_scouting_preferences enable row level security;
alter table app.franchise_scouting_shortlist enable row level security;

create policy scouting_preferences_select_own on app.franchise_scouting_preferences
  for select to authenticated using (exists (
    select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()
  ));
create policy scouting_preferences_write_own on app.franchise_scouting_preferences
  for all to authenticated using (exists (
    select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()
  )) with check (exists (
    select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()
  ) and app.is_allowlisted_owner());

create policy scouting_shortlist_select_own on app.franchise_scouting_shortlist
  for select to authenticated using (exists (
    select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()
  ));
create policy scouting_shortlist_write_own on app.franchise_scouting_shortlist
  for all to authenticated using (exists (
    select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid()
  )) with check (
    exists (select 1 from app.franchises f where f.id=franchise_id and f.owner_uid=auth.uid())
    and app.is_allowlisted_owner()
    and (player_id is null or exists(select 1 from app.franchise_players p where p.id=player_id and p.franchise_id=franchise_scouting_shortlist.franchise_id))
  );

grant select, insert, update, delete on app.franchise_scouting_preferences to authenticated;
grant select, insert, update, delete on app.franchise_scouting_shortlist to authenticated;

create view public.franchise_scouting_preferences_view with (security_invoker=on) as
select * from app.franchise_scouting_preferences;
create view public.franchise_scouting_shortlist_view with (security_invoker=on) as
select * from app.franchise_scouting_shortlist;
grant select on public.franchise_scouting_preferences_view to authenticated;
grant select on public.franchise_scouting_shortlist_view to authenticated;
revoke all on public.franchise_scouting_preferences_view from anon;
revoke all on public.franchise_scouting_shortlist_view from anon;

create or replace function public.save_scouting_preferences(
  p_franchise_id uuid, p_offensive_scheme text, p_defensive_scheme text,
  p_offensive_book_id text, p_defensive_book_id text, p_expected_revision integer, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path=app,public,pg_catalog as $$
declare v_uid uuid:=app.require_owner(); v_prior jsonb; v_revision integer;
begin
  v_prior:=app.replay_outcome(v_uid,p_request_id);
  if v_prior is not null then return v_prior; end if;
  if not exists(select 1 from app.franchises where id=p_franchise_id and owner_uid=v_uid) then
    raise exception 'cross_franchise_reference' using errcode='P0004';
  end if;
  if nullif(btrim(p_offensive_book_id),'') is null or nullif(btrim(p_defensive_book_id),'') is null then
    raise exception 'validation_failed: both playbooks must be selected' using errcode='P0006';
  end if;
  v_revision:=public.touch_franchise(p_franchise_id,p_expected_revision);
  insert into app.franchise_scouting_preferences(franchise_id,offensive_scheme,defensive_scheme,offensive_book_id,defensive_book_id)
  values(p_franchise_id,nullif(btrim(p_offensive_scheme),''),nullif(btrim(p_defensive_scheme),''),btrim(p_offensive_book_id),btrim(p_defensive_book_id))
  on conflict(franchise_id) do update set offensive_scheme=excluded.offensive_scheme,defensive_scheme=excluded.defensive_scheme,
    offensive_book_id=excluded.offensive_book_id,defensive_book_id=excluded.defensive_book_id,updated_at=now();
  v_prior:=jsonb_build_object('franchiseId',p_franchise_id,'revision',v_revision);
  perform app.record_outcome(v_uid,p_request_id,'save_scouting_preferences',v_prior);
  return v_prior;
end $$;
revoke all on function public.save_scouting_preferences(uuid,text,text,text,text,integer,uuid) from public,anon;
grant execute on function public.save_scouting_preferences(uuid,text,text,text,text,integer,uuid) to authenticated;

create or replace function public.restore_scouting_state(p_franchise_id uuid, p_state jsonb, p_player_map jsonb)
returns void language plpgsql security definer set search_path=app,pg_catalog as $$
declare v_item jsonb; v_player_id uuid; v_source_id uuid; v_source jsonb; v_old_player_id text;
begin
  if jsonb_typeof(p_state->'preferences')='object' then
    if coalesce(jsonb_typeof(p_state->'preferences'->'offensiveScheme'),'null') not in ('string','null') or
       coalesce(jsonb_typeof(p_state->'preferences'->'defensiveScheme'),'null') not in ('string','null') or
       jsonb_typeof(p_state->'preferences'->'offensiveBookId') <> 'string' or
       jsonb_typeof(p_state->'preferences'->'defensiveBookId') <> 'string' or
       char_length(p_state->'preferences'->>'offensiveBookId') not between 1 and 64 or
       char_length(p_state->'preferences'->>'defensiveBookId') not between 1 and 64 then
      raise exception 'backup_invalid: scouting preferences are invalid' using errcode='P0007';
    end if;
    insert into app.franchise_scouting_preferences(franchise_id,offensive_scheme,defensive_scheme,offensive_book_id,defensive_book_id)
    values(p_franchise_id,nullif(p_state->'preferences'->>'offensiveScheme',''),nullif(p_state->'preferences'->>'defensiveScheme',''),
      p_state->'preferences'->>'offensiveBookId',p_state->'preferences'->>'defensiveBookId')
    on conflict(franchise_id) do update set offensive_scheme=excluded.offensive_scheme,defensive_scheme=excluded.defensive_scheme,
      offensive_book_id=excluded.offensive_book_id,defensive_book_id=excluded.defensive_book_id;
  end if;
  if jsonb_typeof(coalesce(p_state->'shortlist','[]'::jsonb)) <> 'array' then
    raise exception 'backup_invalid: scouting shortlist is invalid' using errcode='P0007';
  end if;
  for v_item in select * from jsonb_array_elements(coalesce(p_state->'shortlist','[]'::jsonb)) loop
    if jsonb_typeof(v_item) <> 'object' or v_item->>'kind' not in ('trade_block','trade_target') or
       v_item->>'status' not in ('pinned','dismissed') or coalesce(char_length(v_item->>'note'),0)>1000 or
       coalesce(v_item->>'identity','') not in ('franchise','source') then
      raise exception 'backup_invalid: scouting shortlist entry is invalid' using errcode='P0007';
    end if;
    v_old_player_id:=v_item->>'mutablePlayerId';
    v_player_id:=nullif(p_player_map->>v_old_player_id,'')::uuid;
    v_source_id:=null;
    v_source:=v_item->'sourceReference';
    if jsonb_typeof(v_source)='object' then
      if jsonb_typeof(v_source->'sourceId') <> 'string' or jsonb_typeof(v_source->'revisionKey') <> 'string' then raise exception 'backup_invalid: scouting source reference is invalid' using errcode='P0007'; end if;
      select sr.id into v_source_id from app.source_player_records sr join app.source_revisions r on r.id=sr.revision_id
       where sr.source_id=v_source->>'sourceId' and r.revision_key=v_source->>'revisionKey';
      if v_source_id is null then raise exception 'source_revision_unavailable' using errcode='P0005'; end if;
    elsif coalesce(jsonb_typeof(v_source),'null') <> 'null' then
      raise exception 'backup_invalid: scouting source reference is invalid' using errcode='P0007';
    end if;
    if v_item->>'identity'='franchise' and (v_player_id is null or v_source_id is not null or coalesce(jsonb_typeof(v_item->'sourceReference'),'null') <> 'null') then
      raise exception 'backup_invalid: scouting player identity is invalid' using errcode='P0007';
    end if;
    if v_item->>'identity'='source' and (v_player_id is not null or v_source_id is null or coalesce(jsonb_typeof(v_item->'mutablePlayerId'),'null') <> 'null') then
      raise exception 'backup_invalid: scouting source identity is invalid' using errcode='P0007';
    end if;
    if v_player_id is not null and not exists(select 1 from app.franchise_players where id=v_player_id and franchise_id=p_franchise_id) then
      raise exception 'backup_invalid: scouting player is missing' using errcode='P0007';
    end if;
    insert into app.franchise_scouting_shortlist(franchise_id,kind,player_id,source_player_record_id,status,note)
    values(p_franchise_id,v_item->>'kind',v_player_id,v_source_id,v_item->>'status',nullif(v_item->>'note',''));
  end loop;
end $$;
revoke all on function public.restore_scouting_state(uuid,jsonb,jsonb) from public,anon,authenticated;

-- Wrap C4A's complete atomic restore, then restore C4B state in the same transaction.
-- A database error on scouting restoration rolls back the new franchise and all C4A rows.
create or replace function public.restore_new_franchise_c4b(p_payload jsonb, p_request_id uuid)
returns uuid language plpgsql security definer set search_path=app,public,pg_catalog as $$
declare
  v_uid uuid:=app.require_owner(); v_prior jsonb; v_franchise_id uuid; v_restore_request uuid;
  v_player jsonb; v_player_id uuid; v_original_id text; v_player_map jsonb:='{}'::jsonb; v_inner_request uuid;
begin
  v_restore_request:=md5(p_request_id::text||':c4b-scouting-restore')::uuid;
  v_prior:=app.replay_outcome(v_uid,v_restore_request);
  if v_prior is not null then return (v_prior->>'franchiseId')::uuid; end if;
  v_inner_request:=md5(p_request_id::text||':c4a-restore')::uuid;
  v_prior:=app.replay_outcome(v_uid,v_inner_request);
  if v_prior is not null then
    v_franchise_id:=coalesce(v_prior->>'franchiseId',v_prior #>> '{}')::uuid;
  else
    v_franchise_id:=public.restore_new_franchise_c4a(p_payload,v_inner_request);
  end if;
  for v_player in select * from jsonb_array_elements(coalesce(p_payload->'franchise'->'players','[]'::jsonb)) loop
    v_original_id:=v_player->>'mutableId';
    if v_player->>'origin'='custom' then
      select id into v_player_id from app.franchise_players where franchise_id=v_franchise_id and custom_key=v_player->>'customKey';
    else
      select fp.id into v_player_id from app.franchise_players fp
       join app.source_player_records sr on sr.id=fp.source_player_record_id
       join app.source_revisions r on r.id=sr.revision_id
       where fp.franchise_id=v_franchise_id and sr.source_id=v_player->'sourceReference'->>'sourceId'
         and r.revision_key=v_player->'sourceReference'->>'revisionKey';
    end if;
    if v_player_id is not null then v_player_map:=v_player_map||jsonb_build_object(v_original_id,v_player_id::text); end if;
  end loop;
  perform public.restore_scouting_state(v_franchise_id,coalesce(p_payload->'scoutingState',p_payload->'franchise'->'scoutingState','{}'::jsonb),v_player_map);
  perform app.record_outcome(v_uid,v_restore_request,'restore_new_franchise_c4b',jsonb_build_object('franchiseId',v_franchise_id));
  return v_franchise_id;
end $$;
revoke all on function public.restore_new_franchise_c4b(jsonb,uuid) from public,anon;
grant execute on function public.restore_new_franchise_c4b(jsonb,uuid) to authenticated;

create or replace function public.set_scouting_shortlist(
  p_franchise_id uuid, p_kind text, p_player_id uuid, p_source_player_record_id uuid,
  p_status text, p_note text, p_expected_revision integer, p_request_id uuid
) returns jsonb language plpgsql security definer set search_path=app,public,pg_catalog as $$
declare v_uid uuid:=app.require_owner(); v_prior jsonb; v_revision integer;
begin
  v_prior:=app.replay_outcome(v_uid,p_request_id);
  if v_prior is not null then return v_prior; end if;
  if not exists(select 1 from app.franchises where id=p_franchise_id and owner_uid=v_uid) then
    raise exception 'cross_franchise_reference' using errcode='P0004';
  end if;
  if p_kind not in ('trade_block','trade_target') or p_status not in ('pinned','dismissed') or
     (p_player_id is null)=(p_source_player_record_id is null) or coalesce(length(p_note),0)>1000 then
    raise exception 'validation_failed: invalid shortlist entry' using errcode='P0006';
  end if;
  if p_player_id is not null and not exists(select 1 from app.franchise_players where id=p_player_id and franchise_id=p_franchise_id) then
    raise exception 'cross_franchise_reference' using errcode='P0004';
  end if;
  if p_source_player_record_id is not null and not exists(select 1 from app.source_player_records where id=p_source_player_record_id) then
    raise exception 'source_revision_unavailable' using errcode='P0005';
  end if;
  v_revision:=public.touch_franchise(p_franchise_id,p_expected_revision);
  insert into app.franchise_scouting_shortlist(franchise_id,kind,player_id,source_player_record_id,status,note)
  values(p_franchise_id,p_kind,p_player_id,p_source_player_record_id,p_status,nullif(btrim(p_note),''))
  on conflict on constraint scouting_shortlist_identity_unique
  do update set status=excluded.status,note=excluded.note,updated_at=now();
  v_prior:=jsonb_build_object('franchiseId',p_franchise_id,'revision',v_revision);
  perform app.record_outcome(v_uid,p_request_id,'set_scouting_shortlist',v_prior);
  return v_prior;
end $$;
revoke all on function public.set_scouting_shortlist(uuid,text,uuid,uuid,text,text,integer,uuid) from public,anon;
grant execute on function public.set_scouting_shortlist(uuid,text,uuid,uuid,text,text,integer,uuid) to authenticated;
