import { describe, expect, it } from "vitest";
import type { ChartPlayer } from "../lib/depth-chart";
import {
  buildChecklist,
  buildConfirmation,
  describeConfirmation,
  formatBatchTimestamp,
  summarizeChecklist,
  type ChecklistInput,
} from "../lib/checklist";

function player(overrides: Partial<ChartPlayer> & { id: string }): ChartPlayer {
  return {
    fullName: overrides.id.toUpperCase(),
    rosterStatus: "active",
    primaryPosition: "WR",
    overall: 70,
    ...overrides,
  };
}

const A = player({ id: "a", fullName: "Alpha" });
const B = player({ id: "b", fullName: "Bravo" });
const C = player({ id: "c", fullName: "Charlie" });
const QB = player({ id: "q", fullName: "Quarterback", primaryPosition: "QB" });
const SQUAD = player({ id: "s", fullName: "Squad Guy", rosterStatus: "practice_squad" });

function input(overrides: Partial<ChecklistInput> = {}): ChecklistInput {
  return {
    franchiseId: "f1",
    revision: 7,
    players: [A, B, C],
    lists: {},
    ...overrides,
  };
}

describe("checklist derivation", () => {
  it("returns no units when every plan equals its baseline", () => {
    const checklist = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "b"], plan: ["a", "b"] } } }),
    );
    expect(checklist.units).toEqual([]);
    expect(checklist.ready).toEqual([]);
    expect(checklist.blocked).toEqual([]);
  });

  it("consolidates A→B→C to A→C and drops the unit when reverted to A", () => {
    const reordered = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "b", "c"], plan: ["c", "a", "b"] } } }),
    );
    expect(reordered.units).toHaveLength(1);
    expect(reordered.units[0].planned).toEqual(["c", "a", "b"]);
    expect(reordered.units[0].diff.moved).toEqual(["a", "b", "c"]);
    expect(reordered.units[0].diff.added).toEqual([]);
    expect(reordered.units[0].diff.removed).toEqual([]);

    const reverted = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "b", "c"], plan: ["a", "b", "c"] } } }),
    );
    expect(reverted.units).toEqual([]);
  });

  it("tracks added and removed players on a whole-list unit", () => {
    const checklist = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "b", "c"], plan: ["c", "b"] } } }),
    );
    const unit = checklist.units[0];
    expect(unit.position).toBe("WR");
    expect(unit.status).toBe("ready");
    expect(unit.diff.removed).toEqual(["a"]);
    expect(unit.baseline).toEqual(["a", "b", "c"]);
    expect(unit.planned).toEqual(["c", "b"]);
    expect(unit.diff.added).toEqual([]);
  });

  it("keeps units in chart order across several positions", () => {
    const checklist = buildChecklist(
      input({
        lists: {
          WR: { baseline: [], plan: ["a"] },
          QB: { baseline: [], plan: ["b"] },
          HB: { baseline: [], plan: ["c"] },
        },
      }),
    );
    expect(checklist.units.map((unit) => unit.position)).toEqual(["QB", "HB", "WR"]);
  });
});

