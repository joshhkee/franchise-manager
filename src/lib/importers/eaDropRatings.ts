import { EA_TEAMS, type EaRatingsPlayer, type RatingsImportResult } from './eaRatings';

/**
 * Madden 27 player ratings, from EA's own ratings database.
 *
 * This is the scraper path for the current game. The older `ratings-api.ea.com`
 * endpoint in [`eaRatings.ts`](src/lib/importers/eaRatings.ts) still answers for
 * `m23`/`m24` but publishes nothing for Madden 26 or 27, so the app had no real
 * modern rosters at all. The ratings database the game's own site renders from is a
 * different API — `drop-api.ea.com/rating/madden-nfl` — and it *is* publishing
 * Madden 27 data.
 *
 * ## How we read it, and why it looks like this
 *
 * `drop-api` is behind bot protection: a bare `fetch` from Node is answered with
 * HTTP 200 and an empty result set, which is the worst possible failure mode
 * because it looks like "no players". A real browser context works. So the pull is
 * two layers:
 *
 * 1. **`scripts/scrape-ea-ratings.ts`** drives Playwright against
 *    `ea.com/games/madden-nfl/ratings`, which is server-rendered, and hands the raw
 *    HTML of each page to the parser below. Playwright is a dev dependency and
 *    already used by the playbook scraper; nothing in the app depends on it.
 * 2. **This file** is pure: HTML in, players out. No network, no browser, so the
 *    mapping is unit-testable against a fixture and re-runnable offline against the
 *    committed artifact.
 *
 * ## What the feed gives us, and what it does not
 *
 * It gives real Madden 27 primary positions (`LEDG`/`REDG`/`SAM`/`MIKE`/`WILL`, not
 * the retired `LE`/`RE`/`LOLB` set), EA's real archetype per player, the full 55
 * attribute set, height, weight, age, college, jersey, experience and the player's
 * ability list. It does **not** publish contracts or cap figures — see
 * [`RATINGS.md`](RATINGS.md).
 *
 * ## Two passes, because the free agents only exist in the launch set
 *
 * EA's *weekly* ratings updates only republish players who are on a roster: the
 * Week 2 iteration carries 1,911 rows and none of them are unsigned. The launch
 * iteration (`1-base`) carries the whole game — all 3,111 players, free agents
 * included. So the scraper reads the current iteration first, then the launch set,
 * and this file folds them together: a player the current update has keeps his
 * current numbers, and a player only the launch set knows is added and stamped with
 * `ratingsIteration`, so "this number is from launch" stays visible instead of
 * silently averaging the two.
 */

/** One ratings row, exactly as the API sends it. Only the fields we read are typed. */
export interface DropPlayerRaw {
  id?: number | string;
  firstName?: string;
  lastName?: string;
  height?: number;
  weight?: number;
  overallRating?: number;
  college?: string;
  age?: number;
  jerseyNum?: number;
  yearsPro?: number;
  archetype?: { id?: string; label?: string } | null;
  team?: { id?: number; label?: string } | null;
  position?: {
    id?: string;
    label?: string;
    shortLabel?: string;
    positionType?: { id?: string; name?: string };
  } | null;
  playerAbilities?: { id?: string; label?: string; type?: { id?: string } | null }[] | null;
  stats?: Record<string, { value?: unknown } | unknown> | null;
}

export interface DropIteration {
  id: string;
  label: string;
}

export interface DropMeta {
  /** The ratings update these rows come from, e.g. `madden-ratings-week-2`. */
  iteration: string | null;
  iterations: DropIteration[];
  /** Every primary position the game ships, with EA's own side label. */
  positions: { id: string; shortLabel: string; label: string; side: string }[];
  teams: { id: number; label: string }[];
  /** Ability code -> tier ("xFactor" / "superstarAbility"). */
  abilityTiers: Record<string, string>;
}

export interface DropPage {
  players: EaRatingsPlayer[];
  /** Rows this page carried, before any were dropped as unusable. */
  rowCount: number;
  /** Total players across all pages, per the API. */
  total: number | null;
  iteration: string | null;
  /** Present on every page; captured once by the scraper. */
  meta: DropMeta | null;
}

