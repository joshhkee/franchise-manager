import { describe, expect, it } from "vitest";
import type { ExistingSourceRecord } from "../lib/identity";
import {
  buildMissingFieldReport,
  classifyIncoming,
  coverageStatusFor,
  fetchLaunchPlayers,
  normalizeSourcePlayer,
  planImport,
  toBatches,
  type RawSourcePlayer,
} from "../lib/source-import";

const BIJAN: RawSourcePlayer = {
  id: 13202,
  firstName: "Bijan",
  lastName: "Robinson",
  birthdate: "2002-01-30",
  height: 71,
  weight: 215,
  age: 24,
  jerseyNum: 7,
  yearsPro: 3,
  college: "Texas",
  handedness: "Right",
  overallRating: 95,
  iteration: "1-base",
  archetype: { label: "Elusive Back - HB" },
  team: { label: "Atlanta Falcons" },
  position: { shortLabel: "HB" },
  stats: { speed: 93, acceleration: 95 },
  playerAbilities: [{ name: "Bruiser" }],
};

const FREE_AGENT: RawSourcePlayer = {
  id: 999,
  firstName: "Bobby",
  lastName: "Wagner",
  birthdate: "",
  position: { shortLabel: "MIKE" },
  overallRating: 89,
  stats: { speed: 82 },
  playerAbilities: [],
};

describe("normalizeSourcePlayer", () => {
  it("maps a published record into the catalog shape", () => {
    const record = normalizeSourcePlayer(BIJAN);
    expect(record).toMatchObject({
      sourceId: "13202",
      fullName: "Bijan Robinson",
      normalizedName: "bijan robinson",
      birthdate: "2002-01-30",
      team: "Atlanta Falcons",
      listedPosition: "HB",
      archetype: "Elusive Back - HB",
    });
    expect(record.measurements).toMatchObject({ height: 71, weight: 215, jerseyNumber: 7 });
    // The full attribute set travels with the record, plus the published overall.
    expect(record.ratings).toMatchObject({ speed: 93, acceleration: 95, overallRating: 95 });
    expect(record.abilities).toHaveLength(1);
  });

  it("leaves absent values absent instead of defaulting them", () => {
    const record = normalizeSourcePlayer(FREE_AGENT);
    expect(record.team).toBeNull();
    expect(record.archetype).toBeNull();
    expect(record.birthdate).toBeNull();
    expect(record.measurements.college).toBeNull();
    // No invented overall inside the attribute set beyond what was published.
    expect(record.ratings.overallRating).toBe(89);
  });

  it("reads the live payload's numeric handedness, object iteration, and M/D/YY birthdate", () => {
    // Regression for the C2A import crash: the publisher now sends handedness as
    // a number and iteration as an object, and the old text helper threw on both.
    const record = normalizeSourcePlayer({
      ...BIJAN,
      birthdate: "3/1/00",
      handedness: 1,
      iteration: { id: "1-base", label: "Launch Ratings" },
    });
    expect(record.birthdate).toBe("2000-03-01");
    expect(record.measurements.handedness).toBe("Right");
    expect(record.provenance.iteration).toBe("Launch Ratings");
    expect(record.provenance.birthdateRaw).toBe("3/1/00");
  });

  it("maps zero handedness to Left and leaves an unknown code absent", () => {
    expect(normalizeSourcePlayer({ ...BIJAN, handedness: 0 }).measurements.handedness).toBe("Left");
    expect(normalizeSourcePlayer({ ...BIJAN, handedness: 2 }).measurements.handedness).toBeNull();
  });

  it("never coerces a non-string published field into text", () => {
    // The type describes the expected payload shape; the runtime payload is
    // external data, so the test simulates a publisher type change directly.
    const record = normalizeSourcePlayer({
      ...BIJAN,
      team: { label: 7 } as unknown as RawSourcePlayer["team"],
      position: { shortLabel: 12 } as unknown as RawSourcePlayer["position"],
      archetype: undefined,
    });
    expect(record.team).toBeNull();
    expect(record.listedPosition).toBeNull();
    expect(record.archetype).toBeNull();
  });

  it("resolves the published two-digit birth year and preserves the raw string", () => {
    expect(normalizeSourcePlayer({ ...BIJAN, birthdate: "12/31/29" }).birthdate).toBe("2029-12-31");
    expect(normalizeSourcePlayer({ ...BIJAN, birthdate: "1/2/30" }).birthdate).toBe("1930-01-02");
    const anomalous = normalizeSourcePlayer({ ...BIJAN, birthdate: "8/12/73" });
    expect(anomalous.birthdate).toBe("1973-08-12");
    expect(anomalous.provenance.birthdateRaw).toBe("8/12/73");
    expect(normalizeSourcePlayer({ ...BIJAN, birthdate: "not a date" }).birthdate).toBeNull();
  });
});

