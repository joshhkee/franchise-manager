import { createServerSupabase } from "../supabase/server";
import type { Loaded } from "./franchises";
import type { ContractSettings, DraftPickAsset, TransactionProposal } from "../gm";

export interface GmLedgerData {
  storageAvailable: boolean;
  settings: ContractSettings | null;
  picks: DraftPickAsset[];
  proposals: TransactionProposal[];
  sourcePlayers: { revisionId: string | null; records: { id: string; fullName: string; team: string | null }[] };
}

function missing(error: { message?: string } | null): boolean {
  return /does not exist|not found|schema cache/i.test(error?.message ?? "");
}

export async function loadGmLedger(franchiseId: string): Promise<Loaded<GmLedgerData>> {
  const supabase = await createServerSupabase();
  const [settingsResult, picksResult, proposalsResult, sourceResult] = await Promise.all([
    supabase.from("franchise_contract_settings_view").select("team_cap,available_cap,expiry_threshold_years").eq("franchise_id", franchiseId).maybeSingle(),
    supabase.from("franchise_draft_picks_view").select("id,franchise_id,draft_year,draft_round,original_team,current_owner,note,reserved").eq("franchise_id", franchiseId).order("draft_year", { ascending: true }).order("draft_round", { ascending: true }),
    supabase.from("transaction_proposals_view").select("id,franchise_id,kind,counterparty,note,status,created_at,completed_at,player_moves,pick_moves").eq("franchise_id", franchiseId).order("created_at", { ascending: false }).limit(50),
    supabase.from("source_revision_summaries").select("id").order("captured_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const firstError = settingsResult.error ?? picksResult.error ?? proposalsResult.error;
  if (firstError && missing(firstError)) {
    return { ok: true, data: { storageAvailable: false, settings: null, picks: [], proposals: [], sourcePlayers: { revisionId: null, records: [] } } };
  }
  if (firstError) return { ok: false, message: firstError.message ?? "The asset ledger could not be read." };
  if (sourceResult.error && !missing(sourceResult.error)) return { ok: false, message: sourceResult.error.message ?? "The source catalog could not be read." };
  const sourceRevision = sourceResult.data as { id: string } | null;
  const settings = settingsResult.data as { team_cap: number | null; available_cap: number | null; expiry_threshold_years: number | null } | null;
  let sourcePlayers: GmLedgerData["sourcePlayers"] = { revisionId: sourceRevision?.id ?? null, records: [] };
  if (sourceRevision) {
    const [recordsResult, attachedResult] = await Promise.all([
      supabase.from("source_player_records_view").select("id,full_name,team,revision_key,source_id").eq("revision_id", sourceRevision.id).order("full_name", { ascending: true }).limit(5000),
      supabase.from("franchise_players_view").select("source_player_record_id").eq("franchise_id", franchiseId).not("source_player_record_id", "is", null),
    ]);
    if (recordsResult.error && !missing(recordsResult.error)) return { ok: false, message: recordsResult.error.message ?? "The source catalog could not be read." };
    if (attachedResult.error && !missing(attachedResult.error)) return { ok: false, message: attachedResult.error.message ?? "The roster catalog links could not be read." };
    const attached = new Set(((attachedResult.data ?? []) as { source_player_record_id: string }[]).map((row) => row.source_player_record_id));
    sourcePlayers = {
      revisionId: sourceRevision.id,
      records: ((recordsResult.data ?? []) as { id: string; full_name: string; team: string | null; revision_key: string; source_id: string }[])
        .filter((row) => !attached.has(row.id))
        .map((row) => ({ id: row.id, fullName: row.full_name, team: row.team, revisionKey: row.revision_key, sourceId: row.source_id })),
    };
  }
  return {
    ok: true,
    data: {
      storageAvailable: true,
      settings: settings ? {
        teamCap: settings.team_cap === null ? null : Number(settings.team_cap),
        availableCap: settings.available_cap === null ? null : Number(settings.available_cap),
        expiryThresholdYears: settings.expiry_threshold_years,
      } : null,
      picks: ((picksResult.data ?? []) as { id: string; franchise_id: string; draft_year: number; draft_round: number; original_team: string; current_owner: string; note: string | null; reserved: boolean }[]).map((row) => ({
        id: row.id, franchiseId: row.franchise_id, year: Number(row.draft_year), round: Number(row.draft_round),
        originalTeam: row.original_team, currentOwner: row.current_owner, note: row.note, reserved: row.reserved,
      })),
      proposals: ((proposalsResult.data ?? []) as { id: string; franchise_id: string; kind: TransactionProposal["kind"]; counterparty: string; note: string | null; status: TransactionProposal["status"]; created_at: string; completed_at: string | null; player_moves: TransactionProposal["playerMoves"]; pick_moves: TransactionProposal["pickMoves"] }[]).map((row) => ({
        id: row.id, franchiseId: row.franchise_id, kind: row.kind, counterparty: row.counterparty, note: row.note,
        status: row.status, createdAt: row.created_at, completedAt: row.completed_at,
        playerMoves: row.player_moves ?? [], pickMoves: row.pick_moves ?? [],
      })),
      sourcePlayers,
    },
  };
}
