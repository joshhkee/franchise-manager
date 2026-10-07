import { describe, expect, it } from "vitest";
import type { ChartPlayer } from "../lib/depth-chart";
import { overrideKey, resolveFormation } from "../lib/formations/resolver";
import { FALCONS_OFFENSE } from "../lib/formations/data/falcons-offense";
import { FALCONS_DEFENSE } from "../lib/formations/data/falcons-defense";
import { BEARS_OFFENSE } from "../lib/formations/data/bears-offense";
import { VIKINGS_DEFENSE } from "../lib/formations/data/vikings-defense";
import { inventoryEntries } from "../lib/formations/catalog";
import {
  buildFormationChecklist,
  toConfirmUnits,
} from "../lib/checklist-formation";

const player = (id: string, name: string, position: string, overall = 80): ChartPlayer => ({
  id,
  fullName: name,
  rosterStatus: "active",
  primaryPosition: position,
  overall,
});

const chartLists = {
  QB: { baseline: ["qb1", "qb2"], plan: [] },
  LT: { baseline: ["lt1"], plan: [] },
  LG: { baseline: ["lg1"], plan: [] },
  C: { baseline: ["c1"], plan: [] },
  RG: { baseline: ["rg1"], plan: [] },
  RT: { baseline: ["rt1"], plan: [] },
  TE: { baseline: ["te1"], plan: [] },
  WR: { baseline: ["wr1", "wr2", "wr3", "wr4"], plan: [] },
  // Slot receiver list (crosses WR/TE on the real chart): owner note — WR3 is also Slot WR 1.
  SLWR: { baseline: ["wr3"], plan: [] },
  HB: { baseline: ["hb1", "hb2"], plan: [] },
  FB: { baseline: ["fb1"], plan: [] },
};

const players: ChartPlayer[] = [
  player("qb1", "Matt Ryan", "QB"),
  player("lt1", "Jake Matthews", "LT"),
  player("lg1", "Chris Lindstrom", "LG"),
  player("c1", "Drew Dalman", "C"),
  player("rg1", "Chris Hinton", "RG"),
  player("rt1", "Kaleb McGary", "RT"),
  player("te1", "Kyle Pitts", "TE"),
  player("wr1", "Drake London", "WR"),
  player("wr2", "Darnell Mooney", "WR"),
  player("wr3", "Ray-Ray McCloud", "WR"),
  player("wr4", "Casey Washington", "WR"),
  player("hb1", "Bijan Robinson", "HB"),
  player("hb2", "Tyler Allgeier", "HB"),
  player("fb1", "Keith Smith", "FB"),
  player("squad1", "Practice Squad Guy", "WR"),
];
players[14].rosterStatus = "practice_squad";

const allPlayers = new Map(players.map((p) => [p.id, p]));

function formation(id: string) {
  const found =
    FALCONS_OFFENSE.find((f) => f.id === id) ??
    FALCONS_DEFENSE.find((f) => f.id === id) ??
    BEARS_OFFENSE.find((f) => f.id === id) ??
    VIKINGS_DEFENSE.find((f) => f.id === id);
  if (!found) throw new Error(`formation ${id} not found`);
  return found;
}

