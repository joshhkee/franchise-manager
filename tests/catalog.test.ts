import { describe, expect, it } from "vitest";
import {
  attachResultMessage,
  escapeSearchTerm,
  matchTeamOption,
  overallFromRatings,
} from "../lib/catalog";

describe("matchTeamOption", () => {
  const teams = ["Atlanta Falcons", "Buffalo Bills", "NY Giants"];

  it("matches an exact franchise name", () => {
    expect(matchTeamOption("Atlanta Falcons", teams)).toBe("Atlanta Falcons");
    expect(matchTeamOption("  atlanta   falcons ", teams)).toBe("Atlanta Falcons");
  });

  it("matches a unique partial team name without guessing", () => {
    expect(matchTeamOption("Falcons", teams)).toBe("Atlanta Falcons");
    expect(matchTeamOption("Bills", teams)).toBe("Buffalo Bills");
  });

  it("returns null for no match or an ambiguous name", () => {
    expect(matchTeamOption("London Monarchs", teams)).toBeNull();
    expect(matchTeamOption("New York", ["NY Giants", "NY Jets"])).toBeNull();
    expect(matchTeamOption("", teams)).toBeNull();
  });
});

describe("escapeSearchTerm", () => {
  it("escapes SQL wildcard characters so search terms stay literal", () => {
    expect(escapeSearchTerm("100%")).toBe("100\\%");
    expect(escapeSearchTerm("a_b")).toBe("a\\_b");
    expect(escapeSearchTerm("back\\slash")).toBe("back\\\\slash");
    expect(escapeSearchTerm("  Bijan  ")).toBe("Bijan");
  });
});

describe("overallFromRatings", () => {
  it("reads a published overall and keeps anything else unknown", () => {
    expect(overallFromRatings({ overallRating: 87 })).toBe(87);
    expect(overallFromRatings({ overallRating: "87" })).toBe(87);
    expect(overallFromRatings({ overallRating: null })).toBeNull();
    expect(overallFromRatings({ overallRating: "n/a" })).toBeNull();
    expect(overallFromRatings({})).toBeNull();
    expect(overallFromRatings(null)).toBeNull();
  });
});

describe("attachResultMessage", () => {
  it("reports exactly what was attached and what was skipped", () => {
    expect(
      attachResultMessage({ requested: 27, attached: 25, alreadyAttached: 2, alreadyPresent: 0, revision: 4 }),
    ).toBe(
      "Attached 25 published players to this franchise as the provisional source baseline. 2 selected players were already on this roster and left untouched.",
    );
  });

  it("says nothing was attached when every record is already held", () => {
    expect(
      attachResultMessage({ requested: 1, attached: 0, alreadyAttached: 1, alreadyPresent: 0, revision: null }),
    ).toBe(
      "Nothing attached — 1 selected player is already on this roster. No duplicates were created.",
    );
  });

  it("explains a cross-revision identity skip distinctly from a same-record skip", () => {
    expect(
      attachResultMessage({
        requested: 1,
        attached: 0,
        alreadyAttached: 0,
        alreadyPresent: 1,
        revision: null,
      }),
    ).toBe(
      "Nothing attached — 1 selected player is already held from another catalog revision; a later revision never duplicates or replaces an attached player automatically.",
    );
  });
});
