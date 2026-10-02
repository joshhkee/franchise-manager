// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  allowOwner,
  asOwnerSession,
  asRole,
  createTestDb,
  OTHER_GITHUB_ID,
  OTHER_UID,
  OWNER_GITHUB_ID,
  OWNER_UID,
  registerOwner,
} from "./harness";

const SOURCE = "ea-madden-27";
const REVISION_KEY = "1-base";

let db: PGlite;
let revisionId: string;

/** Two records: one fully populated, one with no archetype (unknown, not a default). */
const RECORDS = [
  {
    sourceId: "ea-1",
    fullName: "Bijan Robinson",
    normalizedName: "bijan robinson",
    birthdate: "2002-01-30",
    team: "Atlanta Falcons",
    listedPosition: "HB",
    archetype: "Elusive Back - HB",
    measurements: { height: 71, weight: 215 },
    ratings: { overallRating: 95 },
    abilities: ["Bruiser"],
    reconciliationOutcome: "new",
    reconciliationReason: "no_name_or_source_id_match",
  },
  {
    sourceId: "ea-2",
    fullName: "Cam Heyward",
    normalizedName: "cam heyward",
    birthdate: null,
    team: "Pittsburgh Steelers",
    listedPosition: "DT",
    measurements: { height: 77, weight: 295 },
    ratings: { overallRating: 95 },
    abilities: [],
    reconciliationOutcome: "new",
  },
];

async function beginRevision(key = REVISION_KEY, coverage = "complete_as_imported") {
  await asRole(db, "service_role");
  const result = await db.query<{ id: string; coverage_status: string; missing_field_report: unknown }>(
    "select * from public.begin_source_revision($1, $2, $3, $4::jsonb, $5::jsonb, $6)",
    [SOURCE, key, coverage, JSON.stringify([{ field: "archetype", missing: 782 }]), JSON.stringify({ route: "_next/data" }), "public ratings page"],
  );
  return result.rows[0];
}

async function append(records: unknown[]) {
  await asRole(db, "service_role");
  const result = await db.query<{ append_source_records: { attempted: number; inserted: number; skipped: number } }>(
    "select public.append_source_records($1, $2::jsonb)",
    [revisionId, JSON.stringify(records)],
  );
  return result.rows[0].append_source_records;
}

async function countRecords(): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ count: string }>("select count(*)::text as count from app.source_player_records");
  return Number(result.rows[0].count);
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("source import", () => {
  it("records a labelled revision with its missing-field report", async () => {
    const revision = await beginRevision();
    revisionId = revision.id;
    expect(revision.coverage_status).toBe("complete_as_imported");
    expect(revision.missing_field_report).toEqual([{ field: "archetype", missing: 782 }]);
  });

  it("appends a batch and reports how many rows landed", async () => {
    const result = await append(RECORDS);
    expect(result).toEqual({ attempted: 2, inserted: 2, skipped: 0 });
    expect(await countRecords()).toBe(2);
  });

  it("keeps a missing archetype null instead of inventing a default", async () => {
    await asOwnerSession(db);
    const result = await db.query<{ archetype: string | null; birthdate: string | null }>(
      "select archetype, birthdate from app.source_player_records where source_id = 'ea-2'",
    );
    expect(result.rows[0].archetype).toBeNull();
    expect(result.rows[0].birthdate).toBeNull();
  });

  it("is retry-safe: re-beginning reuses the revision and a repeat append inserts nothing", async () => {
    const again = await beginRevision();
    expect(again.id).toBe(revisionId);

    const result = await append(RECORDS);
    expect(result).toEqual({ attempted: 2, inserted: 0, skipped: 2 });
    expect(await countRecords()).toBe(2);
  });

  it("refuses an unknown coverage status and a duplicate sourceId in one batch", async () => {
    await expect(beginRevision("1-base-week-9", "not_a_label")).rejects.toThrow(/validation_failed/);
    await expect(append([RECORDS[0], RECORDS[0]])).rejects.toThrow(/duplicate sourceId/);
  });

  it("refuses to append to a revision that does not exist", async () => {
    await asRole(db, "service_role");
    await expect(
      db.query("select public.append_source_records($1, $2::jsonb)", [
        "00000000-0000-4000-8000-000000000000",
        JSON.stringify(RECORDS),
      ]),
    ).rejects.toThrow(/source_revision_unavailable/);
  });

  it("keeps the import commands and the catalog out of client reach", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select * from public.begin_source_revision($1, $2, $3, $4::jsonb, $5::jsonb, $6)", [
        SOURCE,
        "1-base-browser",
        "partial",
        JSON.stringify([]),
        JSON.stringify({}),
        "browser",
      ]),
    ).rejects.toThrow(/permission denied/);

    await expect(
      db.query("insert into app.source_player_records (revision_id, source_id, full_name, normalized_name, reconciliation_outcome) values ($1, 'x', 'X', 'x', 'new')", [
        revisionId,
      ]),
    ).rejects.toThrow(/permission denied/);

    await asRole(db, "anon");
    await expect(db.query("select count(*) from app.source_revisions")).rejects.toThrow(/permission denied/);
  });

  it("lets allowlisted owners read the catalog through the read model and hides it from everyone else", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const ownerView = await db.query<{ count: string }>("select count(*)::text as count from app.source_player_records");
    expect(ownerView.rows[0].count).toBe("2");

    const viaReadModel = await db.query<{ count: string; source: string }>(
      "select count(*)::text as count, max(source) as source from public.source_player_records_view",
    );
    expect(viaReadModel.rows[0].count).toBe("2");
    expect(viaReadModel.rows[0].source).toBe(SOURCE);

    await asRole(db, "authenticated", "39999999-9999-4999-8999-999999999999");
    const strangerView = await db.query<{ count: string }>("select count(*)::text as count from app.source_revisions");
    expect(strangerView.rows[0].count).toBe("0");

    await asRole(db, "anon");
    await expect(db.query("select count(*) from public.source_player_records_view")).rejects.toThrow(
      /permission denied/,
    );
  });

  it("refuses to mutate a published revision, even for a privileged caller", async () => {
    await asOwnerSession(db);
    await expect(
      db.query("update app.source_player_records set team = 'Elsewhere' where source_id = 'ea-1'"),
    ).rejects.toThrow(/immutable/);
    await expect(db.query("delete from app.source_revisions where id = $1", [revisionId])).rejects.toThrow(
      /immutable/,
    );

    const still = await db.query<{ team: string }>(
      "select team from app.source_player_records where source_id = 'ea-1'",
    );
    expect(still.rows[0].team).toBe("Atlanta Falcons");
  });
});
