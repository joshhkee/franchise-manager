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

const REQUEST = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;

let db: PGlite;
let sourceRecordId: string;
let franchiseId: string;
let secondFranchiseId: string;
let customPlayerId: string;
let firstFranchise: FranchiseRow;
let secondFranchise: FranchiseRow;

interface FranchiseRow {
  id: string;
  name: string;
  is_default: boolean;
  revision: number;
  archived_at: string | null;
}

interface PlayerRow {
  id: string;
  origin: string;
  custom_key: string | null;
  source_player_record_id: string | null;
  full_name: string;
}

interface FieldRow {
  baseline_value: unknown;
  plan_value: unknown;
  field_class: string;
}

async function createFranchise(name: string | null, requestNumber: number): Promise<FranchiseRow> {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<FranchiseRow>("select * from public.create_franchise($1, $2)", [
    name,
    REQUEST(requestNumber),
  ]);
  return result.rows[0];
}

async function fieldRow(playerId: string, key: string): Promise<FieldRow | undefined> {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<FieldRow>(
    "select baseline_value, plan_value, field_class from app.franchise_player_fields where franchise_player_id = $1 and field_key = $2",
    [playerId, key],
  );
  return result.rows[0];
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");

  await asOwnerSession(db);
  const revision = await db.query<{ id: string }>(
    `insert into app.source_revisions (source, revision_key, coverage_status)
     values ('civilgg', '1-base', 'complete_as_imported') returning id`,
  );
  const record = await db.query<{ id: string }>(
    `insert into app.source_player_records
       (revision_id, source_id, full_name, normalized_name, team, listed_position, reconciliation_outcome)
     values ($1, 'ea-1', 'Bijan Robinson', 'bijan robinson', 'ATL', 'HB', 'new') returning id`,
    [revision.rows[0].id],
  );
  sourceRecordId = record.rows[0].id;

  firstFranchise = await createFranchise(null, 1);
  franchiseId = firstFranchise.id;
  secondFranchise = await createFranchise("Second club", 2);
  secondFranchiseId = secondFranchise.id;

  await asRole(db, "authenticated", OWNER_UID);
  const player = await db.query<PlayerRow>(
    "select * from public.add_custom_player($1, $2, $3, $4)",
    [franchiseId, "Custom Rookie", firstFranchise.revision, REQUEST(3)],
  );
  customPlayerId = player.rows[0].id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("franchise lifecycle", () => {
  it("defaults the first franchise to the Atlanta club and keeps later ones non-default", async () => {
    expect(firstFranchise.name).toBe("Atlanta Falcons");
    expect(firstFranchise.is_default).toBe(true);
    expect(secondFranchise.is_default).toBe(false);

    const third = await createFranchise("Third club", 10);
    expect(third.is_default).toBe(false);
    await asOwnerSession(db);
    await db.query("delete from app.franchises where id = $1", [third.id]);
  });

  it("keeps the default flag on a renamed first franchise and applies the requested name", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const renamed = await db.query<FranchiseRow>(
      "select * from public.set_franchise_name($1, $2, $3, $4)",
      [franchiseId, "Renamed club", 1, REQUEST(11)],
    );
    expect(renamed.rows[0].name).toBe("Renamed club");
    expect(renamed.rows[0].is_default).toBe(true);
    expect(renamed.rows[0].revision).toBe(2);
  });

  it("archives and resumes a franchise without hiding it from its owner", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const archived = await db.query<FranchiseRow>(
      "select * from public.set_franchise_archived($1, true, $2)",
      [secondFranchiseId, REQUEST(12)],
    );
    expect(archived.rows[0].archived_at).not.toBeNull();

    const resumed = await db.query<FranchiseRow>(
      "select * from public.set_franchise_archived($1, false, $2)",
      [secondFranchiseId, REQUEST(13)],
    );
    expect(resumed.rows[0].archived_at).toBeNull();
  });
});

