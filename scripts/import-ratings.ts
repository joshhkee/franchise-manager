import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { closeDb, databaseDescription } from '@/db/index';
import { applyMigrations } from '@/db/migrate';
import { persistRatings } from '@/db/import';
import { artifactToImportResult, isDropArtifact } from '@/lib/importers/eaDropRatings';
import { findLatestDropArtifact, loadDropArtifact } from '@/lib/importers/dropArtifact';
import { fetchRatings, fetchRatingsFromArtifact, type RatingsImportResult } from '@/lib/importers/eaRatings';

/**
 * Import real Madden rosters.
 *
 * Usage:
 *   npm run import:ratings                    # the committed Madden 27 artifact
 *   npm run import:ratings -- --file=x.json   # a specific artifact (or an older docs dump)
 *   npm run import:ratings -- --api           # force the older EA ratings API
 *
 * Madden 27 comes from the committed artifact in `data/imports/`, scraped by
 * `npm run scrape:ratings` (see [`RATINGS.md`](RATINGS.md)). The artifact is the
 * default on purpose: EA's `drop-api` silently returns an empty league outside a
 * browser context, so fetching at import time would look like it worked while
 * importing nothing. The older `ratings-api.ea.com` feed is still there as a
 * fallback for the day a new season shows up on it, but it publishes nothing newer
 * than Madden 24.
 */
const fileArg = process.argv.find((arg) => arg.startsWith('--file='));
const forceApi = process.argv.includes('--api');

console.log(`Importing ratings into ${databaseDescription()}...`);
await applyMigrations();

async function resolveImport(): Promise<RatingsImportResult> {
  if (fileArg) {
    const file = path.resolve(fileArg.slice('--file='.length));
    const parsed = JSON.parse(await readFile(file, 'utf8')) as unknown;
    return isDropArtifact(parsed)
      ? artifactToImportResult(parsed, file)
      : fetchRatingsFromArtifact(file);
  }
  if (!forceApi) {
    const artifact = await findLatestDropArtifact();
    if (artifact) return loadDropArtifact(artifact);
    console.log(
      'No Madden 27 artifact in data/imports/. Run `npm run scrape:ratings` for real Madden 27 rosters.',
    );
  }
  return fetchRatings();
}

try {
  const result = await resolveImport();

  const persisted = await persistRatings(result);

  console.log(`Source: ${result.url} (${result.slug})`);
  console.log(`Imported ${persisted.players} players across ${persisted.teams} teams.`);
  console.log(`Created ${persisted.overlayCreated} franchise rows (existing edits untouched).`);
  if (persisted.staleRemoved) {
    console.log(
      `Replaced ${persisted.staleRemoved} player rows from an earlier ratings pull, so the league is one game's rosters.`,
    );
  }
  for (const note of result.notes) console.log(`- ${note}`);
} catch (error) {
  console.error((error as Error).message);
  console.error('');
  console.error('Import failed. The database keeps whatever rosters it already had.');
  process.exitCode = 1;
}

await closeDb();
