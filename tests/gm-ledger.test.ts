import { describe, expect, it } from "vitest";
import { contractCoverage, contractValueFor, formatMoney } from "../lib/gm";
import type { FranchisePlayer, PlayerField } from "../lib/data/franchises";

const player = (id: string): FranchisePlayer => ({
  id,
  franchiseId: "franchise",
  origin: "custom",
  customKey: `custom-${id}`,
  fullName: id,
  team: null,
  listedPosition: null,
  archetype: null,
  birthdate: null,
  rosterStatus: "active",
});

const field = (id: string, key: string, baselineValue: unknown, planValue: unknown = null): PlayerField => ({
  franchisePlayerId: id,
  fieldKey: key,
  baselineValue,
  planValue,
  fieldClass: "app_fact",
});

describe("C4A contract ledger", () => {
  it("keeps missing values unknown while reporting zero and planned subtotals accurately", () => {
    const players = [player("known"), player("zero"), player("unknown")];
    const fields = [
      field("known", "contract_value", 1250000, 1500000),
      field("known", "contract_years", 2),
      field("zero", "contract_value", 0),
    ];

    expect(contractCoverage(players, fields)).toEqual({
      totalPlayers: 3,
      reportedCount: 2,
      unknownCount: 1,
      recordedTotal: 1250000,
      plannedCount: 2,
      plannedTotal: 1500000,
      complete: false,
    });
    expect(contractValueFor("unknown", fields)).toBeNull();
    expect(contractValueFor("zero", fields)).toBe(0);
  });

  it("handles an empty roster and formats manually recorded money as whole USD", () => {
    expect(contractCoverage([], [])).toEqual({
      totalPlayers: 0,
      reportedCount: 0,
      unknownCount: 0,
      recordedTotal: 0,
      plannedCount: 0,
      plannedTotal: 0,
      complete: true,
    });
    expect(formatMoney(2500000)).toBe("$2,500,000");
  });
});
