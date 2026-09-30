import path from 'node:path';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';

/**
 * One Postgres dialect everywhere.
 *
 * Locally we run PGlite (an embedded Postgres), so the app works with no server
 * and with the exact same SQL as production. When DATABASE_URL is set — Neon or
 * any Postgres — we use that instead. Nothing else in the app knows the
 * difference.
 */
export type Db = PgliteDatabase<typeof schema> & {
  $client?: unknown;
};

const globalForDb = globalThis as unknown as {
  __franchiseDb?: Db;
  __franchiseClient?: unknown;
};

export function hasRemoteDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Where the embedded database lives. `DATA_DIR` lets a host mount a volume. */
export function embeddedDataDir(): string {
  return path.join(process.env.DATA_DIR ?? process.cwd(), 'data', 'pglite');
}

export function databaseDescription(): string {
  return hasRemoteDatabase()
    ? 'Postgres (DATABASE_URL)'
    : `embedded PGlite (${embeddedDataDir()})`;
}

export async function getDb(): Promise<Db> {
  if (globalForDb.__franchiseDb) return globalForDb.__franchiseDb;

  if (hasRemoteDatabase()) {
    const [{ drizzle }, { default: postgres }] = await Promise.all([
      import('drizzle-orm/postgres-js'),
      import('postgres'),
    ]);
    const client = postgres(process.env.DATABASE_URL!, { max: 5 });
    const db = drizzle(client, { schema }) as unknown as Db;
    globalForDb.__franchiseDb = db;
    globalForDb.__franchiseClient = client;
    return db;
  }

  const [{ drizzle }, { PGlite }] = await Promise.all([
    import('drizzle-orm/pglite'),
    import('@electric-sql/pglite'),
  ]);
  const { mkdirSync } = await import('node:fs');
  const dir = embeddedDataDir();
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema }) as unknown as Db;
  globalForDb.__franchiseDb = db;
  globalForDb.__franchiseClient = client;
  return db;
}

/** Close the connection — used by scripts so the process can exit cleanly. */
export async function closeDb(): Promise<void> {
  const client = globalForDb.__franchiseClient as { close?: () => Promise<void> } | undefined;
  if (client?.close) await client.close();
  globalForDb.__franchiseDb = undefined;
  globalForDb.__franchiseClient = undefined;
}

export { schema };