describe("coverage and missing-field reporting", () => {
  it("counts what the source actually omits", () => {
    const report = buildMissingFieldReport([normalizeSourcePlayer(BIJAN), normalizeSourcePlayer(FREE_AGENT)]);
    const byField = Object.fromEntries(report.map((entry) => [entry.field, entry.missing]));
    expect(byField.team).toBe(1);
    expect(byField.archetype).toBe(1);
    expect(byField.birthdate).toBe(1);
    expect(byField["ratings.overallRating"]).toBe(0);
  });

  it("only claims complete-as-imported for an untruncated, fully-arrived fetch", () => {
    const players = [normalizeSourcePlayer(BIJAN), normalizeSourcePlayer(FREE_AGENT)];
    expect(coverageStatusFor(players, 2)).toBe("complete_as_imported");
    expect(coverageStatusFor(players, 5)).toBe("partial");
    expect(coverageStatusFor(players, null)).toBe("partial");
  });
});

describe("CB-1 classification of an incoming import", () => {
  const existing: ExistingSourceRecord[] = [
    { id: "row-1", sourceId: "13202", fullName: "Bijan Robinson", birthdate: "2002-01-30", team: "Atlanta Falcons", listedPosition: "HB" },
  ];

  it("marks an unseen record new", () => {
    const result = classifyIncoming(normalizeSourcePlayer(FREE_AGENT), existing);
    expect(result.outcome).toBe("new");
  });

  it("matches when the composite key agrees", () => {
    const result = classifyIncoming(normalizeSourcePlayer(BIJAN), existing);
    expect(result).toMatchObject({ outcome: "matched", matchedId: "row-1" });
  });

  it("reports a contradiction as a conflict rather than a silent match", () => {
    const moved = normalizeSourcePlayer({ ...BIJAN, team: { label: "Chicago Bears" } });
    const result = classifyIncoming(moved, existing);
    expect(result.outcome).toBe("conflict");
    expect(result.reason).toContain("team");
  });

  it("attaches a declared outcome to every planned record", () => {
    const planned = planImport([BIJAN, FREE_AGENT], existing);
    expect(planned.map((record) => record.reconciliationOutcome)).toEqual(["matched", "new"]);
    expect(planned[0].reconciliationReason).toBe("source_id_and_key_agree");
  });
});

describe("batching", () => {
  it("splits records into restartable batches", () => {
    expect(toBatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(toBatches([], 2)).toEqual([]);
  });
});

function htmlResponse(html: string) {
  return { ok: true, status: 200, text: async () => html, json: async () => ({}) };
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, text: async () => JSON.stringify(body), json: async () => body };
}

/** `serveMax` lets a test simulate a truncated fetch that still reports a larger total. */
function ratingsFetch(total: number, perPage: number, serveMax: number = total) {
  return (async (input: string) => {
    if (!String(input).includes("_next/data")) {
      return htmlResponse('<html><script>{"buildId":"BUILD123"}</script></html>');
    }
    const page = Number(new URL(String(input)).searchParams.get("page"));
    const start = (page - 1) * perPage;
    const count = Math.max(0, Math.min(perPage, serveMax - start));
    const items = Array.from({ length: count }, (_, index) => ({
      id: String(start + index + 1),
      firstName: "Player",
      lastName: `Number${start + index + 1}`,
      position: { shortLabel: "WR" },
      overallRating: 80,
    }));
    return jsonResponse({ pageProps: { ratingDetails: { items, totalItems: total } } });
  }) as unknown as typeof fetch;
}

describe("fetchLaunchPlayers", () => {
  it("paginates until every reported record has arrived", async () => {
    const result = await fetchLaunchPlayers(ratingsFetch(5, 3));
    expect(result.players).toHaveLength(5);
    expect(result.reportedTotal).toBe(5);
    expect(result.buildId).toBe("BUILD123");
  });

  it("treats a short read as a retryable failure rather than an absence", async () => {
    await expect(fetchLaunchPlayers(ratingsFetch(5, 2))).resolves.toMatchObject({ reportedTotal: 5 });
    // The source reports 99 records but stops after 10: never record a revision.
    await expect(fetchLaunchPlayers(ratingsFetch(99, 2, 10))).rejects.toThrow(/retryable failure/);
  });
});
