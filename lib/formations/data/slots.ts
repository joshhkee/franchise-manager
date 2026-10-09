import type { EvidenceTier, FormationDef, FormationSlot, SlotGroup, SlotInheritance } from "../types";

/** Build one formation slot. Coordinates are percent (x: viewer left→right, y: top→bottom). */
export function slot(
  id: string,
  label: string,
  x: number,
  y: number,
  group: SlotGroup,
  onLine: boolean,
  inherits?: SlotInheritance,
  evidence: EvidenceTier = "unverified_default",
): FormationSlot {
  return { id, label, x, y, group, onLine, inherits, evidence };
}

const inh = (position: string, rank: number): SlotInheritance => ({ position, rank });

/** Common offensive alignment slots. Offense-left = viewer-left (owner-attested). */
export const oline = (): FormationSlot[] => [
  slot("LT", "LT", 20, 10, "oline", true, inh("LT", 1)),
  slot("LG", "LG", 35, 10, "oline", true, inh("LG", 1)),
  slot("C", "C", 50, 10, "oline", true, inh("C", 1)),
  slot("RG", "RG", 65, 10, "oline", true, inh("RG", 1)),
  slot("RT", "RT", 80, 10, "oline", true, inh("RT", 1)),
];

export const qb = (y: number): FormationSlot => slot("QB", "QB", 50, y, "qb", y <= 16, inh("QB", 1));
/** Under-center QB: one yard behind the LOS (image-measured from the owner's set sheet). */
export const qbUnder = (): FormationSlot => slot("QB", "QB", 50, 21, "qb", false, inh("QB", 1));
export const wideLeft = (): FormationSlot => slot("X", "X", 4, 10, "receiver", true, inh("WR", 1));
export const wideRight = (): FormationSlot => slot("Z", "Z", 96, 10, "receiver", true, inh("WR", 2));
/**
 * Attached tight ends, just OUTSIDE the tackles (owner's Y Trips Close sheet).
 * The O-line renders as a cohesive chain spanning x 30–70, so x 19/81 sit one
 * marker-gap outside the reflowed tackles — attached, not detached.
 */
export const teLeft = (): FormationSlot => slot("TE", "TE", 19, 10, "tight", true, inh("TE", 1));
export const teRight = (): FormationSlot => slot("TE", "TE", 81, 10, "tight", true, inh("TE", 1));

/** Unmapped formation: catalog reference only (Civil.GG), honest pending state. */
export function unmappedFormation(
  bookId: string,
  set: string,
  name: string,
  slug: string,
): FormationDef {
  return {
    id: `${bookId}:${set}:${slug}`,
    bookId,
    set,
    slug,
    name,
    side: bookId.includes("-off-") ? "offense" : "defense",
    civilPath: `/playbooks/team/nfl/${bookId.includes("-off-") ? "offense" : "defense"}/${bookId.replace(/^(nfl|alt)-(off|def)-/, "")}/${set}/${slug}`,
    status: "unmapped",
    slots: [],
  };
}

export function mappedFormation(
  bookId: string,
  set: string,
  name: string,
  slug: string,
  slots: FormationSlot[],
): FormationDef {
  return {
    id: `${bookId}:${set}:${slug}`,
    bookId,
    set,
    slug,
    name,
    side: bookId.includes("-off-") ? "offense" : "defense",
    civilPath: `/playbooks/team/nfl/${bookId.includes("-off-") ? "offense" : "defense"}/${bookId.replace(/^(nfl|alt)-(off|def)-/, "")}/${set}/${slug}`,
    status: "mapped",
    slots,
  };
}

export { inh };
