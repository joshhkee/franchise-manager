import { describe, expect, it } from "vitest";
import { positionSpec, type ChartPlayer } from "../lib/depth-chart";
import { formationsOf } from "../lib/formations/catalog";
import { buildCoverageReport } from "../lib/formations/coverage";
import { PLAYBOOK_INVENTORY } from "../lib/formations/playbooks";
import { resolveFormation } from "../lib/formations/resolver";
import {
  SPECIAL_TEAMS_DIAGRAMS,
  SPECIAL_TEAMS_MISSING_SETS,
  SPECIAL_TEAMS_ROLES,
  SPECIAL_TEAMS_SETS,
  SPECIAL_TEAMS_TOTAL_PLAYS,
} from "../lib/formations/special-teams";

const player = (id: string, name: string, position: string): ChartPlayer => ({
  id,
  fullName: name,
  rosterStatus: "active",
  primaryPosition: position,
  overall: 80,
});

const playersById = new Map(
  [
    player("qb1", "Quinn Backs", "QB"),
    player("lt1", "Lane Turner", "LT"),
    player("lg1", "Lou Guard", "LG"),
    player("c1", "Cal Snap", "C"),
    player("rg1", "Roy Guard", "RG"),
    player("rt1", "Rex Tackle", "RT"),
    player("te1", "Trey End", "TE"),
    player("wr1", "Xavier Deep", "WR"),
    player("wr2", "Zane Vance", "WR"),
    player("wr3", "Sly Morse", "WR"),
    player("hb1", "Hank Back", "HB"),
    player("fb1", "Fred Back", "FB"),
  ].map((entry) => [entry.id, entry]),
);

const chartLists = {
  QB: { baseline: ["qb1"], plan: [] },
  LT: { baseline: ["lt1"], plan: [] },
  LG: { baseline: ["lg1"], plan: [] },
  C: { baseline: ["c1"], plan: [] },
  RG: { baseline: ["rg1"], plan: [] },
  RT: { baseline: ["rt1"], plan: [] },
  TE: { baseline: ["te1"], plan: [] },
  WR: { baseline: ["wr1", "wr2", "wr3"], plan: [] },
  SLWR: { baseline: ["wr3"], plan: [] },
  HB: { baseline: ["hb1"], plan: [] },
  FB: { baseline: ["fb1"], plan: [] },
};

