/**
 * Source import (C0B-v2 §2, C0A player-source feasibility).
 *
 * Turns the EA Madden 27 Launch ratings iteration into the catalog shape the
 * `app.source_player_records` table stores. Fetching and normalization are pure
 * functions of the payload, so the same input always produces the same records
 * — a re-fetch of an unchanged revision re-imports to nothing.
 *
 * Nothing here mutates a published revision: the database refuses that outside
 * the explicit import window, and the import commands are service-role only.
 */

import {
  classifyRecord,
  normalizeName,
  type Classification,
  type CoverageStatus,
  type ExistingSourceRecord,
  type SourcePlayerLike,
} from "./identity";

/** The published source this importer reads. */
export const SOURCE_NAME = "ea-madden-27";
/** Launch Ratings: the only iteration that holds the whole population, free agents included. */
export const LAUNCH_ITERATION = "1-base";
/** Rows per import round trip; keeps one request small and restartable. */
export const SOURCE_IMPORT_BATCH_SIZE = 400;

const RATINGS_PAGE = "https://www.ea.com/games/madden-nfl/ratings";
const DATA_ROUTE = "en/games/madden-nfl/ratings.json";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const MAX_PAGES = 60;

/** The subset of the published payload this importer reads. */
export interface RawSourcePlayer {
  id: string | number;
  firstName?: string | null;
  lastName?: string | null;
  birthdate?: string | null;
  height?: number | string | null;
  weight?: number | string | null;
  age?: number | null;
  jerseyNum?: number | string | null;
  yearsPro?: number | null;
  college?: string | null;
  /** EA publishes a numeric enum on the live payload (0 left, 1 right). */
  handedness?: number | string | null;
  overallRating?: number | null;
  /** A string in older payloads; the live payload sends `{id, label}`. */
  iteration?: string | { id?: string | null; label?: string | null } | null;
  avatarUrl?: string | null;
  archetype?: { label?: string | null } | null;
  team?: { label?: string | null } | null;
  position?: { shortLabel?: string | null } | null;
  stats?: Record<string, unknown> | null;
  playerAbilities?: unknown[] | null;
}

/** A normalized record, ready for `append_source_records`. */
export interface NormalizedSourcePlayer extends SourcePlayerLike {
  sourceId: string;
  fullName: string;
  normalizedName: string;
  birthdate: string | null;
  team: string | null;
  listedPosition: string | null;
  archetype: string | null;
  measurements: Record<string, unknown>;
  ratings: Record<string, unknown>;
  abilities: unknown[];
  provenance: Record<string, unknown>;
}

export interface MissingFieldEntry {
  field: string;
  missing: number;
}

export interface FetchResult {
  players: RawSourcePlayer[];
  reportedTotal: number | null;
  buildId: string;
}

/**
 * Published text keeps its shape: anything that is not a string is absent,
 * never coerced (`String(1)` would invent the text "1" out of an enum code).
 */
function textOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Handedness is a numeric enum on the live payload. Verified against the
 * publisher's own player pages on 2026-10-04: `1` renders "Handedness Right"
 * (Jessie Bates III, id 13202) and `0` is the left-handed value (Tua
 * Tagovailoa id 20916 and Michael Penix Jr id 14608, both left-handed). Any
 * other value stays unknown rather than guessed.
 */
function handednessOrNull(value: unknown): string | null {
  if (value === 0) return "Left";
  if (value === 1) return "Right";
  return textOrNull(value);
}

/**
 * Birthdates arrive as `M/D/YY` (e.g. `3/1/00`). The century follows the
 * conventional two-digit pivot — 00–29 → 2000s, 30–99 → 1900s — which holds
 * for every record in the observed Launch population except one internally
 * inconsistent source row (id 1817 publishes `8/12/73` with age 22); the raw
 * published string is kept in provenance, so nothing is silently replaced.
 * ISO input passes through unchanged; anything else is absent.
 */
function birthdateOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const shortYear = Number(match[3]);
  const year = shortYear >= 30 ? 1900 + shortYear : 2000 + shortYear;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Keep the iteration's human label (falling back to its id) for provenance. */
function iterationOrNull(value: unknown): string | null {
  if (typeof value === "string") return textOrNull(value);
  if (value !== null && typeof value === "object") {
    const record = value as { label?: unknown; id?: unknown };
    return textOrNull(record.label) ?? textOrNull(record.id);
  }
  return null;
}

/**
 * One published record → one catalog record. Missing values stay absent; nothing
 * is defaulted, recalculated, or inferred (D110, C0B-v2 §3).
 */
