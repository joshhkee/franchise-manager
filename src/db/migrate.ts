import path from 'node:path';
import { getDb, hasRemoteDatabase } from './index';

/** Apply generated SQL migrations to the active database. */
export async function applyMigrations(): Promise<void> {
  const db = await getDb();
  const migrationsFolder = path.join(process.cwd(), 'drizzle');

  if (hasRemoteDatabase()) {
    const { migrate } = await import('drizzle-orm/postgres-js/migrator');
    await migrate(db as never, { migrationsFolder });
    return;
  }

  const { migrate } = await import('drizzle-orm/pglite/migrator');
  await migrate(db as never, { migrationsFolder });
}
