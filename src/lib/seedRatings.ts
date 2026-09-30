/**
 * Synthetic attribute profiles for the demo roster.
 *
 * **These are invented, and the app says so.** The seed roster is already fictional —
 * names, overalls, contracts and dev traits are all made up — and it exists so the app
 * works before you own the game. But `overall` alone cannot answer "does this player fit
 * the scheme", so without attributes the scheme-fit screen would be empty on first run.
 *
 * So we give each demo player a full profile, derived deterministically from his own
 * `overall` and id:
 *
 * - an **archetype**, spread across the ones his position can hold, so the roster shows
 *   a realistic mix rather than 53 clones;
 * - his archetype's **key attributes** clustered around his overall (a few points either
 *   way, stable per player and attribute);
 * - **everything else** well below, the way a corner's run-blocking sits under his
 *   coverage.
 *
 * `npm run import:ratings` replaces all of it with real EA data, at which point nothing
 * here is used for imported players. Every generated row is marked
 * `ratings.demo = true` so a screen can say where a number came from, and the archetype
 * is stored the same way an import stores it so both paths exercise the same resolver.
 */

import {
  ATTRIBUTE_LABELS,
  archetypesForPosition,
  ratingKey,
  type EaAttributeKey,
} from '@/domain/archetypes';

const ALL_ATTRIBUTES = Object.keys(ATTRIBUTE_LABELS) as EaAttributeKey[];

/** FNV-1a, purely so a given player always gets the same profile. */
function hash(value: string): number {
  let h = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** A stable 0..1 for a key, used to jitter one value without touching the others. */
function unit(key: string): number {
  return hash(key) / 0xffffffff;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.round(value), min), max);
}

export interface DemoRatingsInput {
  id: string;
  position: string;
  overall: number;
  /** The authored speed on the seed row, kept verbatim when present. */
  speed?: number;
}

export function demoRatings(input: DemoRatingsInput): Record<string, number | string> {
  const { id, position, overall } = input;
  // `1` rather than `true`: the ratings column holds numbers and strings only.
  const ratings: Record<string, number | string> = { demo: 1 };

  const candidates = archetypesForPosition(position);
  const archetype =
    candidates.length > 0
      ? candidates[Math.floor(unit(`${id}:archetype`) * candidates.length)] ?? candidates[0]
      : undefined;

  if (archetype) {
    // Key attributes track his overall, jittered down more often than up so an
    // average player genuinely misses some of them.
    for (const attribute of archetype.attributes) {
      const swing = Math.round((unit(`${id}:${attribute}`) - 0.58) * 20);
      ratings[ratingKey(attribute)] = clamp(overall + swing, 40, 99);
    }
    ratings.archetype = archetype.id;
  }

  for (const attribute of ALL_ATTRIBUTES) {
    const key = ratingKey(attribute);
    if (key in ratings) continue;
    const swing = Math.round((unit(`${id}:${attribute}`) - 0.5) * 22);
    ratings[key] = clamp(overall - 18 + swing, 25, 95);
  }

  if (input.speed !== undefined) ratings.speed_rating = input.speed;

  return ratings;
}

/** Is this row's attribute detail synthetic? */
export function isDemoRatings(ratings: Record<string, number | string> | null | undefined): boolean {
  return ratings?.demo === 1;
}
