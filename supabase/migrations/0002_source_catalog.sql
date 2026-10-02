-- 0002_source_catalog.sql
-- Immutable source revisions and source player records (C0B-v2 §2), plus the franchise dataset pin (§2).
-- Source snapshots are versioned and never mutated by franchise operations; franchise edits live in
-- franchise-scoped overlays added by later migrations. Applied to the live project by the owner (D088/D119).

create table app.source_revisions (
  id                  uuid primary key default gen_random_uuid(),
  source              text not null check (char_length(btrim(source)) between 1 and 60),
  revision_key        text not null check (char_length(btrim(revision_key)) between 1 and 120),
  captured_at         timestamptz not null default now(),
  coverage_status     text not null check (coverage_status in ('complete_as_imported', 'partial', 'unsupported')),
  missing_field_report jsonb not null default '[]'::jsonb,
  provenance          jsonb not null default '{}'::jsonb,
  access_basis        text,
  created_at          timestamptz not null default now(),
  unique (source, revision_key)
);

comment on table app.source_revisions is
  'Published, versioned source snapshots (C0B-v2 §2). Fetch failure is never recorded as absence; a partial fetch stays a retryable failure and never pins a revision.';

create table app.source_player_records (
  id                    uuid primary key default gen_random_uuid(),
  revision_id           uuid not null references app.source_revisions (id) on delete cascade,
  source_id             text not null,
  full_name             text not null,
  normalized_name       text not null,
  birthdate             date,
  team                  text,
  listed_position       text,
  measurements          jsonb not null default '{}'::jsonb,
  ratings               jsonb not null default '{}'::jsonb,
  archetype             text,
  abilities             jsonb not null default '[]'::jsonb,
  provenance            jsonb not null default '{}'::jsonb,
  reconciliation_outcome text not null check (reconciliation_outcome in ('matched', 'new', 'conflict')),
  reconciliation_reason text,
  created_at            timestamptz not null default now(),
  unique (revision_id, source_id)
);

comment on table app.source_player_records is
  'Revision-scoped source records (C0B-v2 §2). sourceId identifies a record only within its revision; identity across revisions is the declared composite key (CB-1), normalized by lib/identity.ts.';

comment on column app.source_player_records.archetype is
  'Nullable on purpose: a missing archetype is unknown, never a default or a recalculated value (D110).';

create index source_player_records_revision_name_idx
  on app.source_player_records (revision_id, normalized_name);

-- A franchise pins exactly one baseline dataset revision; new revisions are never absorbed automatically.
alter table app.franchises
  add constraint franchises_pinned_revision_fk
  foreign key (pinned_revision_id) references app.source_revisions (id);

-- ---------------------------------------------------------------------------
-- Read-only for clients: allowlisted owners may read the catalog; nothing in
-- the client can insert, update, or delete a source row.
-- ---------------------------------------------------------------------------
alter table app.source_revisions enable row level security;
alter table app.source_player_records enable row level security;

create policy source_revisions_select_owner on app.source_revisions
  for select to authenticated
  using (app.is_allowlisted_owner());

create policy source_player_records_select_owner on app.source_player_records
  for select to authenticated
  using (app.is_allowlisted_owner());

grant select on app.source_revisions to authenticated;
grant select on app.source_player_records to authenticated;

revoke insert, update, delete on app.source_revisions from anon, authenticated;
revoke insert, update, delete on app.source_player_records from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Database-level immutability guard. Even a privileged caller must open the
-- explicit import/maintenance window (transaction-local
-- `app.allow_source_mutation = 'on'`) to change a published snapshot; conflict
-- disposition RPCs will use that window when they land with the import slice.
-- ---------------------------------------------------------------------------
create or replace function app.reject_source_mutation() returns trigger
  language plpgsql
as $$
begin
  if current_setting('app.allow_source_mutation', true) = 'on' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'source records are immutable (C0B-v2 §2): % refused on %.%',
    tg_op, tg_table_schema, tg_table_name
    using errcode = 'P0003';
end
$$;

create trigger source_revisions_immutable
  before update or delete on app.source_revisions
  for each row execute function app.reject_source_mutation();

create trigger source_player_records_immutable
  before update or delete on app.source_player_records
  for each row execute function app.reject_source_mutation();
