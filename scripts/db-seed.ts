import { closeDb, databaseDescription } from '@/db/index';
import { applyMigrations } from '@/db/migrate';
import { applySeed } from '@/db/repo';

const force = process.argv.includes('--force');

console.log(`Seeding ${databaseDescription()}${force ? ' (force: depth charts reset)' : ''}...`);
await applyMigrations();
const result = await applySeed({ force });
console.log(
  `Seeded ${result.teams} teams, ${result.players} players, ${result.formations} formations.`,
);
console.log('Demo roster loaded. Run `npm run import:ratings` for real Madden 27 players.');
await closeDb();
