import { DEPTH_SLOTS } from './depthSlots';
import type { DepthChartState, DepthSlot } from './types';

/**
 * A plausible depth chart for a real roster.
 *
 * Rosters arrive from the ratings import as a flat player list with no chart at
 * all, so this derives one from what the game itself uses: **position and
 * overall**.
 *
 * The rules, in order:
 *
 * 1. **Primary roles first.** The best eligible player takes each roster position —
 *    best QB at `QB`, best corner at `CB` — and no man holds two starting jobs.
 * 2. **Package roles are the next man up.** With the primary jobs taken, each of
 *    Madden's package roles gets the best eligible player still available, in the
 *    game's own depth order: `SLWR` ends up the second receiver, `SLCB` the second
 *    corner, `3DRB` the second back, `PWHB` the third, `RLE` the second edge.
 *    `KOS` mirrors the kicker, because the kicker is who kicks off.
 * 3. **Returners are the fastest men left.** Kick and punt return are ordered by
 *    published speed where we have it; the punt returner gets the next man because
 *    the kick returner took the first.
 * 4. **Backups spread.** Every remaining rank goes to the best eligible player not
 *    already on that line, preferring men who are not backing up somewhere else.
 *
 * What this is **not**: Madden's chart. The feed publishes no depth chart, no roster
 * status and no practice squad, so every player in the list is treated as available,
 * and the result is a starting point to edit — exactly as `RATINGS.md` §6.6 asks.
 */

export interface ChartCandidate {
  id: string;
  /** Primary position, e.g. `WR`, `LEDG`, `MIKE`. */
  position: string;
  overall: number;
  /** Published speed, when the ratings map has it (used for returners only). */
  speed?: number | null;
}

export interface SeededChart {
  entries: DepthChartState['entries'];
  /** Roles left empty, with no eligible player. */
  empty: string[];
  /** Distinct men holding a starting job. */
  starters: number;
  notes: string[];
}

/** Package roles that field the same man as a primary role. */
const MIRRORS: Record<string, string> = {
  KOS: 'K',
};

/**
 * Which position a package role is a package *of*, most specific first.
 *
 * A package slot has no players of its own — nobody's position is `RLE` — so the
 * role has to say what it is an alternative to, or it reads the whole eligible list
 * by overall and hands a rush end job to the best defensive tackle. Our reading of
 * each role, not a fact from the game.
 */
const PACKAGE_POSITIONS: Record<string, string[]> = {
  '3DRB': ['HB', 'FB'],
  PWHB: ['HB', 'FB'],
  SLWR: ['WR'],
  GAD: ['WR', 'HB', 'TE', 'QB', 'FB'],
  NT: ['NT', 'DT'],
  RDT: ['DT', 'NT'],
  RLE: ['LEDG', 'DT'],
  RRE: ['REDG', 'DT'],
  SUBLB: ['MIKE', 'WILL', 'SAM'],
  SLCB: ['CB'],
  KR: ['WR', 'CB', 'HB'],
  PR: ['WR', 'CB', 'HB'],
};

/** How central a player's position is to a role: 0 is the position itself. */
function positionRank(slot: DepthSlot, position: string): number {
  if (slot.situational) {
    const index = PACKAGE_POSITIONS[slot.code]?.indexOf(position) ?? -1;
    if (index >= 0) return index;
  }
  return position === slot.code ? 0 : 1;
}

function byPositionFit(slot: DepthSlot, a: ChartCandidate, b: ChartCandidate): number {
  const rankA = positionRank(slot, a.position);
  const rankB = positionRank(slot, b.position);
  if (rankA !== rankB) return rankA - rankB;
  if (b.overall !== a.overall) return b.overall - a.overall;
  return a.id.localeCompare(b.id);
}

function byReturnSkill(a: ChartCandidate, b: ChartCandidate): number {
  const speedA = a.speed ?? -1;
  const speedB = b.speed ?? -1;
  if (speedB !== speedA) return speedB - speedA;
  if (b.overall !== a.overall) return b.overall - a.overall;
  return a.id.localeCompare(b.id);
}

