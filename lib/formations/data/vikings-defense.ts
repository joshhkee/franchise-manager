/**
 * Minnesota Vikings stock defense (owner-selected scope, D128). Formation list
 * crawled from Civil.GG (public, owner-authorized) 2026-10-06. Defense diagrams
 * are drawn from the offense's view (owner-attested, D128): D-line at BOTTOM,
 * defense-left on the viewer's RIGHT. Geometry mirrors the owner-corrected
 * Falcons book (2026-10-06 reference sheet): the 4-3 Even 6-1 puts six defenders
 * on the LOS (WILL and SAM standing at the edges, four down linemen inside) with
 * MIKE stacked behind and the safeties HIGHER than the corners. Sub-package
 * personnel follow the madden.tools / madden-school confirmations (Nickel 2-4 =
 * 2-4-5 with 2 interior DL + 4 LB + 5 DB; Goal-line 6-2 = 6 DL · 2 LB · 3 DB).
 * Inheritance defaults are provisional (unverified_default).
 */

import type { FormationDef } from "../types";
import { inh, mappedFormation, slot, unmappedFormation } from "./slots";

const BOOK = "nfl-def-vikings";

/** 4-3 even front, owner's reference sheet: six on the LOS, MIKE stacked behind. */
const front43Even = () => [
  slot("WILL", "WILL", 20, 90, "linebacker", true, inh("WILL", 1)),
  slot("RE", "RE", 26, 90, "dline", true, inh("REDG", 1)),
  slot("NT", "NT", 42, 90, "dline", true, inh("NT", 1)),
  slot("DT1", "DT", 58, 90, "dline", true, inh("DT", 1)),
  slot("DT2", "DT", 74, 90, "dline", true, inh("DT", 2)),
  slot("SAM", "SAM", 80, 90, "linebacker", true, inh("SAM", 1)),
];
const mikeStacked = () => slot("MIKE", "MIKE", 50, 74, "linebacker", false, inh("MIKE", 1));
/** Safeties HIGHER than the corners: FS deepest, SS between CB level and FS. */
const secondary43 = () => [
  slot("FS", "FS", 38, 22, "secondary", false, inh("FS", 1)),
  slot("SS", "SS", 62, 32, "secondary", false, inh("SS", 1)),
  slot("CB1", "CB", 10, 42, "secondary", false, inh("CB", 1)),
  slot("CB2", "CB", 90, 42, "secondary", false, inh("CB", 2)),
];
const nickel = () => slot("NB", "NB", 68, 36, "secondary", false, inh("SLCB", 1));

/** Nickel 2-4-5 (madden.tools): 2 interior DL on the ball, 4 LB, 5 DB. */
const nickel24 = () => [
  slot("DT", "DT", 58, 90, "dline", true, inh("DT", 1)),
  slot("NT", "NT", 42, 90, "dline", true, inh("NT", 1)),
  slot("WILL", "WILL", 20, 90, "linebacker", true, inh("WILL", 1)),
  slot("SAM", "SAM", 80, 90, "linebacker", true, inh("SAM", 1)),
  slot("MIKE", "MIKE", 58, 74, "linebacker", false, inh("MIKE", 1)),
  slot("MIKE2", "MIKE", 42, 74, "linebacker", false, inh("MIKE", 2)),
  ...secondary43(),
  nickel(),
];

/** Goal-line 6-2 (madden-school): 6 DL · 2 LB · 3 DB (CB, FS, SS). */
const goalLine62 = () => [
  slot("LEDG", "LE", 80, 90, "dline", true, inh("LEDG", 1)),
  slot("DT1", "DT", 66, 90, "dline", true, inh("DT", 1)),
  slot("DT2", "DT", 56, 90, "dline", true, inh("DT", 2)),
  slot("NT", "NT", 44, 90, "dline", true, inh("NT", 1)),
  slot("DT3", "DT", 34, 90, "dline", true, inh("DT", 3)),
  slot("REDG", "RE", 20, 90, "dline", true, inh("REDG", 1)),
  slot("MIKE", "MIKE", 50, 74, "linebacker", false, inh("MIKE", 1)),
  slot("WILL", "WILL", 28, 74, "linebacker", false, inh("WILL", 1)),
  slot("CB1", "CB", 12, 44, "secondary", false, inh("CB", 1)),
  slot("FS", "FS", 46, 32, "secondary", false, inh("FS", 1)),
  slot("SS", "SS", 68, 36, "secondary", false, inh("SS", 1)),
];

const mapped: FormationDef[] = [
  mappedFormation(BOOK, "4-3", "Even 6-1", "even-6-1", [
    ...front43Even(),
    mikeStacked(),
    ...secondary43(),
  ]),
  mappedFormation(BOOK, "nickel", "2-4", "2-4", nickel24()),
  mappedFormation(BOOK, "goal-line", "6-2", "6-2", goalLine62()),
  mappedFormation(BOOK, "3-4", "Over", "over", [
    slot("LE", "LE", 70, 90, "dline", true, inh("LEDG", 1)),
    slot("NG", "NG", 52, 90, "dline", true, inh("NT", 1)),
    slot("RE", "RE", 30, 90, "dline", true, inh("REDG", 1)),
    slot("WILL", "WILL", 10, 90, "linebacker", true, inh("WILL", 1)),
    slot("SAM", "SAM", 84, 90, "linebacker", true, inh("SAM", 1)),
    slot("MIKE", "MIKE", 38, 74, "linebacker", false, inh("MIKE", 1)),
    slot("JACK", "JACK", 66, 74, "linebacker", false, inh("SAM", 2)),
    ...secondary43(),
  ]),
];

const unmapped: FormationDef[] = [
  ["3-4", "Even", "even"],
  ["3-4", "Over Ed", "over-ed"],
  ["3-4", "Over Solid", "over-solid"],
  ["3-4", "Tite 5 Tech", "tite-5-tech"],
  ["3-4", "Under", "under"],
  ["4-3", "Odd Leo", "odd-leo"],
  ["3-3-5", "3 High Penny", "3-high-penny"],
  ["4-2-5", "3 High", "3-high"],
  ["nickel", "2-4 Dbl Mug", "2-4-dbl-mug"],
  ["nickel", "2-4 Load Dbl Mug", "2-4-load-dbl-mug"],
  ["nickel", "2-4 Load Mug", "2-4-load-mug"],
  ["nickel", "2-4 Single Mug", "2-4-single-mug"],
  ["nickel", "2-4 Swap Dbl Mug", "2-4-swap-dbl-mug"],
  ["nickel", "2-4 Wide", "2-4-wide"],
  ["nickel", "3-3 Odd", "3-3-odd"],
  ["dime", "1-4", "1-4"],
  ["dime", "1-4 Dbl Mug", "1-4-dbl-mug"],
  ["dime", "2-3-6", "2-3-6"],
  ["dime", "Rush", "rush"],
  ["dime", "Single Mug", "single-mug"],
].map(([set, name, slug]) => unmappedFormation(BOOK, set, name, slug));

export const VIKINGS_DEFENSE: FormationDef[] = [...mapped, ...unmapped];
