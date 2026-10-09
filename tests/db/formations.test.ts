// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  allowOwner,
  asOwnerSession,
  asRole,
  createTestDb,
  createFranchise,
  OTHER_UID,
  OWNER_GITHUB_ID,
  OWNER_UID,
  registerOwner,
} from "./harness";

const REQUEST = (n: number) => `00000000-0000-4000-8000-1000000000${String(n).padStart(2, "0")}`;

let db: PGlite;
let franchiseId: string;
let otherFranchiseId: string;
let playerA: string;
let playerB: string;

const BOOK = "nfl-off-falcons";
const SET_FORMATION = "singleback:tight-y-off";

async function currentRevision(): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>(
    "select revision from app.franchises where id = $1",
    [franchiseId],
  );
  return result.rows[0].revision;
}

async function addPlayer(name: string, requestNumber: number): Promise<string> {
  // Compute the revision first: currentRevision() resets the DB role, so it must
  // never run inside an argument list after switching to the authenticated role.
  const revision = await currentRevision();
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<{ id: string }>(
    "select * from public.add_custom_player($1, $2, $3, $4)",
    [franchiseId, name, revision, REQUEST(requestNumber)],
  );
  return result.rows[0].id;
}

async function setOverride(
  slot: string,
  playerId: string | null,
  requestNumber: number,
): Promise<{ ok: boolean; message?: string }> {
  const revision = await currentRevision();
  await asRole(db, "authenticated", OWNER_UID);
  try {
    await db.query("select public.set_formation_override($1, $2, $3, $4, $5, $6, $7)", [
      franchiseId,
      BOOK,
      SET_FORMATION,
      slot,
      playerId,
      revision,
      REQUEST(requestNumber),
    ]);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

async function overrideRows(layer: string): Promise<{ slot_id: string; player_id: string }[]> {
  await asOwnerSession(db);
  const result = await db.query<{ slot_id: string; player_id: string }>(
    `select slot_id, player_id::text from app.formation_overrides
      where franchise_id = $1 and book_id = $2 and formation_id = $3 and layer = $4
      order by slot_id`,
    [franchiseId, BOOK, SET_FORMATION, layer],
  );
  return result.rows;
}

/** Confirm one reviewed formation unit as the current owner role. */
async function confirmFormationUnit(
  slot: string,
  playerId: string,
  label: string,
  requestNumber: number,
): Promise<{ ok: boolean; batchId?: string; message?: string }> {
  const revision = await currentRevision();
  await asRole(db, "authenticated", OWNER_UID);
  try {
    const result = await db.query<{ batchId: string }>(
      "select * from public.confirm_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: `formation_slot:${label}`,
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: slot,
            playerId,
            planPlayerIds: [playerId],
          },
        ]),
        revision,
        REQUEST(requestNumber),
      ],
    );
    return { ok: true, batchId: result.rows[0]?.batchId };
  } catch (error) {
    return { ok: false, message: (error as Error).message };
  }
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "owner");
  await allowOwner(db, 99900001, "other");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "owner");
  await registerOwner(db, OTHER_UID, 99900001, "other");
  franchiseId = await createFranchise(db, OWNER_UID, "Falcons Plan");
  otherFranchiseId = await createFranchise(db, OTHER_UID, "Other Plan");
  playerA = await addPlayer("Kyle Pitts", 1);
  playerB = await addPlayer("Drake London", 2);
});

afterAll(async () => {
  await db.close();
});

