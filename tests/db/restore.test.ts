// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  allowOwner,
  asOwnerSession,
  asRole,
  createTestDb,
  OWNER_GITHUB_ID,
  OWNER_UID,
  registerOwner,
} from "./harness";

const REQUEST = (n: number) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

let db: PGlite;
let franchiseId: string;
let sourcePlayerId: string;
let customPlayerId: string;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Restored club",
    isDefault: false,
    pinnedRevisionKey: "1-base",
    players: [
      {
        mutableId: "old-source",
        origin: "source",
        customKey: null,
        sourceReference: { sourceId: "ea-1", revisionKey: "1-base" },
        fullName: "Bijan Robinson",
      },
      {
        mutableId: "old-custom",
        origin: "custom",
        customKey: "c_keepme",
        sourceReference: null,
        fullName: "Custom Rookie",
      },
    ],
    fields: [
      {
        playerId: "old-custom",
        fieldKey: "jersey_number",
        baselineValue: 0,
        planValue: null,
        fieldClass: "app_fact",
      },
      {
        playerId: "old-source",
        fieldKey: "listed_position",
        baselineValue: null,
        planValue: "HB",
        fieldClass: "game_edit_action",
      },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");

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
  sourcePlayerId = record.rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const franchise = await db.query<{ id: string }>(
    "select * from public.create_franchise($1, $2)",
    ["Atlanta Falcons", REQUEST(1)],
  );
  franchiseId = franchise.rows[0].id;

  const custom = await db.query<{ id: string }>(
    "select * from public.add_custom_player($1, $2, $3, $4)",
    [franchiseId, "Custom Rookie", 0, REQUEST(2)],
  );
  customPlayerId = custom.rows[0].id;

  await db.query("select * from public.attach_source_player($1, $2, $3, $4)", [
    franchiseId,
    sourcePlayerId,
    1,
    REQUEST(3),
  ]);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("restore-new", () => {
  it("creates a new franchise with remapped ids and preserved identity", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const restored = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(payload()), REQUEST(10)],
    );
    const newFranchiseId = restored.rows[0].restore_new_franchise;
    expect(newFranchiseId).not.toBe(franchiseId);

    await asOwnerSession(db);
    const players = await db.query<{
      id: string;
      origin: string;
      custom_key: string | null;
      source_player_record_id: string | null;
    }>(
      "select id, origin, custom_key, source_player_record_id from app.franchise_players where franchise_id = $1 order by origin",
      [newFranchiseId],
    );
    expect(players.rows).toHaveLength(2);

    const custom = players.rows.find((row) => row.origin === "custom");
    expect(custom?.custom_key).toBe("c_keepme");
    expect(custom?.id).not.toBe(customPlayerId);

    const source = players.rows.find((row) => row.origin === "source");
    expect(source?.source_player_record_id).toBe(sourcePlayerId);

    const fields = await db.query<{
      franchise_player_id: string;
      field_key: string;
      baseline_value: unknown;
      plan_value: unknown;
    }>("select franchise_player_id, field_key, baseline_value, plan_value from app.franchise_player_fields where franchise_player_id = any($1::uuid[])", [
      players.rows.map((row) => row.id),
    ]);
    expect(fields.rows).toHaveLength(2);
    const jersey = fields.rows.find((row) => row.field_key === "jersey_number");
    expect(jersey?.baseline_value).toBe(0);
    expect(jersey?.plan_value).toBeNull();
    const position = fields.rows.find((row) => row.field_key === "listed_position");
    expect(position?.plan_value).toBe("HB");
    expect(position?.baseline_value).toBeNull();
  });

  it("refuses a backup whose source revision is missing and writes nothing", async () => {
    await asOwnerSession(db);
    const before = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");

    await asRole(db, "authenticated", OWNER_UID);
    const broken = payload({
      players: [
        {
          mutableId: "old-source",
          origin: "source",
          customKey: null,
          sourceReference: { sourceId: "ea-1", revisionKey: "missing-revision" },
          fullName: "Bijan Robinson",
        },
      ],
      fields: [],
    });
    await expect(
      db.query("select public.restore_new_franchise($1::jsonb, $2)", [JSON.stringify(broken), REQUEST(11)]),
    ).rejects.toThrow(/source_revision_unavailable/);

    await asOwnerSession(db);
    const after = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it("replays a repeated restore request instead of duplicating the franchise", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const first = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(payload({ name: "Replay club" })), REQUEST(12)],
    );
    const replay = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(payload({ name: "Replay club" })), REQUEST(12)],
    );
    expect(replay.rows[0].restore_new_franchise).toBe(first.rows[0].restore_new_franchise);
  });
});
