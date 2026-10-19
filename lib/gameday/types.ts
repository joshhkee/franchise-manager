/**
 * Phase 5 (C5A/C5B) — Gameday Call Sheet domain contract, play metadata,
 * situation buckets, play-type families, and rule engine types.
 *
 * Authority:
 * - SPEC.md ("Gameday") & phases/05-gameday.md
 * - DECISIONS.md: D006 (rules-only), D034–D038, D061, D065–D068, D078, D085,
 *   D090, D097, D099, D100, D106, D111, D133 (planned lineup with pending
 *   warnings), D134 (Civil.GG play art + interactive personnel diagram),
 *   D135 (unified call sheet: Play Type + Situation + 3-Call Spotlight).
 */

import type { BookSide } from "../formations/types";

export type GamedaySide = BookSide;

/**
 * Down & Distance / Situation buckets inspired by the owner's reference sheets
 * ("Troy Offense Call Sheet" & "3-4 Shell Defense Call Sheet", D135) and C5A's
 * required fixture matrix.
 */
export type SituationBucketId =
  | "first_10"
  | "second_short"
  | "second_long"
  | "third_short"
  | "third_medium"
  | "third_long"
  | "third_very_long"
  | "fourth_short"
  | "red_zone_open"
  | "red_zone_tight"
  | "goal_line"
  | "backed_up"
  | "two_minute"
  | "four_minute";

export interface SituationBucketSpec {
  id: SituationBucketId;
  shortLabel: string;
  label: string;
  subtitle: string;
  down: 1 | 2 | 3 | 4 | "any";
  distanceRange: [number, number] | null;
  fieldZone: "open" | "backed_up" | "red_zone_20_11" | "red_zone_10_4" | "goal_line";
  phase: "normal" | "two_minute" | "four_minute" | "must_stop";
  coachingTipOffense: string;
  coachingTipDefense: string;
}

