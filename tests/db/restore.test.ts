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

const REQUEST = (n: number) => `00000000-0000-4000-8000-0000000001${String(n).padStart(2, "0")}`;

let db: PGlite;
let franchiseId: string;
let sourcePlayerId: string;
let incomingSourcePlayerId: string;
let customPlayerId: string;

function payload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Restored club",
    isDefault: false,
    pinnedRevisionKey: "1-base",
    players: [
      {
        mutableId: "old-source",
        origin: "source",
        customKey: null,
        sourceReference: { sourceId: "ea-1", revisionKey: "1-base" },
        fullName: "Bijan Robinson",
        rosterStatus: "active",
      },
      {
        mutableId: "old-custom",
        origin: "custom",
        customKey: "c_keepme",
        sourceReference: null,
        fullName: "Custom Rookie",
        rosterStatus: "practice_squad",
      },
    ],
    fields: [
      {
        playerId: "old-custom",
        fieldKey: "jersey_number",
        baselineValue: 0,
        planValue: null,
        fieldClass: "app_fact",
      },
      {
        playerId: "old-source",
        fieldKey: "listed_position",
        baselineValue: null,
        planValue: "HB",
        fieldClass: "game_edit_action",
      },
    ],
    depthChart: [
      { position: "HB", layer: "baseline", rank: 1, playerId: "old-source" },
      { position: "HB", layer: "plan", rank: 1, playerId: "old-source" },
      { position: "HB", layer: "plan", rank: 2, playerId: "old-custom" },
    ],
    ...overrides,
  };
}

