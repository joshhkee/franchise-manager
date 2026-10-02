// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  allowOwner,
  asOwnerSession,
  asRole,
  createFranchise,
  createTestDb,
  OWNER_GITHUB_ID,
  OWNER_UID,
  registerOwner,
  STRANGER_UID,
} from "./harness";

let db: PGlite;
let revisionId: string;
let playerId: string;
let franchiseId: string;

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  franchiseId = await createFranchise(db, OWNER_UID, "Falcons", true);

  await asOwnerSession(db);
  const revision = await db.query<{ id: string }>(
    `insert into app.source_revisions (source, revision_key, coverage_status, access_basis)
     values ($1, $2, $3, $4) returning id`,
    ["civilgg", "1-base", "complete_as_imported", "owner-provided export"],
  );
  revisionId = revision.rows[0].id;

  const player = await db.query<{ id: string }>(
    `insert into app.source_player_records
       (revision_id, source_id, full_name, normalized_name, birthdate, team, listed_position, reconciliation_outcome)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [revisionId, "ea-123", "Bijan Robinson", "bijan robinson", "2002-01-31", "ATL", "HB", "new"],
  );
  playerId = player.rows[0].id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("source catalog reading", () => {
  it("is readable by an allowlisted owner", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const revisions = await db.query<{ count: string }>(
      "select count(*)::text as count from app.source_revisions",
    );
    const players = await db.query<{ count: string }>(
      "select count(*)::text as count from app.source_player_records",
    );
    expect(revisions.rows[0].count).toBe("1");
    expect(players.rows[0].count).toBe("1");
  });

  it("shows an authenticated stranger nothing", async () => {
    await asRole(db, "authenticated", STRANGER_UID);
    const revisions = await db.query<{ count: string }>(
      "select count(*)::text as count from app.source_revisions",
    );
    expect(revisions.rows[0].count).toBe("0");
  });
});

describe("source catalog immutability", () => {
  it("denies client writes entirely", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query(
        `insert into app.source_player_records
           (revision_id, source_id, full_name, normalized_name, reconciliation_outcome)
         values ($1, $2, $3, $4, $5)`,
        [revisionId, "ea-999", "Forged Player", "forged player", "new"],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("update app.source_player_records set team = $1 where id = $2", ["PHI", playerId]),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.query("delete from app.source_player_records where id = $1", [playerId]),
    ).rejects.toThrow(/permission denied/);
  });

  it("refuses an update even from the privileged session unless the import window is open", async () => {
    await asOwnerSession(db);
    await expect(
      db.query("update app.source_player_records set team = $1 where id = $2", ["PHI", playerId]),
    ).rejects.toThrow(/immutable/);

    await db.exec(
      "begin; select set_config('app.allow_source_mutation', 'on', true); update app.source_player_records set team = 'PHI' where id = " +
        `'${playerId}'; commit;`,
    );

    const updated = await db.query<{ team: string }>(
      "select team from app.source_player_records where id = $1",
      [playerId],
    );
    expect(updated.rows[0].team).toBe("PHI");
  });

  it("rejects a duplicate sourceId inside one revision", async () => {
    await asOwnerSession(db);
    await expect(
      db.query(
        `insert into app.source_player_records
           (revision_id, source_id, full_name, normalized_name, reconciliation_outcome)
         values ($1, $2, $3, $4, $5)`,
        [revisionId, "ea-123", "Duplicate", "duplicate", "new"],
      ),
    ).rejects.toThrow(/duplicate key/);
  });
});

describe("franchise dataset pin", () => {
  it("accepts a real revision and refuses an unknown one", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("update app.franchises set pinned_revision_id = $1 where id = $2", [
      revisionId,
      franchiseId,
    ]);

    await expect(
      db.query("update app.franchises set pinned_revision_id = $1 where id = $2", [
        "00000000-0000-4000-8000-000000000000",
        franchiseId,
      ]),
    ).rejects.toThrow(/foreign key/);
  });
});