export const SITUATION_BUCKETS: readonly SituationBucketSpec[] = [
  {
    id: "first_10",
    shortLabel: "1st & 10",
    label: "1st & 10 — Base Script",
    subtitle: "Open field · stay on schedule",
    down: 1,
    distanceRange: [10, 10],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "Show your base look first. Gain 4+ yards or take an RPO access throw.",
    coachingTipDefense: "Look the same every snap. Match their personnel first, then match the routes.",
  },
  {
    id: "second_short",
    shortLabel: "2nd & 1–3",
    label: "2nd & 1–3 — Shot Down",
    subtitle: "Free play-action or vertical shot",
    down: 2,
    distanceRange: [1, 3],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "An incompletion still leaves 3rd & short. Sell the run fake and take the shot.",
    coachingTipDefense: "Expect play action or a heavy run. Keep deep safety leverage intact.",
  },
  {
    id: "second_long",
    shortLabel: "2nd & 4+",
    label: "2nd & 4+ — Get Back on Schedule",
    subtitle: "Screens, RPOs, high-percentage rhythm",
    down: 2,
    distanceRange: [4, 99],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "Goal is 3rd & 5 or less. Use screens, draws, or quick rhythm — don't take a sack.",
    coachingTipDefense: "Keep everything in front and rally to the catch. Make it 3rd & long.",
  },
  {
    id: "third_short",
    shortLabel: "3rd & 1–2",
    label: "3rd & 1–2 — Short Yardage",
    subtitle: "Heavy gaps, quick flat, or option read",
    down: 3,
    distanceRange: [1, 2],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "6 or fewer in the box: run inside. Stacked box: quick flat or rub concept.",
    coachingTipDefense: "Fill every interior gap and press outside receivers to take away free releases.",
  },
  {
    id: "third_medium",
    shortLabel: "3rd & 3–6",
    label: "3rd & 3–6 — Money Down",
    subtitle: "Take the sticks · man & zone answers",
    down: 3,
    distanceRange: [3, 6],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "Vs Man: mesh, drive, or slants. Vs Zone: stick, snag, or spacing at the sticks.",
    coachingTipDefense: "Robber sits on crossers at the sticks; sim pressure forces a hot read.",
  },
  {
    id: "third_long",
    shortLabel: "3rd & 7–10",
    label: "3rd & 7–10 — Past the Sticks",
    subtitle: "Intermediate levels, dagger, flood",
    down: 3,
    distanceRange: [7, 10],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "Need 10? Throw the 12-yard dig or intermediate flood, not the 5-yard checkdown.",
    coachingTipDefense: "Both edges rush, sub-package DBs match routes, rally and tackle short of the sticks.",
  },
  {
    id: "third_very_long",
    shortLabel: "3rd & 11+",
    label: "3rd & 11+ — Know Where You Are",
    subtitle: "Field-position safe or deep divide",
    down: 3,
    distanceRange: [11, 30],
    fieldZone: "open",
    phase: "normal",
    coachingTipOffense: "Your side of the 50: take the screen or draw for punt room. Plus territory: attack seams.",
    coachingTipDefense: "Keep it all in front with deep shell leverage; don't give up a free chunk or penalty.",
  },
  {
    id: "fourth_short",
    shortLabel: "4th & 1–2",
    label: "4th & 1–2 — Gotta Have It",
    subtitle: "Highest-percentage conversion calls",
    down: 4,
    distanceRange: [1, 2],
    fieldZone: "open",
    phase: "must_stop",
    coachingTipOffense: "Pair your best gap run with a boot/flat play-action constraint.",
    coachingTipDefense: "Sell out on the interior gaps or bring pressure with tight man coverage behind.",
  },
  {
    id: "red_zone_open",
    shortLabel: "Red Zone 20–11",
    label: "Red Zone (20–11) — Field Shrinking",
    subtitle: "High-low corners, fades, red-zone run",
    down: "any",
    distanceRange: null,
    fieldZone: "red_zone_20_11",
    phase: "normal",
    coachingTipOffense: "Vertical grass is compressed: use corner-flat high-lows, inside zone, and rollouts. Never take a sack.",
    coachingTipDefense: "Squeeze the field with split-field match or fire zone; watch the back out of the backfield.",
  },
  {
    id: "red_zone_tight",
    shortLabel: "Red Zone 10–4",
    label: "Tight Red Zone (10–4) — Tight Windows",
    subtitle: "Rubs, slants, stick-nod, power run",
    down: "any",
    distanceRange: null,
    fieldZone: "red_zone_10_4",
    phase: "normal",
    coachingTipOffense: "No room for slow-developing deep routes: use rub crossers, quick slants, or heavy downhill runs.",
    coachingTipDefense: "Tight coverage at the line; pass off bunch rubs and keep edges firm against bootlegs.",
  },
  {
    id: "goal_line",
    shortLabel: "Goal Line (3–1)",
    label: "Goal Line & 2-Point (3 & In)",
    subtitle: "Heavy gaps, play-action flat, sneak",
    down: "any",
    distanceRange: [1, 3],
    fieldZone: "goal_line",
    phase: "normal",
    coachingTipOffense: "Heavy personnel first; pair inside power/dive with play-action waggle/flat to the tight end.",
    coachingTipDefense: "Win the A-gaps first and account for the tight end leaking to the flat.",
  },
  {
    id: "backed_up",
    shortLabel: "Backed Up (1–10)",
    label: "Backed Up (Own 1–10)",
    subtitle: "Create breathing room · no deep drops",
    down: "any",
    distanceRange: null,
    fieldZone: "backed_up",
    phase: "normal",
    coachingTipOffense: "Get out to the 10-yard line. Use downhill runs and quick rhythm throws — no slow end-zone play action.",
    coachingTipDefense: "Pinch the interior gaps, stop the dive, and force a punt from deep in their end zone.",
  },
  {
    id: "two_minute",
    shortLabel: "2-Minute",
    label: "2-Minute / Hurry-Up",
    subtitle: "Sideline access, tempo, protect against explosives",
    down: "any",
    distanceRange: null,
    fieldZone: "open",
    phase: "two_minute",
    coachingTipOffense: "Work the sidelines when out of timeouts; attack the middle only when you can clock or convert.",
    coachingTipDefense: "Stay in a versatile nickel/dime shell you don't need to sub out of; protect the sidelines and deep middle.",
  },
  {
    id: "four_minute",
    shortLabel: "4-Minute",
    label: "4-Minute / Protect Lead",
    subtitle: "Bleed the clock · run & high-completion throws",
    down: "any",
    distanceRange: null,
    fieldZone: "open",
    phase: "four_minute",
    coachingTipOffense: "Stay in bounds, bleed the play clock, and force the defense to burn timeouts.",
    coachingTipDefense: "Fit the run first, bring an extra hat into the box, and rally to the ball carrier.",
  },
] as const;

export const SITUATION_BY_ID: ReadonlyMap<SituationBucketId, SituationBucketSpec> = new Map(
  SITUATION_BUCKETS.map((b) => [b.id, b]),
);

