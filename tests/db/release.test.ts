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

/**
 * C6A integrated release chain (phases/06-hardening.md): one franchise walks
 * source attach → player edit → planned chart → formation override → dependent
 * trade → checklist confirmation/undo → scouting shortlist → gameday plan, and a
 * second franchise must never see any of it. Restore round-trips are covered by
 * tests/db/restore.test.ts (including the C5B wrapper) rather than duplicated.
 */
const REQUEST = (n: number) => `00000000-0000-4000-8000-6000000000${String(n).padStart(2, "0")}`;
const BOOK = "nfl-off-falcons";
const FORMATION = "singleback:tight-y-off";

let db: PGlite;
let franchiseId: string;
let secondFranchiseId: string;
let sourceFranchisePlayerId: string;
let customFranchisePlayerId: string;
let incomingSourceRecordId: string;
let pickId: string;

// Reads the revision as the authenticated owner so callers may pass it inside a
// superuser-only argument list without resetting the connection's role first.
async function revision(): Promise<number> {
  await asRole(db, "authenticated", OWNER_UID);
  const result = await db.query<{ revision: number }>("select revision from app.franchises where id=$1", [
    franchiseId,
  ]);
  return result.rows[0].revision;
}

async function column<T extends Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  await asOwnerSession(db);
  const result = await db.query<T>(sql, params);
  return result.rows;
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");

  await asOwnerSession(db);
  const revisionRow = await db.query<{ id: string }>(
    `insert into app.source_revisions (source, revision_key, coverage_status)
     values ('civilgg', '1-base', 'complete_as_imported') returning id`,
  );
  const sourceRevisionId = revisionRow.rows[0].id;
  const sourceRow = await db.query<{ id: string }>(
    `insert into app.source_player_records
       (revision_id, source_id, full_name, normalized_name, team, listed_position, reconciliation_outcome)
     values ($1, 'ea-bijan', 'Bijan Robinson', 'bijan robinson', 'ATL', 'HB', 'new') returning id`,
    [sourceRevisionId],
  );
  const incomingRow = await db.query<{ id: string }>(
    `insert into app.source_player_records
       (revision_id, source_id, full_name, normalized_name, team, listed_position, reconciliation_outcome)
     values ($1, 'ea-chi-wr', 'Chicago Rookie', 'chicago rookie', 'CHI', 'WR', 'new') returning id`,
    [sourceRevisionId],
  );
  incomingSourceRecordId = incomingRow.rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const created = await db.query<{ id: string }>("select * from public.create_franchise($1,$2)", [
    "Atlanta Falcons",
    REQUEST(1),
  ]);
  franchiseId = created.rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const second = await db.query<{ id: string }>("select * from public.create_franchise($1,$2)", [
    "Second club",
    REQUEST(2),
  ]);
  secondFranchiseId = second.rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const attached = await db.query<{ id: string }>("select * from public.attach_source_player($1,$2,$3,$4)", [
    franchiseId,
    sourceRow.rows[0].id,
    await revision(),
    REQUEST(3),
  ]);
  sourceFranchisePlayerId = attached.rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const custom = await db.query<{ id: string }>("select * from public.add_custom_player($1,$2,$3,$4)", [
    franchiseId,
    "Custom Rookie",
    await revision(),
    REQUEST(4),
  ]);
  customFranchisePlayerId = custom.rows[0].id;
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("C6A integrated release chain", () => {
  it("records a player fact and carries a planned chart + formation override through confirmation and undo", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_player_field($1,$2,$3::jsonb,$4,$5,$6)", [
      customFranchisePlayerId,
      "jersey_number",
      "24",
      "recorded",
      await revision(),
      REQUEST(10),
    ]);
    const fields = await column<{ field_key: string; baseline_value: unknown }>(
      "select field_key, baseline_value from app.franchise_player_fields where franchise_player_id=$1",
      [customFranchisePlayerId],
    );
    expect(fields).toEqual([{ field_key: "jersey_number", baseline_value: 24 }]);

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_depth_chart_plan($1,'HB',$2::uuid[],$3,$4)", [
      franchiseId,
      [sourceFranchisePlayerId, customFranchisePlayerId],
      await revision(),
      REQUEST(11),
    ]);

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_formation_override($1,$2,$3,'HB',$4,$5,$6)", [
      franchiseId,
      BOOK,
      FORMATION,
      customFranchisePlayerId,
      await revision(),
      REQUEST(12),
    ]);

    const confirmed = await db.query<{ confirm_checklist_units: { applied: string[]; batchId: string } }>(
      "select public.confirm_checklist_units($1,$2::jsonb,$3,$4)",
      [
        franchiseId,
        JSON.stringify([
          {
            type: "depth_chart_list",
            unitId: "depth_chart_list:HB",
            position: "HB",
            playerIds: [sourceFranchisePlayerId, customFranchisePlayerId],
          },
        ]),
        await revision(),
        REQUEST(13),
      ],
    );
    expect(confirmed.rows[0].confirm_checklist_units.applied).toEqual(["depth_chart_list:HB"]);

    const afterConfirm = await column<{ layer: string; depth_rank: number }>(
      "select layer, depth_rank from app.depth_chart_entries where franchise_id=$1 and position='HB' order by layer, depth_rank",
      [franchiseId],
    );
    expect(afterConfirm).toEqual([
      { layer: "baseline", depth_rank: 1 },
      { layer: "baseline", depth_rank: 2 },
    ]);

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.undo_action_batch($1,$2,$3,$4)", [
      franchiseId,
      confirmed.rows[0].confirm_checklist_units.batchId,
      await revision(),
      REQUEST(14),
    ]);
    const afterUndo = await column<{ layer: string; depth_rank: number }>(
      "select layer, depth_rank from app.depth_chart_entries where franchise_id=$1 and position='HB' order by layer, depth_rank",
      [franchiseId],
    );
    // Undo corrects app records only: the baseline returns to empty and the plan
    // re-appears, while the formation override stays an explicit plan override.
    expect(afterUndo).toEqual([
      { layer: "plan", depth_rank: 1 },
      { layer: "plan", depth_rank: 2 },
    ]);
    const overrides = await column<{ layer: string; slot_id: string }>(
      "select layer, slot_id from app.formation_overrides where franchise_id=$1 and formation_id=$2",
      [franchiseId, FORMATION],
    );
    expect(overrides).toEqual([{ layer: "plan", slot_id: "HB" }]);
  });

  it("blocks the dependent trade until the planned lineup releases the outgoing player, then applies it exactly once", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const pick = await db.query<{ add_franchise_draft_pick: { id: string } }>(
      "select public.add_franchise_draft_pick($1,2027,2,'Atlanta','Atlanta Falcons',null,$2,$3)",
      [franchiseId, await revision(), REQUEST(20)],
    );
    pickId = pick.rows[0].add_franchise_draft_pick.id;

    await asRole(db, "authenticated", OWNER_UID);
    const proposal = await db.query<{ save_transaction_proposal: { id: string } }>(
      "select public.save_transaction_proposal($1,'trade','Chicago',null,$2::jsonb,$3::jsonb,$4,$5)",
      [
        franchiseId,
        JSON.stringify([
          { direction: "outgoing", playerId: sourceFranchisePlayerId },
          { direction: "incoming", sourceRecordId: incomingSourceRecordId },
        ]),
        JSON.stringify([{ direction: "outgoing", pickId }]),
        await revision(),
        REQUEST(21),
      ],
    );
    const proposalId = proposal.rows[0].save_transaction_proposal.id;

    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select public.finish_transaction_proposal($1,$2,$3,$4)", [
        franchiseId,
        proposalId,
        await revision(),
        REQUEST(22),
      ]),
    ).rejects.toThrow(/dependency_blocked/);

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_depth_chart_plan($1,'HB','{}'::uuid[],$2,$3)", [
      franchiseId,
      await revision(),
      REQUEST(23),
    ]);

    const finishRequest = REQUEST(24);
    await asRole(db, "authenticated", OWNER_UID);
    const finished = await db.query<{ finish_transaction_proposal: { status: string } }>(
      "select public.finish_transaction_proposal($1,$2,$3,$4)",
      [franchiseId, proposalId, await revision(), finishRequest],
    );
    expect(finished.rows[0].finish_transaction_proposal.status).toBe("completed");

    const settledRevision = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    const replay = await db.query<{ finish_transaction_proposal: { status: string } }>(
      "select public.finish_transaction_proposal($1,$2,-1,$3)",
      [franchiseId, proposalId, finishRequest],
    );
    expect(replay.rows[0].finish_transaction_proposal.status).toBe("completed");
    expect(await revision()).toBe(settledRevision);

    const roster = await column<{ full_name: string; roster_status: string }>(
      "select full_name, roster_status from app.franchise_players where franchise_id=$1 order by full_name",
      [franchiseId],
    );
    expect(roster).toEqual([
      { full_name: "Bijan Robinson", roster_status: "traded" },
      { full_name: "Chicago Rookie", roster_status: "active" },
      { full_name: "Custom Rookie", roster_status: "active" },
    ]);
    const pickRow = await column<{ current_owner: string }>(
      "select current_owner from app.franchise_draft_picks where id=$1",
      [pickId],
    );
    expect(pickRow).toEqual([{ current_owner: "Chicago" }]);
  });

  it("keeps scouting and gameday state scoped to the franchise and rejects an invalid plan without a revision bump", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.save_scouting_preferences($1,$2,$3,$4,$5,$6,$7)", [
      franchiseId,
      "west-coast",
      "4-3",
      BOOK,
      "nfl-def-falcons",
      await revision(),
      REQUEST(30),
    ]);

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.set_scouting_shortlist($1,'trade_target',null,$2,'dismissed','Too small for the role',$3,$4)", [
      franchiseId,
      incomingSourceRecordId,
      await revision(),
      REQUEST(31),
    ]);

    await asRole(db, "authenticated", OWNER_UID);
    await db.query("select public.save_gameday_plan($1,$2,$3,$4,$5::jsonb,$6,$7)", [
      franchiseId,
      "off-shotgun-quick",
      "Quick Tempo",
      "Watch nickel blitz",
      JSON.stringify([
        { kind: "play", id: "nfl-off-falcons:gun:bunch-te:spacing_gun_bunch_te" },
        { kind: "formation", id: "nfl-off-falcons:gun:bunch-te" },
      ]),
      await revision(),
      REQUEST(32),
    ]);

    const settledRevision = await revision();
    await asRole(db, "authenticated", OWNER_UID);
    await expect(
      db.query("select public.save_gameday_plan($1,$2,$3,$4,$5::jsonb,$6,$7)", [
        franchiseId,
        "off-shotgun-quick",
        "Duplicate",
        null,
        JSON.stringify([
          { kind: "play", id: "same-play" },
          { kind: "play", id: "same-play" },
        ]),
        settledRevision,
        REQUEST(33),
      ]),
    ).rejects.toThrow(/validation_failed/);
    expect(await revision()).toBe(settledRevision);

    const prefs = await column<{ offensive_scheme: string; offensive_book_id: string }>(
      "select offensive_scheme, offensive_book_id from app.franchise_scouting_preferences where franchise_id=$1",
      [franchiseId],
    );
    expect(prefs).toEqual([{ offensive_scheme: "west-coast", offensive_book_id: BOOK }]);
    const shortlist = await column<{ status: string; source_player_record_id: string }>(
      "select status, source_player_record_id from app.franchise_scouting_shortlist where franchise_id=$1",
      [franchiseId],
    );
    expect(shortlist).toEqual([{ status: "dismissed", source_player_record_id: incomingSourceRecordId }]);
    const pins = await column<{ target_kind: string; target_id: string; pin_rank: number }>(
      "select target_kind, target_id, pin_rank from app.franchise_gameday_pins where franchise_id=$1 order by pin_rank",
      [franchiseId],
    );
    expect(pins).toEqual([
      { target_kind: "play", target_id: "nfl-off-falcons:gun:bunch-te:spacing_gun_bunch_te", pin_rank: 1 },
      { target_kind: "formation", target_id: "nfl-off-falcons:gun:bunch-te", pin_rank: 2 },
    ]);

    const secondFranchiseRows = await column<{ count: string }>(
      `select (
         (select count(*) from app.franchise_gameday_plans where franchise_id=$1) +
         (select count(*) from app.franchise_gameday_pins where franchise_id=$1) +
         (select count(*) from app.franchise_scouting_preferences where franchise_id=$1) +
         (select count(*) from app.franchise_scouting_shortlist where franchise_id=$1)
       )::text as count`,
      [secondFranchiseId],
    );
    expect(secondFranchiseRows).toEqual([{ count: "0" }]);
  });
});