/** Attribute keys the game actually publishes, minus the identity columns. */
function isAttributeKey(key: string): boolean {
  return key !== 'overall' && key !== 'runningStyle';
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

/** Full team name -> abbreviation, so a `team.label` can become our team id. */
const ABBR_BY_TEAM_NAME = new Map(
  Object.values(EA_TEAMS).map((team) => [team.name.toLowerCase(), team.abbr]),
);

/** Nickname ("Bengals") is the last word of the label; used when a name is unusual. */
function abbrForTeamLabel(label: string | undefined): string | null {
  if (!label) return null;
  const direct = ABBR_BY_TEAM_NAME.get(label.trim().toLowerCase());
  if (direct) return direct;
  const nickname = label.trim().split(/\s+/).pop() ?? '';
  return EA_TEAMS[nickname]?.abbr ?? null;
}

/**
 * Dev trait, as far as the ability list can tell us.
 *
 * An X-Factor ability means X-Factor development; a Superstar ability means
 * Superstar. We stop there rather than guessing: a player with no abilities is
 * reported as `null` (unknown), because Star and Normal development look identical
 * from the outside and mislabelling a Star as Normal would understate a real asset.
 * `franchisePlayers.devTrait` keeps whatever the user sets in the app.
 */
export function devTraitFromAbilities(
  abilities: DropPlayerRaw['playerAbilities'],
): 'xfactor' | 'superstar' | null {
  const tiers = new Set((abilities ?? []).map((ability) => ability.type?.id).filter(Boolean));
  if (tiers.has('xFactor')) return 'xfactor';
  if (tiers.has('superstarAbility')) return 'superstar';
  return null;
}

export function normalizeDropPlayer(raw: DropPlayerRaw): EaRatingsPlayer | null {
  const firstName = String(raw.firstName ?? '').trim();
  const lastName = String(raw.lastName ?? '').trim();
  if (!firstName && !lastName) return null;

  const position = String(raw.position?.id ?? '').trim();
  if (!position) return null;

  const ratings: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(raw.stats ?? {})) {
    if (!isAttributeKey(key)) continue;
    const inner = value && typeof value === 'object' ? (value as { value?: unknown }).value : value;
    const number = toNumber(inner);
    if (number !== null) ratings[`${key}_rating`] = number;
    else if (typeof inner === 'string') ratings[`${key}_rating`] = inner;
  }

  // The archetype rides along in the ratings map because that is where scheme fit
  // already looks for it (`gradeRoleFit` reads `ratings.archetype`), and EA's codes
  // are the exact keys `resolveArchetypeId` understands.
  const archetype = raw.archetype?.id ? String(raw.archetype.id) : null;
  if (archetype) ratings.archetype = archetype;

  const abilities = (raw.playerAbilities ?? [])
    .map((ability) => (ability.label ? String(ability.label) : null))
    .filter((label): label is string => Boolean(label));
  if (abilities.length) ratings.abilities = abilities.join(', ');

  const teamId = abbrForTeamLabel(raw.team?.label);

  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : `${firstName}-${lastName}`.toLowerCase().replace(/\s+/g, '-'),
    firstName,
    lastName,
    position,
    jersey: toNumber(raw.jerseyNum),
    teamId,
    overall: toNumber(raw.overallRating) ?? 60,
    age: toNumber(raw.age),
    heightInches: toNumber(raw.height),
    weightLbs: toNumber(raw.weight),
    college: typeof raw.college === 'string' ? raw.college : null,
    // The feed publishes no contract figures at all; say so rather than inventing one.
    salary: null,
    ratings,
    archetype,
    devTrait: devTraitFromAbilities(raw.playerAbilities),
  };
}

/** The iteration is a string on some responses and an object on others. */
type IterationRef = string | { id?: string; label?: string } | null | undefined;

function iterationIdFrom(value: IterationRef): string | null {
  if (typeof value === 'string' && value.trim() !== '') return value;
  if (value && typeof value === 'object' && typeof value.id === 'string') return value.id;
  return null;
}

interface RatingDetails {
  items?: DropPlayerRaw[];
  totalItems?: number;
  iteration?: IterationRef;
}

interface NextData {
  props?: {
    pageProps?: {
      ratingDetails?: RatingDetails;
      /** Carries the iteration actually being shown, e.g. `{ id, label }`. */
      ratingsFilters?: { iteration?: IterationRef } | null;
      auxData?: { defaultLocaleFilters?: Record<string, unknown> };
      pageProps?: { ratingDetails?: RatingDetails };
    };
  };
}

