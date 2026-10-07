/**
 * C3A formation catalog — types and evidence vocabulary.
 *
 * Every formation carries a stable identity of (bookId, set, slug); a formation
 * name alone is never identity (C0B-v2 §6). Slot coordinates, inheritance, and
 * orientation are data fields with an explicit evidence tier, because the D113
 * in-game supplement is still open: per D128 this catalog is OWNER-ATTESTED
 * (Madden 27 recollection, 2026-10-06) plus Civil.GG observed public data, and
 * nothing may be presented as in-game verified.
 */

export type BookSide = "offense" | "defense";
export type BookKind = "team" | "alternate";

/** One Madden 27 playbook in the game's catalog (Civil.GG observed inventory). */
export interface PlaybookRef {
  /** Stable id, e.g. "nfl-off-falcons", "nfl-def-vikings", "alt-off-west-coast". */
  id: string;
  side: BookSide;
  kind: BookKind;
  teamLabel: string;
  label: string;
  totalPlays: number;
  /** Civil.GG path, kept for provenance and one-click cross-checking. */
  civilPath: string;
}

/**
 * Evidence tiers for catalog facts. Displayed in the UI, never collapsed into a
 * verified claim:
 * - owner_attested: the owner stated it from Madden 27 (recorded in the C3A evidence record).
 * - civil_gg_image: alignment structure corroborated by Civil.GG's public formation image.
 * - unverified_default: a provisional editable mapping; treated as unknown until confirmed.
 */
export type EvidenceTier = "owner_attested" | "civil_gg_image" | "unverified_default";

export const EVIDENCE_LABELS: Record<EvidenceTier, string> = {
  owner_attested: "Owner-attested (Madden 27, not in-game verified)",
  civil_gg_image: "Civil.GG alignment image (public data, unverified)",
  unverified_default: "Provisional mapping — unverified, editable",
};

export type SlotGroup =
  | "oline"
  | "qb"
  | "back"
  | "tight"
  | "receiver"
  | "dline"
  | "linebacker"
  | "secondary";

/** Which depth-chart list and rank a formation slot inherits from (provisional). */
export interface SlotInheritance {
  position: string;
  rank: number;
}

export interface FormationSlot {
  /** Stable within the formation, e.g. "QB", "LT", "X", "SL1", "NB". */
  id: string;
  label: string;
  /** Diagram coordinates in percent: x 0–100 viewer-left→right, y 0–100 top→bottom. */
  x: number;
  y: number;
  group: SlotGroup;
  /** True when the slot is on the line of scrimmage. */
  onLine: boolean;
  inherits?: SlotInheritance;
  evidence: EvidenceTier;
}

export interface FormationDef {
  /** `${bookId}:${set}:${slug}` — stable across sessions and shared with Coach/Gameday later. */
  id: string;
  bookId: string;
  set: string;
  slug: string;
  name: string;
  side: BookSide;
  civilPath: string;
  /** "mapped" = slot data exists (provisional); "unmapped" = catalog reference only. */
  status: "mapped" | "unmapped";
  slots: FormationSlot[];
}

export interface LoadedBook {
  playbook: PlaybookRef;
  formations: FormationDef[];
}

/**
 * Owner-attested orientation conventions (D128, 2026-10-06, Madden 27):
 * offense line at TOP with the offense's left on the viewer's left; defense drawn
 * from the offense's view with the D-line at BOTTOM, so the defense's left appears
 * on the viewer's right. Carried as data with a confidence marker (C0B-v2 §6, IR-9).
 */
export const ORIENTATION = {
  offenseLineAtTop: true,
  defenseLineAtBottom: true,
  offenseLeft: "viewer_left",
  defenseLeft: "viewer_right",
  confidence: "owner_attested",
} as const;

export const ORIENTATION_NOTE =
  "Orientation is owner-attested from Madden 27, not in-game verified: offense line top (offense-left = viewer's left); defense line bottom, drawn as the offense sees it (defense-left = viewer's right).";

/**
 * Split the full FormationDef id (`bookId:set:slug`) into the two columns the
 * database stores (book_id, formation_id). Identity rule: split at the FIRST
 * colon only — the set may itself contain colons-free text, but slug never does,
 * and a name alone is never identity (C0B-v2 §6). Every DB write and every
 * checklist confirm/cancel payload MUST use this split; sending the full app id
 * as formation_id would silently miss the stored rows.
 */
export function splitFormationDbId(fullId: string): { bookId: string; formationId: string } | null {
  const index = fullId.indexOf(":");
  if (index <= 0 || index === fullId.length - 1) return null;
  return { bookId: fullId.slice(0, index), formationId: fullId.slice(index + 1) };
}