describe("formation catalog", () => {
  it("carries all four books with the crawled formation counts", () => {
    expect(FALCONS_OFFENSE).toHaveLength(42);
    expect(FALCONS_OFFENSE.filter((f) => f.id.endsWith(":trips-y-slot"))).toHaveLength(1);
    expect(BEARS_OFFENSE).toHaveLength(42);
    expect(FALCONS_DEFENSE).toHaveLength(15);
    expect(VIKINGS_DEFENSE).toHaveLength(24);
  });

  it("lists the full 86-book inventory with exactly the loaded ones marked", () => {
    const entries = inventoryEntries();
    expect(entries).toHaveLength(86);
    const loaded = entries.filter((entry) => entry.loaded);
    expect(loaded.map((entry) => entry.playbook.id).sort()).toEqual(
      ["nfl-def-falcons", "nfl-def-vikings", "nfl-off-bears", "nfl-off-falcons"].sort(),
    );
  });

  it("keeps formation identity as book:set:slug, never a name alone", () => {
    const falconsWingSlot = FALCONS_OFFENSE.find((f) => f.name === "Wing Slot");
    const bearsDeuce = BEARS_OFFENSE.find((f) => f.name === "Deuce Close");
    expect(falconsWingSlot?.id).toContain("nfl-off-falcons");
    expect(bearsDeuce?.id).toContain("nfl-off-bears");
  });

  it("maps the prioritized second batch with set-scoped identity", () => {
    // The gun Tight Y Off is a distinct formation from the singleback one.
    const singleback = FALCONS_OFFENSE.find((f) => f.id === "nfl-off-falcons:singleback:tight-y-off");
    const gun = FALCONS_OFFENSE.find((f) => f.id === "nfl-off-falcons:gun:tight-y-off");
    expect(singleback?.status).toBe("mapped");
    expect(gun?.status).toBe("mapped");
    expect(gun?.slots.find((s) => s.id === "QB")?.y).toBeGreaterThan(singleback!.slots.find((s) => s.id === "QB")!.y);
    for (const id of [
      "nfl-off-falcons:gun:tight-flex",
      "nfl-off-falcons:gun:tight-open",
      "nfl-off-falcons:gun:trips-te-flex",
      "nfl-off-falcons:pistol:bunch-te",
    ]) {
      const formation = FALCONS_OFFENSE.find((f) => f.id === id);
      expect(formation?.status).toBe("mapped");
      expect(formation?.slots.filter((s) => s.inherits).length).toBeGreaterThan(0);
    }
    // Owner feedback batch: the whole Falcons offense book is now mapped —
    // no honest-pending entries remain on offense.
    expect(FALCONS_OFFENSE.filter((f) => f.status === "mapped")).toHaveLength(42);
    expect(FALCONS_OFFENSE.filter((f) => f.status === "unmapped")).toHaveLength(0);
    expect(FALCONS_OFFENSE).toHaveLength(42);
  });

  it("fields exactly 11 players on every mapped formation in every loaded book", () => {
    for (const book of [FALCONS_OFFENSE, FALCONS_DEFENSE, BEARS_OFFENSE, VIKINGS_DEFENSE]) {
      for (const entry of book.filter((f) => f.status === "mapped")) {
        expect(entry.slots, entry.id).toHaveLength(11);
      }
    }
  });

  it("keeps the unmapped catalog entries honest in the defense books", () => {
    expect(FALCONS_DEFENSE.filter((f) => f.status === "mapped")).toHaveLength(9);
    expect(FALCONS_DEFENSE.filter((f) => f.status === "unmapped")).toHaveLength(6);
    expect(FALCONS_DEFENSE).toHaveLength(15);
    expect(VIKINGS_DEFENSE.filter((f) => f.status === "mapped")).toHaveLength(4);
    expect(VIKINGS_DEFENSE.filter((f) => f.status === "unmapped")).toHaveLength(20);
    expect(VIKINGS_DEFENSE).toHaveLength(24);
  });

  it("matches the owner's Y Trips Close reference sheet (11 players, one slot, TE attached right)", () => {
    const f = formation("nfl-off-falcons:singleback:y-trips-close");
    expect(f.slots).toHaveLength(11);
    // Exactly ONE slot receiver — the SLWR chart list player (owner note:
    // "WR3 is also listed as Slot WR 1"), not a second WR ranking.
    const slSlots = f.slots.filter((s) => s.id.startsWith("SL"));
    expect(slSlots).toHaveLength(1);
    expect(slSlots[0].inherits).toMatchObject({ position: "SLWR", rank: 1 });
    // TE attached right of center, ON the line of scrimmage.
    const te = f.slots.find((s) => s.id === "TE");
    expect(te?.onLine).toBe(true);
    expect(te?.x).toBeGreaterThan(50);
    // QB under center: off the line, one yard behind it (not floating deep).
    const qbSlot = f.slots.find((s) => s.id === "QB");
    expect(qbSlot?.onLine).toBe(false);
    expect(qbSlot!.y).toBeGreaterThan(10);
    expect(qbSlot!.y).toBeLessThan(26);
    // X isolated far left, Z wide right, one HB, three receivers total (X/SL/Z).
    expect(f.slots.find((s) => s.id === "X")!.x).toBeLessThan(20);
    expect(f.slots.find((s) => s.id === "Z")!.x).toBeGreaterThan(80);
    expect(f.slots.filter((s) => s.group === "receiver")).toHaveLength(3);
    expect(f.slots.filter((s) => s.group === "back")).toHaveLength(1);
  });

  it("matches the owner's 4-3 Even 6-1 reference sheet (six on the line, safeties high)", () => {
    const f = formation("nfl-def-falcons:4-3:even-6-1");
    expect(f.slots).toHaveLength(11); // personnel: 4 DL / 3 LB / 4 DB
    const onLine = f.slots.filter((s) => s.onLine);
    expect(onLine.map((s) => s.id).sort()).toEqual(["DT1", "DT2", "NT", "RE", "SAM", "WILL"]);
    for (const s of onLine) expect(s.y).toBe(90);
    // MIKE stacks alone at A-gap depth behind the six-man wall.
    const mike = f.slots.find((s) => s.id === "MIKE");
    expect(mike?.onLine).toBe(false);
    expect(mike!.y).toBeLessThan(90);
    expect(f.slots.filter((s) => s.group === "dline")).toHaveLength(4);
    expect(f.slots.filter((s) => s.group === "linebacker")).toHaveLength(3);
    expect(f.slots.filter((s) => s.group === "secondary")).toHaveLength(4);
    // Safeties HIGHER than the corners: FS deepest, SS between CB level and FS.
    const fs = f.slots.find((s) => s.id === "FS");
    const ss = f.slots.find((s) => s.id === "SS");
    const cb = f.slots.find((s) => s.id === "CB1");
    expect(fs!.y).toBeLessThan(ss!.y);
    expect(ss!.y).toBeLessThan(cb!.y);
  });

  it("sub-packages match the confirmed personnel packages", () => {
    const groupCount = (id: string, group: string) =>
      formation(id).slots.filter((s) => s.group === group).length;
    // Nickel 2-4 = Nickel 2-4-5 (madden.tools): 2 interior DL · 4 LB · 5 DB.
    expect(groupCount("nfl-def-falcons:nickel:2-4", "dline")).toBe(2);
    expect(groupCount("nfl-def-falcons:nickel:2-4", "linebacker")).toBe(4);
    expect(groupCount("nfl-def-falcons:nickel:2-4", "secondary")).toBe(5);
    // Dime 2-3-6 = Big Dime 4-1-6 (madden.tools): 2 down DTs + 2 stand-up edges · 1 LB · 6 DB.
    expect(groupCount("nfl-def-falcons:dime:2-3-6", "dline")).toBe(4);
    expect(groupCount("nfl-def-falcons:dime:2-3-6", "linebacker")).toBe(1);
    expect(groupCount("nfl-def-falcons:dime:2-3-6", "secondary")).toBe(6);
    // Goal-line 6-2 (madden-school): 6 DL · 2 LB · 3 DB.
    expect(groupCount("nfl-def-falcons:goal-line:6-2", "dline")).toBe(6);
    expect(groupCount("nfl-def-falcons:goal-line:6-2", "linebacker")).toBe(2);
    expect(groupCount("nfl-def-falcons:goal-line:6-2", "secondary")).toBe(3);
    // The same packages hold in the Vikings book.
    expect(groupCount("nfl-def-vikings:nickel:2-4", "dline")).toBe(2);
    expect(groupCount("nfl-def-vikings:nickel:2-4", "linebacker")).toBe(4);
    expect(formation("nfl-def-vikings:4-3:even-6-1").slots).toHaveLength(11);
    expect(formation("nfl-def-vikings:4-3:even-6-1").slots.filter((s) => s.onLine)).toHaveLength(6);
  });
});

