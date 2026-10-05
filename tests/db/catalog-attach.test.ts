// @vitest-environment node
// 0009_catalog_attach.sql: attach published team rosters and explicit record
// selections to a franchise without duplicating identity, and keep every
// validation failure atomic (nothing written).
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

const REQUEST = (n: number) => `00000000-0000-4000-9000-0000000000${String(n).padStart(2, "0")}`;

interface AttachSummary {
  requested: number;
  attached: number;
  alreadyAttached: number;
  alreadyPresent: number;
  revision: number | null;
}

let db: PGlite;
let franchiseId: string;
let secondFranchiseId: string;
let revisionOne: string;
let revisionTwo: string;
let falconsIds: string[];
let billsId: string;
let unsignedId: string;
let noPositionId: string;
let secondRevisionBijanId: string;

async function attachTeam(
  franchise: string,
  revision: string,
  team: string,
  expectedRevision: number,
  requestNumber: number,
  uid = OWNER_UID,
): Promise<AttachSummary> {
  await asRole(db, "authenticated", uid);
  const result = await db.query<{ result: AttachSummary }>(
    "select public.attach_source_team($1, $2, $3, $4, $5) as result",
    [franchise, revision, team, expectedRevision, REQUEST(requestNumber)],
  );
  return result.rows[0].result;
}

async function attachRecords(
  franchise: string,
  ids: string[],
  expectedRevision: number,
  requestNumber: number,
  uid = OWNER_UID,
): Promise<AttachSummary> {
  await asRole(db, "authenticated", uid);
  const result = await db.query<{ result: AttachSummary }>(
    "select public.attach_source_records($1, $2, $3, $4) as result",
    [franchise, ids, expectedRevision, REQUEST(requestNumber)],
  );
  return result.rows[0].result;
}

async function franchiseRevision(id: string): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>(
    "select revision from app.franchises where id = $1",
    [id],
  );
  return result.rows[0].revision;
}

