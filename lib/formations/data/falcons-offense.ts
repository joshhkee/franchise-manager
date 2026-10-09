/**
 * Atlanta Falcons stock offense (D022). Formation list crawled from Civil.GG
 * (public, owner-authorized) 2026-10-06; ALL 42 formations mapped. Slot
 * structure follows the owner-supplied set references (2026-10-06: Y Trips
 * Close alignment sheet) plus madden.tools published personnel groups
 * (e.g. Y Trips Close = 1 RB · 1 TE · 3 WR; the slot receiver is the SLWR list
 * player, matching the reference note "WR3 is also listed as Slot WR 1").
 *
 * QB depth ladder follows the set type: under center y=21 (one yard behind the
 * LOS, per the owner's sheet), pistol y=26, gun y=30. Empty sets field NO
 * running back in the backfield — the RB flexes out as a WB receiver
 * (madden.tools: empty = 11 personnel with the RB split wide). I-Form Slot
 * Stack is 21 personnel (2 RB, 1 TE, 2 WR): TE attached, Z+SL stacked, no
 * isolated X. Every formation fields exactly 11 players.
 * Inheritance defaults remain provisional (unverified_default) pending the
 * owner's per-formation confirm sheet (D113).
 */

import type { FormationDef } from "../types";
import {
  inh,
  mappedFormation,
  oline,
  qb,
  qbUnder,
  slot,
  teLeft,
  teRight,
} from "./slots";

const BOOK = "nfl-off-falcons";

/** Isolated backside X (viewer's far left, offense-left = viewer-left). */
const isolatedX = () => slot("X", "X", 4, 10, "receiver", true, inh("WR", 1));
/** Wide right Z (WR2). */
const zRight = () => slot("Z", "Z", 94, 10, "receiver", true, inh("WR", 2));
/** Slot receiver — the SLWR chart list player (owner reference: WR3 = Slot WR 1). */
const slRight = (x = 78, y = 14) => slot("SL", "SL", x, y, "receiver", false, inh("SLWR", 1));
/** Slot receiver on the LEFT side, just inside the isolated X (Civil.GG Tight Y Off alignment, 2026-10-08). */
const slLeft = (x = 22, y = 15) => slot("SL", "SL", x, y, "receiver", false, inh("SLWR", 1));

