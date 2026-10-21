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
} from "./harness";

const request = (value: number) => `00000000-0000-4000-8000-0000000005${String(value).padStart(2, "0")}`;
const OTHER_UID = "54444444-4444-4444-8444-444444444444";
const OTHER_GITHUB_ID = 99900005;

let db: PGlite;
let first: string;
let second: string;
let strangerFranchise: string;

async function revision(franchiseId: string): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>("select revision from app.franchises where id=$1", [franchiseId]);
  return result.rows[0].revision;
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  first = await createFranchise(db, OWNER_UID, "First franchise");
  second = await createFranchise(db, OWNER_UID, "Second franchise");

  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");
  strangerFranchise = await createFranchise(db, OTHER_UID, "Other owner's franchise");
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("C5B Gameday plan persistence and franchise isolation", () => {
  it("saves a theme plan and ordered pins atomically and replays idempotently", async () => {
    const expected = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    const pins = JSON.stringify([
      { kind: "play", id: "nfl-off-falcons:gun:bunch-te:spacing_gun_bunch_te" },
      { kind: "formation", id: "nfl-off-falcons:gun:bunch-te" },
    ]);
    const saved = await db.query<{ save_gameday_plan: { revision: number; themeId: string } }>(
      "select public.save_gameday_plan($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::integer,$7::uuid)",
      [first, "off-shotgun-quick", "Quick Tempo", "Watch nickel blitz", pins, expected, request(1)],
    );
    const after = await revision(first);
    expect(after).toBe(expected + 1);

    await asRole(db, "authenticated", OWNER_UID);
    const replay = await db.query<{ save_gameday_plan: { revision: number; themeId: string } }>(
      "select public.save_gameday_plan($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::integer,$7::uuid)",
      [first, "off-shotgun-quick", "Quick Tempo", "Watch nickel blitz", pins, -1, request(1)],
    );
    expect(replay.rows[0].save_gameday_plan).toEqual(saved.rows[0].save_gameday_plan);
    expect(await revision(first)).toBe(after);

    await asRole(db, "authenticated", OWNER_UID);
    const planRows = await db.query<{ theme_id: string; custom_name: string; custom_notes: string }>(
      "select theme_id,custom_name,custom_notes from public.franchise_gameday_plans_view where franchise_id=$1",
      [first],
    );
    expect(planRows.rows).toEqual([
      { theme_id: "off-shotgun-quick", custom_name: "Quick Tempo", custom_notes: "Watch nickel blitz" },
    ]);

    const pinRows = await db.query<{ target_kind: string; target_id: string; pin_rank: number }>(
      "select target_kind,target_id,pin_rank from public.franchise_gameday_pins_view where franchise_id=$1 order by pin_rank",
      [first],
    );
    expect(pinRows.rows).toEqual([
      { target_kind: "play", target_id: "nfl-off-falcons:gun:bunch-te:spacing_gun_bunch_te", pin_rank: 1 },
      { target_kind: "formation", target_id: "nfl-off-falcons:gun:bunch-te", pin_rank: 2 },
    ]);
  });

  it("rejects stale revisions, duplicate pins, and cross-franchise or unauthorized writes", async () => {
    const current = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query(
        "select public.save_gameday_plan($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::integer,$7::uuid)",
        [first, "off-shotgun-quick", "Stale", null, "[]", current - 1, request(2)],
      ),
    ).rejects.toThrow(/stale_revision/i);

    await asRole(db, "authenticated", OWNER_UID);
    const dupPins = JSON.stringify([
      { kind: "play", id: "play-1" },
      { kind: "play", id: "play-1" },
    ]);
    await expect(
      db.query(
        "select public.save_gameday_plan($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::integer,$7::uuid)",
        [first, "off-shotgun-quick", "Dup", null, dupPins, current, request(3)],
      ),
    ).rejects.toThrow(/validation_failed/i);

    const strangerRev = await revision(strangerFranchise);
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query(
        "select public.save_gameday_plan($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::integer,$7::uuid)",
        [strangerFranchise, "off-shotgun-quick", "Cross", null, "[]", strangerRev, request(4)],
      ),
    ).rejects.toThrow(/cross_franchise_reference/i);
  });

  it("isolates Gameday plans between franchises and between owners via RLS", async () => {
    const revB = await revision(strangerFranchise);
    await asRole(db, "authenticated", OTHER_UID);
    await db.query(
      "select public.save_gameday_plan($1::uuid,$2::text,$3::text,$4::text,$5::jsonb,$6::integer,$7::uuid)",
      [strangerFranchise, "def-contain-run", "Private Defense", "Owner B only", "[]", revB, request(5)],
    );

    await asRole(db, "authenticated", OWNER_UID);
    const visibleToA = await db.query<{ franchise_id: string; custom_name: string }>(
      "select franchise_id,custom_name from public.franchise_gameday_plans_view",
    );
    expect(visibleToA.rows).toEqual([{ franchise_id: first, custom_name: "Quick Tempo" }]);

    const secondPlans = await db.query<{ franchise_id: string }>(
      "select franchise_id from public.franchise_gameday_plans_view where franchise_id=$1",
      [second],
    );
    expect(secondPlans.rows).toHaveLength(0);

    await asRole(db, "authenticated", OTHER_UID);
    const visibleToB = await db.query<{ franchise_id: string; custom_name: string }>(
      "select franchise_id,custom_name from public.franchise_gameday_plans_view",
    );
    expect(visibleToB.rows).toEqual([{ franchise_id: strangerFranchise, custom_name: "Private Defense" }]);
  });
});