async function playerRows(id: string): Promise<{ full_name: string; source_player_record_id: string }[]> {
  await asOwnerSession(db);
  const result = await db.query<{ full_name: string; source_player_record_id: string }>(
    "select full_name, source_player_record_id from app.franchise_players where franchise_id = $1 order by full_name",
    [id],
  );
  return result.rows;
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
     values ('ea-madden-27', '1-base', 'complete_as_imported') returning id`,
  );
  revisionOne = revision.rows[0].id;

  const insert = (sourceId: string, name: string, team: string | null, position: string | null) =>
    db.query<{ id: string }>(
      `insert into app.source_player_records
         (revision_id, source_id, full_name, normalized_name, team, listed_position, ratings, reconciliation_outcome)
       values ($1, $2, $3, lower($3), $4, $5, '{"overallRating": 80}', 'new') returning id`,
      [revisionOne, sourceId, name, team, position],
    );

  const bijan = await insert("ea-1", "Bijan Robinson", "Atlanta Falcons", "HB");
  const jessie = await insert("ea-2", "Jessie Bates III", "Atlanta Falcons", "FS");
  noPositionId = (await insert("ea-3", "No Position Guy", "Atlanta Falcons", null)).rows[0].id;
  falconsIds = [bijan.rows[0].id, jessie.rows[0].id, noPositionId];
  billsId = (await insert("ea-4", "Bills Backup", "Buffalo Bills", "QB")).rows[0].id;
  unsignedId = (await insert("ea-5", "Free Agent Guy", null, "WR")).rows[0].id;

  const revisionTwoRow = await db.query<{ id: string }>(
    `insert into app.source_revisions (source, revision_key, coverage_status)
     values ('ea-madden-27', '2-week', 'complete_as_imported') returning id`,
  );
  revisionTwo = revisionTwoRow.rows[0].id;
  secondRevisionBijanId = (
    await db.query<{ id: string }>(
      `insert into app.source_player_records
         (revision_id, source_id, full_name, normalized_name, team, listed_position, ratings, reconciliation_outcome)
       values ($1, 'ea-1', 'Bijan Robinson', 'bijan robinson', 'Atlanta Falcons', 'HB', '{"overallRating": 82}', 'matched')
       returning id`,
      [revisionTwo],
    )
  ).rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const first = await db.query<{ id: string }>("select id from public.create_franchise(null, $1)", [
    REQUEST(90),
  ]);
  franchiseId = first.rows[0].id;
  const second = await db.query<{ id: string }>("select id from public.create_franchise($1, $2)", [
    "Second team",
    REQUEST(91),
  ]);
  secondFranchiseId = second.rows[0].id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("attach published team roster", () => {
  it("attaches a whole team as source-backed players and bumps the revision once", async () => {
    const summary = await attachTeam(franchiseId, revisionOne, "Atlanta Falcons", 0, 1);
    expect(summary).toMatchObject({
      requested: 3,
      attached: 3,
      alreadyAttached: 0,
      alreadyPresent: 0,
      revision: 1,
    });

    const rows = await playerRows(franchiseId);
    expect(rows.map((row) => row.full_name)).toEqual([
      "Bijan Robinson",
      "Jessie Bates III",
      "No Position Guy",
    ]);
    for (const row of rows) {
      expect(falconsIds).toContain(row.source_player_record_id);
    }
    expect(await franchiseRevision(franchiseId)).toBe(1);
  });

  it("keeps an unlisted position unknown instead of inventing one", async () => {
    await asOwnerSession(db);
    const result = await db.query<{ listed_position: string | null }>(
      "select listed_position from app.source_player_records where id = $1",
      [noPositionId],
    );
    expect(result.rows[0].listed_position).toBeNull();

    await asOwnerSession(db);
    const fields = await db.query<{ count: string }>(
      `select count(*)::text as count from app.franchise_player_fields fld
        join app.franchise_players fp on fp.id = fld.franchise_player_id
       where fp.franchise_id = $1`,
      [franchiseId],
    );
    expect(fields.rows[0].count).toBe("0");
  });

  it("refuses to duplicate an already attached team and changes nothing on a re-run", async () => {
    const summary = await attachTeam(franchiseId, revisionOne, "Atlanta Falcons", 1, 2);
    expect(summary).toMatchObject({ requested: 3, attached: 0, alreadyAttached: 3, revision: null });
    expect(await franchiseRevision(franchiseId)).toBe(1);
    expect(await playerRows(franchiseId)).toHaveLength(3);
  });

  it("replays the stored outcome for a repeated request id", async () => {
    const first = await attachTeam(secondFranchiseId, revisionOne, "Buffalo Bills", 0, 3);
    expect(first.attached).toBe(1);
    const replay = await attachTeam(secondFranchiseId, revisionOne, "Buffalo Bills", 0, 3);
    expect(replay).toEqual(first);
    expect(await playerRows(secondFranchiseId)).toHaveLength(1);
  });

  it("refuses an unknown team without writing anything", async () => {
    await expect(
      attachTeam(franchiseId, revisionOne, "London Monarchs", 1, 4),
    ).rejects.toThrow(/validation_failed: no published/);
    expect(await playerRows(franchiseId)).toHaveLength(3);
    expect(await franchiseRevision(franchiseId)).toBe(1);
  });
});

describe("attach explicit records", () => {
  it("attaches an unsigned record and reports the already attached one", async () => {
    const summary = await attachRecords(franchiseId, [unsignedId, falconsIds[0]], 1, 5);
    expect(summary).toMatchObject({
      requested: 2,
      attached: 1,
      alreadyAttached: 1,
      alreadyPresent: 0,
      revision: 2,
    });
    const rows = await playerRows(franchiseId);
    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.full_name)).toContain("Free Agent Guy");
  });

  it("refuses a same-name player from a different revision instead of duplicating identity", async () => {
    const summary = await attachRecords(franchiseId, [secondRevisionBijanId], 2, 6);
    expect(summary).toMatchObject({ requested: 1, attached: 0, alreadyAttached: 0, alreadyPresent: 1 });
    expect(await franchiseRevision(franchiseId)).toBe(2);
    expect(await playerRows(franchiseId)).toHaveLength(4);
  });

  it("refuses repeated ids inside one request", async () => {
    await expect(attachRecords(franchiseId, [billsId, billsId], 2, 7)).rejects.toThrow(
      /validation_failed: the request repeats a source record/,
    );
    expect(await playerRows(franchiseId)).toHaveLength(4);
  });

  it("refuses records from more than one revision in one request", async () => {
    await expect(
      attachRecords(franchiseId, [billsId, secondRevisionBijanId], 2, 8),
    ).rejects.toThrow(/validation_failed: one request must use a single source revision/);
    expect(await playerRows(franchiseId)).toHaveLength(4);
  });

  it("writes nothing when any record id is unavailable", async () => {
    await expect(
      attachRecords(franchiseId, [billsId, "00000000-0000-4000-9000-0000000000ff"], 2, 9),
    ).rejects.toThrow(/source_revision_unavailable/);
    expect(await playerRows(franchiseId)).toHaveLength(4);
    expect(await franchiseRevision(franchiseId)).toBe(2);
  });

  it("refuses a stale revision without writing", async () => {
    await expect(attachRecords(franchiseId, [billsId], 0, 10)).rejects.toThrow(/stale_revision/);
    expect(await playerRows(franchiseId)).toHaveLength(4);
  });

  it("rejects and refuses requests from anon and a second owner", async () => {
    await asRole(db, "anon");
    await expect(
      db.query("select public.attach_source_records($1, $2, $3, $4)", [
        franchiseId,
        [billsId],
        2,
        REQUEST(11),
      ]),
    ).rejects.toThrow(/permission denied/);

    await expect(
      attachRecords(franchiseId, [billsId], 2, 12, OTHER_UID),
    ).rejects.toThrow(/cross_franchise_reference/);
    expect(await playerRows(franchiseId)).toHaveLength(4);
  });
});

describe("team coverage read model", () => {
  it("groups published records by team and keeps the unsigned group separate", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const result = await db.query<{
      team: string | null;
      player_count: number | string;
      missing_position_count: number | string;
    }>(
      `select team, player_count, missing_position_count
         from public.source_team_summaries
        where revision_id = $1
        order by team nulls last`,
      [revisionOne],
    );

    const byTeam = new Map(result.rows.map((row) => [row.team, row]));
    expect(Number(byTeam.get("Atlanta Falcons")?.player_count)).toBe(3);
    expect(Number(byTeam.get("Atlanta Falcons")?.missing_position_count)).toBe(1);
    expect(Number(byTeam.get("Buffalo Bills")?.player_count)).toBe(1);
    expect(Number(byTeam.get(null)?.player_count)).toBe(1);
  });
});
