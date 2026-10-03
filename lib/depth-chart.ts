/**
 * C2A depth-chart rules — **provisional** planning reference.
 *
 * The exact Madden 27 position labels, order, rank limits, slot eligibility, and
 * specialist reuse are NOT verified: they are the C0A evidence supplement the
 * owner cannot produce without game access (D113/D123). Everything the app
 * enforces or suggests from those rules lives in this one module so the verified
 * supplement can replace it without touching schema, commands, or UI structure.
 *
 * Rules encoded here:
 * - position groups and order: owner planning reference only (DECISIONS.md), not the game enum;
 * - rank limits: conservative provisional depths, clearly labeled and editable in the chart;
 * - eligibility: a player's recorded listed primary position, plus explicitly provisional
 *   cross-position/specialist reuse — a mismatch is disclosed, never silently presented as legal;
 * - practice squad: never silently eligible; a promotion prerequisite is surfaced (D023; C4A owns
 *   real promotion tools, so C2A offers a recorded roster correction instead).
 */

export const DEPTH_CHART_RULES_LABEL =
  "Provisional rules — owner planning reference, not verified against Madden 27 (D113 supplement pending)";

export const DEPTH_CHART_RULES_DETAIL =
  "Position labels, order, rank limits, and eligibility below come from the owner's planning reference. " +
  "They are editable planning help, not the game's actual enum: nothing here is presented as a Madden default.";

export const SUGGESTION_LABEL =
  "Provisional suggestion — sorted by recorded overall rating, not the game's depth chart (D107)";

export type PositionGroup = "offense" | "defense" | "specialists";

export interface PositionSpec {
  key: string;
  label: string;
  group: PositionGroup;
  /** Provisional maximum list depth (structural DB cap is 12; this is the planning limit). */
  maxRank: number;
  /** Owner-reference primary positions this slot may also be filled from (provisional). */
  crossPositions: string[];
  /** Secondary/specialist slots stay manual: no auto-suggestion (D107). */
  manual?: boolean;
  /** The owner reference did not verify what this label means; never guess. */
  unverifiedMeaning?: boolean;
}

export const POSITION_GROUPS: { key: PositionGroup; label: string }[] = [
  { key: "offense", label: "Offense" },
  { key: "defense", label: "Defense" },
  { key: "specialists", label: "Specialists" },
];

/**
 * Owner's reference list (DECISIONS.md "position labels from memory"). Order is
 * provisional and grouped only to make planning readable.
 */
export const POSITIONS: PositionSpec[] = [
  { key: "QB", label: "QB", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "HB", label: "HB", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "FB", label: "FB", group: "offense", maxRank: 3, crossPositions: [] },
  { key: "TE", label: "TE", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "WR", label: "WR", group: "offense", maxRank: 6, crossPositions: [] },
  { key: "LT", label: "LT", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "LG", label: "LG", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "C", label: "C", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "RG", label: "RG", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "RT", label: "RT", group: "offense", maxRank: 5, crossPositions: [] },
  { key: "3DRB", label: "3DRB", group: "offense", maxRank: 2, crossPositions: ["HB"], manual: true },
  { key: "PWHB", label: "PWHB", group: "offense", maxRank: 2, crossPositions: ["HB", "FB"], manual: true },
  { key: "SLWR", label: "SLWR", group: "offense", maxRank: 3, crossPositions: ["WR", "TE"], manual: true },
  {
    key: "GAD",
    label: "GAD",
    group: "offense",
    maxRank: 1,
    crossPositions: [],
    manual: true,
    unverifiedMeaning: true,
  },
  { key: "LEDG", label: "LEDG", group: "defense", maxRank: 5, crossPositions: [] },
  { key: "REDG", label: "REDG", group: "defense", maxRank: 5, crossPositions: [] },
  { key: "DT", label: "DT", group: "defense", maxRank: 5, crossPositions: [] },
  { key: "SAM", label: "SAM", group: "defense", maxRank: 4, crossPositions: [] },
  { key: "MIKE", label: "MIKE", group: "defense", maxRank: 4, crossPositions: [] },
  { key: "WILL", label: "WILL", group: "defense", maxRank: 4, crossPositions: [] },
  { key: "CB", label: "CB", group: "defense", maxRank: 6, crossPositions: [] },
  { key: "SS", label: "SS", group: "defense", maxRank: 4, crossPositions: [] },
  { key: "FS", label: "FS", group: "defense", maxRank: 4, crossPositions: [] },
  { key: "RLE", label: "RLE", group: "defense", maxRank: 2, crossPositions: ["LEDG", "REDG"], manual: true },
  { key: "RRE", label: "RRE", group: "defense", maxRank: 2, crossPositions: ["LEDG", "REDG"], manual: true },
  { key: "RDT", label: "RDT", group: "defense", maxRank: 2, crossPositions: ["DT"], manual: true },
  { key: "NT", label: "NT", group: "defense", maxRank: 2, crossPositions: ["DT"], manual: true },
  {
    key: "SLCB",
    label: "SLCB",
    group: "defense",
    maxRank: 3,
    crossPositions: ["CB", "SAM", "MIKE", "WILL"],
    manual: true,
  },
  {
    key: "SUBLB",
    label: "SUBLB",
    group: "defense",
    maxRank: 2,
    crossPositions: ["SAM", "MIKE", "WILL", "SS"],
    manual: true,
  },
  { key: "K", label: "K", group: "specialists", maxRank: 2, crossPositions: [] },
  { key: "P", label: "P", group: "specialists", maxRank: 2, crossPositions: [] },
  { key: "LS", label: "LS", group: "specialists", maxRank: 2, crossPositions: [] },
  { key: "KOS", label: "KOS", group: "specialists", maxRank: 2, crossPositions: ["K"], manual: true },
  { key: "PR", label: "PR", group: "specialists", maxRank: 3, crossPositions: ["WR", "CB", "HB"], manual: true },
  { key: "KR", label: "KR", group: "specialists", maxRank: 3, crossPositions: ["WR", "CB", "HB"], manual: true },
];

