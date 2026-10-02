import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const MIGRATIONS_DIR = path.join(process.cwd(), "supabase", "migrations");

/**
 * Stand-in for the Supabase-managed `auth` schema and roles so the real
 * migrations and policies can run against PGlite (D119). It mirrors Supabase's
 * published auth.uid() definition and creates the anon/authenticated/
 * service_role roles the migrations grant to.
 */
const AUTH_SHIM = `
create schema if not exists auth;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end
$$;

create or replace function auth.uid() returns uuid
  language sql
  stable
  as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
`;

export type SupabaseRole = "anon" | "authenticated" | "service_role";

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(AUTH_SHIM);
  for (const file of migrationFiles()) {
    await db.exec(readFileSync(path.join(MIGRATIONS_DIR, file), "utf8"));
  }
  return db;
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

/**
 * Switch the single PGlite connection to a Supabase-like identity. With no uid
 * this reproduces the anon/service caller, where auth.uid() is null.
 */
export async function asRole(db: PGlite, role: SupabaseRole, uid?: string): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid ?? ""]);
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    uid ? JSON.stringify({ sub: uid, role }) : "",
  ]);
  await db.exec(`set role ${role}`);
}

/** Run as the migration/owner role that bypasses RLS (Supabase's service key path). */
export async function asOwnerSession(db: PGlite): Promise<void> {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false)");
}

export async function allowOwner(
  db: PGlite,
  githubUserId: number,
  githubLogin: string,
): Promise<void> {
  await asOwnerSession(db);
  await db.query(
    "insert into app.owner_allowlist (github_user_id, github_login) values ($1, $2)",
    [githubUserId, githubLogin],
  );
}

export async function registerOwner(
  db: PGlite,
  uid: string,
  githubUserId: number,
  githubLogin: string,
): Promise<void> {
  await asOwnerSession(db);
  await db.query("select public.register_owner($1, $2, $3)", [uid, githubUserId, githubLogin]);
}

export async function createFranchise(
  db: PGlite,
  uid: string,
  name: string,
  isDefault = false,
): Promise<string> {
  await asRole(db, "authenticated", uid);
  const result = await db.query<{ id: string }>(
    "insert into app.franchises (owner_uid, name, is_default) values ($1, $2, $3) returning id",
    [uid, name, isDefault],
  );
  return result.rows[0].id;
}

export async function countFranchisesSeen(db: PGlite): Promise<number> {
  const result = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");
  return Number(result.rows[0].count);
}

export const OWNER_UID = "31111111-1111-4111-8111-111111111111";
export const OTHER_UID = "32222222-2222-4222-8222-222222222222";
export const STRANGER_UID = "33333333-3333-4333-8333-333333333333";
export const OWNER_GITHUB_ID = 21141160;
export const OTHER_GITHUB_ID = 99900001;
export const STRANGER_GITHUB_ID = 99900002;