describe("custom and source-backed players", () => {
  it("gives custom players an app-generated key in a distinct namespace", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const player = await db.query<PlayerRow>(
      "select * from public.add_custom_player($1, $2, $3, $4)",
      [franchiseId, "Another Rookie", 2, REQUEST(14)],
    );
    expect(player.rows[0].custom_key).toMatch(/^c_[0-9a-f]{32}$/);
    expect(player.rows[0].custom_key).not.toBe(customPlayerId);
  });

  it("attaches a source record without mutating it", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const attached = await db.query<PlayerRow>(
      "select * from public.attach_source_player($1, $2, $3, $4)",
      [franchiseId, sourceRecordId, 3, REQUEST(15)],
    );
    expect(attached.rows[0].origin).toBe("source");
    expect(attached.rows[0].source_player_record_id).toBe(sourceRecordId);

    await asOwnerSession(db);
    const source = await db.query<{ full_name: string; team: string }>(
      "select full_name, team from app.source_player_records where id = $1",
      [sourceRecordId],
    );
    expect(source.rows[0]).toEqual({ full_name: "Bijan Robinson", team: "ATL" });
  });

  it("refuses to attach the same source record twice into one franchise", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select * from public.attach_source_player($1, $2, $3, $4)", [
        franchiseId,
        sourceRecordId,
        4,
        REQUEST(16),
      ]),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe("grouped editable fields", () => {
  it("starts unknown (no row) and stores an explicit zero as a value, not as missing", async () => {
    expect(await fieldRow(customPlayerId, "jersey_number")).toBeUndefined();

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select * from public.set_player_field($1, $2, $3::jsonb, $4, $5, $6)", [
      customPlayerId,
      "jersey_number",
      "0",
      "recorded",
      4,
      REQUEST(17),
    ]);
    const row = await fieldRow(customPlayerId, "jersey_number");
    expect(row?.baseline_value).toBe(0);
    expect(row?.field_class).toBe("app_fact");
  });

  it("records an already-happened value, clears the redundant plan, and keeps unrelated plans", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select * from public.set_player_field($1, $2, $3::jsonb, $4, $5, $6)", [
      customPlayerId,
      "listed_position",
      JSON.stringify("HB"),
      "plan",
      5,
      REQUEST(18),
    ]);
    await db.query("select * from public.set_player_field($1, $2, $3::jsonb, $4, $5, $6)", [
      customPlayerId,
      "team",
      JSON.stringify("ATL"),
      "plan",
      6,
      REQUEST(19),
    ]);

    await db.query("select * from public.set_player_field($1, $2, $3::jsonb, $4, $5, $6)", [
      customPlayerId,
      "listed_position",
      JSON.stringify("HB"),
      "recorded",
      7,
      REQUEST(20),
    ]);

    const position = await fieldRow(customPlayerId, "listed_position");
    expect(position?.baseline_value).toBe("HB");
    expect(position?.plan_value).toBeNull();

    const team = await fieldRow(customPlayerId, "team");
    expect(team?.plan_value).toBe("ATL");
    expect(team?.baseline_value).toBeNull();
  });

  it("refuses a stale revision without mutating anything", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select * from public.set_player_field($1, $2, $3::jsonb, $4, $5, $6)", [
        customPlayerId,
        "notes",
        JSON.stringify("stale write"),
        "plan",
        0,
        REQUEST(21),
      ]),
    ).rejects.toThrow(/stale_revision/);

    expect(await fieldRow(customPlayerId, "notes")).toBeUndefined();
  });
});

describe("retry safety and isolation", () => {
  it("replays an applied request instead of double-applying it", async () => {
    await asOwnerSession(db);
    const before = await db.query<{ count: string }>(
      "select count(*)::text as count from app.franchise_players where franchise_id = $1",
      [franchiseId],
    );

    await asRole(db, "authenticated", OWNER_UID);
    const replay = await db.query<PlayerRow>(
      "select * from public.add_custom_player($1, $2, $3, $4)",
      [franchiseId, "Custom Rookie", 999, REQUEST(3)],
    );
    expect(replay.rows[0].id).toBe(customPlayerId);

    await asOwnerSession(db);
    const after = await db.query<{ count: string }>(
      "select count(*)::text as count from app.franchise_players where franchise_id = $1",
      [franchiseId],
    );
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it("hides another owner's players and refuses their commands", async () => {
    await asRole(db, "authenticated", OTHER_UID);
    const visible = await db.query<{ count: string }>(
      "select count(*)::text as count from app.franchise_players where franchise_id = $1",
      [franchiseId],
    );
    expect(visible.rows[0].count).toBe("0");

    await expect(
      db.query("select * from public.add_custom_player($1, $2, $3, $4)", [
        franchiseId,
        "Intruder",
        0,
        REQUEST(22),
      ]),
    ).rejects.toThrow(/cross_franchise_reference/);
  });

  it("keeps the applied-request ledger out of client reach", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await expect(db.query("select count(*) from app.request_outcomes")).rejects.toThrow(/permission denied/);
  });
});
