import { describe, expect, it } from "vitest";
import {
  POSITIONS,
  diffPosition,
  eligibilityFor,
  listIssues,
  maxRankFor,
  positionSpec,
  positionsInGroup,
  suggestProvisionalOrder,
  type ChartPlayer,
} from "../lib/depth-chart";

function player(overrides: Partial<ChartPlayer> = {}): ChartPlayer {
  return {
    id: "p1",
    fullName: "Player One",
    rosterStatus: "active",
    primaryPosition: "QB",
    overall: 70,
    ...overrides,
  };
}

describe("provisional position reference", () => {
  it("keeps one spec per key and groups the owner reference without inventing labels", () => {
    const keys = POSITIONS.map((spec) => spec.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(positionsInGroup("offense").length).toBeGreaterThan(0);
    expect(positionsInGroup("defense").length).toBeGreaterThan(0);
    expect(positionsInGroup("specialists").map((spec) => spec.key)).toEqual(
      expect.arrayContaining(["K", "P", "LS", "KOS", "PR", "KR"]),
    );

    const gad = positionSpec("GAD");
    expect(gad?.unverifiedMeaning).toBe(true);
    expect(maxRankFor("QB")).toBe(positionSpec("QB")?.maxRank);
    expect(maxRankFor("UNKNOWN")).toBe(5);
  });
});

describe("eligibility", () => {
  it("allows the listed primary position and the declared provisional cross-roles", () => {
    expect(eligibilityFor(player({ primaryPosition: "QB" }), "QB").ok).toBe(true);
    expect(eligibilityFor(player({ primaryPosition: "HB" }), "3DRB").ok).toBe(true);
    expect(eligibilityFor(player({ primaryPosition: "WR" }), "SLWR").ok).toBe(true);
    expect(eligibilityFor(player({ primaryPosition: "DT" }), "RDT").ok).toBe(true);
    expect(eligibilityFor(player({ primaryPosition: "WR" }), "KR").ok).toBe(true);
  });

  it("discloses a mismatch instead of silently placing the player", () => {
    const result = eligibilityFor(player({ primaryPosition: "QB" }), "WR");
    expect(result.ok).toBe(false);
    expect(result.blocked).toBe("position_mismatch");
    expect(result.note).toContain("provisional");
  });

  it("blocks practice-squad players with a promotion prerequisite and unknown primary positions", () => {
    const squad = eligibilityFor(player({ rosterStatus: "practice_squad" }), "QB");
    expect(squad.ok).toBe(false);
    expect(squad.blocked).toBe("practice_squad");
    expect(squad.note).toContain("promotion");

    const missing = eligibilityFor(player({ primaryPosition: null }), "QB");
    expect(missing.ok).toBe(false);
    expect(missing.blocked).toBe("position_required");
  });
});

describe("provisional suggestion", () => {
  it("orders eligible actives by recorded overall, unknown last, and respects the provisional limit", () => {
    const players = [
      player({ id: "low", fullName: "Low", overall: 60 }),
      player({ id: "high", fullName: "High", overall: 88 }),
      player({ id: "unknown", fullName: "Unknown", overall: null }),
      player({ id: "wrong", fullName: "Wrong", primaryPosition: "WR" }),
      player({ id: "squad", fullName: "Squad", rosterStatus: "practice_squad" }),
      player({ id: "tie-a", fullName: "A Tie", overall: 88 }),
    ];

    const order = suggestProvisionalOrder(players, "QB");
    expect(order).toEqual(["tie-a", "high", "low", "unknown"]);
    expect(order).not.toContain("wrong");
    expect(order).not.toContain("squad");
  });

  it("leaves manual secondary/specialist slots empty for the owner (D107)", () => {
    expect(suggestProvisionalOrder([player({ primaryPosition: "HB" })], "3DRB")).toEqual([]);
    expect(suggestProvisionalOrder([player({ primaryPosition: "PR" })], "PR")).toEqual([]);
  });

  it("allows the same player to hold a primary and a specialist role", () => {
    const back = player({ id: "hb", primaryPosition: "HB" });
    const primary = suggestProvisionalOrder([back], "HB");
    expect(primary).toContain("hb");
    expect(eligibilityFor(back, "3DRB").ok).toBe(true);
  });
});

describe("pending differences", () => {
  it("consolidates reorders and reverts without an append-only log", () => {
    const a = ["p1", "p2", "p3"];
    expect(diffPosition(a, ["p1", "p2", "p3"]).changed).toBe(false);

    const reordered = diffPosition(a, ["p3", "p1", "p2"]);
    expect(reordered.changed).toBe(true);
    expect(reordered.moved).toEqual(["p1", "p2", "p3"]);

    const replaced = diffPosition(a, ["p3", "p1", "p4"]);
    expect(replaced.added).toEqual(["p4"]);
    expect(replaced.removed).toEqual(["p2"]);

    expect(diffPosition(a, a).changed).toBe(false);
  });

  it("reports eligibility issues for a whole list in order", () => {
    const playersById = new Map([
      ["p1", player({ id: "p1", primaryPosition: "QB" })],
      ["p2", player({ id: "p2", primaryPosition: "WR" })],
    ]);
    const issues = listIssues(playersById, "QB", ["p1", "p2"]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ playerId: "p2", reason: "position_mismatch" });
  });
});