export function normalizeSourcePlayer(raw: RawSourcePlayer): NormalizedSourcePlayer {
  const fullName = `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.replace(/\s+/g, " ").trim();
  const ratings: Record<string, unknown> = { ...(raw.stats ?? {}) };
  if (raw.overallRating !== null && raw.overallRating !== undefined) {
    ratings.overallRating = raw.overallRating;
  }

  return {
    sourceId: String(raw.id),
    fullName,
    normalizedName: normalizeName(fullName),
    birthdate: birthdateOrNull(raw.birthdate),
    team: textOrNull(raw.team?.label),
    listedPosition: textOrNull(raw.position?.shortLabel),
    archetype: textOrNull(raw.archetype?.label),
    measurements: {
      height: raw.height ?? null,
      weight: raw.weight ?? null,
      age: raw.age ?? null,
      jerseyNumber: raw.jerseyNum ?? null,
      yearsPro: raw.yearsPro ?? null,
      college: textOrNull(raw.college),
      handedness: handednessOrNull(raw.handedness),
    },
    ratings,
    abilities: raw.playerAbilities ?? [],
    provenance: {
      source: SOURCE_NAME,
      iteration: iterationOrNull(raw.iteration),
      birthdateRaw: textOrNull(raw.birthdate),
      avatarUrl: textOrNull(raw.avatarUrl),
    },
  };
}

/**
 * What the published payload actually omits, as counted facts. A missing value is
 * reported, never filled in, and the report travels with the revision.
 */
export function buildMissingFieldReport(
  players: readonly NormalizedSourcePlayer[],
): MissingFieldEntry[] {
  const entry = (field: string, isMissing: (p: NormalizedSourcePlayer) => boolean): MissingFieldEntry => ({
    field,
    missing: players.filter(isMissing).length,
  });

  return [
    entry("team", (p) => p.team === null),
    entry("archetype", (p) => p.archetype === null),
    entry("birthdate", (p) => p.birthdate === null),
    entry("listedPosition", (p) => p.listedPosition === null),
    entry("measurements.height", (p) => p.measurements.height === null || p.measurements.height === undefined),
    entry("measurements.weight", (p) => p.measurements.weight === null || p.measurements.weight === undefined),
    entry("ratings.overallRating", (p) => p.ratings.overallRating === null || p.ratings.overallRating === undefined),
  ];
}

/**
 * "Complete as imported" describes the fetch, not the game: it is only claimed
 * when the fetch was not truncated and every reported record arrived. Anything
 * less is `partial` — never presented as full game coverage (IR-3).
 */
export function coverageStatusFor(
  players: readonly NormalizedSourcePlayer[],
  reportedTotal: number | null,
): CoverageStatus {
  if (reportedTotal === null) return "partial";
  return players.length === reportedTotal ? "complete_as_imported" : "partial";
}

/**
 * A record that has no sourceId or name match is `new`. When it matches an
 * existing record, CB-1 decides: agreement is `matched`, anything partial,
 * contradictory, or ambiguous is `conflict` for owner disposition (never a
 * silent match). Candidates are narrowed first so classification stays linear.
 */
export function classifyIncoming(
  incoming: SourcePlayerLike,
  existing: readonly ExistingSourceRecord[],
): Classification {
  const name = normalizeName(incoming.fullName);
  const candidates = existing.filter(
    (record) => record.sourceId === incoming.sourceId || normalizeName(record.fullName) === name,
  );

  if (candidates.length === 0) {
    return { outcome: "new", reason: "no_name_or_source_id_match" };
  }

  return classifyRecord(incoming, candidates);
}

/** The import plan the database stores: every record carries its declared outcome. */
export interface PlannedRecord extends NormalizedSourcePlayer {
  reconciliationOutcome: "matched" | "new" | "conflict";
  reconciliationReason: string;
}

export function planImport(
  players: readonly RawSourcePlayer[],
  existing: readonly ExistingSourceRecord[],
): PlannedRecord[] {
  return players.map((raw) => {
    const normalized = normalizeSourcePlayer(raw);
    const classification = classifyIncoming(normalized, existing);
    const planned: PlannedRecord = {
      ...normalized,
      reconciliationOutcome: classification.outcome,
      reconciliationReason: classification.reason,
    };
    return planned;
  });
}

/** Split records into the batches the import command appends. */
export function toBatches<T>(items: readonly T[], size: number = SOURCE_IMPORT_BATCH_SIZE): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

/**
 * Fetch the Launch iteration. A short read is a retryable failure, never an
 * absence: the caller must not record a revision from a truncated fetch.
 */
export async function fetchLaunchPlayers(
  fetchImpl: typeof fetch = fetch,
): Promise<FetchResult> {
  const page = await fetchImpl(RATINGS_PAGE, { headers: { "user-agent": USER_AGENT } });
  if (!page.ok) throw new Error(`Ratings page responded ${page.status}`);
  const html = await page.text();
  const buildId = html.match(/"buildId":"([^"]+)"/)?.[1];
  if (!buildId) throw new Error("Could not find the ratings page build id");

  const players: RawSourcePlayer[] = [];
  let reportedTotal: number | null = null;

  for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber += 1) {
    const url = `https://www.ea.com/_next/data/${buildId}/${DATA_ROUTE}?franchiseSlug=madden-nfl&page=${pageNumber}&iteration=${LAUNCH_ITERATION}`;
    const response = await fetchImpl(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Ratings page ${pageNumber} responded ${response.status}`);

    const payload = (await response.json()) as {
      pageProps?: { ratingDetails?: { items?: RawSourcePlayer[]; totalItems?: number | null } };
    };
    const details = payload.pageProps?.ratingDetails ?? {};
    const items = details.items ?? [];
    reportedTotal = details.totalItems ?? reportedTotal;

    if (items.length === 0) break;
    players.push(...items);
    if (reportedTotal !== null && players.length >= reportedTotal) break;
  }

  if (reportedTotal !== null && players.length < reportedTotal) {
    throw new Error(`Fetched ${players.length} of ${reportedTotal} records; treating as a retryable failure`);
  }

  return { players, reportedTotal, buildId };
}
