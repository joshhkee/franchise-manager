// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  asOwnerSession,
  asRole,
  allowOwner,
  createFranchise,
  createTestDb,
  countFranchisesSeen,
  OTHER_GITHUB_ID,
  OTHER_UID,
  OWNER_GITHUB_ID,
  OWNER_UID,
  registerOwner,
  STRANGER_GITHUB_ID,
  STRANGER_UID,
} from "./harness";

let db: PGlite;
let ownerFranchiseId: string;
let otherFranchiseId: string;

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");
  ownerFranchiseId = await createFranchise(db, OWNER_UID, "Falcons", true);
  otherFranchiseId = await createFranchise(db, OTHER_UID, "Other club");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("authoritative owner allowlisting", () => {
  it("registers an allowlisted identity but rejects one that is not allowlisted", async () => {
    await asOwnerSession(db);
    const allowed = await db.query<{ github_login: string }>(
      "select github_login from app.owners where uid = $1",
      [OWNER_UID],
    );
    expect(allowed.rows).toHaveLength(1);

    await expect(
      db.query("select public.register_owner($1, $2, $3)", [STRANGER_UID, STRANGER_GITHUB_ID, "stranger"]),
    ).rejects.toThrow(/unauthorized/);

    const stranger = await db.query("select 1 from app.owners where uid = $1", [STRANGER_UID]);
    expect(stranger.rows).toHaveLength(0);
  });

  it("keeps the allowlist and the bootstrap function out of client reach", async () => {
    await asRole(db, "authenticated", STRANGER_UID);
    await expect(db.query("select count(*) from app.owner_allowlist")).rejects.toThrow(/permission denied/);
    await expect(
      db.query("select public.register_owner($1, $2, $3)", [STRANGER_UID, OWNER_GITHUB_ID, "spoof"]),
    ).rejects.toThrow(/permission denied/);

    await asRole(db, "anon");
    await expect(db.query("select count(*) from app.franchises")).rejects.toThrow(/permission denied/);
  });
});

describe("franchise isolation", () => {
  it("shows each owner only their own franchises", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    expect(await countFranchisesSeen(db)).toBe(1);

    await asRole(db, "authenticated", OTHER_UID);
    expect(await countFranchisesSeen(db)).toBe(1);
  });

  it("blocks an authenticated stranger with no owners row from creating a franchise", async () => {
    await asRole(db, "authenticated", STRANGER_UID);
    await expect(
      db.query("insert into app.franchises (owner_uid, name) values ($1, $2)", [STRANGER_UID, "Sneaky"]),
    ).rejects.toThrow(/row-level security/);
  });

  it("does not let one owner modify another owner's franchise", async () => {
    await asRole(db, "authenticated", OTHER_UID);
    await db.query("update app.franchises set name = $1 where id = $2", ["Hijacked", ownerFranchiseId]);

    await asOwnerSession(db);
    const ownerRow = await db.query<{ name: string; revision: number }>(
      "select name, revision from app.franchises where id = $1",
      [ownerFranchiseId],
    );
    expect(ownerRow.rows[0].name).toBe("Falcons");
    expect(ownerRow.rows[0].revision).toBe(0);
  });
});

describe("revision contract", () => {
  it("increments on a matching revision and refuses a stale one", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const first = await db.query<{ touch_franchise: number }>(
      "select public.touch_franchise($1, $2)",
      [ownerFranchiseId, 0],
    );
    expect(first.rows[0].touch_franchise).toBe(1);

    await expect(
      db.query("select public.touch_franchise($1, $2)", [ownerFranchiseId, 0]),
    ).rejects.toThrow(/stale_revision/);

    const second = await db.query<{ touch_franchise: number }>(
      "select public.touch_franchise($1, $2)",
      [ownerFranchiseId, 1],
    );
    expect(second.rows[0].touch_franchise).toBe(2);
  });

  it("leaves another franchise untouched when the revision matches elsewhere", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select public.touch_franchise($1, $2)", [otherFranchiseId, 0]),
    ).rejects.toThrow(/stale_revision/);

    await asOwnerSession(db);
    const otherRow = await db.query<{ revision: number }>(
      "select revision from app.franchises where id = $1",
      [otherFranchiseId],
    );
    expect(otherRow.rows[0].revision).toBe(0);
  });
});
