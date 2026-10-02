import { describe, expect, it } from "vitest";
import {
  classifyRecord,
  keysAgree,
  normalizeName,
  type ExistingSourceRecord,
} from "../lib/identity";

function existing(overrides: Partial<ExistingSourceRecord>): ExistingSourceRecord {
  return {
    id: "record-1",
    sourceId: "ea-1",
    fullName: "Bijan Robinson",
    birthdate: "2002-01-31",
    team: "ATL",
    listedPosition: "HB",
    ...overrides,
  };
}

describe("normalization", () => {
  it("strips diacritics, punctuation, and case without dropping name suffixes", () => {
    expect(normalizeName("  Amon-Ra St. Brown ")).toBe("amon ra st brown");
    expect(normalizeName("José Ramírez")).toBe("jose ramirez");
    expect(normalizeName("Michael Pittman Jr.")).toBe("michael pittman jr");
  });
});

describe("composite key agreement", () => {
  it("matches when the name and a corroborating field agree", () => {
    expect(
      keysAgree(
        { sourceId: "ea-1", fullName: "Bijan Robinson", team: "ATL" },
        { sourceId: "ea-1", fullName: "Bijan Robinson", team: "ATL", birthdate: "2002-01-31" },
      ),
    ).toBe(true);
  });

  it("does not match on a name alone when no corroborating field overlaps", () => {
    expect(
      keysAgree(
        { sourceId: "ea-1", fullName: "Bijan Robinson" },
        { sourceId: "ea-1", fullName: "Bijan Robinson" },
      ),
    ).toBe(false);
  });
});

describe("reconciliation outcomes", () => {
  it("is new when nothing matches", () => {
    const result = classifyRecord(
      { sourceId: "ea-2", fullName: "New Rookie", team: "ATL" },
      [existing({})],
    );
    expect(result.outcome).toBe("new");
  });

  it("matches on sourceId plus a corroborating field", () => {
    const result = classifyRecord(
      { sourceId: "ea-1", fullName: "Bijan Robinson", team: "ATL", birthdate: "2002-01-31" },
      [existing({})],
    );
    expect(result).toEqual({ outcome: "matched", matchedId: "record-1", reason: "source_id_and_key_agree" });
  });

  it("matches when only the name and team overlap", () => {
    const result = classifyRecord(
      { sourceId: "different-id", fullName: "Bijan Robinson", team: "ATL" },
      [existing({ birthdate: null, listedPosition: null })],
    );
    expect(result.outcome).toBe("matched");
    expect(result.reason).toBe("composite_key_agrees");
  });

  it("is a conflict when sourceId agrees but a corroborating field contradicts", () => {
    const result = classifyRecord(
      { sourceId: "ea-1", fullName: "Bijan Robinson", team: "PHI" },
      [existing({})],
    );
    expect(result.outcome).toBe("conflict");
    expect(result.candidates).toEqual(["record-1"]);
    expect(result.reason).toContain("source_id_conflicts_on_team");
  });

  it("is a conflict when the name matches but no field can corroborate", () => {
    const result = classifyRecord(
      { sourceId: "other", fullName: "Bijan Robinson" },
      [existing({ sourceId: "ea-1", birthdate: null, team: null, listedPosition: null })],
    );
    expect(result.outcome).toBe("conflict");
    expect(result.reason).toContain("partially_agrees_only");
  });

  it("is a conflict when two candidates share the normalized name", () => {
    const result = classifyRecord(
      { sourceId: "ea-9", fullName: "Bijan Robinson", team: "ATL" },
      [
        existing({ id: "record-1", sourceId: "ea-1" }),
        existing({ id: "record-2", sourceId: "ea-2", birthdate: "2003-03-03" }),
      ],
    );
    expect(result.outcome).toBe("conflict");
    expect(result.candidates).toEqual(["record-1", "record-2"]);
    expect(result.reason).toBe("several_candidates_share_the_normalized_name");
  });

  it("re-classifies a repeat import as matched instead of creating a duplicate", () => {
    const record = existing({});
    const result = classifyRecord(record, [record]);
    expect(result.outcome).toBe("matched");
    expect(result.matchedId).toBe(record.id);
  });
});