/**
 * Play Type / Family badges matching the call-sheet PDFs:
 * Offense: R (Run), P (Quick/Dropback Pass), RP (RPO), PA (Play Action), S (Screen), M (Move/Boot)
 * Defense: 3 (Cover 3 / 1-High), 4 (Quarters/6/9 Split-Field), 1 (Man / Cover 1), 2 (Cover 2),
 *          SIM (Sim Pressure 4-Rush), 5R (Fire Zone 5-Rush), 0 (Man Blitz / Zero), GL (Goal Line)
 */
export type OffensePlayFamily =
  | "run"
  | "quick_pass"
  | "dropback_pass"
  | "rpo"
  | "play_action"
  | "screen"
  | "move_boot";

export type DefensePlayFamily =
  | "cover_3"
  | "quarters_split"
  | "man_brackets"
  | "cover_2"
  | "sim_pressure"
  | "fire_zone"
  | "man_blitz_zero"
  | "goal_line_front";

export type PlayFamilyId = OffensePlayFamily | DefensePlayFamily;

export interface PlayFamilyMeta {
  id: PlayFamilyId;
  side: GamedaySide;
  badge: string;
  label: string;
  shortDescription: string;
  accentTone: "amber" | "sky" | "emerald" | "violet" | "rose" | "slate";
}

export const PLAY_FAMILIES: readonly PlayFamilyMeta[] = [
  // Offense
  {
    id: "run",
    side: "offense",
    badge: "R",
    label: "Run Game",
    shortDescription: "Inside zone, duo, stretch, power, counter & option reads",
    accentTone: "amber",
  },
  {
    id: "quick_pass",
    side: "offense",
    badge: "P",
    label: "Quick Game",
    shortDescription: "3-step rhythm: stick, spacing, slants, mesh & shallow cross",
    accentTone: "sky",
  },
  {
    id: "dropback_pass",
    side: "offense",
    badge: "DB",
    label: "Dropback / Beat Coverage",
    shortDescription: "Intermediate & vertical concepts: flood, dagger, drive, levels & corners",
    accentTone: "violet",
  },
  {
    id: "rpo",
    side: "offense",
    badge: "RP",
    label: "RPO Menu",
    shortDescription: "Run-pass options: alert bubble, peek slant, glance post & stick",
    accentTone: "emerald",
  },
  {
    id: "play_action",
    side: "offense",
    badge: "PA",
    label: "Play Action & Shots",
    shortDescription: "Sell the run fake to hit crossers, deep posts, and wheel shots",
    accentTone: "rose",
  },
  {
    id: "screen",
    side: "offense",
    badge: "S",
    label: "Screens",
    shortDescription: "Slip screens, jailbreak screens, and WR screens vs heat",
    accentTone: "slate",
  },
  {
    id: "move_boot",
    side: "offense",
    badge: "M",
    label: "Move the Pocket / Boot",
    shortDescription: "Sprint-outs, naked boots, and waggles with a 3-level flood read",
    accentTone: "amber",
  },
  // Defense
  {
    id: "cover_3",
    side: "defense",
    badge: "3",
    label: "Cover 3 · 1-High",
    shortDescription: "Cover 3 Sky, Cloud, Buzz & Match (Rip/Liz) — 8-man box integrity",
    accentTone: "sky",
  },
  {
    id: "quarters_split",
    side: "defense",
    badge: "4",
    label: "Quarters / 6 / 9 · Split-Field",
    shortDescription: "2-high match shells: Cover 4 Quarters, Palms, Cover 6 & Cover 9",
    accentTone: "violet",
  },
  {
    id: "man_brackets",
    side: "defense",
    badge: "1",
    label: "Man · Robber & Brackets",
    shortDescription: "Cover 1 Hole, Robber Press, Cover 2 Man, and Double Bracket calls",
    accentTone: "amber",
  },
  {
    id: "cover_2",
    side: "defense",
    badge: "2",
    label: "Tampa 2 & Invert",
    shortDescription: "Hard/cloud flats with deep half safeties and middle runner",
    accentTone: "emerald",
  },
  {
    id: "sim_pressure",
    side: "defense",
    badge: "SIM",
    label: "Sim Pressure (4 Rush)",
    shortDescription: "Crowded line looks that bring 4 and drop 7 into coverage",
    accentTone: "slate",
  },
  {
    id: "fire_zone",
    side: "defense",
    badge: "5R",
    label: "Zone Pressure (5 Rush)",
    shortDescription: "Bring 5 rushers with 3-deep / 3-under fire-zone coverage behind",
    accentTone: "rose",
  },
  {
    id: "man_blitz_zero",
    side: "defense",
    badge: "0",
    label: "Man Blitz & Zero",
    shortDescription: "5–6 rushers with Cover 1 or Cover 0 man coverage — ball must come out",
    accentTone: "rose",
  },
  {
    id: "goal_line_front",
    side: "defense",
    badge: "GL",
    label: "Goal Line & Short Yardage",
    shortDescription: "Heavy 6-2 and 4-3 Even 6-1 fronts built to win interior gaps",
    accentTone: "amber",
  },
] as const;

