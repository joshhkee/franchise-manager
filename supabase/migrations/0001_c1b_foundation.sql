-- 0001_c1b_foundation.sql
-- C1B foundation: authoritative owner allowlist, owner identity mapping, franchise isolation.
-- Traceability: C0B-v2 §2 (franchise isolation, custom/source boundary), §5 (revision + stale_revision),
-- §9 (Franchise entity, unauthorized/cross_franchise_reference outcomes), §10 (policy/migration ownership).
-- Source revisions, players, and backups arrive in later migrations and reuse these helpers.
-- Applied to the live project by the owner (D088/D119); never during a build.

create schema if not exists app;

-- ---------------------------------------------------------------------------
-- Authoritative allowlist. Owner-managed through the secret key or the SQL
-- editor; no client role can read or change it (no policies, no grants).
-- ---------------------------------------------------------------------------
create table app.owner_allowlist (
  github_user_id bigint primary key check (github_user_id > 0),
  github_login   text not null check (char_length(btrim(github_login)) between 1 and 80),
  created_at     timestamptz not null default now()
);

comment on table app.owner_allowlist is
  'Authoritative list of GitHub identities permitted to own this app (C0B-v2 §2). Service-key access only.';

-- ---------------------------------------------------------------------------
-- One authenticated Supabase user maps to exactly one allowlisted identity.
-- ---------------------------------------------------------------------------
create table app.owners (
  uid            uuid primary key,
  github_user_id bigint not null unique references app.owner_allowlist (github_user_id),
  github_login   text not null,
  created_at     timestamptz not null default now()
);

comment on table app.owners is
  'Mapping from an authenticated Supabase user to an allowlisted GitHub identity; written only by public.register_owner.';

-- ---------------------------------------------------------------------------
-- Franchises. Every mutable C1B entity hangs off a franchise (C0B-v2 §2).
-- pinned_revision_id is constrained when the source-revision tables land.
-- ---------------------------------------------------------------------------
create table app.franchises (
  id                 uuid primary key default gen_random_uuid(),
  owner_uid          uuid not null references app.owners (uid),
  name               text not null check (char_length(btrim(name)) between 1 and 80),
  is_default         boolean not null default false,
  pinned_revision_id uuid,
  revision           integer not null default 0 check (revision >= 0),
  archived_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on column app.franchises.revision is
  'Monotonic per-franchise revision; every committed mutation increments it (C0B-v2 §5).';

create unique index franchises_one_default_owner_idx
  on app.franchises (owner_uid)
  where is_default and archived_at is null;

create index franchises_owner_idx on app.franchises (owner_uid);

-- ---------------------------------------------------------------------------
-- Ownership helpers. auth.uid() is null for anon and for keyless calls, so
-- every predicate below is false for them.
-- ---------------------------------------------------------------------------
create or replace function app.current_owner() returns uuid
  language sql
  stable
  set search_path = pg_catalog
  as $$ select auth.uid() $$;

create or replace function app.is_allowlisted_owner() returns boolean
  language sql
  stable
  security definer
  set search_path = app, pg_catalog
  as $$ select exists (select 1 from app.owners o where o.uid = auth.uid()) $$;

-- ---------------------------------------------------------------------------
-- Row level security: an authenticated identity sees only its own franchises,
-- and only an allowlisted owner may create or update one.
-- ---------------------------------------------------------------------------
alter table app.owner_allowlist enable row level security;
alter table app.owners enable row level security;
alter table app.franchises enable row level security;

-- The allowlist intentionally has no policy: only the secret key reaches it.

create policy owners_select_self on app.owners
  for select to authenticated
  using (uid = auth.uid());

create policy franchises_select_own on app.franchises
  for select to authenticated
  using (owner_uid = auth.uid());

create policy franchises_insert_own on app.franchises
  for insert to authenticated
  with check (owner_uid = auth.uid() and app.is_allowlisted_owner());

create policy franchises_update_own on app.franchises
  for update to authenticated
  using (owner_uid = auth.uid())
  with check (owner_uid = auth.uid() and app.is_allowlisted_owner());

create policy franchises_delete_own on app.franchises
  for delete to authenticated
  using (owner_uid = auth.uid());

-- ---------------------------------------------------------------------------
-- Controlled owner bootstrap (no first-user-wins enrollment). Only the server
-- holding the secret key may call this; a non-allowlisted identity is rejected
-- with an `unauthorized` outcome instead of being silently enrolled.
-- ---------------------------------------------------------------------------
create or replace function public.register_owner(
  p_uid uuid,
  p_github_user_id bigint,
  p_github_login text
) returns app.owners
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_owner app.owners;
begin
  if not exists (
    select 1 from app.owner_allowlist a where a.github_user_id = p_github_user_id
  ) then
    raise exception 'unauthorized: GitHub identity % is not allowlisted', p_github_user_id
      using errcode = 'P0001';
  end if;

  insert into app.owners (uid, github_user_id, github_login)
  values (p_uid, p_github_user_id, p_github_login)
  on conflict (uid) do update
    set github_user_id = excluded.github_user_id,
        github_login   = excluded.github_login
  returning * into v_owner;

  return v_owner;
end
$$;

-- ---------------------------------------------------------------------------
-- Revision contract: a write carrying a stale expected revision mutates
-- nothing and raises `stale_revision` (C0B-v2 §5). No last-write-wins.
-- ---------------------------------------------------------------------------
create or replace function public.touch_franchise(
  p_franchise_id uuid,
  p_expected_revision integer
) returns integer
  language plpgsql
  security definer
  set search_path = app, public, pg_catalog
as $$
declare
  v_revision integer;
begin
  update app.franchises f
     set revision = f.revision + 1,
         updated_at = now()
   where f.id = p_franchise_id
     and f.revision = p_expected_revision
     and f.owner_uid = auth.uid()
  returning f.revision into v_revision;

  if v_revision is null then
    raise exception 'stale_revision' using errcode = 'P0002';
  end if;

  return v_revision;
end
$$;

-- ---------------------------------------------------------------------------
-- Privileges. RLS is only reached after a grant, so grant narrowly: the
-- client roles get the tables they may use and the two callable functions.
-- ---------------------------------------------------------------------------
grant usage on schema app to authenticated, service_role;

grant select on app.owners to authenticated;
grant select, insert, update, delete on app.franchises to authenticated;

grant select, insert, update, delete on all tables in schema app to service_role;
alter default privileges in schema app
  grant select, insert, update, delete on tables to service_role;

grant execute on function app.current_owner() to authenticated;
grant execute on function app.is_allowlisted_owner() to authenticated;
grant execute on function public.touch_franchise(uuid, integer) to authenticated;
grant execute on function public.register_owner(uuid, bigint, text) to service_role;

revoke all on function app.current_owner() from public, anon;
revoke all on function app.is_allowlisted_owner() from public, anon;
revoke all on function public.touch_franchise(uuid, integer) from public, anon;
revoke all on function public.register_owner(uuid, bigint, text) from public, anon, authenticated;

revoke all on app.owner_allowlist from anon, authenticated;
