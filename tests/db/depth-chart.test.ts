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
let franchiseId: string;
let otherFranchiseId: string;
let playerOne: string;
let playerTwo: string;
let playerThree: string;
let otherPlayer: string;

interface ChartRow {
  position: string;
  layer: string;
  depth_rank: number;
  franchise_player_id: string;
}

async function revisionOf(id: string): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>(
    "select revision from app.franchises where id = $1",
    [id],
  );
  return result.rows[0].revision;
}

async function addPlayer(franchise: string, name: string, expectedRevision: number, requestNumber: number) {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<{ id: string }>(
    "select * from public.add_custom_player($1, $2, $3, $4)",
    [franchise, name, expectedRevision, REQUEST(requestNumber)],
  );
  return result.rows[0].id;
}

async function planRows(franchise: string, position: string): Promise<ChartRow[]> {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<ChartRow>(
    `select position, layer, depth_rank, franchise_player_id
       from app.depth_chart_entries
      where franchise_id = $1 and position = $2 and layer = 'plan'
      order by depth_rank`,
    [franchise, position],
  );
  return result.rows;
}

async function baselineRows(franchise: string, position: string): Promise<ChartRow[]> {
  await asOwnerSession(db);
  const result = await db.query<ChartRow>(
    `select position, layer, depth_rank, franchise_player_id
       from app.depth_chart_entries
      where franchise_id = $1 and position = $2 and layer = 'baseline'
      order by depth_rank`,
    [franchise, position],
  );
  return result.rows;
}

async function savePlan(
  franchise: string,
  position: string,
  players: string[],
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query<{ set_depth_chart_plan: { playerIds: string[] } }>(
    "select public.set_depth_chart_plan($1, $2, $3, $4, $5)",
    [franchise, position, players, expectedRevision, REQUEST(requestNumber)],
  );
}

