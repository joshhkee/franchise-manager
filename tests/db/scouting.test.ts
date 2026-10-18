// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { allowOwner, asOwnerSession, asRole, createTestDb, createFranchise, OWNER_GITHUB_ID, OWNER_UID, registerOwner } from "./harness";

const request = (value: number) => `00000000-0000-4000-8000-0000000003${String(value).padStart(2, "0")}`;
const OTHER_UID = "34444444-4444-4444-8444-444444444444";
const OTHER_GITHUB_ID = 99900003;
let db: PGlite;
let first: string;
let second: string;
let strangerFranchise: string;
let firstPlayer: string;
let firstSourcePlayer: string;
let secondPlayer: string;
let strangerPlayer: string;

async function revision(franchiseId: string): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>("select revision from app.franchises where id=$1", [franchiseId]);
  return result.rows[0].revision;
}

async function addPlayer(franchiseId: string, name: string, id: number, uid = OWNER_UID): Promise<string> {
  const expectedRevision = await revision(franchiseId);
  await asRole(db, "authenticated", uid);
  const result = await db.query<{ id: string }>("select * from public.add_custom_player($1,$2,$3,$4)", [franchiseId, name, expectedRevision, request(id)]);
  return result.rows[0].id;
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  first = await createFranchise(db, OWNER_UID, "First franchise");
  second = await createFranchise(db, OWNER_UID, "Second franchise");
  firstPlayer = await addPlayer(first, "First Player", 1);
  secondPlayer = await addPlayer(second, "Second Player", 2);
  await asOwnerSession(db);
  const sourceRevision = await db.query<{ id: string }>("insert into app.source_revisions(source,revision_key,coverage_status) values('civilgg','scouting-fixture','complete_as_imported') returning id");
  const sourceRecord = await db.query<{ id: string }>("insert into app.source_player_records(revision_id,source_id,full_name,normalized_name,team,listed_position,reconciliation_outcome) values($1,'scout-source-1','First Player','first player','ATL','WR','new') returning id", [sourceRevision.rows[0].id]);
  const attachRevision = await revision(first);
  await asRole(db, "authenticated", OWNER_UID);
  firstSourcePlayer = (await db.query<{ id: string }>("select * from public.attach_source_player($1,$2,$3,$4)", [first, sourceRecord.rows[0].id, attachRevision, request(4)])).rows[0].id;
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");
  strangerFranchise = await createFranchise(db, OTHER_UID, "Other owner's franchise");
  strangerPlayer = await addPlayer(strangerFranchise, "Other Player", 3, OTHER_UID);
}, 60_000);

afterAll(async () => { await db?.close(); });

describe("C4B scouting persistence and franchise isolation", () => {
  it("saves independent preferences and replays a request without another revision change", async () => {
    const expected = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    const args = [first, "", "Multiple", "nfl-off-bears", "nfl-def-vikings", expected, request(10)];
    const saved = await db.query<{ save_scouting_preferences: { revision: number } }>(
      "select public.save_scouting_preferences($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::integer,$7::uuid)", args,
    );
    const after = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    const replay = await db.query<{ save_scouting_preferences: { revision: number } }>(
      "select public.save_scouting_preferences($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::integer,$7::uuid)",
      [first, "", "Multiple", "nfl-off-bears", "nfl-def-vikings", -1, request(10)],
    );
    expect(replay.rows[0].save_scouting_preferences).toEqual(saved.rows[0].save_scouting_preferences);
    expect(await revision(first)).toBe(after);

    await asOwnerSession(db);
    const rows = await db.query<{ franchise_id: string; offensive_book_id: string; defensive_book_id: string }>(
      "select franchise_id,offensive_book_id,defensive_book_id from app.franchise_scouting_preferences order by franchise_id",
    );
    expect(rows.rows).toContainEqual({ franchise_id: first, offensive_book_id: "nfl-off-bears", defensive_book_id: "nfl-def-vikings" });
    expect(rows.rows).toHaveLength(1);
  });

  it("persists dismissals/notes, rejects a player from another franchise, and hides another owner's state", async () => {
    const current = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_scouting_shortlist($1,'trade_block',$2,null,'pinned','Review chart',$3,$4)", [first, firstPlayer, current, request(11)]);
    const next = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_scouting_shortlist($1,'trade_block',$2,null,'pinned','Source-backed player',$3,$4)", [first, firstSourcePlayer, next, request(15)]);
    const afterSourcePin = await revision(first);
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_scouting_shortlist($1,'trade_block',$2,null,'dismissed','Keep for later',$3,$4)", [first, firstPlayer, afterSourcePin, request(12)]);
    const crossFranchise = revision(first).then(async (rev) => {
      await asRole(db, "authenticated", OWNER_UID);
      return db.query("select public.set_scouting_shortlist($1,'trade_block',$2,null,'pinned',null,$3,$4)", [first, secondPlayer, rev, request(13)]);
    });
    await expect(crossFranchise).rejects.toThrow(/cross_franchise_reference|foreign key/i);

    const ownerBRevision = await revision(strangerFranchise);
    await asRole(db, "authenticated", OTHER_UID);
    await db.query("select public.set_scouting_shortlist($1,'trade_target',$2,null,'pinned','Private to owner B',$3,$4)", [strangerFranchise, strangerPlayer, ownerBRevision, request(14)]);

    await asRole(db, "authenticated", OWNER_UID);
    const visible = await db.query<{ franchise_id: string; status: string; note: string }>(
      "select franchise_id,status,note from public.franchise_scouting_shortlist_view order by note",
    );
    expect(visible.rows).toEqual([
      { franchise_id: first, status: "dismissed", note: "Keep for later" },
      { franchise_id: first, status: "pinned", note: "Source-backed player" },
    ]);
    await asRole(db, "authenticated", OTHER_UID);
    const hidden = await db.query<{ franchise_id: string; note: string }>("select franchise_id,note from public.franchise_scouting_shortlist_view order by note");
    expect(hidden.rows).toEqual([{ franchise_id: strangerFranchise, note: "Private to owner B" }]);
  });

  it("uses disjoint mutable player identities between franchises", async () => {
    expect(firstPlayer).not.toBe(secondPlayer);
    expect(second).not.toBe(first);
  });
});
