import {
  createEnvelope,
  type BackupActionBatch,
  type BackupChange,
  type BackupEnvelope,
  type BackupFormationFavorite,
  type BackupFormationOverride,
  type BackupFranchisePayload,
  type BackupGmState,
  type BackupScoutingState,
} from "./backup";
import { createServerSupabase } from "./supabase/server";
import type { Loaded } from "./data/franchises";

interface ExportRow {
  id: string;
  origin: "source" | "custom";
  custom_key: string | null;
  full_name: string;
  source_id: string | null;
  source_revision_key: string | null;
  roster_status: "active" | "practice_squad" | "pending_incoming" | "traded" | "released" | null;
}

interface ChartRow {
  position: string;
  layer: "baseline" | "plan";
  depth_rank: number;
  franchise_player_id: string;
}

interface BatchRow {
  command: string;
  summary: unknown;
  before_state: { changes?: BackupChange[] } | null;
  after_state: { changes?: BackupChange[] } | null;
  created_at: string;
}

function changesOf(state: { changes?: BackupChange[] } | null): BackupChange[] {
  return Array.isArray(state?.changes) ? (state?.changes as BackupChange[]) : [];
}

export async function buildFranchiseEnvelope(
  franchiseId: string,
): Promise<Loaded<{ envelope: BackupEnvelope; name: string }>> {
  const supabase = await createServerSupabase();

  const [franchise, players, fields, revisions, chart] = await Promise.all([
    supabase
      .from("franchise_summaries")
      .select("id,name,pinned_revision_id")
      .eq("id", franchiseId)
      .maybeSingle(),
    supabase
      .from("franchise_players_view")
      .select("id,origin,custom_key,full_name,source_id,source_revision_key,roster_status")
      .eq("franchise_id", franchiseId)
      .order("full_name", { ascending: true }),
    supabase
      .from("franchise_player_fields_view")
      .select("franchise_player_id,field_key,baseline_value,plan_value,field_class")
      .eq("franchise_id", franchiseId),
    supabase.from("source_revision_summaries").select("id,revision_key"),
    supabase
      .from("depth_chart_view")
      .select("position,layer,depth_rank,franchise_player_id")
      .eq("franchise_id", franchiseId)
      .order("position", { ascending: true })
      .order("depth_rank", { ascending: true }),
  ]);

  const error = franchise.error ?? players.error ?? fields.error ?? revisions.error ?? chart.error;
  if (error) return { ok: false, message: error.message };
  if (!franchise.data) return { ok: false, message: "That franchise is not available for this owner." };

  // Retained undo history (C0B-v2 §8). Migration 0011 may not be applied yet: a missing
  // view is an honest empty history, never a failed export of the state that does exist.
  const historyResult = await supabase
    .from("action_batches_view")
    .select("command,summary,before_state,after_state,created_at")
    .eq("franchise_id", franchiseId)
    .eq("command", "confirm_checklist_units")
    .is("undone_at", null)
    .order("created_at", { ascending: true });
  if (historyResult.error && !/does not exist|not found|schema cache/i.test(historyResult.error.message ?? "")) {
    return { ok: false, message: historyResult.error.message };
  }
  const history: BackupActionBatch[] = ((historyResult.data ?? []) as unknown as BatchRow[]).map((row) => ({
    command: row.command,
    summary: (row.summary ?? {}) as Record<string, unknown>,
    beforeState: { changes: changesOf(row.before_state) },
    afterState: { changes: changesOf(row.after_state) },
    createdAt: row.created_at,
  }));

  // C3A formation overrides and favorites; a missing view (migration 0012 not yet
  // applied) is an honest empty list, never a failed export of the state that exists.
  const formationOverridesResult = await supabase
    .from("formation_overrides_view")
    .select("book_id,formation_id,slot_id,layer,player_id")
    .eq("franchise_id", franchiseId);
  const formationMissing = /does not exist|not found|schema cache/i.test(
    formationOverridesResult.error?.message ?? "",
  );
  if (!formationMissing && formationOverridesResult.error) {
    return { ok: false, message: formationOverridesResult.error.message };
  }
  const formationFavoritesResult = await supabase
    .from("formation_favorites_view")
    .select("book_id,formation_id")
    .eq("franchise_id", franchiseId);
  if (!formationMissing && formationFavoritesResult.error) {
    return { ok: false, message: formationFavoritesResult.error.message };
  }
  const formationOverrides: BackupFormationOverride[] = (
    (formationOverridesResult.data ?? []) as {
      book_id: string;
      formation_id: string;
      slot_id: string;
      layer: "baseline" | "plan";
      player_id: string;
    }[]
  ).map((row) => ({
    bookId: row.book_id,
    formationId: row.formation_id,
    slotId: row.slot_id,
    layer: row.layer,
    playerId: row.player_id,
  }));
  const formationFavorites: BackupFormationFavorite[] = (
    (formationFavoritesResult.data ?? []) as { book_id: string; formation_id: string }[]
  ).map((row) => ({ bookId: row.book_id, formationId: row.formation_id }));

  const revisionKeyById = new Map(
    (revisions.data ?? []).map((row) => [row.id as string, row.revision_key as string]),
  );

  const gmSettingsResult = await supabase.from("franchise_contract_settings_view")
    .select("team_cap,available_cap,expiry_threshold_years").eq("franchise_id", franchiseId).maybeSingle();
  const gmMissing = /does not exist|not found|schema cache/i.test(gmSettingsResult.error?.message ?? "");
  if (!gmMissing && gmSettingsResult.error) return { ok: false, message: gmSettingsResult.error.message };
  let gmState: BackupGmState | undefined;
  if (!gmMissing) {
    const [picksResult, proposalsResult] = await Promise.all([
      supabase.from("franchise_draft_picks_view").select("id,draft_year,draft_round,original_team,current_owner,note").eq("franchise_id", franchiseId),
      supabase.from("transaction_proposals_view").select("id,kind,counterparty,note,status,created_at,completed_at,player_moves,pick_moves").eq("franchise_id", franchiseId).order("created_at", { ascending: true }),
    ]);
    const gmError = picksResult.error ?? proposalsResult.error;
    if (gmError) return { ok: false, message: gmError.message };
    const pickRows = (picksResult.data ?? []) as { id: string; draft_year: number; draft_round: number; original_team: string; current_owner: string; note: string | null }[];
    const proposalRows = (proposalsResult.data ?? []) as { id: string; kind: "trade" | "sign" | "cut" | "promotion"; counterparty: string; note: string | null; status: "proposed" | "completed" | "cancelled"; created_at: string; completed_at: string | null; player_moves: { direction: "incoming" | "outgoing" | "promotion"; playerId: string | null; sourceRecordId: string | null; sourceId: string | null; revisionKey: string | null }[]; pick_moves: { direction: "incoming" | "outgoing"; pickId: string }[] }[];
    gmState = {
      settings: gmSettingsResult.data ? {
        teamCap: gmSettingsResult.data.team_cap === null ? null : Number(gmSettingsResult.data.team_cap),
        availableCap: gmSettingsResult.data.available_cap === null ? null : Number(gmSettingsResult.data.available_cap),
        expiryThresholdYears: gmSettingsResult.data.expiry_threshold_years,
      } : null,
      picks: pickRows.map((row) => ({ mutableId: row.id, year: Number(row.draft_year), round: Number(row.draft_round), originalTeam: row.original_team, currentOwner: row.current_owner, note: row.note })),
      proposals: proposalRows.map((row) => ({
        mutableId: row.id, kind: row.kind, counterparty: row.counterparty, note: row.note, status: row.status,
        createdAt: row.created_at, completedAt: row.completed_at,
        playerMoves: row.player_moves.map((move) => {
          const heldId = move.playerId ?? move.sourceRecordId;
          return {
            direction: move.direction,
            mutablePlayerId: move.playerId ? heldId : null,
            ...(move.direction === "incoming" && move.sourceId && move.revisionKey ? { sourceReference: { sourceId: move.sourceId, revisionKey: move.revisionKey } } : {}),
          };
        }),
        pickMoves: row.pick_moves.map((move) => ({ direction: move.direction, mutablePickId: move.pickId })),
      })),
    };
  }

  const scoutingPreferencesResult = await supabase.from("franchise_scouting_preferences_view")
    .select("offensive_scheme,defensive_scheme,offensive_book_id,defensive_book_id").eq("franchise_id", franchiseId).maybeSingle();
  const scoutingMissing = /does not exist|not found|schema cache/i.test(scoutingPreferencesResult.error?.message ?? "");
  if (!scoutingMissing && scoutingPreferencesResult.error) return { ok: false, message: scoutingPreferencesResult.error.message };
  let scoutingState: BackupScoutingState | undefined;
  if (!scoutingMissing) {
    const shortlistResult = await supabase.from("franchise_scouting_shortlist_view")
      .select("kind,player_id,source_player_record_id,status,note").eq("franchise_id", franchiseId);
    if (shortlistResult.error) return { ok: false, message: shortlistResult.error.message };
    const sourceIdentities = [...new Set(((shortlistResult.data ?? []) as { source_player_record_id: string | null }[]).map((row) => row.source_player_record_id).filter((id): id is string => Boolean(id)))];
    const sourceRowsResult = sourceIdentities.length
      ? await supabase.from("source_player_records_view").select("id,source_id,revision_key").in("id", sourceIdentities)
      : { data: [], error: null };
    if (sourceRowsResult.error) return { ok: false, message: sourceRowsResult.error.message };
    const sourceRef = new Map(((sourceRowsResult.data ?? []) as { id: string; source_id: string; revision_key: string }[]).map((row) => [row.id, { sourceId: row.source_id, revisionKey: row.revision_key }]));
    const pref = scoutingPreferencesResult.data as { offensive_scheme: string | null; defensive_scheme: string | null; offensive_book_id: string; defensive_book_id: string } | null;
    scoutingState = {
      preferences: {
        offensiveScheme: pref?.offensive_scheme ?? null, defensiveScheme: pref?.defensive_scheme ?? null,
        offensiveBookId: pref?.offensive_book_id ?? "nfl-off-falcons", defensiveBookId: pref?.defensive_book_id ?? "nfl-def-falcons",
      },
      shortlist: ((shortlistResult.data ?? []) as { kind: "trade_block" | "trade_target"; player_id: string | null; source_player_record_id: string | null; status: "pinned" | "dismissed"; note: string | null }[]).map((row) => {
        const mutablePlayerId = row.player_id;
        const sourceReference = row.source_player_record_id ? sourceRef.get(row.source_player_record_id) ?? null : null;
        if (!mutablePlayerId && !sourceReference) throw new Error("A scouting shortlist source reference could not be resolved; export stopped rather than dropping it.");
        return { kind: row.kind, identity: mutablePlayerId ? "franchise" as const : "source" as const, mutablePlayerId, sourceReference, status: row.status, note: row.note };
      }),
    };
  }

  const payload: BackupFranchisePayload = {
    name: franchise.data.name as string,
    isDefault: false,
    pinnedRevisionKey: franchise.data.pinned_revision_id
      ? (revisionKeyById.get(franchise.data.pinned_revision_id as string) ?? null)
      : null,
    players: ((players.data ?? []) as ExportRow[]).map((row) => ({
      mutableId: row.id,
      origin: row.origin,
      customKey: row.custom_key,
      sourceReference:
        row.origin === "source" && row.source_id && row.source_revision_key
          ? { sourceId: row.source_id, revisionKey: row.source_revision_key }
          : null,
      fullName: row.full_name,
      rosterStatus: row.roster_status ?? "active",
    })),
    fields: (fields.data ?? []).map((row) => ({
      playerId: row.franchise_player_id as string,
      fieldKey: row.field_key as string,
      baselineValue: row.baseline_value ?? null,
      planValue: row.plan_value ?? null,
      fieldClass: (row.field_class as "game_edit_action" | "app_fact") ?? "app_fact",
    })),
    depthChart: ((chart.data ?? []) as ChartRow[]).map((row) => ({
      position: row.position,
      layer: row.layer,
      rank: row.depth_rank,
      playerId: row.franchise_player_id,
    })),
    formationOverrides,
    formationFavorites,
    history,
    ...(gmState ? { gmState } : {}),
    ...(scoutingState ? { scoutingState } : {}),
  };

  return { ok: true, data: { envelope: createEnvelope(payload), name: payload.name } };
}

export async function restoreNewFranchise(
  payload: BackupFranchisePayload,
  requestId: string,
): Promise<Loaded<string>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("restore_new_franchise_c4b", {
    p_payload: { franchise: payload, gmState: payload.gmState ?? null, scoutingState: payload.scoutingState ?? null },
    p_request_id: requestId,
  });

  if (error) {
    const text = error.message ?? "";
    if (text.includes("source_revision_unavailable")) {
      return {
        ok: false,
        message:
          "That backup needs a source revision this catalog does not have. Import the revision or pin an available one; nothing was restored.",
      };
    }
    if (text.includes("backup_invalid")) {
      return { ok: false, message: "The backup payload was rejected as invalid; nothing was restored." };
    }
    if (text.includes("unauthorized")) {
      return { ok: false, message: "This account is not the allowlisted owner." };
    }
    return { ok: false, message: `Restore failed; nothing was written. ${text}` };
  }

  return { ok: true, data: data as string };
}