export const PLAY_FAMILY_BY_ID: ReadonlyMap<PlayFamilyId, PlayFamilyMeta> = new Map(
  PLAY_FAMILIES.map((f) => [f.id, f]),
);

/** Offensive personnel groupings used for offensive display and defensive matching. */
export type OffensivePersonnelGrouping =
  | "11"
  | "12"
  | "13"
  | "21"
  | "22"
  | "23"
  | "10"
  | "00"
  | "unknown";

/**
 * Alignment look is distinct from personnel grouping (SPEC.md / phases/05-gameday.md):
 * an Empty alignment with 11 personnel (1 RB flexed wide + 1 TE + 3 WR) is NOT 00 personnel!
 */
export type AlignmentLook =
  | "under_center"
  | "pistol"
  | "gun_balanced"
  | "gun_bunch"
  | "gun_trips"
  | "gun_empty"
  | "goal_line";

/**
 * Curated Drive Theme IDs:
 * Three offense themes + three defense themes per D066/D085/C5A, plus extensible custom plan support.
 */
export type OffenseThemeId =
  | "off-under-center-pa"
  | "off-shotgun-quick"
  | "off-motion-misdirection";

export type DefenseThemeId =
  | "def-contain-run"
  | "def-balanced-shell"
  | "def-pressure-contain";

export type DriveThemeId = OffenseThemeId | DefenseThemeId;

export type EvidenceDistinction =
  | "official_game_fact"
  | "civil_gg_catalog"
  | "football_heuristic";

/**
 * One verified play entry in the C5A catalog.
 * Every play comes directly from Civil.GG's observed Madden 27 playbook database
 * (crawled 2026-10-06 / 2026-10-19, D106/D111/D134) and links to a real `FormationDef`
 * in our formation catalog.
 */
export interface CatalogPlay {
  /** Stable play ID: `${bookId}:${formationSlug}:${playSlug}` */
  id: string;
  /** Civil.GG numeric play ID for provenance */
  civilPlayId: number;
  bookId: string;
  side: GamedaySide;
  /** Full FormationDef id (`${bookId}:${set}:${slug}`) */
  formationId: string;
  setName: string;
  formationName: string;
  /** Exact play name as published in Madden 27 / Civil.GG */
  playName: string;
  /** Raw play_type from Civil.GG ("RUN" | "PASS" | "RPO" | "Zone" | "Match" | "Man" | "Blitz") */
  sourcePlayType: string;
  /** Categorized call-sheet family badge */
  family: PlayFamilyId;
  /** Complementary role within a 3-call menu ("anchor" | "constraint" | "shot_or_pressure") */
  complementaryRole: "anchor" | "constraint" | "shot_or_pressure";
  /** Actual offensive personnel grouping for offense plays, or target defensive package label */
  personnelGrouping: OffensivePersonnelGrouping | "base_34" | "base_43" | "nickel" | "dime" | "goal_line";
  /** Alignment look (separates empty alignment from 00 personnel) */
  alignmentLook: AlignmentLook | "front_odd" | "front_even" | "sub_mug" | "sub_nickel" | "sub_dime" | "front_heavy";
  /** Themes this play belongs to */
  themes: DriveThemeId[];
  /** Situation buckets where this play is eligible */
  situations: SituationBucketId[];
  /** Defensive personnel compatibility (for defensive plays: which offensive personnel groupings it safely matches) */
  compatibleOffensePersonnel?: OffensivePersonnelGrouping[];
  /** Whether this defensive call is safe against an Empty alignment (e.g., 5-out threat) */
  safeAgainstEmptyLook?: boolean;
  /** Short call-sheet chip tags (e.g. ["MAN", "C3"], ["5 RUSH"], ["SIM"], ["1-HI"]) */
  tags: string[];
  /** Concise 1-line purpose / coaching cue visible on the short play card (D038) */
  cue: string;
  /** Expandable coaching details — explicitly separated from official game facts (D038, D067) */
  coachingDetails: {
    /** Progression read or defensive key (heuristic) */
    reads: string;
    /** Look / pre-snap disguise partner in the same formation family (heuristic) */
    disguiseAndComplements: string;
    /** When NOT to call it / coverage or front risk (heuristic) */
    risks: string;
    /** Coaching adjustments / pre-snap notes with explicit evidence label */
    adjustmentsNote: string;
  };
  /** Public Civil.GG play art diagram URL (D134, replaceable with text/personnel fallback) */
  playArtUrl: string;
  /** Provenance URL on Civil.GG */
  civilPageUrl: string;
}

