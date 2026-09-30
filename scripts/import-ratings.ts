import path from 'node:path';
import { closeDb, databaseDescription } from '@/db/index';
import { applyMigrations } from '@/db/migrate';
import { persistRatings } from '@/db/import';
import { fetchRatings, fetchRatingsFromArtifact } from '@/lib/importers/eaRatings';

/**
 * Import real Madden rosters from EA's public ratings API.
 *
 * Usage:
 *   npm run import:ratings                 # newest season slug that answers
 *   npm run import:ratings -- --file=x.json  # replay a saved raw response
 */
const fileArg = process.argv.find((arg) => arg.startsWith('--file='));

console.log(`Importing ratings into ${databaseDescription()}...`);
await applyMigrations();

try {
  const result = fileArg
    ? await fetchRatingsFromArtifact(path.resolve(fileArg.slice('--file='.length)))
    : await fetchRatings();

  const persisted = await persistRatings(result);

  console.log(`Source: ${result.url} (${result.slug})`);
  console.log(`Imported ${persisted.players} players across ${persisted.teams} teams.`);
  console.log(`Created ${persisted.overlayCreated} franchise rows (existing edits untouched).`);
  for (const note of result.notes) console.log(`- ${note}`);
} catch (error) {
  console.error((error as Error).message);
  console.error('');
  console.error('The app still works on the seeded demo roster: npm run db:seed');
  process.exitCode = 1;
}

await closeDb();
