import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { RatingsImportResult } from './eaRatings';
import { artifactToImportResult, isDropArtifact } from './eaDropRatings';

/**
 * The committed Madden 27 ratings artifact, read from disk.
 *
 * `scripts/scrape-ea-ratings.ts` writes one JSON file per ratings update; the import
 * replays that file instead of hitting EA, because fetching `drop-api` outside a
 * browser context silently returns an empty league ([`RATINGS.md`](RATINGS.md) §2.1).
 * Keeping the read on disk is what makes the import deterministic and offline.
 */

/** Where the scraper writes. `data/imports/` is committed on purpose. */
export const DROP_ARTIFACT_DIR = path.join(process.cwd(), 'data', 'imports');

/** Prefix the scraper uses, so this never picks up the old `m24` dump. */
export const DROP_ARTIFACT_PREFIX = 'ea-ratings-madden27';

/** The newest committed artifact, or null when none has been scraped yet. */
export async function findLatestDropArtifact(dir = DROP_ARTIFACT_DIR): Promise<string | null> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }

  const candidates = names.filter(
    (name) => name.startsWith(DROP_ARTIFACT_PREFIX) && name.endsWith('.json'),
  );
  if (candidates.length === 0) return null;

  const withTimes = await Promise.all(
    candidates.map(async (name) => {
      const full = path.join(dir, name);
      const info = await stat(full);
      return { full, at: info.mtimeMs };
    }),
  );
  withTimes.sort((a, b) => b.at - a.at);
  return withTimes[0]?.full ?? null;
}

/** Read an artifact and turn it into the shape `persistRatings` consumes. */
export async function loadDropArtifact(filePath: string): Promise<RatingsImportResult> {
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
  if (!isDropArtifact(parsed)) {
    throw new Error(
      `${filePath} is not a Madden 27 ratings artifact (expected { source, scrapedAt, players[] }). Run \`npm run scrape:ratings\` first.`,
    );
  }
  return artifactToImportResult(parsed, filePath);
}
