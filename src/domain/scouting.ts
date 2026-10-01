/**
 * Scouting the rest of the league.
 *
 * The same grade `/scheme` puts on your own starters, applied to any player on any
 * team, so "who fits what I want to run" has one answer everywhere. Nothing here is
 * new maths: it picks the scheme for a player's side of the ball and hands him to
 * [`gradeRoleFit`](src/domain/schemeFit.ts).
 *
 * Two honest limits, both inherited from the fit engine and repeated in the UI:
 *
 * - A player is graded at his **primary position**, not at a depth-chart role. The
 *   feed publishes no depth chart, so we cannot know that a corner is really his
 *   team's nickel back.
 * - We grade him against **your** schemes, not his current team's. That is the
 *   question a scouting screen exists to answer, but it means a grade is about fit
 *   with your plan, never about how good he is.
 */

import { depthSlot } from './depthSlots';
import { gradeRoleFit, type FitGrade, type RoleFit } from './schemeFit';
import type { Scheme } from './schemes';
import type { Side } from './types';

export interface ScoutingSchemes {
  offense: Scheme | null;
  defense: Scheme | null;
}

export interface ScoutingPlayer {
  position: string;
  ratings?: Record<string, number | string> | null;
  /** A stored archetype code from outside the ratings map, when a row carries one. */
  storedArchetype?: unknown;
}

/** Which side of the ball a primary position plays on. */
export function sideForPosition(position: string): Side | null {
  return depthSlot(position)?.side ?? null;
}

/** The scheme a player is graded against; specialists have none, on purpose. */
export function schemeForPosition(position: string, schemes: ScoutingSchemes): Scheme | null {
  const side = sideForPosition(position);
  if (side === 'offense') return schemes.offense;
  if (side === 'defense') return schemes.defense;
  return null;
}

/** Grade one player against the schemes the owner wants to run. */
export function fitForPlayer(player: ScoutingPlayer, schemes: ScoutingSchemes): RoleFit {
  return gradeRoleFit({
    roleCode: player.position,
    ratings: player.ratings ?? null,
    storedArchetype: player.storedArchetype ?? player.ratings?.archetype,
    scheme: schemeForPosition(player.position, schemes),
  });
}

/** Best fit first, for sorting a scouting table by how well players suit you. */
const FIT_ORDER: Record<FitGrade, number> = {
  ideal: 0,
  strong: 1,
  workable: 2,
  mismatch: 3,
  unrated: 4,
};

export function fitRank(grade: FitGrade): number {
  return FIT_ORDER[grade];
}

export function fitCounts(
  players: ScoutingPlayer[],
  schemes: ScoutingSchemes,
): Record<FitGrade, number> {
  const counts: Record<FitGrade, number> = {
    ideal: 0,
    strong: 0,
    workable: 0,
    mismatch: 0,
    unrated: 0,
  };
  for (const player of players) counts[fitForPlayer(player, schemes).grade] += 1;
  return counts;
}
