import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * EA's public ratings API.
 *
 * This is the endpoint the ea.com ratings database itself reads from, so it is
 * public, official and available without owning the game. It gives us real
 * Madden rosters, attributes and salaries — everything except franchise state
 * (contract years, cap space, dev traits, injuries, depth chart), which is either
 * entered in the app or imported from a save file later.
 *
 * The season slug has to be discovered: `m23-ratings` is known to work, and newer
 * seasons follow the same shape. We probe newest-first and report clearly if none
 * answer, rather than pretending a specific URL is guaranteed.
 */

export interface EaRatingsPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  jersey: number | null;
  teamId: string | null;
  overall: number;
  age: number | null;
  heightInches: number | null;
  /** Weight in pounds. The Madden 27 feed publishes it; older feeds may not. */
  weightLbs?: number | null;
  college: string | null;
  salary: number | null;
  ratings: Record<string, number | string>;
  /** EA's archetype code, e.g. `WR_DeepThreat`. Only the Madden 27 feed publishes one. */
  archetype?: string | null;
  /**
   * Development trait read off the player's ability list. `null` means 
   * "not knowable from this source" — never guess between Star and Normal.
   */
  devTrait?: 'xfactor' | 'superstar' | null;
  /**
   * Which Madden 27 ratings update these numbers came from.
   *
   * Only the scraper path sets it. EA's weekly updates republish rostered players
   * only, so the unsigned pool (free agents) is merged in from the launch set and
   * keeps `1-base` here — that way a launch rating is never mistaken for a current
   * one. The older `ratings-api.ea.com` feed leaves it undefined.
   */
  ratingsIteration?: string | null;
}

export interface RatingsImportResult {
  slug: string;
  url: string;
  players: EaRatingsPlayer[];
  teams: number;
  artifactPath: string | null;
  notes: string[];
  /** The NFL season the ratings describe, e.g. 2023 for `m24-ratings`. */
  seasonYear: number | null;
  /**
   * True when this pull is the whole league, so player rows from an earlier pull
   * should be removed. The Madden 27 artifact is one game's complete rosters; the
   * older API import is not, so it leaves existing rows alone.
   */
  replacesSource?: boolean;
}

/** Nickname -> team identity, as the API reports `team`. */
export const EA_TEAMS: Record<
  string,
  { abbr: string; name: string; conference: string; division: string }
