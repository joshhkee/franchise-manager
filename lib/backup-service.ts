import { createEnvelope, type BackupEnvelope, type BackupFranchisePayload } from "./backup";
import { createServerSupabase } from "./supabase/server";
import type { Loaded } from "./data/franchises";

interface ExportRow {
  id: string;
  origin: "source" | "custom";
  custom_key: string | null;
  full_name: string;
  source_id: string | null;
  source_revision_key: string | null;
  roster_status: "active" | "practice_squad" | null;
}

interface ChartRow {
  position: string;
  layer: "baseline" | "plan";
  depth_rank: number;
  franchise_player_id: string;
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

  const revisionKeyById = new Map(
    (revisions.data ?? []).map((row) => [row.id as string, row.revision_key as string]),
  );

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
  };

  return { ok: true, data: { envelope: createEnvelope(payload), name: payload.name } };
}

export async function restoreNewFranchise(
  payload: BackupFranchisePayload,
  requestId: string,
): Promise<Loaded<string>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("restore_new_franchise", {
    p_payload: payload,
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