beforeAll(async () => {
  db = await createTestDb();
  await allowOwner(db, OWNER_GITHUB_ID, "joshhkee");
  await registerOwner(db, OWNER_UID, OWNER_GITHUB_ID, "joshhkee");

  await asOwnerSession(db);
  const revision = await db.query<{ id: string }>(
    `insert into app.source_revisions (source, revision_key, coverage_status)
     values ('civilgg', '1-base', 'complete_as_imported') returning id`,
  );
  const record = await db.query<{ id: string }>(
    `insert into app.source_player_records
       (revision_id, source_id, full_name, normalized_name, team, listed_position, reconciliation_outcome)
     values ($1, 'ea-1', 'Bijan Robinson', 'bijan robinson', 'ATL', 'HB', 'new') returning id`,
    [revision.rows[0].id],
  );
  sourcePlayerId = record.rows[0].id;
  const incomingRecord = await db.query<{ id: string }>(
    `insert into app.source_player_records
       (revision_id, source_id, full_name, normalized_name, team, reconciliation_outcome)
     values ($1, 'ea-incoming', 'Incoming Rookie', 'incoming rookie', null, 'new') returning id`,
    [revision.rows[0].id],
  );
  incomingSourcePlayerId = incomingRecord.rows[0].id;

  await asRole(db, "authenticated", OWNER_UID);
  const franchise = await db.query<{ id: string }>(
    "select * from public.create_franchise($1, $2)",
    ["Atlanta Falcons", REQUEST(1)],
  );
  franchiseId = franchise.rows[0].id;

  const custom = await db.query<{ id: string }>(
    "select * from public.add_custom_player($1, $2, $3, $4)",
    [franchiseId, "Custom Rookie", 0, REQUEST(2)],
  );
  customPlayerId = custom.rows[0].id;

  await db.query("select * from public.attach_source_player($1, $2, $3, $4)", [
    franchiseId,
    sourcePlayerId,
    1,
    REQUEST(3),
  ]);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("restore-new", () => {
  it("creates a new franchise with remapped ids and preserved identity", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const restored = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(payload()), REQUEST(10)],
    );
    const newFranchiseId = restored.rows[0].restore_new_franchise;
    expect(newFranchiseId).not.toBe(franchiseId);

    await asOwnerSession(db);
    const players = await db.query<{
      id: string;
      origin: string;
      custom_key: string | null;
      source_player_record_id: string | null;
    }>(
      "select id, origin, custom_key, source_player_record_id from app.franchise_players where franchise_id = $1 order by origin",
      [newFranchiseId],
    );
    expect(players.rows).toHaveLength(2);

    const custom = players.rows.find((row) => row.origin === "custom");
    expect(custom?.custom_key).toBe("c_keepme");
    expect(custom?.id).not.toBe(customPlayerId);

    const source = players.rows.find((row) => row.origin === "source");
    expect(source?.source_player_record_id).toBe(sourcePlayerId);

    const fields = await db.query<{
      franchise_player_id: string;
      field_key: string;
      baseline_value: unknown;
      plan_value: unknown;
    }>("select franchise_player_id, field_key, baseline_value, plan_value from app.franchise_player_fields where franchise_player_id = any($1::uuid[])", [
      players.rows.map((row) => row.id),
    ]);
    expect(fields.rows).toHaveLength(2);
    const jersey = fields.rows.find((row) => row.field_key === "jersey_number");
    expect(jersey?.baseline_value).toBe(0);
    expect(jersey?.plan_value).toBeNull();
    const position = fields.rows.find((row) => row.field_key === "listed_position");
    expect(position?.plan_value).toBe("HB");
    expect(position?.baseline_value).toBeNull();

    const statuses = await db.query<{ origin: string; roster_status: string }>(
      "select origin, roster_status from app.franchise_players where franchise_id = $1 order by origin",
      [newFranchiseId],
    );
    expect(statuses.rows.find((row) => row.origin === "custom")?.roster_status).toBe("practice_squad");
    expect(statuses.rows.find((row) => row.origin === "source")?.roster_status).toBe("active");

    const chart = await db.query<{
      position: string;
      layer: string;
      depth_rank: number;
      franchise_player_id: string;
    }>(
      "select position, layer, depth_rank, franchise_player_id from app.depth_chart_entries where franchise_id = $1 order by layer, depth_rank",
      [newFranchiseId],
    );
    expect(chart.rows).toHaveLength(3);
    const sourceNewId = players.rows.find((row) => row.origin === "source")?.id;
    const customNewId = players.rows.find((row) => row.origin === "custom")?.id;
    expect(chart.rows.filter((row) => row.layer === "baseline")[0]?.franchise_player_id).toBe(sourceNewId);
    expect(chart.rows.filter((row) => row.layer === "plan" && row.depth_rank === 2)[0]?.franchise_player_id).toBe(
      customNewId,
    );
  });

  it("restores retained undo history with remapped player ids", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const withHistory = payload({
      name: "History club",
      history: [
        {
          command: "confirm_checklist_units",
          summary: { label: "Confirmed checklist units", units: ["depth_chart_list:HB"] },
          beforeState: {
            changes: [
              {
                kind: "depth_chart_list",
                position: "HB",
                baseline: ["old-custom"],
                plan: ["old-source", "old-custom"],
                verification: "provisional_published",
              },
            ],
          },
          afterState: {
            changes: [
              {
                kind: "depth_chart_list",
                position: "HB",
                baseline: ["old-source", "old-custom"],
                plan: [],
                verification: "owner_confirmed",
              },
              { kind: "roster_status", playerId: "old-custom", rosterStatus: "active" },
            ],
          },
          createdAt: "2026-10-06T12:00:00.000Z",
        },
      ],
    });

    const restored = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(withHistory), REQUEST(20)],
    );
    const newFranchiseId = restored.rows[0].restore_new_franchise;

    await asOwnerSession(db);
    const players = await db.query<{ id: string; origin: string }>(
      "select id, origin from app.franchise_players where franchise_id = $1",
      [newFranchiseId],
    );
    const customId = players.rows.find((row) => row.origin === "custom")?.id;
    const sourceId = players.rows.find((row) => row.origin === "source")?.id;

    const batches = await db.query<{
      command: string;
      before_state: { changes: { baseline?: string[] }[] };
      after_state: { changes: { baseline?: string[]; playerId?: string }[] };
    }>(
      "select command, before_state, after_state from app.action_batches where franchise_id = $1 order by created_at",
      [newFranchiseId],
    );
    expect(batches.rows).toHaveLength(1);
    expect(batches.rows[0].command).toBe("confirm_checklist_units");
    expect(batches.rows[0].before_state.changes[0].baseline).toEqual([customId]);
    expect(batches.rows[0].after_state.changes[0].baseline).toEqual([sourceId, customId]);
    expect(batches.rows[0].after_state.changes[1].playerId).toBe(customId);
  });

  it("refuses a backup whose source revision is missing and writes nothing", async () => {
    await asOwnerSession(db);
    const before = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");

    await asRole(db, "authenticated", OWNER_UID);
    const broken = payload({
      players: [
        {
          mutableId: "old-source",
          origin: "source",
          customKey: null,
          sourceReference: { sourceId: "ea-1", revisionKey: "missing-revision" },
          fullName: "Bijan Robinson",
        },
      ],
      fields: [],
    });
    await expect(
      db.query("select public.restore_new_franchise($1::jsonb, $2)", [JSON.stringify(broken), REQUEST(11)]),
    ).rejects.toThrow(/source_revision_unavailable/);

    await asOwnerSession(db);
    const after = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it("restores C4A cap settings, picks and open proposal claims with remapped ids, atomically and retry-safely", async () => {
    const gmState = {
      settings: { teamCap: 255000000, availableCap: 12000000, expiryThresholdYears: 2 },
      picks: [{ mutableId: "old-pick", year: 2029, round: 3, originalTeam: "Atlanta", currentOwner: "Atlanta", note: "known" }],
      proposals: [{
        mutableId: "old-proposal", kind: "trade", counterparty: "Chicago", note: null,
        status: "proposed", createdAt: "2026-10-10T12:00:00.000Z", completedAt: null,
        playerMoves: [
          { direction: "outgoing", mutablePlayerId: "old-source" },
          { direction: "incoming", mutablePlayerId: null, sourceReference: { sourceId: "ea-incoming", revisionKey: "1-base" } },
        ],
        pickMoves: [{ direction: "outgoing", mutablePickId: "old-pick" }],
      }],
    };
    const envelopePayload = payload({ gmState });
    const wrapped = JSON.stringify({ franchise: envelopePayload, gmState });
    await asOwnerSession(db);
    const beforeCount = await db.query<{ count: string }>("select count(*)::text as count from app.franchises where name='Restored club'");
    await asRole(db, "authenticated", OWNER_UID);
    const restored = await db.query<{ restore_new_franchise_c4a: string }>(
      "select public.restore_new_franchise_c4a($1::jsonb, $2)", [wrapped, REQUEST(30)],
    );
    const newFranchiseId = restored.rows[0].restore_new_franchise_c4a;
    const replay = await db.query<{ restore_new_franchise_c4a: string }>(
      "select public.restore_new_franchise_c4a($1::jsonb, $2)", [wrapped, REQUEST(30)],
    );
    expect(replay.rows[0].restore_new_franchise_c4a).toBe(newFranchiseId);

    await asOwnerSession(db);
    const settings = await db.query<{ team_cap: number; available_cap: number; expiry_threshold_years: number }>(
      "select team_cap, available_cap, expiry_threshold_years from app.franchise_contract_settings where franchise_id=$1", [newFranchiseId],
    );
    expect(settings.rows[0]).toEqual({ team_cap: "255000000.00", available_cap: "12000000.00", expiry_threshold_years: 2 });
    const proposal = await db.query<{ id: string; status: string }>(
      "select id,status from app.transaction_proposals where franchise_id=$1", [newFranchiseId],
    );
    expect(proposal.rows).toHaveLength(1);
    expect(proposal.rows[0].status).toBe("proposed");
    const moves = await db.query<{ direction: string; player_id: string; source_player_record_id: string | null; roster_status: string }>(
      `select m.direction,m.player_id,m.source_player_record_id,p.roster_status
       from app.transaction_player_moves m join app.franchise_players p on p.id=m.player_id
       where m.proposal_id=$1 order by m.direction`, [proposal.rows[0].id],
    );
    expect(moves.rows).toHaveLength(2);
    expect(moves.rows.find((row) => row.direction === "incoming")?.source_player_record_id).toBe(incomingSourcePlayerId);
    expect(moves.rows.find((row) => row.direction === "incoming")?.roster_status).toBe("pending_incoming");
    const claims = await db.query<{ count: string }>(
      "select count(*)::text as count from app.transaction_asset_claims where proposal_id=$1", [proposal.rows[0].id],
    );
    expect(claims.rows[0].count).toBe("4");
    const picks = await db.query<{ draft_year: number; current_owner: string }>(
      "select draft_year,current_owner from app.franchise_draft_picks where franchise_id=$1", [newFranchiseId],
    );
    expect(picks.rows).toEqual([{ draft_year: 2029, current_owner: "Atlanta" }]);
    const franchiseCount = await db.query<{ count: string }>("select count(*)::text as count from app.franchises where name='Restored club'");
    expect(Number(franchiseCount.rows[0].count)).toBe(Number(beforeCount.rows[0].count) + 1);
  });

  it("restores C4B preferences and shortlist atomically with franchise-player remapping", async () => {
    const scoutingState = {
      preferences: { offensiveScheme: null, defensiveScheme: "Multiple", offensiveBookId: "nfl-off-bears", defensiveBookId: "nfl-def-vikings" },
      shortlist: [
        { kind: "trade_block", identity: "franchise", mutablePlayerId: "old-custom", sourceReference: null, status: "dismissed", note: "Keep for the next roster review" },
        { kind: "trade_block", identity: "franchise", mutablePlayerId: "old-source", sourceReference: null, status: "pinned", note: "Source-backed shortlist identity" },
        { kind: "trade_target", identity: "source", mutablePlayerId: null, sourceReference: { sourceId: "ea-incoming", revisionKey: "1-base" }, status: "pinned", note: null },
      ],
    };
    const wrapped = JSON.stringify({ franchise: payload({ scoutingState }), gmState: null, scoutingState });
    await asRole(db, "authenticated", OWNER_UID);
    const restored = await db.query<{ restore_new_franchise_c4b: string }>(
      "select public.restore_new_franchise_c4b($1::jsonb,$2::uuid)", [wrapped, REQUEST(40)],
    );
    const newFranchiseId = restored.rows[0].restore_new_franchise_c4b;
    await asOwnerSession(db);
    const prefs = await db.query<{ offensive_scheme: string | null; defensive_scheme: string | null; offensive_book_id: string; defensive_book_id: string }>(
      "select offensive_scheme,defensive_scheme,offensive_book_id,defensive_book_id from app.franchise_scouting_preferences where franchise_id=$1", [newFranchiseId],
    );
    expect(prefs.rows[0]).toEqual({ offensive_scheme: null, defensive_scheme: "Multiple", offensive_book_id: "nfl-off-bears", defensive_book_id: "nfl-def-vikings" });
    const rows = await db.query<{ kind: string; player_id: string | null; source_player_record_id: string | null; status: string; note: string | null }>(
      "select kind,player_id,source_player_record_id,status,note from app.franchise_scouting_shortlist where franchise_id=$1 order by kind", [newFranchiseId],
    );
    const restoredPlayers = await db.query<{ id: string; custom_key: string | null; source_player_record_id: string | null }>("select id,custom_key,source_player_record_id from app.franchise_players where franchise_id=$1", [newFranchiseId]);
    const restoredCustom = restoredPlayers.rows.find((row) => row.custom_key === "c_keepme")?.id;
    const restoredSourcePlayer = restoredPlayers.rows.find((row) => row.source_player_record_id === sourcePlayerId)?.id;
    expect(restoredCustom).toBeTruthy();
    expect(rows.rows).toEqual([
      { kind: "trade_block", player_id: restoredCustom, source_player_record_id: null, status: "dismissed", note: "Keep for the next roster review" },
      { kind: "trade_block", player_id: restoredSourcePlayer, source_player_record_id: null, status: "pinned", note: "Source-backed shortlist identity" },
      { kind: "trade_target", player_id: null, source_player_record_id: incomingSourcePlayerId, status: "pinned", note: null },
    ]);
  });

  it("rejects invalid C4B references without retaining the new franchise", async () => {
    const invalid = payload({ scoutingState: {
      preferences: { offensiveScheme: null, defensiveScheme: null, offensiveBookId: "nfl-off-falcons", defensiveBookId: "nfl-def-falcons" },
      shortlist: [{ kind: "trade_block", identity: "franchise", mutablePlayerId: "missing-player", sourceReference: null, status: "pinned", note: null }],
    } });
    await asOwnerSession(db);
    const before = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");
    await asRole(db, "authenticated", OWNER_UID);
    await expect(db.query("select public.restore_new_franchise_c4b($1::jsonb,$2::uuid)", [JSON.stringify({ franchise: invalid, scoutingState: (invalid as typeof invalid & { scoutingState: unknown }).scoutingState }), REQUEST(41)])).rejects.toThrow(/backup_invalid/);
    await asOwnerSession(db);
    const after = await db.query<{ count: string }>("select count(*)::text as count from app.franchises");
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it("replays a repeated restore request instead of duplicating the franchise", async () => {
    await asRole(db, "authenticated", OWNER_UID);
    const first = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(payload({ name: "Replay club" })), REQUEST(12)],
    );
    const replay = await db.query<{ restore_new_franchise: string }>(
      "select public.restore_new_franchise($1::jsonb, $2)",
      [JSON.stringify(payload({ name: "Replay club" })), REQUEST(12)],
    );
    expect(replay.rows[0].restore_new_franchise).toBe(first.rows[0].restore_new_franchise);
  });
});
