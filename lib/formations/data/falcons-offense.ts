/**
 * Atlanta Falcons stock offense (D022). Formation list crawled from Civil.GG
 * (public, owner-authorized) 2026-10-06. Slot structure follows Civil.GG's public
 * alignment images; the depth-chart inheritance per slot is a provisional
 * (unverified_default) mapping awaiting the owner's per-formation confirm sheet.
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

const BOOK = "nfl-off-falcons";

const mapped: FormationDef[] = [
  mappedFormation(BOOK, "singleback", "Tight Y Off", "tight-y-off", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "singleback", "Wing Slot", "wing-slot", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
    slot("SL", "SL", 78, 16, "receiver", false, inh("WR", 3)),
  ]),
  mappedFormation(BOOK, "singleback", "Y Trips Close", "y-trips-close", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    slot("Z", "Z", 84, 10, "receiver", true, inh("WR", 2)),
    slot("SL1", "SL", 92, 14, "receiver", false, inh("WR", 3)),
    slot("SL2", "SL", 76, 18, "receiver", false, inh("WR", 4)),
    slot("HB", "HB", 50, 30, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "i-form", "Close", "close", [
    qb(16),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("FB", "FB", 50, 26, "back", false, inh("FB", 1)),
    slot("HB", "HB", 50, 36, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Bunch TE", "bunch-te", [
    qb(24),
    ...oline(),
    teLeft(),
    wideLeft(),
    slot("Z", "Z", 84, 10, "receiver", true, inh("WR", 2)),
    slot("SL1", "SL", 90, 15, "receiver", false, inh("WR", 3)),
    slot("SL2", "SL", 78, 19, "receiver", false, inh("WR", 4)),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Trips Y Slot", "trips-y-slot", [
    qb(24),
    ...oline(),
    teLeft(),
    wideLeft(),
    slot("Z", "Z", 84, 10, "receiver", true, inh("WR", 2)),
    slot("SL1", "SL", 92, 14, "receiver", false, inh("WR", 3)),
    slot("SL2", "SL", 78, 18, "receiver", false, inh("WR", 4)),
    slot("HB", "HB", 50, 32, "back", false, inh("HB", 1)),
  ]),
  mappedFormation(BOOK, "gun", "Empty Base Flex", "empty-base-flex", [
    qb(24),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("SL1", "SL", 78, 15, "receiver", false, inh("WR", 3)),
    slot("SL2", "SL", 88, 19, "receiver", false, inh("WR", 4)),
  ]),
  mappedFormation(BOOK, "gun", "Wing Slot Offset", "wing-slot-offset", [
    qb(24),
    ...oline(),
    teLeft(),
    wideLeft(),
    wideRight(),
    slot("HB", "HB", 58, 32, "back", false, inh("HB", 1)),
    slot("SL", "SL", 80, 16, "receiver", false, inh("WR", 3)),
  ]),
];

const unmapped: FormationDef[] = [
  ["singleback", "Tight Y Off Flex", "tight-y-off-flex"],
  ["singleback", "Wing Pair", "wing-pair"],
  ["singleback", "Wing Tight", "wing-tight"],
  ["singleback", "Wing Tight Z", "wing-tight-z"],
  ["i-form", "Slot Stack", "slot-stack"],
  ["i-form", "Y Off Close", "y-off-close"],
  ["weak", "H Close Off", "h-close-off"],
  ["split-backs", "Offset Wing Close", "offset-wing-close"],
  ["pistol", "Bunch", "bunch"],
  ["pistol", "Bunch TE", "bunch-te"],
  ["pistol", "Doubles Hip", "doubles-hip"],
  ["pistol", "Doubles Y Off Stack", "doubles-y-off-stack"],
  ["pistol", "Strong Y Off Close", "strong-y-off-close"],
  ["pistol", "U Off Trips", "u-off-trips"],
  ["pistol", "Wing Slot", "wing-slot"],
  ["gun", "Bunch", "bunch"],
  ["gun", "Bunch Offset", "bunch-offset"],
  ["gun", "Bunch Spread", "bunch-spread"],
  ["gun", "Bunch Wide Nasty", "bunch-wide-nasty"],
  ["gun", "Deuce Close", "deuce-close"],
  ["gun", "Empty Bunch Open", "empty-bunch-open"],
  ["gun", "Empty Bunch Wide", "empty-bunch-wide"],
  ["gun", "Empty Chips Quads", "empty-chips-quads"],
  ["gun", "Normal Off Close Wk", "normal-off-close-wk"],
  ["gun", "Normal Y Off Close", "normal-y-off-close"],
  ["gun", "Spread Y-Slot Wk", "spread-y-slot-wk"],
  ["gun", "Tight Flex", "tight-flex"],
  ["gun", "Tight Open", "tight-open"],
  ["gun", "Tight Y Off", "tight-y-off"],
  ["gun", "Trey Y-Flex", "trey-y-flex"],
  ["gun", "Trips TE Flex", "trips-te-flex"],
  ["gun", "Y Off Trio Close", "y-off-trio-close"],
  ["gun", "Y Off Trips Close", "y-off-trips-close"],
  ["goal-line", "Normal", "normal"],
].map(([set, name, slug]) => unmappedFormation(BOOK, set, name, slug));

export const FALCONS_OFFENSE: FormationDef[] = [...mapped, ...unmapped];
