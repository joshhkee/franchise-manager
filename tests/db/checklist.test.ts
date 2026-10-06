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
let playerA: string;
let playerB: string;
let playerSquad: string;

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

async function layerIds(franchise: string, position: string, layer: string): Promise<string[]> {
  await asOwnerSession(db);
  const result = await db.query<{ franchise_player_id: string }>(
    `select franchise_player_id from app.depth_chart_entries
      where franchise_id = $1 and position = $2 and layer = $3 order by depth_rank`,
    [franchise, position, layer],
  );
  return result.rows.map((row) => row.franchise_player_id);
}

async function verificationOf(franchise: string, position: string): Promise<string | null> {
  await asOwnerSession(db);
  const result = await db.query<{ verification: string }>(
    "select verification from app.depth_chart_state where franchise_id = $1 and position = $2",
    [franchise, position],
  );
  return result.rows[0]?.verification ?? null;
}

async function savePlan(
  franchise: string,
  position: string,
  players: string[],
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query("select public.set_depth_chart_plan($1, $2, $3, $4, $5)", [
    franchise,
    position,
    players,
    expectedRevision,
    REQUEST(requestNumber),
  ]);
}

async function recordBaseline(
  franchise: string,
  position: string,
  players: string[],
  expectedRevision: number,
  requestNumber: number,
) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query("select public.record_depth_chart_baseline($1, $2, $3, 'provisional', $4, $5)", [
    franchise,
    position,
    players,
    expectedRevision,
    REQUEST(requestNumber),
  ]);
}

async function setRoster(franchise: string, player: string, status: string, revision: number, requestNumber: number) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query("select * from public.set_player_roster_status($1, $2, $3, $4)", [
    player,
    status,
    revision,
    REQUEST(requestNumber),
  ]);
}

interface Unit {
  type: "depth_chart_list" | "roster_status";
  unitId: string;
  position?: string;
  playerIds?: string[];
  playerId?: string;
  status?: "active" | "practice_squad";
}

async function confirm(franchise: string, units: Unit[], revision: number, requestNumber: number) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query<{ confirm_checklist_units: { applied: string[]; batchId: string; revision: number } }>(
    "select public.confirm_checklist_units($1, $2::jsonb, $3, $4)",
    [franchise, JSON.stringify(units), revision, REQUEST(requestNumber)],
  );
}

async function cancel(franchise: string, positions: string[], revision: number, requestNumber: number) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query<{
    cancel_checklist_units: { cancelled: string[]; dependent: string[]; revision: number };
  }>("select public.cancel_checklist_units($1, $2::jsonb, $3, $4)", [
    franchise,
    JSON.stringify(positions.map((position) => ({ type: "depth_chart_list", position }))),
    revision,
    REQUEST(requestNumber),
  ]);
}

async function undo(franchise: string, batchId: string, revision: number, requestNumber: number) {
  await asRole(db, "authenticated", OWNER_UID);
  return db.query("select public.undo_action_batch($1, $2, $3, $4)", [
    franchise,
    batchId,
    revision,
    REQUEST(requestNumber),
  ]);
}

