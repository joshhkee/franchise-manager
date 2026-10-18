import { describe, expect, it } from "vitest";
import { PLAYBOOK_INVENTORY } from "../lib/formations/playbooks";
import { numericRating, roleNotes, targetPoolSummary, tradeBlockReasons, validBook } from "../lib/scouting";

describe("C4B provisional scouting explanations", () => {
  it("keeps practical role context separate by position and avoids a composite fit grade", () => {
    expect(roleNotes("WR")[0]).toMatch(/route execution or hands/);
    expect(roleNotes("CB")[0]).toMatch(/coverage recognition/);
    expect(roleNotes(null)[0]).toMatch(/unknown/);
    expect(roleNotes("WR").join(" ")).not.toMatch(/\d+%|overall fit|score/i);
  });

  it("keeps absent or invalid ratings unknown rather than treating them as zero", () => {
    expect(numericRating(null)).toBeNull();
    expect(numericRating("")).toBeNull();
    expect(numericRating("not a number")).toBeNull();
    expect(numericRating("91")).toBe(91);
  });

  it("avoids anomaly calls on small peer samples and states only observed positional counts", () => {
    expect(targetPoolSummary(3, "WR")).toContain("sample is small");
    expect(tradeBlockReasons({ id: "p", identity: "franchise", fullName: "A", team: "ATL", listedPosition: "WR", archetype: null, age: null, overall: null, ratings: {}, measurements: {} }, 3)[0]).toContain("3 active/practice-squad");
    expect(tradeBlockReasons({ id: "p", identity: "franchise", fullName: "A", team: null, listedPosition: null, archetype: null, age: null, overall: null, ratings: {}, measurements: {} }, 3)[0]).toContain("unknown");
  });

  it("accepts only books from their declared side", () => {
    const offense = PLAYBOOK_INVENTORY.find((book) => book.id === "nfl-off-falcons")!;
    const defense = PLAYBOOK_INVENTORY.find((book) => book.id === "nfl-def-vikings")!;
    expect(validBook(offense, "offense")).toBe(true);
    expect(validBook(offense, "defense")).toBe(false);
    expect(validBook(defense, "defense")).toBe(true);
  });
});