describe("formation resolver", () => {
  it("resolves inherited slots from the depth chart", () => {
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides: new Map(),
    });
    const qb = result.slots.find((slot) => slot.slot.id === "QB");
    const lt = result.slots.find((slot) => slot.slot.id === "LT");
    expect(qb?.player?.fullName).toBe("Matt Ryan");
    expect(qb?.source).toBe("inherited");
    expect(lt?.player?.fullName).toBe("Jake Matthews");
    expect(result.conflicts).toHaveLength(0);
  });

  it("an explicit override wins over inheritance and marks pending", () => {
    const overrides = new Map([
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "TE", "plan"), "wr1"],
    ]);
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides,
    });
    const te = result.slots.find((slot) => slot.slot.id === "TE");
    expect(te?.player?.id).toBe("wr1");
    expect(te?.pendingOverride).toBe(true);
  });

  it("inherited slots recompute when the chart plan changes (no override involved)", () => {
    const edited = { ...chartLists, WR: { baseline: chartLists.WR.baseline, plan: ["wr3", "wr1", "wr2", "wr4"] } };
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists: edited,
      overrides: new Map(),
    });
    const x = result.slots.find((slot) => slot.slot.id === "X");
    expect(x?.player?.id).toBe("wr3");
    expect(x?.pendingOverride).toBe(false);
  });

  it("same-player override-vs-inheritance equality keeps the override and derives no unit (A32)", () => {
    // The owner set an override for wr2 on X while the chart still resolved wr1.
    // A later chart change makes wr2 the inherited resolution too: the override row
    // persists (source = override), the slot shows samePlayerOverride, and no
    // checklist unit derives from the equality — but reset stays available.
    const overrides = new Map([
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "X", "plan"), "wr2"],
    ]);
    const edited = { ...chartLists, WR: { baseline: chartLists.WR.baseline, plan: ["wr2", "wr1"] } };
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists: edited,
      overrides,
    });
    const x = result.slots.find((slot) => slot.slot.id === "X");
    expect(x?.player?.id).toBe("wr2");
    expect(x?.source).toBe("override");
    expect(x?.pendingOverride).toBe(false);
    expect(x?.samePlayerOverride).toBe(true);
    const checklist = buildFormationChecklist({
      bookId: "nfl-off-falcons",
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists: edited,
      overrides,
    });
    expect(checklist.units).toHaveLength(0);
  });

  it("an override that differs from the recomputed baseline stays a pending unit", () => {
    const overrides = new Map([
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "X", "plan"), "wr1"],
    ]);
    const edited = { ...chartLists, WR: { baseline: chartLists.WR.baseline, plan: ["wr2", "wr1"] } };
    const checklist = buildFormationChecklist({
      bookId: "nfl-off-falcons",
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists: edited,
      overrides,
    });
    expect(checklist.units.map((unit) => unit.slotId)).toEqual(["X"]);
    expect(checklist.units[0]?.baselinePlayerId).toBe("wr2");
  });

  it("a missing inherited rank is a visible conflict, never a fabricated starter", () => {
    const emptyLists = {
      QB: { baseline: [], plan: [] },
      LT: { baseline: [], plan: [] },
      LG: { baseline: [], plan: [] },
      C: { baseline: [], plan: [] },
      RG: { baseline: [], plan: [] },
      RT: { baseline: [], plan: [] },
    };
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:i-form:close"),
      playersById: allPlayers,
      chartLists: emptyLists,
      overrides: new Map(),
    });
    expect(result.conflicts.filter((c) => c.kind === "missing_rank").length).toBeGreaterThan(0);
    expect(result.slots.every((slot) => slot.player === null)).toBe(true);
  });

  it("a duplicate resolved player is flagged on every colliding slot", () => {
    const overrides = new Map([
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "X", "plan"), "wr2"],
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "Z", "plan"), "wr2"],
    ]);
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides,
    });
    expect(result.duplicates).toHaveLength(1);
    expect(result.duplicates[0].slotIds.sort()).toEqual(["X", "Z"]);
    expect(result.conflicts.filter((c) => c.kind === "duplicate").length).toBe(2);
  });

  it("a departed override target stays visible as a conflict", () => {
    const overrides = new Map([
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "TE", "plan"), "departed-player"],
    ]);
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides,
    });
    const te = result.slots.find((slot) => slot.slot.id === "TE");
    expect(te?.conflict?.kind).toBe("departed");
    expect(te?.player).toBeNull();
  });

  it("a practice-squad resolution is disclosed, not hidden", () => {
    const overrides = new Map([
      [overrideKey("nfl-off-falcons:singleback:tight-y-off", "TE", "plan"), "squad1"],
    ]);
    const result = resolveFormation({
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides,
    });
    const te = result.slots.find((slot) => slot.slot.id === "TE");
    expect(te?.conflict?.kind).toBe("practice_squad");
  });

  it("defense diagrams store the offense's view (defense-left = viewer-right)", () => {
    // The 3-4 fronts carry true LE/RE ids; the owner-corrected 4-3 Even 6-1
    // covers its edges with stand-up WILL/SAM (no LE slot exists there).
    const result = resolveFormation({
      formation: formation("nfl-def-falcons:3-4:over"),
      playersById: allPlayers,
      chartLists: { ...chartLists, LEDG: { baseline: ["ledg1"], plan: [] }, REDG: { baseline: ["redg1"], plan: [] }, DT: { baseline: ["dt1", "dt2"], plan: [] }, WILL: { baseline: ["will1"], plan: [] }, MIKE: { baseline: ["mike1"], plan: [] }, SAM: { baseline: ["sam1"], plan: [] }, CB: { baseline: ["cb1", "cb2"], plan: [] }, FS: { baseline: ["fs1"], plan: [] }, SS: { baseline: ["ss1"], plan: [] } },
      overrides: new Map(),
    });
    const le = result.slots.find((slot) => slot.slot.id === "LE");
    const re = result.slots.find((slot) => slot.slot.id === "RE");
    expect(le!.slot.x).toBeGreaterThan(re!.slot.x);
    expect(le!.slot.y).toBeGreaterThan(50);
  });
});