const POSITION_BY_KEY = new Map(POSITIONS.map((spec) => [spec.key, spec]));

export function positionSpec(key: string): PositionSpec | null {
  return POSITION_BY_KEY.get(key) ?? null;
}

export function positionsInGroup(group: PositionGroup): PositionSpec[] {
  return POSITIONS.filter((spec) => spec.group === group);
}

export function groupOf(key: string): PositionGroup | null {
  return positionSpec(key)?.group ?? null;
}

export type RosterStatus = "active" | "practice_squad";

export interface ChartPlayer {
  id: string;
  fullName: string;
  rosterStatus: RosterStatus;
  /** Recorded listed primary position (field baseline), else the source fact, else null. */
  primaryPosition: string | null;
  /** Recorded overall first, then the published source overall; null means unknown, never zero. */
  overall: number | null;
}

export type BlockReason = "position_required" | "position_mismatch" | "practice_squad";

export interface Eligibility {
  ok: boolean;
  blocked: BlockReason | null;
  note: string;
}

/**
 * Whether a player may occupy a position slot under the provisional rules.
 * A negative answer is disclosed in the UI, never converted into a silent skip.
 */
export function eligibilityFor(player: ChartPlayer, position: string): Eligibility {
  if (player.rosterStatus === "practice_squad") {
    return {
      ok: false,
      blocked: "practice_squad",
      note: "Practice squad — a promotion is required before this can be confirmed in game. If you already promoted them, record the roster correction.",
    };
  }

  if (!player.primaryPosition) {
    return {
      ok: false,
      blocked: "position_required",
      note: "No listed primary position is recorded for this player yet.",
    };
  }

  const spec = positionSpec(position);
  const allowed =
    player.primaryPosition === position || (spec?.crossPositions.includes(player.primaryPosition) ?? false);

  if (!allowed) {
    return {
      ok: false,
      blocked: "position_mismatch",
      note: `Listed primary position is ${player.primaryPosition}; the provisional rules do not place them at ${position}. Rules are editable once the C0A supplement lands.`,
    };
  }

  if (spec?.crossPositions.includes(player.primaryPosition) && player.primaryPosition !== position) {
    return {
      ok: true,
      blocked: null,
      note: `Provisionally allowed here as a cross-position/specialist role from ${player.primaryPosition}.`,
    };
  }

  return { ok: true, blocked: null, note: "" };
}

export function maxRankFor(position: string): number {
  return positionSpec(position)?.maxRank ?? 5;
}

/**
 * Provisional initial order for a primary position (D107): eligible active
 * players sorted by overall rating, unknown ratings last, ties by name. Manual
 * (secondary/specialist) slots stay empty for the owner.
 */
export function suggestProvisionalOrder(
  players: ChartPlayer[],
  position: string,
  excludeIds: readonly string[] = [],
): string[] {
  const spec = positionSpec(position);
  if (!spec || spec.manual) return [];

  const exclude = new Set(excludeIds);
  return players
    .filter((player) => !exclude.has(player.id))
    .filter((player) => eligibilityFor(player, position).ok)
    .sort((a, b) => {
      const ao = a.overall ?? Number.NEGATIVE_INFINITY;
      const bo = b.overall ?? Number.NEGATIVE_INFINITY;
      if (ao !== bo) return bo - ao;
      return a.fullName.localeCompare(b.fullName);
    })
    .slice(0, spec.maxRank)
    .map((player) => player.id);
}

export interface PositionDiff {
  changed: boolean;
  added: string[];
  removed: string[];
  moved: string[];
}

/** Pending difference for one position: plan versus recorded baseline. */
export function diffPosition(baseline: readonly string[], plan: readonly string[]): PositionDiff {
  const inBaseline = new Set(baseline);
  const inPlan = new Set(plan);
  const added = plan.filter((id) => !inBaseline.has(id));
  const removed = baseline.filter((id) => !inPlan.has(id));
  const moved = baseline.filter((id, index) => inPlan.has(id) && plan[index] !== id);
  return { changed: added.length > 0 || removed.length > 0 || moved.length > 0, added, removed, moved };
}

export interface ListIssue {
  playerId: string;
  reason: BlockReason;
  note: string;
}

/** Provisional eligibility issues for a whole position list, in list order. */
export function listIssues(
  playersById: ReadonlyMap<string, ChartPlayer>,
  position: string,
  ids: readonly string[],
): ListIssue[] {
  const issues: ListIssue[] = [];
  for (const id of ids) {
    const player = playersById.get(id);
    if (!player) continue;
    const eligibility = eligibilityFor(player, position);
    if (!eligibility.ok && eligibility.blocked) {
      issues.push({ playerId: id, reason: eligibility.blocked, note: eligibility.note });
    }
  }
  return issues;
}