async function batchCount(franchise: string): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ count: string }>(
    "select count(*)::text as count from app.action_batches where franchise_id = $1",
    [franchise],
  );
  return Number(result.rows[0].count);
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await allowOwner(db, OTHER_GITHUB_ID, "second-owner");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OTHER_UID, OTHER_GITHUB_ID, "second-owner");

  await asRole(db, "authenticated", OWNER_UID);
  const first = await db.query<{ id: string }>("select * from public.create_franchise($1, $2)", [
    "Atlanta Falcons",
    REQUEST(1),
  ]);
  franchiseId = first.rows[0].id;

  let revision = await revisionOf(franchiseId);
  playerA = await addPlayer(franchiseId, "Alpha Receiver", revision, 2);
  revision = await revisionOf(franchiseId);
  playerB = await addPlayer(franchiseId, "Bravo Receiver", revision, 3);
  revision = await revisionOf(franchiseId);
  playerSquad = await addPlayer(franchiseId, "Squad Caller", revision, 4);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("confirm_checklist_units", () => {
  it("promotes the reviewed plan to an owner-confirmed baseline, removes the plan, and bumps once", async () => {
    let revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "WR", [playerA, playerB], revision, 10);

    revision = await revisionOf(franchiseId);
    const result = await confirm(
      franchiseId,
      [{ type: "depth_chart_list", unitId: "depth_chart_list:WR", position: "WR", playerIds: [playerA, playerB] }],
      revision,
      11,
    );
    expect(result.rows[0].confirm_checklist_units.applied).toEqual(["depth_chart_list:WR"]);
    expect(result.rows[0].confirm_checklist_units.revision).toBe(revision + 1);
    expect(await revisionOf(franchiseId)).toBe(revision + 1);

    expect(await layerIds(franchiseId, "WR", "baseline")).toEqual([playerA, playerB]);
    expect(await layerIds(franchiseId, "WR", "plan")).toEqual([]);
    expect(await verificationOf(franchiseId, "WR")).toBe("owner_confirmed");
    expect(await batchCount(franchiseId)).toBe(1);
  });

  it("replays a retried confirmation instead of applying it twice", async () => {
    let revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "TE", [playerA], revision, 12);

    revision = await revisionOf(franchiseId);
    const units: Unit[] = [{ type: "depth_chart_list", unitId: "depth_chart_list:TE", position: "TE", playerIds: [playerA] }];
    const first = await confirm(franchiseId, units, revision, 13);
    const afterFirst = await revisionOf(franchiseId);

    const replay = await confirm(franchiseId, units, revision, 13);
    expect(replay.rows[0].confirm_checklist_units.batchId).toBe(first.rows[0].confirm_checklist_units.batchId);
    expect(await revisionOf(franchiseId)).toBe(afterFirst);
    expect(await batchCount(franchiseId)).toBe(2);
  });

  it("refuses a stale revision without mutating anything", async () => {
    const revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "CB", [playerB], revision, 14);

    const stale = (await revisionOf(franchiseId)) - 1;
    await expect(
      confirm(
        franchiseId,
        [{ type: "depth_chart_list", unitId: "depth_chart_list:CB", position: "CB", playerIds: [playerB] }],
        stale,
        15,
      ),
    ).rejects.toThrow(/stale_revision/);

    expect(await layerIds(franchiseId, "CB", "plan")).toEqual([playerB]);
    expect(await layerIds(franchiseId, "CB", "baseline")).toEqual([]);
  });

  it("applies none when the reviewed scope is no longer the pending plan", async () => {
    let revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "HB", [playerA], revision, 16);

    revision = await revisionOf(franchiseId);
    await expect(
      confirm(
        franchiseId,
        [{ type: "depth_chart_list", unitId: "depth_chart_list:HB", position: "HB", playerIds: [playerB] }],
        revision,
        17,
      ),
    ).rejects.toThrow(/no longer pending/);

    expect(await layerIds(franchiseId, "HB", "plan")).toEqual([playerA]);
    expect(await layerIds(franchiseId, "HB", "baseline")).toEqual([]);
  });

  it("applies a whole multi-unit batch atomically and applies none if one unit is invalid", async () => {
    let revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "FS", [playerA], revision, 18);
    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "SS", [playerB], revision, 19);

    revision = await revisionOf(franchiseId);
    await expect(
      confirm(
        franchiseId,
        [
          { type: "depth_chart_list", unitId: "depth_chart_list:FS", position: "FS", playerIds: [playerA] },
          { type: "depth_chart_list", unitId: "depth_chart_list:SS", position: "SS", playerIds: [playerA] },
        ],
        revision,
        20,
      ),
    ).rejects.toThrow(/no longer pending/);

    expect(await layerIds(franchiseId, "FS", "plan")).toEqual([playerA]);
    expect(await layerIds(franchiseId, "FS", "baseline")).toEqual([]);
    expect(await layerIds(franchiseId, "SS", "plan")).toEqual([playerB]);

    revision = await revisionOf(franchiseId);
    const ok = await confirm(
      franchiseId,
      [
        { type: "depth_chart_list", unitId: "depth_chart_list:FS", position: "FS", playerIds: [playerA] },
        { type: "depth_chart_list", unitId: "depth_chart_list:SS", position: "SS", playerIds: [playerB] },
      ],
      revision,
      21,
    );
    expect(ok.rows[0].confirm_checklist_units.applied).toEqual(["depth_chart_list:FS", "depth_chart_list:SS"]);
    expect(await layerIds(franchiseId, "FS", "baseline")).toEqual([playerA]);
    expect(await layerIds(franchiseId, "SS", "baseline")).toEqual([playerB]);
  });

  it("blocks a dependent list until its promotion prerequisite is in the same ordered batch", async () => {
    let revision = await revisionOf(franchiseId);
    await setRoster(franchiseId, playerSquad, "practice_squad", revision, 90);

    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "KR", [playerSquad], revision, 22);

    revision = await revisionOf(franchiseId);
    await expect(
      confirm(
        franchiseId,
        [{ type: "depth_chart_list", unitId: "depth_chart_list:KR", position: "KR", playerIds: [playerSquad] }],
        revision,
        23,
      ),
    ).rejects.toThrow(/dependency_blocked/);
    expect(await layerIds(franchiseId, "KR", "baseline")).toEqual([]);

    revision = await revisionOf(franchiseId);
    const result = await confirm(
      franchiseId,
      [
        { type: "roster_status", unitId: `roster_status:${playerSquad}`, playerId: playerSquad, status: "active" },
        { type: "depth_chart_list", unitId: "depth_chart_list:KR", position: "KR", playerIds: [playerSquad] },
      ],
      revision,
      24,
    );
    expect(result.rows[0].confirm_checklist_units.applied).toEqual([
      `roster_status:${playerSquad}`,
      "depth_chart_list:KR",
    ]);
    expect(await layerIds(franchiseId, "KR", "baseline")).toEqual([playerSquad]);
    await asRole(db, "authenticated", OWNER_UID);
    const status = await db.query<{ roster_status: string }>(
      "select roster_status from public.franchise_players_view where id = $1",
      [playerSquad],
    );
    expect(status.rows[0].roster_status).toBe("active");
  });
});