describe("formation overrides (0012)", () => {
  it("sets a plan override with a revision bump", async () => {
    const before = await currentRevision();
    const result = await setOverride("TE", playerA, 3);
    expect(result.ok).toBe(true);
    const after = await currentRevision();
    expect(after).toBe(before + 1);
    const plan = await overrideRows("plan");
    expect(plan).toEqual([{ slot_id: "TE", player_id: playerA }]);
  });

  it("clearing the plan removes the pending row", async () => {
    await setOverride("TE", null, 4);
    expect(await overrideRows("plan")).toEqual([]);
  });

  it("a same-player set stores the row (override intent persists, A32)", async () => {
    await setOverride("TE", playerA, 5);
    // Confirm it once so it becomes the baseline override.
    const firstConfirm = await confirmFormationUnit("TE", playerA, "test1", 6);
    expect(firstConfirm.ok).toBe(true);
    expect(await overrideRows("baseline")).toEqual([{ slot_id: "TE", player_id: playerA }]);
    expect(await overrideRows("plan")).toEqual([]);
    // Set the same player again as a plan: row persists even though it matches.
    await setOverride("TE", playerA, 7);
    expect(await overrideRows("plan")).toEqual([{ slot_id: "TE", player_id: playerA }]);
  });

  it("confirm refuses when the reviewed scope no longer matches (atomic no-op)", async () => {
    await setOverride("Z", playerB, 8);
    const stalePlayerId = playerA === playerB ? playerB : playerA;
    const revision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select public.confirm_checklist_units($1, $2, $3, $4)", [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test2",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "Z",
            playerId: stalePlayerId,
            planPlayerIds: [stalePlayerId],
          },
        ]),
        revision,
        REQUEST(9),
      ]),
    ).rejects.toThrow(/no longer pending/);
  });

  it("confirm applies formation + chart units atomically in one batch with one revision bump", async () => {
    await setOverride("Z", playerB, 10);
    // Plan a chart change too.
    const planRevision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const planResult = await db.query("select public.set_depth_chart_plan($1, $2, $3, $4, $5)", [
      franchiseId,
      "QB",
      [playerB],
      planRevision,
      REQUEST(11),
    ]);
    expect(planResult.rows).toHaveLength(1);

    const before = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const result = await db.query<{ confirm_checklist_units: { applied: string[]; batchId: string; revision: number } }>(
      "select * from public.confirm_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test3",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "Z",
            playerId: playerB,
            planPlayerIds: [playerB],
          },
          {
            type: "depth_chart_list",
            unitId: "depth_chart_list:QB",
            position: "QB",
            playerIds: [playerB],
          },
        ]),
        before,
        REQUEST(12),
      ],
    );
    // PGlite wraps a scalar jsonb return in a single named column.
    const confirmedBatch = result.rows[0].confirm_checklist_units;
    expect(confirmedBatch.applied).toHaveLength(2);
    expect(confirmedBatch.revision).toBe(before + 1);
    const planRowsAfter = await overrideRows("plan");
    expect(planRowsAfter.filter((row) => row.slot_id === "Z")).toEqual([]);
    const baselineRowsAfter = await overrideRows("baseline");
    expect(baselineRowsAfter).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slot_id: "TE", player_id: playerA }),
        expect.objectContaining({ slot_id: "Z", player_id: playerB }),
      ]),
    );
    // The chart list is confirmed as owner_confirmed baseline.
    await asOwnerSession(db);
    const chart = await db.query<{ layer: string }>(
      "select layer from app.depth_chart_entries where franchise_id = $1 and position = 'QB'",
      [franchiseId],
    );
    expect(chart.rows.map((row) => row.layer)).toEqual(["baseline"]);
  });

  it("a practice-squad override target is dependency_blocked", async () => {
    const squad = await addPlayer("Squad Receiver", 13);
    await asOwnerSession(db);
    await db.query("update app.franchise_players set roster_status = 'practice_squad' where id = $1", [squad]);
    await setOverride("X", squad, 14);
    const revision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select public.confirm_checklist_units($1, $2, $3, $4)", [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test4",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "X",
            playerId: squad,
            planPlayerIds: [squad],
          },
        ]),
        revision,
        REQUEST(15),
      ]),
    ).rejects.toThrow(/dependency_blocked/);
  });

  it("cancel removes the pending formation override and reports dependents", async () => {
    await setOverride("X", playerB, 16);
    const revision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const result = await db.query<{ cancel_checklist_units: { cancelled: string[]; dependent: string[] } }>(
      "select * from public.cancel_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test5",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "X",
          },
        ]),
        revision,
        REQUEST(17),
      ],
    );
    expect(result.rows[0].cancel_checklist_units.cancelled).toEqual([`${BOOK}:${SET_FORMATION}:X`]);
    const planRowsAfterCancel = await overrideRows("plan");
    expect(planRowsAfterCancel.filter((row) => row.slot_id === "X")).toEqual([]);
  });

  it("undo reverses a confirmed formation unit and refuses a second undo", async () => {
    await setOverride("X", playerA, 18);
    const revision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const confirmed = await db.query<{ confirm_checklist_units: { batchId: string } }>(
      "select * from public.confirm_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test6",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "X",
            playerId: playerA,
            planPlayerIds: [playerA],
          },
        ]),
        revision,
        REQUEST(19),
      ],
    );
    const batchId = confirmed.rows[0].confirm_checklist_units.batchId;
    const undoRevision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const undo = await db.query<{ undo_action_batch: { restored: unknown[] } }>(
      "select * from public.undo_action_batch($1, $2, $3, $4)",
      [franchiseId, batchId, undoRevision, REQUEST(20)],
    );
    expect(undo.rows[0].undo_action_batch.restored).toHaveLength(1);
    expect(await overrideRows("baseline").then((rows) => rows.filter((r) => r.slot_id === "X"))).toEqual([]);

    const secondRevision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select public.undo_action_batch($1, $2, $3, $4)", [
        franchiseId,
        batchId,
        secondRevision,
        REQUEST(21),
      ]),
    ).rejects.toThrow(/already undone/);
  });

  it("undo refuses when a later change touched the slot (dependency_blocked)", async () => {
    await setOverride("X", playerB, 22);
    const revision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const confirmed = await db.query<{ confirm_checklist_units: { batchId: string } }>(
      "select * from public.confirm_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test7",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "X",
            playerId: playerB,
            planPlayerIds: [playerB],
          },
        ]),
        revision,
        REQUEST(23),
      ],
    );
    // Later change to the same slot.
    await setOverride("X", playerA, 24);
    const undoRevision = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select * from public.undo_action_batch($1, $2, $3, $4)", [
        franchiseId,
        confirmed.rows[0].confirm_checklist_units.batchId,
        undoRevision,
        REQUEST(25),
      ]),
    ).rejects.toThrow(/dependency_blocked/);
    // Nothing was mutated by the refused undo: X's plan stays pending (the later
    // change), the TE same-player row persists by design (A32).
    const planRowsAfterRefusal = await overrideRows("plan");
    expect(planRowsAfterRefusal.map((row) => row.slot_id).sort()).toEqual(["TE", "X"]);
    // The refused undo leaves the confirmed baseline (playerB) and the newer pending
    // plan (playerA) exactly as they were — resolution, not silent rollback.
    const xBaseline = await overrideRows("baseline").then((rows) => rows.filter((r) => r.slot_id === "X"));
    expect(xBaseline.map((row) => row.player_id)).toEqual([playerB]);
  });

  it("a lost-response retry replays the stored outcome without double-applying", async () => {
    await setOverride("X", playerB, 26);
    const before = await currentRevision();
    await asRole(db, "authenticated", OWNER_UID);
    const first = await db.query<{ confirm_checklist_units: { batchId: string } }>(
      "select * from public.confirm_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test8",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "X",
            playerId: playerB,
            planPlayerIds: [playerB],
          },
        ]),
        before,
        REQUEST(27),
      ],
    );
    const replay = await db.query<{ confirm_checklist_units: { batchId: string } }>(
      "select * from public.confirm_checklist_units($1, $2, $3, $4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "formation_slot",
            unitId: "formation_slot:test8",
            bookId: BOOK,
            formationId: SET_FORMATION,
            slotId: "X",
            playerId: playerB,
            planPlayerIds: [playerB],
          },
        ]),
        before,
        REQUEST(27),
      ],
    );
    expect(replay.rows[0].confirm_checklist_units.batchId).toBe(
      first.rows[0].confirm_checklist_units.batchId,
    );
  });

  it("isolation: another owner's franchise override is refused and invisible", async () => {
    await asRole(db, "authenticated", OTHER_UID);
    await expect(
      db.query("select public.set_formation_override($1, $2, $3, $4, $5, $6, $7)", [
        otherFranchiseId,
        BOOK,
        SET_FORMATION,
        "TE",
        null,
        9999,
        REQUEST(28),
      ]),
    ).rejects.toThrow(/cross_franchise_reference|revision/i);
    await asRole(db, "authenticated", OWNER_UID);
    const rows = await db.query<{ count: string }>(
      "select count(*)::text as count from app.formation_overrides where franchise_id = $1",
      [otherFranchiseId],
    );
    expect(rows.rows[0].count).toBe("0");
  });

  it("backup restore carries formation overrides and favorites with remapped ids", async () => {
    // Favorite a formation.
    await asRole(db, "authenticated", OWNER_UID);
    await db.query(
      "insert into app.formation_favorites (franchise_id, book_id, formation_id) values ($1, $2, $3)",
      [franchiseId, BOOK, SET_FORMATION],
    );
    const payload = await asOwnerSession(db).then(async () => {
      const players = await db.query<{ id: string; full_name: string; roster_status: string }>(
        "select id::text, full_name, roster_status from app.franchise_players where franchise_id = $1 order by full_name",
        [franchiseId],
      );
      const overrides = await db.query<{ book_id: string; formation_id: string; slot_id: string; layer: string; player_id: string }>(
        "select book_id, formation_id, slot_id, layer, player_id::text from app.formation_overrides where franchise_id = $1",
        [franchiseId],
      );
      return {
        name: "Falcons Restored",
        players: players.rows.map((row, index) => ({
          mutableId: row.id,
          origin: "custom",
          customKey: `c_${index}`,
          fullName: row.full_name,
          rosterStatus: row.roster_status,
          sourceReference: null,
        })),
        fields: [],
        depthChart: [],
        formationOverrides: overrides.rows.map((row) => ({
          bookId: row.book_id,
          formationId: row.formation_id,
          slotId: row.slot_id,
          layer: row.layer,
          playerId: row.player_id,
        })),
        formationFavorites: [{ bookId: BOOK, formationId: SET_FORMATION }],
        history: [],
      };
    });

    await asRole(db, "authenticated", OWNER_UID);
    const restored = await db.query<{ restore_new_franchise: string }>(
      "select * from public.restore_new_franchise($1, $2)",
      [JSON.stringify(payload), REQUEST(29)],
    );
    const newId = restored.rows[0].restore_new_franchise;

    await asOwnerSession(db);
    const restoredOverrides = await db.query<{ slot_id: string; player_id: string; full_name: string }>(
      `select o.slot_id, o.player_id::text, p.full_name
         from app.formation_overrides o
         join app.franchise_players p on p.id = o.player_id
        where o.franchise_id = $1 and o.layer = 'baseline'
        order by o.slot_id`,
      [newId],
    );
    expect(restoredOverrides.rows.length).toBeGreaterThan(0);
    const originalNames = await db.query<{ full_name: string }>(
      "select full_name from app.franchise_players where franchise_id = $1",
      [franchiseId],
    );
    const originalNameSet = new Set(originalNames.rows.map((row) => row.full_name));
    for (const row of restoredOverrides.rows) {
      expect(originalNameSet.has(row.full_name)).toBe(true);
    }
    const restoredFavorites = await db.query<{ formation_id: string }>(
      "select formation_id from app.formation_favorites where franchise_id = $1",
      [newId],
    );
    expect(restoredFavorites.rows).toEqual([{ formation_id: SET_FORMATION }]);
  });
});