describe("partial application and already-happened reconciliation", () => {
  it("recomputes the remaining diff after only part of a list was changed in game", () => {
    // Baseline WR [a,b,c], plan [c,a,b]; the owner changed only ranks 1-2 in Madden and
    // records the actual valid intermediate list [a,c,b]. The remaining difference is what
    // is left, never an arbitrary per-rank tick ledger.
    const before = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "b", "c"], plan: ["c", "a", "b"] } } }),
    );
    expect(before.units).toHaveLength(1);

    const afterRecordingReality = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "c", "b"], plan: ["c", "a", "b"] } } }),
    );
    expect(afterRecordingReality.units).toHaveLength(1);
    expect(afterRecordingReality.units[0].baseline).toEqual(["a", "c", "b"]);
    expect(afterRecordingReality.units[0].planned).toEqual(["c", "a", "b"]);
    expect(afterRecordingReality.units[0].diff.moved).toEqual(["a", "c"]);
  });

  it("removes a redundant unit when reality catches up and preserves an unrelated plan", () => {
    const caughtUp = buildChecklist(
      input({ lists: { WR: { baseline: ["a", "b"], plan: ["a", "b"] } } }),
    );
    expect(caughtUp.units).toEqual([]);

    const unrelated = buildChecklist(
      input({
        lists: {
          WR: { baseline: ["a"], plan: ["b"] },
          TE: { baseline: ["a", "b"], plan: ["b"] },
        },
      }),
    );
    // Recording TE reality (already equal to its plan) leaves the unrelated WR plan pending.
    const afterRecording = buildChecklist(
      input({
        lists: {
          WR: { baseline: ["a"], plan: ["b"] },
          TE: { baseline: ["b"], plan: ["b"] },
        },
      }),
    );
    expect(unrelated.units.map((unit) => unit.position)).toEqual(["TE", "WR"]);
    expect(afterRecording.units.map((unit) => unit.position)).toEqual(["WR"]);
  });
});

describe("prerequisites and blocking", () => {
  it("blocks a practice-squad plan and exposes a promotion prerequisite unit", () => {
    const checklist = buildChecklist(
      input({
        players: [A, SQUAD],
        lists: { WR: { baseline: [], plan: ["s"] } },
      }),
    );
    const unit = checklist.blocked[0];
    expect(unit.status).toBe("blocked");
    expect(unit.blocked.map((block) => block.kind)).toEqual(["practice_squad"]);
    expect(unit.prerequisites[0].kind).toBe("promotion");
    expect(unit.prerequisites[0].unitRef).toBe("roster_status:s");
    expect(checklist.promotions).toHaveLength(1);
    expect(checklist.promotions[0].unitId).toBe("roster_status:s");
  });

  it("blocks a plan that contains a pending incoming transaction player (C4A seam fixture)", () => {
    const checklist = buildChecklist(
      input({
        lists: { WR: { baseline: [], plan: ["a"] } },
        pendingIncoming: new Set(["a"]),
      }),
    );
    const unit = checklist.blocked[0];
    expect(unit.blocked[0].kind).toBe("pending_transaction");
    expect(unit.prerequisites[0].kind).toBe("transaction");
    expect(unit.prerequisites[0].unitRef).toBeNull();
  });

  it("blocks an ineligible placement with a repair note, and never auto-resolves it", () => {
    const mismatch = player({ id: "m", fullName: "Mismatch", primaryPosition: "QB" });
    const checklist = buildChecklist(
      input({ players: [mismatch], lists: { WR: { baseline: [], plan: ["m"] } } }),
    );
    const unit = checklist.blocked[0];
    expect(unit.blocked[0].kind).toBe("ineligible_placement");
    expect(unit.blocked[0].note.length).toBeGreaterThan(0);
    expect(checklist.promotions).toEqual([]);
  });

  it("blocks a plan that references a player no longer on the roster", () => {
    const checklist = buildChecklist(
      input({ players: [A], lists: { WR: { baseline: ["gone"], plan: ["gone"] } } }),
    );
    // baseline === plan, so no pending unit exists at all.
    expect(checklist.units).toEqual([]);

    const pending = buildChecklist(
      input({ players: [A], lists: { WR: { baseline: ["gone", "a"], plan: ["gone"] } } }),
    );
    expect(pending.blocked[0].blocked[0].kind).toBe("ineligible_placement");
  });
});

