/**
 * Atlanta Falcons stock defense (D022). Formation list crawled from Civil.GG
 * (public, owner-authorized) 2026-10-06. Defense diagrams are drawn from the
 * offense's view (owner-attested, D128): D-line at BOTTOM, defense-left on the
 * viewer's RIGHT. Inheritance defaults are provisional (unverified_default).
 */

import type { FormationDef } from "../types";
import { inh, mappedFormation, slot, unmappedFormation } from "./slots";

const BOOK = "nfl-def-falcons";

/** D-line at bottom; defense's LEFT end sits on the viewer's RIGHT (mirrored). */
const front34 = () => [
  slot("LE", "LE", 72, 90, "dline", true, inh("LEDG", 1)),
  slot("NT", "NT", 56, 90, "dline", true, inh("NT", 1)),
  slot("RE", "RE", 28, 90, "dline", true, inh("REDG", 1)),
  slot("WILL", "WILL", 20, 72, "linebacker", false, inh("WILL", 1)),
  slot("MIKE", "MIKE", 50, 72, "linebacker", false, inh("MIKE", 1)),
  slot("SAM", "SAM", 80, 72, "linebacker", false, inh("SAM", 1)),
];
const front43 = () => [
  slot("RE", "RE", 28, 90, "dline", true, inh("REDG", 1)),
  slot("DT1", "DT", 44, 90, "dline", true, inh("DT", 1)),
  slot("DT2", "DT", 60, 90, "dline", true, inh("DT", 2)),
  slot("LE", "LE", 76, 90, "dline", true, inh("LEDG", 1)),
  slot("WILL", "WILL", 20, 72, "linebacker", false, inh("WILL", 1)),
  slot("MIKE", "MIKE", 50, 72, "linebacker", false, inh("MIKE", 1)),
  slot("SAM", "SAM", 80, 72, "linebacker", false, inh("SAM", 1)),
];
const secondary43 = () => [
  slot("CB1", "CB", 8, 10, "secondary", false, inh("CB", 1)),
  slot("CB2", "CB", 92, 10, "secondary", false, inh("CB", 2)),
  slot("FS", "FS", 38, 26, "secondary", false, inh("FS", 1)),
  slot("SS", "SS", 62, 26, "secondary", false, inh("SS", 1)),
];
/** Nickel corner replaces a linebacker; slot corner inherits the SLCB chart list. */
const nickel = () => slot("NB", "NB", 68, 26, "secondary", false, inh("SLCB", 1));
const dime = () => slot("DB3", "DB", 30, 26, "secondary", false, inh("SLCB", 2));

const mapped: FormationDef[] = [
  mappedFormation(BOOK, "4-3", "Even 6-1", "even-6-1", [...front43(), ...secondary43()]),
  mappedFormation(BOOK, "nickel", "2-4", "2-4", [
    ...front34().map((s) =>
      s.id === "NT" ? slot("DT", "DT", 56, 90, "dline", true, inh("DT", 1)) : s,
    ),
    slot("WILL", "WILL", 20, 72, "linebacker", false, inh("WILL", 1)),
    slot("MIKE", "MIKE", 50, 72, "linebacker", false, inh("MIKE", 1)),
    ...secondary43(),
    nickel(),
  ]),
  mappedFormation(BOOK, "dime", "2-3-6", "2-3-6", [
    slot("LE", "LE", 72, 90, "dline", true, inh("LEDG", 1)),
    slot("DT", "DT", 56, 90, "dline", true, inh("DT", 1)),
    slot("RE", "RE", 28, 90, "dline", true, inh("REDG", 1)),
    slot("MIKE", "MIKE", 50, 72, "linebacker", false, inh("MIKE", 1)),
    ...secondary43(),
    nickel(),
    dime(),
  ]),
  mappedFormation(BOOK, "goal-line", "6-2", "6-2", [
    slot("RE", "RE", 24, 90, "dline", true, inh("REDG", 1)),
    slot("DT1", "DT", 38, 90, "dline", true, inh("DT", 1)),
    slot("DT2", "DT", 52, 90, "dline", true, inh("DT", 2)),
    slot("DT3", "DT", 66, 90, "dline", true, inh("NT", 1)),
    slot("LE", "LE", 80, 90, "dline", true, inh("LEDG", 1)),
    slot("LB1", "LB", 32, 72, "linebacker", false, inh("SAM", 1)),
    slot("LB2", "LB", 68, 72, "linebacker", false, inh("MIKE", 1)),
    slot("CB1", "CB", 8, 10, "secondary", false, inh("CB", 1)),
    slot("CB2", "CB", 92, 10, "secondary", false, inh("CB", 2)),
  ]),
];

const unmapped: FormationDef[] = [
  ["3-4", "Cub", "cub"],
  ["3-4", "Odd", "odd"],
  ["3-4", "Over", "over"],
  ["3-4", "Under 4 Tech", "under-4-tech"],
  ["3-3-5", "Penny", "penny"],
  ["nickel", "2-4 Dbl Mug", "2-4-dbl-mug"],
  ["nickel", "2-4 Load Dbl Mug", "2-4-load-dbl-mug"],
  ["nickel", "2-4 Load Mug", "2-4-load-mug"],
  ["nickel", "2-4 Single Mug", "2-4-single-mug"],
  ["nickel", "2-4 Wide", "2-4-wide"],
  ["dime", "Rush", "rush"],
].map(([set, name, slug]) => unmappedFormation(BOOK, set, name, slug));

export const FALCONS_DEFENSE: FormationDef[] = [...mapped, ...unmapped];