export function buildTeamDepthChart(candidates: ChartCandidate[]): SeededChart {
  const entries: DepthChartState['entries'] = {};
  const notes: string[] = [];
  const empty: string[] = [];

  /**
   * Players eligible for a role, in the order the role reads them: its own position
   * first, then overall, so the best *actual* corner starts at `CB` rather than the
   * best safety and the rush ends go to edge rushers. Returners read by speed.
   */
  const poolFor = (slot: DepthSlot): ChartCandidate[] => {
    const pool = candidates.filter((candidate) =>
      slot.eligiblePositions.includes(candidate.position),
    );
    return pool.sort((a, b) =>
      slot.code === 'KR' || slot.code === 'PR' ? byReturnSkill(a, b) : byPositionFit(slot, a, b),
    );
  };

  /** Men holding a starting job. Nobody gets two. */
  const starters = new Set<string>();
  /** How many backup lines each man already covers. */
  const backupUses = new Map<string, number>();

  /** Best eligible man who is not starting somewhere else. */
  const claim = (pool: ChartCandidate[]): string | null => {
    const choice = pool.find((candidate) => !starters.has(candidate.id));
    if (!choice) return null;
    starters.add(choice.id);
    return choice.id;
  };

  // 1. Primary roles: one distinct starter each, best eligible first.
  for (const slot of DEPTH_SLOTS) {
    if (slot.situational) continue;
    entries[slot.code] = Array.from({ length: slot.ranks }, () => null);
    const starter = claim(poolFor(slot));
    if (starter) entries[slot.code]![0] = starter;
    else empty.push(slot.code);
  }

  // 2. Package roles: the next man up, and the returners by speed.
  for (const slot of DEPTH_SLOTS) {
    if (!slot.situational) continue;
    entries[slot.code] = Array.from({ length: slot.ranks }, () => null);

    const mirrored = MIRRORS[slot.code] ? entries[MIRRORS[slot.code]!]?.[0] : undefined;
    if (mirrored) {
      entries[slot.code]![0] = mirrored;
      continue;
    }

    const starter = claim(poolFor(slot));
    if (starter) entries[slot.code]![0] = starter;
    else empty.push(slot.code);
  }

  // 3. Backups: never twice on one line, and spread before shared.
  for (const slot of DEPTH_SLOTS) {
    if (MIRRORS[slot.code]) continue;
    const ranked = entries[slot.code] ?? [];
    const pool = poolFor(slot);
    const usedHere = new Set(ranked.filter((id): id is string => Boolean(id)));

    for (let rank = 1; rank < ranked.length; rank += 1) {
      const choice =
        pool.find((player) => !usedHere.has(player.id) && !backupUses.has(player.id)) ??
        pool.find((player) => !usedHere.has(player.id) && (backupUses.get(player.id) ?? 0) < 2) ??
        pool.find((player) => !usedHere.has(player.id)) ??
        null;
      if (!choice) continue;
      ranked[rank] = choice.id;
      usedHere.add(choice.id);
      backupUses.set(choice.id, (backupUses.get(choice.id) ?? 0) + 1);
    }
  }

  const placed = new Set(
    Object.values(entries).flatMap((ranked) => ranked.filter((id): id is string => Boolean(id))),
  );
  const unusedMen = candidates.filter((candidate) => !placed.has(candidate.id)).length;

  notes.push(
    `Seeded from position and overall: ${starters.size} starter(s) across ${
      Object.keys(entries).length - empty.length
    } roles, ${placed.size} of ${candidates.length} players placed.`,
  );
  notes.push(
    'The ratings feed publishes no depth chart or roster status, so every player is treated as available and package roles are simply the next man up at their position. This is a starting point, not Madden\u2019s chart.',
  );
  if (unusedMen > 0) notes.push(`${unusedMen} player(s) did not fit any role.`);
  if (empty.length > 0) notes.push(`No eligible player for: ${empty.join(', ')}.`);

  return { entries, empty, starters: starters.size, notes };
}
