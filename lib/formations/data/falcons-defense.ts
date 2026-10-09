/**
 * Atlanta Falcons stock defense (D022). Formation list crawled from Civil.GG
 * (public, owner-authorized) 2026-10-06. Defense diagrams are drawn from the
 * offense's view (owner-attested, D128): D-line at BOTTOM, defense-left on the
 * viewer's RIGHT. The 4-3 Even 6-1 alignment follows the owner's in-game
 * reference sheet (2026-10-06): SIX defenders on the line of scrimmage — WILL
 * and SAM stand up at the edges flanking FOUR down linemen (RE–NT–DT–DT), with
 * MIKE stacked alone at A-gap depth behind; safeties sit HIGHER than the
 * corners (FS deepest, SS between the corner level and FS). That is 4 DL /
 * 3 LB / 4 DB = 11 players, exactly as the sheet's personnel note says.
 *
 * Sub-package personnel confirmed against madden.tools / madden-school
 * personnel tables (2026-10-06): Nickel 2-4 = Nickel 2-4-5 (2 interior DL,
 * 4 LB — two stand-up edge backers on the ball, two inside backers over the
 * guards, 5 DB); Dime 2-3-6 = Big Dime 4-1-6 (NT+RDT hands in the dirt, RLE
 * and RRE standing up on the edges, lone MIKE/SUBLB behind, 6 DB); Goal-line
 * 6-2 = 6 DL · 2 LB · 3 DB (CB, FS, SS). Inheritance defaults remain
 * provisional (unverified_default) pending the owner's per-formation confirm
 * sheet (D113); the 3-4 weak rush-backer label "JACK" is provisional too.
 */

import type { FormationDef } from "../types";
import { inh, mappedFormation, slot, unmappedFormation } from "./slots";

const BOOK = "nfl-def-falcons";

/**
 * 4-3 even front, owner's reference sheet: six on the LOS (WILL and SAM at the
 * edges, four linemen inside), MIKE stacked behind. Down linemen are authored
 * so the cohesive-chain reflow centers them at mid-field, reading as an even
 * interior wall between the two stand-up edge backers.
 */
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
/** Nickel corner replaces a linebacker; slot corner inherits the SLCB chart list. */
const nickel = () => slot("NB", "NB", 68, 36, "secondary", false, inh("SLCB", 1));
const dime = () => slot("DB3", "DB", 32, 36, "secondary", false, inh("SLCB", 2));

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

/** 3-4 even front: NG + two DEs on the line, four linebackers behind. */
const front34 = () => [
  slot("LE", "LE", 76, 90, "dline", true, inh("LEDG", 1)),
  slot("NG", "NG", 50, 90, "dline", true, inh("NT", 1)),
  slot("RE", "RE", 24, 90, "dline", true, inh("REDG", 1)),
  slot("WILL", "WILL", 10, 90, "linebacker", true, inh("WILL", 1)),
  slot("SAM", "SAM", 90, 90, "linebacker", true, inh("SAM", 1)),
  slot("MIKE", "MIKE", 38, 74, "linebacker", false, inh("MIKE", 1)),
  slot("JACK", "JACK", 62, 74, "linebacker", false, inh("SAM", 2)),
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
  mappedFormation(BOOK, "dime", "2-3-6", "2-3-6", [
    // Big Dime 4-1-6: NT + DT with hands in the dirt, RLE/RRE standing up on
    // the edges (two-point stance at the LOS), lone MIKE anchoring the second
    // level, six DBs behind.
    slot("RLE", "RLE", 24, 90, "dline", true, inh("LEDG", 1)),
    slot("NT", "NT", 42, 90, "dline", true, inh("NT", 1)),
    slot("DT", "DT", 58, 90, "dline", true, inh("DT", 1)),
    slot("RRE", "RRE", 76, 90, "dline", true, inh("REDG", 1)),
    slot("MIKE", "MIKE", 50, 74, "linebacker", false, inh("MIKE", 1)),
    ...secondary43(),
    nickel(),
    dime(),
  ]),
  mappedFormation(BOOK, "goal-line", "6-2", "6-2", goalLine62()),
  mappedFormation(BOOK, "3-4", "Cub", "cub", [...front34(), ...secondary43()]),
  mappedFormation(BOOK, "3-4", "Odd", "odd", [...front34(), ...secondary43()]),
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
  mappedFormation(BOOK, "3-4", "Under 4 Tech", "under-4-tech", [
    slot("LE", "LE", 78, 90, "dline", true, inh("LEDG", 1)),
    slot("NG", "NG", 54, 90, "dline", true, inh("NT", 1)),
    slot("RE", "RE", 32, 90, "dline", true, inh("REDG", 1)),
    slot("WILL", "WILL", 12, 90, "linebacker", true, inh("WILL", 1)),
    slot("SAM", "SAM", 88, 90, "linebacker", true, inh("SAM", 1)),
    slot("MIKE", "MIKE", 42, 74, "linebacker", false, inh("MIKE", 1)),
    slot("JACK", "JACK", 64, 74, "linebacker", false, inh("SAM", 2)),
    ...secondary43(),
  ]),
  mappedFormation(BOOK, "3-3-5", "Penny", "penny", [
    slot("LE", "LE", 76, 90, "dline", true, inh("LEDG", 1)),
    slot("NG", "NG", 50, 90, "dline", true, inh("NT", 1)),
    slot("RE", "RE", 24, 90, "dline", true, inh("REDG", 1)),
    slot("WILL", "WILL", 10, 90, "linebacker", true, inh("WILL", 1)),
    slot("SAM", "SAM", 90, 90, "linebacker", true, inh("SAM", 1)),
    slot("MIKE", "MIKE", 50, 74, "linebacker", false, inh("MIKE", 1)),
    ...secondary43(),
    nickel(),
  ]),
];

const unmapped: FormationDef[] = [
  ["nickel", "2-4 Dbl Mug", "2-4-dbl-mug"],
  ["nickel", "2-4 Load Dbl Mug", "2-4-load-dbl-mug"],
  ["nickel", "2-4 Load Mug", "2-4-load-mug"],
  ["nickel", "2-4 Single Mug", "2-4-single-mug"],
  ["nickel", "2-4 Wide", "2-4-wide"],
  ["dime", "Rush", "rush"],
].map(([set, name, slug]) => unmappedFormation(BOOK, set, name, slug));

export const FALCONS_DEFENSE: FormationDef[] = [...mapped, ...unmapped];
