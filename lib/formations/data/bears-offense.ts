/**
 * Chicago Bears stock offense (owner-selected scope, D128). Formation list crawled
 * from Civil.GG (public, owner-authorized) 2026-10-06. Slot structure follows the
 * public alignment images; depth-chart inheritance defaults are provisional
 * (unverified_default) awaiting the per-formation confirm sheet.
 */

import type { FormationDef } from "../types";
import {
  inh,
  mappedFormation,
  oline,
  qb,
  slot,
  teLeft,
  unmappedFormation,
  wideLeft,
  wideRight,
} from "./slots";

const BOOK = "nfl-off-bears";

const mapped: FormationDef[] = [
  mappedFormation(BOOK, "singleback", "Ace Double Wing", "ace-double-wing", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
    slot("WB", "WB", 72, 20, "back", false, inh("HB", 2)),
  ]),
  mappedFormation(BOOK, "singleback", "Deuce Close", "deuce-close", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("HB", "HB", 44, 30, "back", false, inh("HB", 1)),
    slot("RB", "RB", 58, 30, "back", false, inh("HB", 2)),
  ]),
  // U (TE) off the ball + trips trio right; no isolated X (21→11-slot fix).
  mappedFormation(BOOK, "singleback", "U Off Trips", "u-off-trips", [
    qb(16),
    ...oline(),
    slot("TE", "TE", 26, 16, "tight", false, inh("TE", 1)),
    slot("Z", "Z", 84, 10, "receiver", true, inh("WR", 2)),
    slot("SL1", "SL", 92, 14, "receiver", false, inh("WR", 3)),
    slot("SL2", "SL", 78, 18, "receiver", false, inh("WR", 4)),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "i-form", "Y Off Close", "y-off-close", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("FB", "FB", 50, 26, "back", false, inh("FB", 1)),
    slot("HB", "HB", 50, 36, "back", false, inh("HB", 1)),
  ]),
  // Bunch cluster left (Z+SL+TE), X isolated right — 11 personnel (madden.tools).
  mappedFormation(BOOK, "gun", "Bunch X Nasty", "bunch-x-nasty", [
    qb(24),
    ...oline(),
    slot("Z", "Z", 2, 10, "receiver", true, inh("WR", 2)),
    slot("SL", "SL", 9, 15, "receiver", false, inh("WR", 3)),
    teLeft(),
    slot("X", "X", 92, 10, "receiver", true, inh("WR", 1)),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
];

const unmapped: FormationDef[] = [
  ["singleback", "Bunch X Nasty", "bunch-x-nasty"],
  ["singleback", "East Tight", "east-tight"],
  ["singleback", "Tight Doubles", "tight-doubles"],
  ["singleback", "Tight Y Off Flex", "tight-y-off-flex"],
  ["singleback", "U Off Stack", "u-off-stack"],
  ["singleback", "Wing Close", "wing-close"],
  ["singleback", "Wing Pair Heavy", "wing-pair-heavy"],
  ["singleback", "Wing Tight Left", "wing-tight-left"],
  ["i-form", "Wing", "wing"],
  ["strong", "Wing", "wing"],
  ["weak", "Close", "close"],
  ["pistol", "Bunch TE", "bunch-te"],
  ["pistol", "Deuce Close", "deuce-close"],
  ["gun", "Bunch Open TE", "bunch-open-te"],
  ["gun", "Bunch Spread", "bunch-spread"],
  ["gun", "Deuce Close", "deuce-close"],
  ["gun", "Double Stack", "double-stack"],
  ["gun", "Doubles HB Wk", "doubles-hb-wk"],
  ["gun", "Empty Base Trio", "empty-base-trio"],
  ["gun", "Empty Chips Nasty", "empty-chips-nasty"],
  ["gun", "Empty Chips Quads", "empty-chips-quads"],
  ["gun", "Normal Y Off Close", "normal-y-off-close"],
  ["gun", "Slot Right", "slot-right"],
  ["gun", "Spread", "spread"],
  ["gun", "Tight Open", "tight-open"],
  ["gun", "Tight Y Off Wk", "tight-y-off-wk"],
  ["gun", "Trips", "trips"],
  ["gun", "Trips HB Wk", "trips-hb-wk"],
  ["gun", "Trips TE Flex", "trips-te-flex"],
  ["gun", "Trips TE Offset Wk", "trips-te-offset-wk"],
  ["gun", "Wing Flex Offset Wk", "wing-flex-offset-wk"],
  ["gun", "Wing Slot Offset", "wing-slot-offset"],
  ["gun", "Wing Tight Nasty", "wing-tight-nasty"],
  ["gun", "Y Off Trio Wk", "y-off-trio-wk"],
  ["gun", "Y Off Trips", "y-off-trips"],
  ["gun", "Y Off Trips Wk", "y-off-trips-wk"],
  ["goal-line", "Normal", "normal"],
].map(([set, name, slug]) => unmappedFormation(BOOK, set, name, slug));

export const BEARS_OFFENSE: FormationDef[] = [...mapped, ...unmapped];