export interface DriveThemeTemplate {
  id: DriveThemeId;
  side: GamedaySide;
  defaultBookId: string;
  name: string;
  subtitle: string;
  identitySummary: string;
  /** Why this theme works as a coherent drive approach (heuristic) */
  coachingPhilosophy: string;
  /** Situations intentionally unsupported by this theme (honest grid cells, C5A) */
  intentionallyUnsupportedSituations: {
    situationId: SituationBucketId;
    reason: string;
  }[];
}

/**
 * User-editable customizations per franchise + theme (persisted in C5B migration 0015,
 * backed up in BackupEnvelope).
 */
export interface CustomThemePlan {
  themeId: DriveThemeId;
  customName: string | null;
  customNotes: string | null;
  /** Pinned play IDs (`CatalogPlay.id`) in deterministic user-pinned order */
  pinnedPlayIds: string[];
  /** Pinned formation IDs (`FormationDef.id`) */
  pinnedFormationIds: string[];
}

/**
 * Optional manual context inputs on Gameday (D034, D037, C5A).
 * Absent context stays explicitly "unknown", never fabricated.
 */
export interface GamedayScenarioInput {
  bookId: string;
  side: GamedaySide;
  themeId: DriveThemeId;
  situationId: SituationBucketId;
  /** Optional play-family filter chip ("all" or specific PlayFamilyId) */
  familyFilter?: PlayFamilyId | "all";
  /** Optional defensive/game context */
  offensePersonnel?: OffensivePersonnelGrouping;
  offenseAlignment?: "any" | "empty_look" | "compressed_bunch" | "trips";
  opponentTendency?: "unknown" | "run_heavy" | "quick_pass" | "deep_shot" | "mobile_qb" | "blitz_heavy";
  /** Current-session recently displayed play IDs (resettable, never treated as "used/called" log) */
  recentlyDisplayedPlayIds?: string[];
  /** Rotation step when the user clicks "Refresh 3 Calls" within the same theme & situation */
  refreshSeed?: number;
  /** Saved pins for this theme */
  pinnedPlayIds?: string[];
  pinnedFormationIds?: string[];
}

export interface PendingLineupWarning {
  slotId: string;
  slotLabel: string;
  playerName: string;
  kind: "pending_incoming_trade" | "practice_squad_unpromoted" | "slot_conflict" | "pending_override";
  detail: string;
}

export interface EvaluatedPlayRecommendation {
  play: CatalogPlay;
  isPinnedPlay: boolean;
  isPinnedFormation: boolean;
  wasRecentlyDisplayed: boolean;
  /** Traceable rule explanation for why this call is in the 3-call menu (C5A) */
  reasons: {
    kind: EvidenceDistinction;
    text: string;
  }[];
}

export interface ExcludedPinnedPlay {
  play: CatalogPlay;
  exclusionReason: string;
}

export interface GamedayEvaluationResult {
  bookSupported: boolean;
  unsupportedBookMessage: string | null;
  situationSupportedByTheme: boolean;
  unsupportedSituationMessage: string | null;
  /** Up to THREE complementary eligible calls (fewer if verified pool has <3, never filler) */
  recommendations: EvaluatedPlayRecommendation[];
  /** All eligible plays in the current theme + situation + filters (for the full interactive Call Sheet matrix) */
  allEligiblePlays: CatalogPlay[];
  /** Incompatible pinned favorites retained for browsing but excluded from the suggested menu (D100) */
  incompatiblePinnedPlays: ExcludedPinnedPlay[];
  /** Compatible pinned plays that overflowed the 3-call cap (deterministic tie-break disclosure, C5A) */
  overflowPinnedPlays: CatalogPlay[];
  /** Honest explanation when refresh cannot vary the menu (all-pinned or pool <= 3) */
  varietyExhaustionNote: string | null;
  /** Explicit trace of how unknown/optional inputs were handled */
  contextTrace: string[];
}
