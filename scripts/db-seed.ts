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
if (result.retiredRoles.length) {
  console.log(`Retired ${result.retiredRoles.length} role(s) the game no longer has: ${result.retiredRoles.join(', ')}`);
  console.log(`Carried ${result.migratedEntries} depth-chart entr(ies) onto their new role.`);
}
console.log('Demo roster loaded. Run `npm run import:ratings` for real Madden 27 players.');
await closeDb();