/**
 * The iteration the page is actually showing.
 *
 * `ratingDetails` does not carry it; the selected filter does. Recorded so an
 * artifact can say which ratings update its rows came from and the scraper can name
 * the file after it, rather than guessing from the page's default.
 */
function effectiveIteration(data: NextData | null): string | null {
  const page = data?.props?.pageProps;
  return (
    iterationIdFrom(page?.ratingsFilters?.iteration) ??
    iterationIdFrom(page?.ratingDetails?.iteration) ??
    null
  );
}

export function extractNextData(html: string): NextData | null {
  const match = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1] as string) as NextData;
  } catch {
    return null;
  }
}

/**
 * The ratings rows sit at `props.pageProps.ratingDetails`, except after client-side
 * navigation, where Next.js nests props once more. Both shapes are real; handle both.
 */
function ratingDetailsOf(data: NextData) {
  const page = data.props?.pageProps;
  return page?.ratingDetails ?? page?.pageProps?.ratingDetails ?? null;
}

export function metaFromHtml(html: string): DropMeta | null {
  const data = extractNextData(html);
  const filters = data?.props?.pageProps?.auxData?.defaultLocaleFilters as
    | {
        iterations?: { id: string; label: string }[];
        positions?: { id: string; shortLabel?: string; label?: string; positionType?: { id?: string } }[];
        teamGroups?: { teams?: { id: number; label: string }[] }[];
        playerAbilities?: { id: string; type?: { id?: string } }[];
      }
    | undefined;
  if (!filters) return null;

  const abilityTiers: Record<string, string> = {};
  for (const ability of filters.playerAbilities ?? []) {
    if (ability.id && ability.type?.id) abilityTiers[ability.id] = ability.type.id;
  }

  return {
    iteration: effectiveIteration(data),
    iterations: (filters.iterations ?? []).map((entry) => ({ id: entry.id, label: entry.label })),
    positions: (filters.positions ?? []).map((entry) => ({
      id: entry.id,
      shortLabel: entry.shortLabel ?? entry.id,
      label: entry.label ?? entry.id,
      side: entry.positionType?.id ?? 'unknown',
    })),
    teams: (filters.teamGroups ?? [])
      .flatMap((group) => group.teams ?? [])
      .map((team) => ({ id: team.id, label: team.label })),
    abilityTiers,
  };
}

export function parseDropPage(html: string): DropPage {
  const data = extractNextData(html);
  const details = data ? ratingDetailsOf(data) : null;
  const rows = details?.items ?? [];

  const players: EaRatingsPlayer[] = [];
  for (const row of rows) {
    const normalized = normalizeDropPlayer(row);
    if (normalized) players.push(normalized);
  }

  return {
    players,
    rowCount: rows.length,
    total: typeof details?.totalItems === 'number' ? details.totalItems : null,
    iteration: effectiveIteration(data),
    meta: metaFromHtml(html),
  };
}

export interface DropRatingsInput {
  pages: DropPage[];
  /**
   * The launch set, read after the current iteration.
   *
   * Rows here are added only when the current update has no row for that player —
   * free agents and unsigned players — and they keep this iteration on their
   * `ratingsIteration` so a launch number is never mistaken for a current one.
   */
  base?: { pages: DropPage[]; iteration: string | null } | null;
  /** Where the rows came from, recorded on the import. */
  source: string;
  iteration: string | null;
  meta?: DropMeta | null;
}

/**
 * Fold scraped pages into the same result shape the older importer returns, so
 * `persistRatings` (and therefore the whole write path) needs no changes.
 */