> = {
  '49ers': { abbr: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' },
  Bears: { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' },
  Bengals: { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
  Bills: { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
  Broncos: { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
  Browns: { abbr: 'CLE', name: 'Cleveland Browns', conference: 'AFC', division: 'North' },
  Buccaneers: { abbr: 'TB', name: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South' },
  Cardinals: { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
  Chargers: { abbr: 'LAC', name: 'Los Angeles Chargers', conference: 'AFC', division: 'West' },
  Chiefs: { abbr: 'KC', name: 'Kansas City Chiefs', conference: 'AFC', division: 'West' },
  Colts: { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
  Commanders: { abbr: 'WAS', name: 'Washington Commanders', conference: 'NFC', division: 'East' },
  Cowboys: { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
  Dolphins: { abbr: 'MIA', name: 'Miami Dolphins', conference: 'AFC', division: 'East' },
  Eagles: { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
  Falcons: { abbr: 'ATL', name: 'Atlanta Falcons', conference: 'NFC', division: 'South' },
  Giants: { abbr: 'NYG', name: 'New York Giants', conference: 'NFC', division: 'East' },
  Jaguars: { abbr: 'JAX', name: 'Jacksonville Jaguars', conference: 'AFC', division: 'South' },
  Jets: { abbr: 'NYJ', name: 'New York Jets', conference: 'AFC', division: 'East' },
  Lions: { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' },
  Packers: { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
  Panthers: { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
  Patriots: { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
  Raiders: { abbr: 'LV', name: 'Las Vegas Raiders', conference: 'AFC', division: 'West' },
  Rams: { abbr: 'LAR', name: 'Los Angeles Rams', conference: 'NFC', division: 'West' },
  Ravens: { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
  Saints: { abbr: 'NO', name: 'New Orleans Saints', conference: 'NFC', division: 'South' },
  Seahawks: { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
  Steelers: { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
  Texans: { abbr: 'HOU', name: 'Houston Texans', conference: 'AFC', division: 'South' },
  Titans: { abbr: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' },
  Vikings: { abbr: 'MIN', name: 'Minnesota Vikings', conference: 'NFC', division: 'North' },
};

const API_ROOT = 'https://ratings-api.ea.com/v2/entities';

/**
 * Season slugs, newest first.
 *
 * Verified 2026-09: `m27-ratings` and `m26-ratings` do not exist (500), `m25-ratings`
 * exists but is empty, and `m24-ratings` / `m23-ratings` return full player sets.
 * Run `npm run probe:ea` after a game launch to see whether a new season appeared,
 * or pass `--slug=` if you find one.
 */
export const CANDIDATE_SLUGS = [
  'm27-ratings',
  'madden-27-ratings',
  'm27-player-ratings',
  'm27ratings',
  'm26-ratings',
  'm25-ratings',
  'm24-ratings',
  'm23-ratings',
];

/** The API caps a single response at 1000 docs and defaults to 65. */
const PAGE_SIZE = 1000;

const IDENTITY_FIELDS = new Set([
  'firstName',
  'lastName',
  'team',
  'status',
  'plyrAssetname',
  'plyrPortrait',
  'plyrBirthdate',
  'runningStyle_rating',
  'college',
  'jerseyNum',
  'height',
  'weight',
  'overall_rating',
  'totalSalary',
  'signingBonus',
]);

function ageFromBirthdate(birthdate: unknown, now = new Date(2026, 8, 29)): number | null {
  if (typeof birthdate !== 'string' || !birthdate) return null;
  const parts = birthdate.split('/').map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null;
  const [month, day, year] = parts as [number, number, number];
  const born = new Date(year, month - 1, day);
  let age = now.getFullYear() - born.getFullYear();
  const monthDiff = now.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < born.getDate())) age -= 1;
  return age;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

export function normalizeEaPlayer(raw: Record<string, unknown>): EaRatingsPlayer | null {
  const firstName = String(raw.firstName ?? '').trim();
  const lastName = String(raw.lastName ?? '').trim();
  if (!firstName && !lastName) return null;

  const teamNickname = typeof raw.team === 'string' ? raw.team : '';
  const team = EA_TEAMS[teamNickname];
  const asset = String(raw.plyrAssetname ?? '');

  const ratings: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (IDENTITY_FIELDS.has(key)) continue;
    if (typeof value === 'number' || typeof value === 'string') ratings[key] = value;
  }

  const overall =
    toNumber(raw.overall_rating) ?? toNumber(raw.overallRating) ?? toNumber(raw.ovr) ?? 60;

  return {
    id: asset || `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, '-'),
    firstName,
    lastName,
    position: String(raw.position ?? '').trim() || 'UNKNOWN',
    jersey: toNumber(raw.jerseyNum),
    teamId: team?.abbr ?? null,
    overall,
    age: ageFromBirthdate(raw.plyrBirthdate),
    heightInches: toNumber(raw.height),
    weightLbs: toNumber(raw.weight),
    college: typeof raw.college === 'string' ? raw.college : null,
    salary: toNumber(raw.totalSalary),
    ratings,
  };
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json', 'user-agent': 'madden-franchise-manager/0.1' },
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response.json();
}

/**
 * Fetch every player for a season.
 *
 * The endpoint paginates with `limit`/`offset` (max 1000 per response) and
 * otherwise silently returns only the first 65 rows, which is exactly the kind of
 * thing that makes an import look successful while dropping 97% of the league.
 */
async function fetchAllPages(
  slug: string,
  fetchImpl: typeof fetch,
  notes: string[],
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset < 20_000; offset += PAGE_SIZE) {
    const url = `${API_ROOT}/${slug}?limit=${PAGE_SIZE}&offset=${offset}`;
    const json = (await fetchJson(url, fetchImpl)) as EaResponse;
    const docs = Array.isArray(json.docs) ? json.docs : [];
    if (docs.length === 0) break;

    let added = 0;
    for (const doc of docs) {
      const key = String(doc.plyrAssetname ?? `${doc.firstName}-${doc.lastName}-${doc.jerseyNum}-${doc.team}`);
      if (seen.has(key)) continue;
      seen.add(key);
      all.push(doc);
      added += 1;
    }
    if (added === 0) break;
    if (json.count && all.length >= json.count) break;
    if (json.count) notes.push(`Fetched ${all.length}/${json.count} players...`);
  }

  return all;
}

interface EaResponse {
  count?: number;
  docs?: Record<string, unknown>[];
}

/**
 * Probe candidate season slugs newest-first and return the first that answers.
 * `m23-ratings` is the known-good shape, so a failure here means EA changed the
 * API or none of the candidate slugs exist yet — both of which we report plainly.
 */
export async function discoverRatingsEndpoint(
  fetchImpl: typeof fetch = fetch,
  preferredSlug?: string,
): Promise<{ slug: string; url: string; docs: Record<string, unknown>[]; notes: string[]; seasonYear: number | null }> {
  const notes: string[] = [];
  const failures: string[] = [];
  const candidates = preferredSlug ? [preferredSlug, ...CANDIDATE_SLUGS] : CANDIDATE_SLUGS;

  for (const slug of candidates) {
    const url = `${API_ROOT}/${slug}`;
    try {
      const json = (await fetchJson(url, fetchImpl)) as EaResponse;
      const firstPage = Array.isArray(json.docs) ? json.docs : [];
      const count = typeof json.count === 'number' ? json.count : null;
      if (firstPage.length === 0 || count === 0) {
        failures.push(`${slug}: no players published`);
        continue;
      }

      if (slug !== candidates[0]) {
        notes.push(
          `Used ${slug}: the newest candidate did not answer. Madden 27 ratings are not published on this endpoint yet, so this is an older season.`,
        );
      }

      const docs = await fetchAllPages(slug, fetchImpl, notes);
      notes.push(`Fetched ${docs.length} of ${count ?? '?'} players for ${slug}.`);
      return { slug, url, docs, notes, seasonYear: seasonYearFromSlug(slug) };
    } catch (error) {
      failures.push(`${slug}: ${(error as Error).message}`);
    }
  }

  throw new Error(
    [
      'Could not reach any EA ratings endpoint.',
      ...failures.map((failure) => `  - ${failure}`),
      '',
      'Fallbacks: scrape the ea.com ratings pages with `npm run scrape:ratings`,',
      'use a ratings mirror such as maddenratings.com, or import from a franchise save file',
      '(`npm run import:save`) once you own the game.',
    ].join('\n'),
  );
}

/** `m24-ratings` -> 2023 (the season a Madden 24 ratings set describes). */
function seasonYearFromSlug(slug: string): number | null {
  const match = /m(\d{2})-ratings/.exec(slug);
  if (!match) return null;
  const titleYear = 2000 + Number(match[1]);
  return titleYear - 1;
}

export interface FetchRatingsOptions {
  fetchImpl?: typeof fetch;
  /** Where to save the raw response for later re-imports. */
  artifactDir?: string | null;
  /** Force a season slug, e.g. `m27-ratings`. */
  slug?: string;
}

export async function fetchRatings(options: FetchRatingsOptions = {}): Promise<RatingsImportResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const { slug, url, docs, notes, seasonYear } = await discoverRatingsEndpoint(
    fetchImpl,
    options.slug,
  );

  const players: EaRatingsPlayer[] = [];
  let skipped = 0;
  for (const doc of docs) {
    const normalized = normalizeEaPlayer(doc);
    if (normalized) players.push(normalized);
    else skipped += 1;
  }
  if (skipped) notes.push(`Skipped ${skipped} rows with no usable name.`);

  const withTeams = new Set(players.map((player) => player.teamId).filter(Boolean));
  notes.push(`${withTeams.size} teams represented; ${players.length} players parsed.`);

  let artifactPath: string | null = null;
  if (options.artifactDir !== null) {
    const dir = options.artifactDir ?? path.join(process.cwd(), 'data', 'imports');
    await mkdir(dir, { recursive: true });
    artifactPath = path.join(dir, `ea-ratings-${slug}.json`);
    await writeFile(artifactPath, JSON.stringify({ slug, url, fetchedAt: new Date().toISOString(), docs }, null, 0));
    notes.push(`Raw response saved to ${path.relative(process.cwd(), artifactPath)}.`);
  }

  return { slug, url, players, teams: withTeams.size, artifactPath, notes, seasonYear };
}

/** Load a previously saved artifact instead of hitting the network. */
export async function fetchRatingsFromArtifact(filePath: string): Promise<RatingsImportResult> {
  const { readFile } = await import('node:fs/promises');
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as {
    slug: string;
    url: string;
    docs: Record<string, unknown>[];
  };
  const players = parsed.docs
    .map(normalizeEaPlayer)
    .filter((player): player is EaRatingsPlayer => player !== null);
  return {
    slug: parsed.slug,
    url: parsed.url,
    players,
    teams: new Set(players.map((p) => p.teamId).filter(Boolean)).size,
    artifactPath: filePath,
    notes: [`Loaded from artifact ${filePath}.`],
    seasonYear: seasonYearFromSlug(parsed.slug),
  };
}

export function eaTeamRows(): {
  id: string;
  name: string;
  abbr: string;
  conference: string;
  division: string;
  source: string;
}[] {
  return Object.values(EA_TEAMS).map((team) => ({
    id: team.abbr,
    name: team.name,
    abbr: team.abbr,
    conference: team.conference,
    division: team.division,
    source: 'ea-ratings',
  }));
}