describe("cancel_checklist_units", () => {
  it("reverts the plan to its baseline and reports dependent positions", async () => {
    let revision = await revisionOf(franchiseId);
    await recordBaseline(franchiseId, "DT", [playerA], revision, 25);
    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "DT", [playerB], revision, 26);
    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "NT", [playerB], revision, 27);

    revision = await revisionOf(franchiseId);
    const result = await cancel(franchiseId, ["DT"], revision, 28);
    expect(result.rows[0].cancel_checklist_units.cancelled).toEqual(["DT"]);
    expect(result.rows[0].cancel_checklist_units.dependent).toEqual(expect.arrayContaining(["NT"]));
    expect(result.rows[0].cancel_checklist_units.dependent).not.toContain("DT");

    expect(await layerIds(franchiseId, "DT", "plan")).toEqual([]);
    expect(await layerIds(franchiseId, "DT", "baseline")).toEqual([playerA]);
    expect(await layerIds(franchiseId, "NT", "plan")).toEqual([playerB]);
  });

  it("refuses to cancel a position with no pending plan", async () => {
    const revision = await revisionOf(franchiseId);
    await expect(cancel(franchiseId, ["LG"], revision, 29)).rejects.toThrow(/no pending plan/);
  });
});

describe("undo_action_batch", () => {
  it("restores the before state, marks the batch undone, and refuses a second undo", async () => {
    let revision = await revisionOf(franchiseId);
    await recordBaseline(franchiseId, "RG", [playerA], revision, 30);
    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "RG", [playerB, playerA], revision, 31);

    revision = await revisionOf(franchiseId);
    const confirmed = await confirm(
      franchiseId,
      [{ type: "depth_chart_list", unitId: "depth_chart_list:RG", position: "RG", playerIds: [playerB, playerA] }],
      revision,
      32,
    );
    const batchId = confirmed.rows[0].confirm_checklist_units.batchId;
    expect(await layerIds(franchiseId, "RG", "baseline")).toEqual([playerB, playerA]);

    revision = await revisionOf(franchiseId);
    const undone = await undo(franchiseId, batchId, revision, 33);
    expect((undone.rows[0] as { undo_action_batch: { revision: number } }).undo_action_batch.revision).toBe(
      revision + 1,
    );
    expect(await layerIds(franchiseId, "RG", "baseline")).toEqual([playerA]);
    expect(await layerIds(franchiseId, "RG", "plan")).toEqual([playerB, playerA]);
    expect(await verificationOf(franchiseId, "RG")).toBe("provisional_published");

    revision = await revisionOf(franchiseId);
    await expect(undo(franchiseId, batchId, revision, 34)).rejects.toThrow(/already undone/);
  });

  it("refuses to undo when a later dependent change touched the same scope", async () => {
    let revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "WILL", [playerA], revision, 35);
    revision = await revisionOf(franchiseId);
    const confirmed = await confirm(
      franchiseId,
      [{ type: "depth_chart_list", unitId: "depth_chart_list:WILL", position: "WILL", playerIds: [playerA] }],
      revision,
      36,
    );
    const batchId = confirmed.rows[0].confirm_checklist_units.batchId;

    // A later edit re-plans the same position, so the stored after-state no longer holds.
    revision = await revisionOf(franchiseId);
    await savePlan(franchiseId, "WILL", [playerB], revision, 37);

    revision = await revisionOf(franchiseId);
    await expect(undo(franchiseId, batchId, revision, 38)).rejects.toThrow(/dependency_blocked/);
    expect(await layerIds(franchiseId, "WILL", "plan")).toEqual([playerB]);
  });
});

