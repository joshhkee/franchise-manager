import { closeDb, databaseDescription } from '@/db/index';
import { applyMigrations } from '@/db/migrate';
import { applySeed } from '@/db/repo';

const force = process.argv.includes('--force');

console.log(`Seeding ${databaseDescription()}${force ? ' (force: call sheet reset)' : ''}...`);
await applyMigrations();
const result = await applySeed({ force });
console.log(`Seeded ${result.formations} formations.`);
if (result.retiredRoles.length) {
  console.log(`Retired ${result.retiredRoles.length} role(s) the game no longer has: ${result.retiredRoles.join(', ')}`);
  console.log(`Carried ${result.migratedEntries} depth-chart entr(ies) onto their new role.`);
}
console.log(
  'Seed complete. Run `npm run import:ratings` for the real Madden 27 rosters, then `npm run seed:chart -- --team=ATL --user-team`.',
);
await closeDb();