describe("formation checklist integration", () => {
  const overrides = new Map([
    [overrideKey("nfl-off-falcons:singleback:tight-y-off", "TE", "plan"), "wr1"],
    [overrideKey("nfl-off-falcons:singleback:tight-y-off", "X", "plan"), "wr1"], // same-player
    [overrideKey("nfl-off-falcons:singleback:tight-y-off", "Z", "plan"), "wr3"],
  ]);

  it("creates units only for explicit differing overrides; same-player and inherited create none", () => {
    const checklist = buildFormationChecklist({
      bookId: "nfl-off-falcons",
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides,
    });
    expect(checklist.units.map((unit) => unit.slotId).sort()).toEqual(["TE", "Z"].sort());
  });

  it("a chart edit that changes an inherited slot creates no formation unit", () => {
    const edited = { ...chartLists, WR: { baseline: chartLists.WR.baseline, plan: ["wr4", "wr2", "wr3"] } };
    const checklist = buildFormationChecklist({
      bookId: "nfl-off-falcons",
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists: edited,
      overrides: new Map(),
    });
    expect(checklist.units).toHaveLength(0);
  });

  it("emits confirm units with the full slot identity", () => {
    const checklist = buildFormationChecklist({
      bookId: "nfl-off-falcons",
      formation: formation("nfl-off-falcons:singleback:tight-y-off"),
      playersById: allPlayers,
      chartLists,
      overrides,
    });
    const units = toConfirmUnits(checklist.units);
    const te = units.find((unit) => unit.slotId === "TE");
    expect(te).toMatchObject({
      type: "formation_slot",
      bookId: "nfl-off-falcons",
      formationId: "nfl-off-falcons:singleback:tight-y-off",
      slotId: "TE",
      playerId: "wr1",
    });
  });
});