export function toRatingsImportResult(input: DropRatingsInput): RatingsImportResult {
  const players = new Map<string, EaRatingsPlayer>();
  let dropped = 0;
  for (const page of input.pages) {
    const iteration = input.iteration ?? page.iteration;
    for (const player of page.players) {
      if (players.has(player.id)) dropped += 1;
      players.set(player.id, { ...player, ratingsIteration: iteration });
    }
  }

  let fromBase = 0;
  let baseOverlap = 0;
  for (const page of input.base?.pages ?? []) {
    const iteration = input.base?.iteration ?? page.iteration;
    for (const player of page.players) {
      if (players.has(player.id)) {
        baseOverlap += 1;
        continue;
      }
      players.set(player.id, { ...player, ratingsIteration: iteration });
      fromBase += 1;
    }
  }

  const list = [...players.values()];
  const notes: string[] = [];
  const withTeam = list.filter((player) => player.teamId).length;
  const withArchetype = list.filter((player) => player.archetype).length;
  const withTrait = list.filter((player) => player.devTrait).length;
  const noTeam = list.filter((player) => !player.teamId);

  notes.push(
    `Read ${input.pages.length} page(s): ${input.pages.reduce((sum, page) => sum + page.rowCount, 0)} rows, ${list.length} unique players.`,
  );
  notes.push(
    `${withTeam} players matched a team; ${withArchetype} carry an archetype; ${withTrait} have an ability tier.`,
  );
  if (dropped) notes.push(`${dropped} duplicate row(s) across pages were merged.`);
  if (input.base) {
    notes.push(
      `Launch set (${input.base.iteration ?? 'unlabelled'}): ${input.base.pages.length} page(s) read, ` +
        `${fromBase} player(s) added that the current update does not carry — free agents and unsigned players.` +
        (baseOverlap
          ? ` ${baseOverlap} launch row(s) overlapped the current update and kept their newer numbers.`
          : ''),
    );
  }
  if (noTeam.length > 0) {
    notes.push(
      `${noTeam.length} player(s) have no team row: free agents${input.base ? ' from the launch set' : ''}, or a team label we do not recognise (${noTeam
        .slice(0, 6)
        .map((player) => `${player.firstName} ${player.lastName}`)
        .join(', ')}).`,
    );
  }
  notes.push(
    'Contracts and cap figures are not published by this feed; franchise rows start without them.',
  );

  return {
    slug: input.iteration ?? 'madden-ratings',
    url: input.source,
    players: list,
    teams: new Set(list.map((player) => player.teamId).filter(Boolean)).size,
    artifactPath: null,
    notes,
    seasonYear: 2026,
    // One game's complete league: importing it should clear out any earlier pull
    // (e.g. the Madden 24 dump) rather than leaving two seasons of rosters merged.
    replacesSource: true,
  };
}

/** The artifact shape the scraper writes, so an import can be replayed offline. */
export interface DropArtifact {
  source: string;
  iteration: string | null;
  /**
   * The launch set folded in for the players the weekly update does not publish
   * (free agents). Players carrying this iteration on `ratingsIteration` were
   * merged from it.
   */
  baseIteration?: string | null;
  scrapedAt: string;
  /** How the HTML was read: the browser context (preferred) or Node fetch (fallback). */
  transport?: 'browser' | 'fetch';
  meta: DropMeta | null;
  players: EaRatingsPlayer[];
}

export function artifactToImportResult(artifact: DropArtifact, filePath: string): RatingsImportResult {
  const freeAgents = artifact.players.filter((player) => !player.teamId).length;
  const launchRated = artifact.baseIteration
    ? artifact.players.filter((player) => player.ratingsIteration === artifact.baseIteration).length
    : 0;

  const notes = [
    `Loaded ${artifact.players.length} player(s) from ${filePath} (scraped ${artifact.scrapedAt}${
      artifact.transport ? ` via ${artifact.transport}` : ''
    }).`,
    ...(freeAgents ? [`${freeAgents} of them are unsigned (free agents).`] : []),
    ...(launchRated
      ? [
          `${launchRated} carry launch-set ratings (${artifact.baseIteration}): the weekly updates only republish rostered players.`,
        ]
      : []),
    'Contracts and cap figures are not published by this feed; franchise rows start without them.',
  ];
  return {
    slug: artifact.iteration ?? 'madden-ratings',
    url: artifact.source,
    players: artifact.players,
    teams: new Set(artifact.players.map((player) => player.teamId).filter(Boolean)).size,
    artifactPath: filePath,
    notes,
    seasonYear: 2026,
    replacesSource: true,
  };
}

export function isDropArtifact(value: unknown): value is DropArtifact {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Array.isArray((value as DropArtifact).players) &&
      typeof (value as DropArtifact).scrapedAt === 'string',
  );
}
