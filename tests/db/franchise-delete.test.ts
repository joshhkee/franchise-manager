// @vitest-environment node
// D124: owner-requested permanent deletion for accidental franchises.
// Proves the command is owner-scoped, refuses the default franchise, requires
// the exact name, cascades every franchise row, and replays a lost-response
// retry through the request ledger.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
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
  STRANGER_UID,
} from "./harness";

let db: PGlite;
let defaultFranchiseId: string;
let targetFranchiseId: string;
let targetRequestId: string;

async function createFranchise(name: string, uid = OWNER_UID): Promise<string> {
  await asRole(db, "authenticated", uid);
  const result = await db.query<{ id: string; is_default: boolean }>(
    "select id, is_default from public.create_franchise($1, $2)",
    [name, randomUUID()],
  );
  return result.rows[0].id;
}

async function deleteFranchise(
  franchiseId: string,
  confirmName: string,
  requestId: string,
  uid = OWNER_UID,
) {
  await asRole(db, "authenticated", uid);
  return db.query<{ id: string; name: string }>(
    "select id, name from public.delete_franchise($1, $2, $3)",
    [franchiseId, confirmName, requestId],
  );
}

async function franchiseCountAsOwner(): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");
  return Number(result.rows[0].count);
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");

  defaultFranchiseId = await createFranchise("Atlanta Falcons");
  targetFranchiseId = await createFranchise("Accidental club");

  // A player inside the target proves the delete cascades franchise rows.
  await asRole(db, "authenticated", OWNER_UID);
  await db.query("select public.add_custom_player($1, $2, $3, $4)", [
    targetFranchiseId,
    "Sweep Player",
    0,
    randomUUID(),
  ]);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("delete_franchise", () => {
  it("refuses a mismatched confirmation name and deletes nothing", async () => {
    await expect(deleteFranchise(targetFranchiseId, "Wrong name", randomUUID())).rejects.toThrow(
      /validation_failed/,
    );
    expect(await franchiseCountAsOwner()).toBe(2);
  });

  it("refuses the default franchise even with the exact name", async () => {
    await expect(deleteFranchise(defaultFranchiseId, "Atlanta Falcons", randomUUID())).rejects.toThrow(
      /unsupported_operation/,
    );
    expect(await franchiseCountAsOwner()).toBe(2);
  });

  it("refuses another owner's franchise as a cross-franchise reference", async () => {
    await expect(
      deleteFranchise(targetFranchiseId, "Accidental club", randomUUID(), OTHER_UID),
    ).rejects.toThrow(/cross_franchise_reference/);
    expect(await franchiseCountAsOwner()).toBe(2);
  });

  it("refuses an authenticated identity with no owners row", async () => {
    await expect(
      deleteFranchise(targetFranchiseId, "Accidental club", randomUUID(), STRANGER_UID),
    ).rejects.toThrow(/unauthorized/);
    expect(await franchiseCountAsOwner()).toBe(2);
  });

  it("deletes a non-default franchise with its rows and replays a retry safely", async () => {
    targetRequestId = randomUUID();
    const deleted = await deleteFranchise(targetFranchiseId, "Accidental club", targetRequestId);
    expect(deleted.rows[0]).toMatchObject({ id: targetFranchiseId, name: "Accidental club" });

    await asOwnerSession(db);
    const players = await db.query<{ count: string }>(
      "select count(*)::text as count from app.franchise_players where franchise_id = $1",
      [targetFranchiseId],
    );
    expect(players.rows[0].count).toBe("0");
    expect(await franchiseCountAsOwner()).toBe(1);

    // A lost-response retry with the same request id replays the stored outcome
    // instead of failing on the now-missing row.
    const replay = await deleteFranchise(targetFranchiseId, "Accidental club", targetRequestId);
    expect(replay.rows[0]).toMatchObject({ id: targetFranchiseId, name: "Accidental club" });
    expect(await franchiseCountAsOwner()).toBe(1);
  });

  it("keeps the command out of anon reach", async () => {
    await asRole(db, "anon");
    await expect(
      db.query("select public.delete_franchise($1, $2, $3)", [defaultFranchiseId, "Atlanta Falcons", randomUUID()]),
    ).rejects.toThrow(/permission denied/);
  });
});
