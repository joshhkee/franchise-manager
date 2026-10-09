/**
 * C3B special-teams inventory — what is actually knowable from public sources,
 * and what is not (D114 gate, answered as option (a) by D131).
 *
 * Scope decision D131: this checkpoint lists the special-teams sets, their play
 * counts and the named roles, and says plainly that no diagrams are authored.
 * No coordinates are invented, and no source is claimed to publish structured
 * special-teams slots — none does.
 */

export interface SpecialTeamsSource {
  source: string;
  sourceUrl: string;
  observedAt: string;
  evidenceClass: string;
}

export const SPECIAL_TEAMS_SOURCE: SpecialTeamsSource = {
  source: "Madden Tools public Madden 27 database (cross-check source, not the primary catalog source)",
  sourceUrl: "https://madden.tools/playbooks",
  observedAt: "2026-10-09",
  evidenceClass: "public source observation, not in-game verification",
};

export interface SpecialTeamSet {
  id: string;
  label: string;
  /** Plays the source published for this set. */
  plays: number;
  sourceUrl: string;
  /** Roles this set actually fields, as named by the source's own description. */
  roles: string[];
  note: string;
}

/**
 * Every special-teams set the source publishes for Madden 27. The source warns
 * its coverage is still expanding, so a missing set here is a gap in the source,
 * not evidence the set is absent from the game.
 */
export const SPECIAL_TEAMS_SETS: SpecialTeamSet[] = [
  {
    id: "field-goal",
    label: "Field Goal",
    plays: 12,
    sourceUrl: "https://madden.tools/playbooks/formation/special/field-goal",
    roles: ["LS", "K", "H", "Y"],
    note: "One kick / PAT plus eleven fakes that share an identical pre-snap look.",
  },
  {
    id: "punt",
    label: "Punt",
    plays: 9,
    sourceUrl: "https://madden.tools/playbooks/formation/special/punt",
    roles: ["LS", "P"],
    note: "Eight fakes and one straight punt in the published list.",
  },
  {
    id: "punt-tight",
    label: "Punt Tight",
    plays: 3,
    sourceUrl: "https://madden.tools/playbooks/formation/special/punt-tight",
    roles: ["LS", "P"],
    note: "A tighter front than the standard punt set.",
  },
  {
    id: "stop-clock",
    label: "Stop Clock",
    plays: 3,
    sourceUrl: "https://madden.tools/playbooks/formation/special/stop-clock",
    roles: ["K", "H"],
    note: "Late-game clock-stopping package.",
  },
];

/** Sets the game has that no public source publishes: a disclosed gap, not a skip. */
export const SPECIAL_TEAMS_MISSING_SETS: { label: string; detail: string }[] = [
  { label: "Kickoff", detail: "Not published by the cross-check source; absent from the primary catalog too." },
  { label: "Kick return", detail: "Not published; no alignment or role data exists publicly." },
  { label: "Punt return", detail: "Not published; no alignment or role data exists publicly." },
  { label: "Onside kick", detail: "Not published; the source's Field Goal page names the set but has no page for it." },
  { label: "Field goal block", detail: "Not published; the defensive counterpart of the kicking sets is absent." },
  { label: "Extra point", detail: "Not published as its own set." },
  { label: "Two-point conversion", detail: "Not published as its own set." },
];

/** The D131 answer, kept as data so the interface cannot quietly imply otherwise. */
export const SPECIAL_TEAMS_DIAGRAMS = {
  authored: false,
  decision: "D131",
  reason:
    "No public source publishes structured special-teams slots, so coordinates would have to be invented. The owner chose the inventory-plus-roles scope instead: no diagrams for this checkpoint.",
  closes: "The special-teams coverage position stays disclosed through release (C6A, D130).",
} as const;

export interface SpecialTeamsRole {
  key: string;
  label: string;
  /**
   * depth_chart: the role is an existing depth-chart slot, so a player can already
   * be assigned to it. set_role: the source's description names the role inside a
   * set, but there is no depth-chart slot for it and none is invented here.
   */
  availability: "depth_chart" | "set_role";
  detail: string;
}

export const SPECIAL_TEAMS_ROLES: SpecialTeamsRole[] = [
  { key: "K", label: "Kicker", availability: "depth_chart", detail: "Field goals, extra points and kickoffs." },
  { key: "P", label: "Punter", availability: "depth_chart", detail: "Punts and holds." },
  { key: "LS", label: "Long snapper", availability: "depth_chart", detail: "Snaps for kicks and punts." },
  { key: "KOS", label: "Kickoff specialist", availability: "depth_chart", detail: "Kickoff duty, often separate from the field-goal kicker." },
  { key: "PR", label: "Punt returner", availability: "depth_chart", detail: "Receives punts." },
  { key: "KR", label: "Kick returner", availability: "depth_chart", detail: "Receives kickoffs." },
  {
    key: "H",
    label: "Holder",
    availability: "set_role",
    detail: "Named in the Field Goal and Stop Clock set descriptions. No depth-chart slot exists for it.",
  },
  {
    key: "Y",
    label: "Wing",
    availability: "set_role",
    detail: "Named as the Y wing in the Field Goal set description. No depth-chart slot exists for it.",
  },
];

export const SPECIAL_TEAMS_TOTAL_PLAYS = SPECIAL_TEAMS_SETS.reduce((sum, set) => sum + set.plays, 0);