async function recordBaseline(
  franchise: string,
  position: string,
  players: string[],
  intent: string,
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query<{
    record_depth_chart_baseline: { playerIds: string[]; verification: string; planKept: boolean };
  }>("select public.record_depth_chart_baseline($1, $2, $3, $4, $5, $6)", [
    franchise,
    position,
    players,
    intent,
    expectedRevision,
    REQUEST(requestNumber),
  ]);
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");

  await asRole(db, "authenticated", OWNER_UID);
  const first = await db.query<{ id: string; revision: number }>(
    "select * from public.create_franchise($1, $2)",
    ["Atlanta Falcons", REQUEST(1)],
  );
  franchiseId = first.rows[0].id;

  const second = await db.query<{ id: string }>("select * from public.create_franchise($1, $2)", [
    "Second club",
    REQUEST(2),
  ]);
  otherFranchiseId = second.rows[0].id;

  let revision = await revisionOf(franchiseId);
  playerOne = await addPlayer(franchiseId, "Alpha Back", revision, 3);
  revision = await revisionOf(franchiseId);
  playerTwo = await addPlayer(franchiseId, "Bravo Back", revision, 4);
  revision = await revisionOf(franchiseId);
  playerThree = await addPlayer(franchiseId, "Charlie Back", revision, 5);

  otherPlayer = await addPlayer(otherFranchiseId, "Other Club Back", 0, 6);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("depth-chart commands", () => {
  it("saves one whole position list and reads it back through the owner-scoped view", async () => {
    const revision = await revisionOf(franchiseId);
    const result = await savePlan(franchiseId, "QB", [playerOne, playerTwo], revision, 20);
    expect(result.rows[0].set_depth_chart_plan.playerIds).toEqual([playerOne, playerTwo]);

    const rows = await planRows(franchiseId, "QB");
    expect(rows.map((row) => [row.depth_rank, row.franchise_player_id])).toEqual([
      [1, playerOne],
      [2, playerTwo],
    ]);

    await asRole(db, "authenticated", OWNER_UID);
    const view = await db.query<{
      position: string;
      layer: string;
      depth_rank: number;
      verification: string;
      full_name: string;
    }>(
      `select position, layer, depth_rank, verification, full_name
         from public.depth_chart_view
        where franchise_id = $1 and position = 'QB' and layer = 'plan'
        order by depth_rank`,
      [franchiseId],
    );
    expect(view.rows).toHaveLength(2);
    expect(view.rows[0].verification).toBe("provisional_published");
    expect(view.rows[0].full_name).toBe("Alpha Back");
  });

  it("refuses a stale revision without touching the stored list", async () => {
    const stale = (await revisionOf(franchiseId)) - 1;
    await expect(savePlan(franchiseId, "QB", [playerThree], stale, 21)).rejects.toThrow(
      /stale_revision/,
    );
    const rows = await planRows(franchiseId, "QB");
    expect(rows.map((row) => row.franchise_player_id)).toEqual([playerOne, playerTwo]);
  });

  it("refuses players that belong to another franchise and leaves the list intact", async () => {
    const revision = await revisionOf(franchiseId);
    await expect(
      savePlan(franchiseId, "QB", [playerOne, otherPlayer], revision, 22),
    ).rejects.toThrow(/cross_franchise_reference/);
    const rows = await planRows(franchiseId, "QB");
    expect(rows.map((row) => row.franchise_player_id)).toEqual([playerOne, playerTwo]);
  });

  it("rejects duplicates inside one position list", async () => {
    const revision = await revisionOf(franchiseId);
    await expect(savePlan(franchiseId, "QB", [playerOne, playerOne], revision, 23)).rejects.toThrow(
      /validation_failed/,
    );
  });

  it("replays a retried request instead of applying it twice", async () => {
    const revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "HB", [playerThree], revision, 24);
    const afterFirst = await revisionOf(franchiseId);

    const replay = await savePlan(franchiseId, "HB", [playerOne], revision, 24);
    expect(replay.rows[0].set_depth_chart_plan.playerIds).toEqual([playerThree]);
    expect(await revisionOf(franchiseId)).toBe(afterFirst);
    expect((await planRows(franchiseId, "HB")).map((row) => row.franchise_player_id)).toEqual([
      playerThree,
    ]);
  });

  it("does not store a plan that equals the recorded baseline", async () => {
    const revision = await revisionOf(franchiseId);
    await recordBaseline(franchiseId, "WR", [playerOne, playerTwo], "provisional", revision, 25);
    const next = await revisionOf(franchiseId);
    await savePlan(franchiseId, "WR", [playerOne, playerTwo], next, 26);
    expect(await planRows(franchiseId, "WR")).toEqual([]);
  });

  it("records reality without silently erasing an unrelated plan, and clears a redundant one", async () => {
    let revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "TE", [playerOne, playerTwo, playerThree], revision, 27);

    revision = await revisionOf(franchiseId);
    const kept = await recordBaseline(franchiseId, "TE", [playerOne, playerThree], "recorded", revision, 28);
    expect(kept.rows[0].record_depth_chart_baseline.planKept).toBe(true);
    expect(kept.rows[0].record_depth_chart_baseline.verification).toBe("owner_confirmed");
    expect((await planRows(franchiseId, "TE")).map((row) => row.franchise_player_id)).toEqual([
      playerOne,
      playerTwo,
      playerThree,
    ]);

    revision = await revisionOf(franchiseId);
    const redundant = await recordBaseline(
      franchiseId,
      "TE",
      [playerOne, playerTwo, playerThree],
      "recorded",
      revision,
      29,
    );
    expect(redundant.rows[0].record_depth_chart_baseline.planKept).toBe(false);
    expect(await planRows(franchiseId, "TE")).toEqual([]);
    expect((await baselineRows(franchiseId, "TE")).map((row) => row.franchise_player_id)).toEqual([
      playerOne,
      playerTwo,
      playerThree,
    ]);

    await asRole(db, "authenticated", OWNER_UID);
    const view = await db.query<{ verification: string }>(
      "select distinct verification from public.depth_chart_view where franchise_id = $1 and position = 'TE'",
      [franchiseId],
    );
    expect(view.rows[0].verification).toBe("owner_confirmed");
  });

  it("discards a pending plan back to its baseline", async () => {
    let revision = await revisionOf(franchiseId);
    await recordBaseline(franchiseId, "CB", [playerOne], "provisional", revision, 30);

    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "CB", [playerTwo], revision, 31);
    expect(await planRows(franchiseId, "CB")).toHaveLength(1);

    revision = await revisionOf(franchiseId);
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.discard_depth_chart_plan($1, $2, $3, $4)", [
      franchiseId,
      "CB",
      revision,
      REQUEST(32),
    ]);

    expect(await planRows(franchiseId, "CB")).toEqual([]);
    expect((await baselineRows(franchiseId, "CB")).map((row) => row.franchise_player_id)).toEqual([
      playerOne,
    ]);
  });

  it("records roster corrections (active vs practice squad) and isolates them per owner", async () => {
    const revision = await revisionOf(franchiseId);
    await asRole(db, "authenticated", OWNER_UID);
    const result = await db.query<{ roster_status: string }>(
      "select * from public.set_player_roster_status($1, $2, $3, $4)",
      [playerOne, "practice_squad", revision, REQUEST(33)],
    );
    expect(result.rows[0].roster_status).toBe("practice_squad");

    await asRole(db, "authenticated", OWNER_UID);
    const seen = await db.query<{ roster_status: string }>(
      "select roster_status from public.franchise_players_view where id = $1",
      [playerOne],
    );
    expect(seen.rows[0].roster_status).toBe("practice_squad");

    await asRole(db, "authenticated", OTHER_UID);
    const stranger = await db.query<{ roster_status: string }>(
      "select roster_status from public.franchise_players_view where id = $1",
      [playerOne],
    );
    expect(stranger.rows).toHaveLength(0);

    const nextRevision = await revisionOf(franchiseId);
    await asRole(db, "authenticated", OTHER_UID);
    await expect(
      db.query("select * from public.set_player_roster_status($1, $2, $3, $4)", [
        playerOne,
        "active",
        nextRevision,
        REQUEST(34),
      ]),
    ).rejects.toThrow(/cross_franchise_reference/);
  });

  it("keeps chart rows invisible to anonymous and other-owner callers", async () => {
    await asRole(db, "anon");
    await expect(
      db.query("select * from app.depth_chart_entries where franchise_id = $1", [franchiseId]),
    ).rejects.toThrow(/permission denied|42501/);

    await asRole(db, "authenticated", OTHER_UID);
    const otherSeen = await db.query("select * from app.depth_chart_entries where franchise_id = $1", [
      franchiseId,
    ]);
    expect(otherSeen.rows).toHaveLength(0);

    await asRole(db, "authenticated", OWNER_UID);
    const ownerSeen = await db.query(
      "select * from app.depth_chart_entries where franchise_id = $1",
      [franchiseId],
    );
    expect(ownerSeen.rows.length).toBeGreaterThan(0);
  });
});
