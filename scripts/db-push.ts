import { closeDb, databaseDescription } from '@/db/index';
import { applyMigrations } from '@/db/migrate';

const target = databaseDescription();
console.log(`Applying migrations to ${target}...`);
await applyMigrations();
console.log('Migrations applied.');
await closeDb();
