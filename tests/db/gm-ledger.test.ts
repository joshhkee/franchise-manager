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

const REQUEST = (n: number) => `00000000-0000-4000-8000-0000000002${String(n).padStart(2, "0")}`;

let db: PGlite;
let franchiseId: string;
let playerA: string;
let sourcePlayer: string;
let competingSourcePlayer: string;
let sourceRevision: string;
let pickId: string;

async function revision(): Promise<number> {
  await asOwnerSession(db);
  const result = await db.query<{ revision: number }>("select revision from app.franchises where id = $1", [franchiseId]);
  return result.rows[0].revision;
}

async function addPlayer(name: string, expectedRevision: number, requestNumber: number): Promise<string> {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<{ id: string }>("select * from public.add_custom_player($1, $2, $3, $4)", [
    franchiseId, name, expectedRevision, REQUEST(requestNumber),
  ]);
  return result.rows[0].id;
}

async function saveProposal(
  moves: unknown[],
  picks: unknown[],
  expectedRevision: number,
  requestNumber: number,
): Promise<string> {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<{ save_transaction_proposal: { id: string } }>(
    "select public.save_transaction_proposal($1, 'trade', 'Chicago', null, $2::jsonb, $3::jsonb, $4, $5)",
    [franchiseId, JSON.stringify(moves), JSON.stringify(picks), expectedRevision, REQUEST(requestNumber)],
  );
  return result.rows[0].save_transaction_proposal.id;
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");
  await asOwnerSession(db);
  const revisionData = await db.query<{ id: string }>("insert into app.source_revisions (source, revision_key, coverage_status) values ('test', 'base', 'complete_as_imported') returning id");
  sourceRevision = revisionData.rows[0].id;
  const initialRecord = await db.query<{ id: string }>(`insert into app.source_player_records (revision_id, source_id, full_name, normalized_name, team, reconciliation_outcome) values ($1, 'seed', 'Seed', 'seed', 'ATL', 'new') returning id`, [sourceRevision]);
  sourcePlayer = initialRecord.rows[0].id;
  await asRole(db, "authenticated", OWNER_UID);
  const created = await db.query<{ id: string }>("select * from public.create_franchise($1, $2)", ["Atlanta", REQUEST(1)]);
  franchiseId = created.rows[0].id;
  playerA = await addPlayer("Trade candidate", await revision(), 2);

  await asOwnerSession(db);
  const revisionRow = await db.query<{ id: string }>(
    "insert into app.source_revisions (source, revision_key, coverage_status) values ('test', 'extra', 'complete_as_imported') returning id",
  );
  const sourceRow = await db.query<{ id: string }>(
    `insert into app.source_player_records (revision_id, source_id, full_name, normalized_name, team, reconciliation_outcome)
     values ($1, 'incoming-1', 'Incoming Player', 'incoming player', 'CHI', 'new') returning id`,
    [revisionRow.rows[0].id],
  );
  competingSourcePlayer = sourceRow.rows[0].id;
  const pickRevision = await revision();
  await asRole(db, "authenticated", OWNER_UID);
  const pick = await db.query<{ add_franchise_draft_pick: { id: string } }>(
    "select public.add_franchise_draft_pick($1, 2027, 2, 'Atlanta', 'Atlanta', null, $2, $3)",
    [franchiseId, pickRevision, REQUEST(4)],
  );
  pickId = pick.rows[0].add_franchise_draft_pick.id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("C4A transaction ledger", () => {
  it("reserves each asset once, rejects competing proposals, and releases reservations on cancellation", async () => {
    const id = await saveProposal(
      [{ direction: "outgoing", playerId: playerA }, { direction: "incoming", sourceRecordId: sourcePlayer }],
      [{ direction: "outgoing", pickId }], await revision(), 10,
    );
    await expect(saveProposal(
      [{ direction: "outgoing", playerId: playerA }, { direction: "incoming", sourceRecordId: sourcePlayer }],
      [], await revision(), 11,
    )).rejects.toThrow(/dependency_blocked|duplicate key/);

    const cancelRevision = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    const cancelled = await db.query<{ cancel_transaction_proposal: { status: string } }>(
      "select public.cancel_transaction_proposal($1, $2, $3, $4)",
      [franchiseId, id, cancelRevision, REQUEST(12)],
    );
    expect(cancelled.rows[0].cancel_transaction_proposal.status).toBe("cancelled");
    await asOwnerSession(db);
    const claims = await db.query<{ count: string }>(
      "select count(*)::text as count from app.transaction_asset_claims where proposal_id = $1", [id],
    );
    expect(claims.rows[0].count).toBe("0");
    const incoming = await db.query<{ roster_status: string }>(
      "select roster_status from app.franchise_players where id = (select player_id from app.transaction_player_moves where proposal_id = $1 and direction = 'incoming')", [id],
    );
    expect(incoming.rows[0].roster_status).toBe("released");
  });

  it("blocks completion while outgoing players remain on a planned lineup, then commits once", async () => {
    const current = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_depth_chart_plan($1, 'HB', $2::uuid[], $3, $4)", [franchiseId, [playerA], current, REQUEST(13)]);
    const proposalId = await saveProposal(
      [{ direction: "outgoing", playerId: playerA }, { direction: "incoming", sourceRecordId: competingSourcePlayer }],
      [{ direction: "outgoing", pickId }], await revision(), 14,
    );
    const blockedRevision = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    await expect(db.query("select public.finish_transaction_proposal($1, $2, $3, $4)", [
      franchiseId, proposalId, blockedRevision, REQUEST(15),
    ])).rejects.toThrow(/dependency_blocked/);
    await asOwnerSession(db);
    const stillOpen = await db.query<{ status: string }>("select status from app.transaction_proposals where id = $1", [proposalId]);
    expect(stillOpen.rows[0].status).toBe("proposed");

    const clearChartRevision = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_depth_chart_plan($1, 'HB', '{}'::uuid[], $2, $3)", [franchiseId, clearChartRevision, REQUEST(16)]);
    const finishRequest = REQUEST(17);
    const finishRevision = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    const completed = await db.query<{ finish_transaction_proposal: { status: string } }>(
      "select public.finish_transaction_proposal($1, $2, $3, $4)", [franchiseId, proposalId, finishRevision, finishRequest],
    );
    expect(completed.rows[0].finish_transaction_proposal.status).toBe("completed");
    const replay = await db.query<{ finish_transaction_proposal: { status: string } }>(
      "select public.finish_transaction_proposal($1, $2, -1, $3)", [franchiseId, proposalId, finishRequest],
    );
    expect(replay.rows[0].finish_transaction_proposal.status).toBe("completed");

    await asOwnerSession(db);
    const rows = await db.query<{ full_name: string; roster_status: string }>(
      "select full_name, roster_status from app.franchise_players where franchise_id = $1", [franchiseId],
    );
    expect(rows.rows.find((row) => row.full_name === "Trade candidate")?.roster_status).toBe("traded");
    expect(rows.rows.find((row) => row.full_name === "Incoming Player")?.roster_status).toBe("active");
    const owner = await db.query<{ current_owner: string }>("select current_owner from app.franchise_draft_picks where id = $1", [pickId]);
    expect(owner.rows[0].current_owner).toBe("Chicago");
  });
});