describe("reviewed confirmation batching", () => {
  it("includes only the selected ready units, in chart order", () => {
    const checklist = buildChecklist(
      input({
        players: [A, QB],
        lists: {
          WR: { baseline: [], plan: ["a"] },
          QB: { baseline: [], plan: ["q"] },
        },
      }),
    );
    const plan = buildConfirmation(checklist, ["depth_chart_list:WR"]);
    expect(plan.units.map((unit) => unit.type)).toEqual(["depth_chart_list"]);
    expect(plan.units[0]).toMatchObject({ position: "WR", playerIds: ["a"] });
    expect(plan.excluded).toEqual([]);

    const all = buildConfirmation(checklist, ["depth_chart_list:WR", "depth_chart_list:QB"]);
    expect(all.units.map((unit) => (unit.type === "depth_chart_list" ? unit.position : ""))).toEqual([
      "QB",
      "WR",
    ]);
  });

  it("excludes a blocked unit with reasons unless the owner opts into its promotion", () => {
    const checklist = buildChecklist(
      input({ players: [A, SQUAD], lists: { WR: { baseline: [], plan: ["s", "a"] } } }),
    );

    const withheld = buildConfirmation(checklist, ["depth_chart_list:WR"]);
    expect(withheld.units).toEqual([]);
    expect(withheld.excluded).toHaveLength(1);
    expect(withheld.excluded[0].reasons[0]).toContain("practice squad");

    const withPromotion = buildConfirmation(checklist, ["depth_chart_list:WR"], {
      includePromotions: true,
    });
    expect(withPromotion.excluded).toEqual([]);
    expect(withPromotion.units.map((unit) => unit.type)).toEqual([
      "roster_status",
      "depth_chart_list",
    ]);
    expect(withPromotion.units[0]).toMatchObject({ playerId: "s", status: "active" });
  });

  it("never silently includes a transaction or placement prerequisite", () => {
    const checklist = buildChecklist(
      input({ lists: { WR: { baseline: [], plan: ["a"] } }, pendingIncoming: new Set(["a"]) }),
    );
    const plan = buildConfirmation(checklist, ["depth_chart_list:WR"], { includePromotions: true });
    expect(plan.units).toEqual([]);
    expect(plan.excluded[0].reasons[0]).toContain("pending incoming transaction");
  });

  it("queues a shared promotion prerequisite once, before both dependents", () => {
    const checklist = buildChecklist(
      input({
        players: [A, SQUAD],
        lists: {
          WR: { baseline: [], plan: ["s"] },
          KR: { baseline: [], plan: ["s"] },
        },
      }),
    );
    const plan = buildConfirmation(checklist, ["depth_chart_list:WR", "depth_chart_list:KR"], {
      includePromotions: true,
    });
    expect(plan.units.filter((unit) => unit.type === "roster_status")).toHaveLength(1);
    expect(plan.units[0].type).toBe("roster_status");
    expect(plan.units[plan.units.length - 1].type).toBe("depth_chart_list");
  });
});

describe("summary helpers", () => {
  it("reports pending/ready/blocked counts and labels", () => {
    const checklist = buildChecklist(
      input({
        players: [A, QB, SQUAD],
        lists: {
          WR: { baseline: [], plan: ["a"] },
          QB: { baseline: [], plan: ["q"] },
          HB: { baseline: [], plan: ["s"] },
        },
      }),
    );
    const summary = summarizeChecklist(checklist);
    expect(summary.pendingUnits).toBe(3);
    expect(summary.readyUnits).toBe(2);
    expect(summary.blockedUnits).toBe(1);
    expect(summary.positions).toEqual(["QB", "HB", "WR"]);
  });

  it("formats retained-batch timestamps deterministically in UTC", () => {
    expect(formatBatchTimestamp("2026-10-06T10:41:43.000Z")).toBe("2026-10-06 10:41 UTC");
    expect(formatBatchTimestamp("2026-10-06T23:05:00.000Z")).toBe("2026-10-06 23:05 UTC");
    expect(formatBatchTimestamp("not-a-date")).toBe("unknown time");
  });

  it("describes a confirmation plan including exclusions", () => {
    const checklist = buildChecklist(
      input({ players: [A, SQUAD], lists: { WR: { baseline: [], plan: ["a", "s"] } } }),
    );
    const plan = buildConfirmation(checklist, ["depth_chart_list:WR"], { includePromotions: true });
    expect(describeConfirmation(plan)).toBe("1 position · 1 promotion prerequisite");
  });
});
