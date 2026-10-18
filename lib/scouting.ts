import type { PlaybookRef } from "./formations/types";

export type ScoutingSide = "offense" | "defense";
export type ShortlistKind = "trade_block" | "trade_target";
export type ShortlistStatus = "pinned" | "dismissed";

export interface ScoutPlayer {
  id: string;
  identity: "franchise" | "source";
  fullName: string;
  team: string | null;
  listedPosition: string | null;
  archetype: string | null;
  age: number | null;
  overall: number | null;
  ratings: Record<string, unknown>;
  measurements: Record<string, unknown>;
  rosterStatus?: string;
  sourceRecordId?: string;
  sourceReference?: { sourceId: string; revisionKey: string };
}

export interface ShortlistEntry {
  kind: ShortlistKind;
  identity: "franchise" | "source";
  playerId: string | null;
  sourceRecordId: string | null;
  status: ShortlistStatus;
  note: string | null;
}

export interface ScoutingPreferences {
  offensiveScheme: string | null;
  defensiveScheme: string | null;
  offensiveBookId: string;
  defensiveBookId: string;
}

export interface ScoutingData {
  preferences: ScoutingPreferences;
  roster: ScoutPlayer[];
  targets: ScoutPlayer[];
  shortlist: ShortlistEntry[];
}

const OFFENSE_ROLES: Record<string, string[]> = {
  QB: ["Passing and decision ratings describe different observations; no one field measures complete quarterback play."],
  HB: ["Speed and acceleration are athletic context, not direct measures of vision or ball security."],
  FB: ["Blocking and receiving tasks are distinct; do not collapse them into one fullback grade."],
  WR: ["Acceleration is a burst indicator and speed is a separate field; neither measures route execution or hands by itself."],
  TE: ["A hybrid role: compare blocking and receiving observations separately."],
  LT: ["Pass protection and run blocking are distinct tasks; raw ratings remain separate."],
  LG: ["Interior pass protection and run blocking are distinct tasks; raw ratings remain separate."],
  C: ["Center responsibilities include snapping and communication, which these ratings do not fully measure."],
  RG: ["Interior pass protection and run blocking are distinct tasks; raw ratings remain separate."],
  RT: ["Pass protection and run blocking are distinct tasks; raw ratings remain separate."],
};

const DEFENSE_ROLES: Record<string, string[]> = {
  LEDG: ["Edge pressure and run defense are different tasks; speed alone is not a complete role measure."],
  REDG: ["Edge pressure and run defense are different tasks; speed alone is not a complete role measure."],
  DT: ["Interior disruption, run defense, and strength are separate observations."],
  MIKE: ["Run defense, coverage, and communication are separate responsibilities."],
  SAM: ["Linebacker responsibilities vary with alignment; raw athletic fields do not establish scheme fit."],
  WILL: ["Linebacker responsibilities vary with alignment; raw athletic fields do not establish scheme fit."],
  CB: ["Speed and jumping are athletic context; coverage recognition and assignment execution are not measured here."],
  FS: ["Deep coverage and run support are separate tasks; do not equate safety and corner roles."],
  SS: ["Run support and pass coverage are distinct tasks; alignment changes the role."],
};

/** Evidence-linked language; never emits a composite score or threshold. */
export function roleNotes(position: string | null): string[] {
  if (!position) return ["Listed position is unknown; no position-specific role comparison is available."];
  return (OFFENSE_ROLES[position] ?? DEFENSE_ROLES[position] ?? [
    "No position-specific role note is configured; inspect the raw fields without inferring fit.",
  ]);
}

export const SCOUTING_SOURCES = [
  { label: "NFL combine data by position", url: "https://www.nfl.com/news/what-does-the-combine-data-mean-depends-on-your-position-09000d5d80ecd9a3" },
  { label: "NFL Football Operations terms", url: "https://operations.nfl.com/rules-officiating/nfl-football-basics/football-terms" },
  { label: "EA Madden 27 Franchise deep dive", url: "https://www.ea.com/games/madden-nfl/madden-nfl-27/news/madden-27-franchise-mode" },
] as const;

export const EMPTY_PREFERENCES: ScoutingPreferences = {
  offensiveScheme: null,
  defensiveScheme: null,
  offensiveBookId: "nfl-off-falcons",
  defensiveBookId: "nfl-def-falcons",
};

export function validBook(book: PlaybookRef, side: ScoutingSide): boolean {
  return book.side === side;
}

export function numericRating(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function tradeBlockReasons(player: ScoutPlayer, samePositionCount: number): string[] {
  if (!player.listedPosition) return ["Listed position unknown; positional surplus cannot be assessed."];
  if (samePositionCount <= 1) return ["No same-position surplus in the current roster; no move is suggested."];
  return [`${samePositionCount} active/practice-squad players list ${player.listedPosition}; review depth-chart roles before considering a move.`];
}

export function targetPoolSummary(count: number, position: string): string {
  const cohort = position === "all" ? "catalog" : `${position} catalog`;
  return count < 10
    ? `${count} ${cohort} record${count === 1 ? "" : "s"}; sample is small, so no anomaly label is assigned.`
    : `${count} ${cohort} records. Compare raw published fields; no fit or anomaly score is computed.`;
}