const mapped: FormationDef[] = [
  // --- Singleback (under center) ---
  mappedFormation(BOOK, "singleback", "Tight Y Off", "tight-y-off", [
    qbUnder(),
    ...oline(),
    teRight(),
    isolatedX(),
    slLeft(22, 15),
    zRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Wing Slot", "wing-slot", [
    qbUnder(),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(78, 16),
    zRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Y Trips Close", "y-trips-close", [
    qbUnder(),
    ...oline(),
    teRight(),
    isolatedX(),
    slRight(78, 14),
    zRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Tight Y Off Flex", "tight-y-off-flex", [
    qbUnder(),
    ...oline(),
    teRight(),
    isolatedX(),
    slLeft(22, 15),
    zRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Wing Pair", "wing-pair", [
    qbUnder(),
    ...oline(),
    teLeft(),
    slot("TE2", "TE", 20, 16, "tight", false, inh("TE", 2)),
    teRight(),
    isolatedX(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Wing Tight", "wing-tight", [
    qbUnder(),
    ...oline(),
    teLeft(),
    slot("TE2", "TE", 20, 16, "tight", false, inh("TE", 2)),
    teRight(),
    isolatedX(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Wing Tight Z", "wing-tight-z", [
    qbUnder(),
    ...oline(),
    teLeft(),
    slot("TE2", "TE", 20, 16, "tight", false, inh("TE", 2)),
    teRight(),
    zRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  // --- I-form ---
  mappedFormation(BOOK, "i-form", "Close", "close", [
    qbUnder(),
    ...oline(),
    teLeft(),
    isolatedX(),
    zRight(),
    slot("FB", "FB", 50, 29, "back", false, inh("FB", 1)),
    slot("HB", "HB", 50, 37, "back", false, inh("HB", 1)),
  ]),
  // 21 personnel (madden.tools): 2 RB, 1 TE, 2 WR — Z+SL stacked, no isolated X.
  mappedFormation(BOOK, "i-form", "Slot Stack", "slot-stack", [
    qbUnder(),
    ...oline(),
    teLeft(),
    slot("Z", "Z", 88, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 82, 20, "receiver", false, inh("SLWR", 1)),
    slot("FB", "FB", 50, 29, "back", false, inh("FB", 1)),
    slot("HB", "HB", 50, 37, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "i-form", "Y Off Close", "y-off-close", [
    qbUnder(),
    ...oline(),
    slot("TE", "TE", 19, 16, "tight", false, inh("TE", 1)),
    isolatedX(),
    zRight(),
    slot("FB", "FB", 50, 29, "back", false, inh("FB", 1)),
    slot("HB", "HB", 50, 37, "back", false, inh("HB", 1)),
  ]),
  // --- Weak / split backs ---
  mappedFormation(BOOK, "weak", "H Close Off", "h-close-off", [
    qbUnder(),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(84, 14),
    zRight(),
    slot("HB", "HB", 44, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "split-backs", "Offset Wing Close", "offset-wing-close", [
    qbUnder(),
    ...oline(),
    teLeft(),
    isolatedX(),
    zRight(),
    slot("HB", "HB", 44, 30, "back", false, inh("HB", 1)),
    slot("WB", "WB", 62, 26, "back", false, inh("HB", 2)),
  ]),
  // --- Pistol ---
  mappedFormation(BOOK, "pistol", "Bunch TE", "bunch-te", [
    qb(26),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    isolatedX(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "pistol", "Bunch", "bunch", [
    qb(26),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    isolatedX(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "pistol", "Doubles Hip", "doubles-hip", [
    qb(26),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(84, 14),
    zRight(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "pistol", "Doubles Y Off Stack", "doubles-y-off-stack", [
    qb(26),
    ...oline(),
    slot("TE", "TE", 19, 16, "tight", false, inh("TE", 1)),
    isolatedX(),
    slot("Z", "Z", 88, 12, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 94, 18, "receiver", false, inh("SLWR", 1)),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "pistol", "Strong Y Off Close", "strong-y-off-close", [
    qb(26),
    ...oline(),
    slot("TE", "TE", 82, 16, "tight", false, inh("TE", 1)),
    isolatedX(),
    slRight(74, 12),
    zRight(),
    slot("HB", "HB", 56, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "pistol", "U Off Trips", "u-off-trips", [
    qb(26),
    ...oline(),
    slot("TE", "TE", 80, 10, "tight", true, inh("TE", 1)),
    isolatedX(),
    slRight(88, 14),
    zRight(),
    slot("HB", "HB", 66, 28, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "pistol", "Wing Slot", "wing-slot", [
    qb(26),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(78, 16),
    zRight(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  // --- Gun ---
  mappedFormation(BOOK, "gun", "Bunch TE", "bunch-te", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    isolatedX(),
    slot("HB", "HB", 58, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Bunch", "bunch", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    isolatedX(),
    slot("HB", "HB", 58, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Bunch Offset", "bunch-offset", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    isolatedX(),
    slot("HB", "HB", 62, 26, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Bunch Spread", "bunch-spread", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 0, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 8, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    isolatedX(),
    slot("HB", "HB", 58, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Bunch Wide Nasty", "bunch-wide-nasty", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    slot("X", "X", 92, 12, "receiver", true, inh("WR", 1)),
    slot("HB", "HB", 58, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Deuce Close", "deuce-close", [
    qb(30),
    ...oline(),
    teRight(),
    slot("TE2", "TE", 80, 16, "tight", false, inh("TE", 2)),
    slot("Z", "Z", 70, 12, "receiver", false, inh("WR", 2)),
    isolatedX(),
    slot("HB", "HB", 58, 30, "back", false, inh("HB", 1)),
  ]),
  // Empty = no RB in the backfield; the RB flexes out as a WB receiver.
  mappedFormation(BOOK, "gun", "Empty Base Flex", "empty-base-flex", [
    qb(30),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(84, 15),
    zRight(),
    slot("WB", "WB", 78, 16, "receiver", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Empty Bunch Open", "empty-bunch-open", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 14, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    slot("X", "X", 92, 10, "receiver", true, inh("WR", 1)),
    slot("WB", "WB", 78, 16, "receiver", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Empty Bunch Wide", "empty-bunch-wide", [
    qb(30),
    ...oline(),
    slot("Z", "Z", 0, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 8, 14, "receiver", false, inh("SLWR", 1)),
    teLeft(),
    slot("X", "X", 96, 10, "receiver", true, inh("WR", 1)),
    slot("WB", "WB", 80, 18, "receiver", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Empty Chips Quads", "empty-chips-quads", [
    qb(30),
    ...oline(),
    slot("TE", "TE", 72, 10, "tight", true, inh("TE", 1)),
    slot("WB", "WB", 80, 18, "receiver", false, inh("HB", 1)),
    slot("SL", "SL", 88, 14, "receiver", false, inh("SLWR", 1)),
    slot("Z", "Z", 96, 10, "receiver", true, inh("WR", 2)),
    isolatedX(),
  ]),
  mappedFormation(BOOK, "gun", "Normal Off Close Wk", "normal-off-close-wk", [
    qb(30),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(84, 14),
    zRight(),
    slot("HB", "HB", 44, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Normal Y Off Close", "normal-y-off-close", [
    qb(30),
    ...oline(),
    slot("TE", "TE", 19, 16, "tight", false, inh("TE", 1)),
    isolatedX(),
    slRight(84, 14),
    zRight(),
    slot("HB", "HB", 56, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Spread Y-Slot Wk", "spread-y-slot-wk", [
    qb(30),
    ...oline(),
    isolatedX(),
    slot("SL", "SL", 14, 14, "receiver", false, inh("SLWR", 1)),
    slot("TE", "TE", 86, 14, "tight", false, inh("TE", 1)),
    zRight(),
    slot("HB", "HB", 42, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Tight Y Off", "tight-y-off", [
    qb(30),
    ...oline(),
    teRight(),
    isolatedX(),
    slLeft(22, 15),
    zRight(),
    slot("HB", "HB", 58, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Tight Flex", "tight-flex", [
    qb(30),
    ...oline(),
    slot("TE", "TE", 19, 16, "tight", false, inh("TE", 1)),
    isolatedX(),
    slRight(68, 15),
    zRight(),
    slot("HB", "HB", 58, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Tight Open", "tight-open", [
    qb(30),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(70, 15),
    zRight(),
    slot("HB", "HB", 58, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Trey Y-Flex", "trey-y-flex", [
    qb(30),
    ...oline(),
    isolatedX(),
    slot("Z", "Z", 96, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 88, 14, "receiver", false, inh("SLWR", 1)),
    slot("TE", "TE", 78, 18, "tight", false, inh("TE", 1)),
    slot("HB", "HB", 58, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Trips TE Flex", "trips-te-flex", [
    qb(30),
    ...oline(),
    teRight(),
    isolatedX(),
    slRight(76, 18),
    zRight(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Trips Y Slot", "trips-y-slot", [
    qb(30),
    ...oline(),
    teRight(),
    isolatedX(),
    slRight(90, 14),
    zRight(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Wing Slot Offset", "wing-slot-offset", [
    qb(30),
    ...oline(),
    teLeft(),
    isolatedX(),
    slRight(80, 16),
    zRight(),
    slot("HB", "HB", 58, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Y Off Trio Close", "y-off-trio-close", [
    qb(30),
    ...oline(),
    isolatedX(),
    slot("TE", "TE", 80, 18, "tight", false, inh("TE", 1)),
    slot("SL", "SL", 88, 14, "receiver", false, inh("SLWR", 1)),
    zRight(),
    slot("HB", "HB", 56, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Y Off Trips Close", "y-off-trips-close", [
    qb(30),
    ...oline(),
    isolatedX(),
    slot("TE", "TE", 82, 17, "tight", false, inh("TE", 1)),
    slot("SL", "SL", 90, 14, "receiver", false, inh("SLWR", 1)),
    zRight(),
    slot("HB", "HB", 56, 30, "back", false, inh("HB", 1)),
  ]),
  // --- Goal line ---
  // 23 personnel (madden.tools): 2 RB · 3 TE · 0 WR — third TE wings off the left.
  mappedFormation(BOOK, "goal-line", "Normal", "normal", [
    qbUnder(),
    ...oline(),
    teLeft(),
    slot("TE2", "TE", 26, 16, "tight", false, inh("TE", 2)),
    teRight(),
    slot("FB", "FB", 50, 29, "back", false, inh("FB", 1)),
    slot("HB", "HB", 50, 38, "back", false, inh("HB", 1)),
  ]),
];

export const FALCONS_OFFENSE: FormationDef[] = mapped;