describe("playbook coverage report", () => {
  it("reconciles all 86 inventoried books against what the catalog carries", () => {
    const report = buildCoverageReport();

    expect(report.entries).toHaveLength(86);
    expect(report.entries).toHaveLength(PLAYBOOK_INVENTORY.length);
    expect(report.counts.books).toBe(86);
    expect(report.counts.loaded).toBe(4);
    expect(report.totals.verified + report.totals.partial + report.totals.unsupported).toBe(86);
  });

  it("marks nothing verified while every slot is still a provisional default", () => {
    const report = buildCoverageReport();

    // D113 is open: no mapping has been checked in the game, so "verified" must stay empty.
    expect(report.totals.verified).toBe(0);
    expect(report.totals.partial).toBe(4);
    expect(report.totals.unsupported).toBe(82);
    expect(report.counts.provisionalSlots).toBeGreaterThan(0);
    expect(report.counts.mapped).toBe(60);
    expect(report.counts.formations).toBe(123);
  });

  it("derives each status from the data rather than hand-written labels", () => {
    for (const entry of buildCoverageReport().entries) {
      if (entry.status === "unsupported") {
        expect(entry.formationCount).toBe(0);
        expect(entry.detail).toMatch(/No formation data yet/);
      }
      if (entry.status === "partial") {
        expect(entry.formationCount).toBeGreaterThan(0);
        expect(entry.mappedCount).toBeLessThanOrEqual(entry.formationCount);
        // Partial is either an incomplete census or leftover provisional slots.
        expect(entry.mappedCount < entry.formationCount || entry.provisionalSlots > 0).toBe(true);
        expect(entry.provisionalSlots).toBeGreaterThan(0);
      }
      if (entry.status === "verified") {
        expect(entry.mappedCount).toBe(entry.formationCount);
        expect(entry.provisionalSlots).toBe(0);
      }
    }
  });

  it("carries provenance for every book so a status can be traced", () => {
    for (const entry of buildCoverageReport().entries) {
      expect(entry.provenance.source).toContain("Civil.GG");
      expect(entry.provenance.sourceUrl).toMatch(/^https:\/\//);
      expect(entry.provenance.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.detail.length).toBeGreaterThan(0);
    }
  });

  it("reports the loaded books with their real mapped counts", () => {
    const report = buildCoverageReport();
    const byId = new Map(report.entries.map((entry) => [entry.playbook.id, entry]));

    expect(byId.get("nfl-off-falcons")?.detail).toBe(
      "All 42 formations mapped, but 462 slots are still provisional.",
    );
    expect(byId.get("nfl-off-bears")?.detail).toBe("5 of 42 formations mapped; 55 slots are still provisional.");
    expect(byId.get("nfl-def-falcons")?.detail).toBe("9 of 15 formations mapped; 99 slots are still provisional.");
    expect(byId.get("nfl-def-vikings")?.detail).toBe("4 of 24 formations mapped; 44 slots are still provisional.");
  });

  it("stays inside the recorded catalog budget", () => {
    const startedReport = performance.now();
    for (let i = 0; i < 200; i += 1) buildCoverageReport();
    const reportMs = performance.now() - startedReport;

    let resolved = 0;
    const startedResolve = performance.now();
    for (const playbook of PLAYBOOK_INVENTORY) {
      const formations = formationsOf(playbook.id);
      for (const formation of formations) {
        if (formation.status !== "mapped") continue;
        resolveFormation({ formation, playersById, chartLists, overrides: new Map() });
        resolved += 1;
      }
    }
    const resolveMs = performance.now() - startedResolve;

    expect(resolved).toBe(60);
    // Generous ceilings: this is a regression guard, not a benchmark. Measured
    // 2026-10-09 on the development machine: 200 report builds plus all 60 mapped
    // formations resolved take ~8ms together, so these ceilings only catch a real
    // collapse rather than describing a target.
    expect(reportMs).toBeLessThan(2000);
    expect(resolveMs).toBeLessThan(1000);
  });
});

describe("special-teams inventory", () => {
  it("lists only the sets a public source actually publishes, with its play counts", () => {
    expect(SPECIAL_TEAMS_SETS.map((set) => [set.id, set.plays])).toEqual([
      ["field-goal", 12],
      ["punt", 9],
      ["punt-tight", 3],
      ["stop-clock", 3],
    ]);
    expect(SPECIAL_TEAMS_TOTAL_PLAYS).toBe(27);
    for (const set of SPECIAL_TEAMS_SETS) {
      expect(set.sourceUrl).toMatch(/^https:\/\/madden\.tools\//);
      expect(set.note.length).toBeGreaterThan(0);
    }
  });

  it("carries no slot data at all, so no diagram can be drawn from it", () => {
    // The D131 scope choice: inventory and roles only. A set carrying slots or
    // coordinates would mean invented data, and this test is the tripwire.
    for (const set of SPECIAL_TEAMS_SETS) {
      expect("slots" in set).toBe(false);
      expect("x" in set).toBe(false);
      expect("y" in set).toBe(false);
    }
    expect(SPECIAL_TEAMS_DIAGRAMS.authored).toBe(false);
    expect(SPECIAL_TEAMS_DIAGRAMS.decision).toBe("D131");
    expect(SPECIAL_TEAMS_DIAGRAMS.reason).toContain("invented");
  });

  it("discloses the sets that no public source publishes", () => {
    const labels = SPECIAL_TEAMS_MISSING_SETS.map((entry) => entry.label);
    expect(labels).toHaveLength(7);
    expect(new Set(labels).size).toBe(7);
    for (const expected of ["Kickoff", "Kick return", "Punt return", "Onside kick", "Field goal block"]) {
      expect(labels).toContain(expected);
    }
    for (const entry of SPECIAL_TEAMS_MISSING_SETS) expect(entry.detail.length).toBeGreaterThan(0);
  });

  it("points every assignable special-teams role at a real depth-chart slot", () => {
    const assignable = SPECIAL_TEAMS_ROLES.filter((role) => role.availability === "depth_chart");
    expect(assignable.map((role) => role.key)).toEqual(["K", "P", "LS", "KOS", "PR", "KR"]);
    for (const role of assignable) {
      expect(positionSpec(role.key)).not.toBeNull();
    }
  });

  it("keeps holder and wing as named roles without inventing depth-chart slots", () => {
    const setRoles = SPECIAL_TEAMS_ROLES.filter((role) => role.availability === "set_role");
    expect(setRoles.map((role) => role.key)).toEqual(["H", "Y"]);
    for (const role of setRoles) {
      expect(positionSpec(role.key)).toBeNull();
      expect(role.detail).toMatch(/No depth-chart slot/);
    }
  });
});