describe("retention and isolation", () => {
  it("prunes action history to the most recent 50 batches and 30 days", async () => {
    await asOwnerSession(db);
    await db.query("delete from app.action_batches where franchise_id = $1", [franchiseId]);
    for (let index = 0; index < 55; index += 1) {
      await db.query(
        "insert into app.action_batches (franchise_id, command, created_at) values ($1, 'confirm_checklist_units', now() - ($2 || ' hours')::interval)",
        [franchiseId, index],
      );
    }
    await db.query(
      "insert into app.action_batches (franchise_id, command, created_at) values ($1, 'confirm_checklist_units', now() - interval '40 days')",
      [franchiseId],
    );
    await db.query("select app.prune_action_batches($1)", [franchiseId]);
    expect(await batchCount(franchiseId)).toBe(50);
    const old = await db.query<{ count: string }>(
      "select count(*)::text as count from app.action_batches where created_at < now() - interval '30 days'",
    );
    expect(Number(old.rows[0].count)).toBe(0);
  });

  it("keeps history and confirmation invisible to anonymous and other-owner callers", async () => {
    await asRole(db, "anon");
    await expect(db.query("select * from app.action_batches")).rejects.toThrow(/permission denied|42501/);

    await asRole(db, "authenticated", OTHER_UID);
    const otherSeen = await db.query("select * from app.action_batches where franchise_id = $1", [franchiseId]);
    expect(otherSeen.rows).toHaveLength(0);

    await asRole(db, "authenticated", OTHER_UID);
    await expect(
      db.query("select public.confirm_checklist_units($1, $2::jsonb, 0, $3)", [
        franchiseId,
        JSON.stringify([{ type: "depth_chart_list", position: "WR", playerIds: [playerA] }]),
        REQUEST(60),
      ]),
    ).rejects.toThrow(/cross_franchise_reference/);
  });
});
