import type { ChartPlayer, RosterStatus } from "../depth-chart";
import { createServerSupabase } from "../supabase/server";
import type { Loaded } from "./franchises";

export interface DepthChartEntryRow {
  position: string;
  layer: "baseline" | "plan";
  rank: number;
  playerId: string;
  verification: "provisional_published" | "owner_confirmed";
}

export interface DepthChartData {
  players: ChartPlayer[];
  entries: DepthChartEntryRow[];
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function numberOrNull(value: unknown): number | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Read the depth-chart surface for one franchise: the players eligible to be
 * charted (with their recorded/source position and overall), and the stored
 * baseline/plan entries. Fails honestly if migration 0007 is not applied yet.
 */
export async function loadDepthChart(franchiseId: string): Promise<Loaded<DepthChartData>> {
  const supabase = await createServerSupabase();

  const [playersResult, fieldsResult, chartResult] = await Promise.all([
    supabase
      .from("franchise_players_view")
      .select("id,full_name,roster_status,listed_position,source_overall")
      .eq("franchise_id", franchiseId)
      .order("full_name", { ascending: true }),
    supabase
      .from("franchise_player_fields_view")
      .select("franchise_player_id,field_key,baseline_value")
      .eq("franchise_id", franchiseId)
      .in("field_key", ["listed_position", "overall"]),
    supabase
      .from("depth_chart_view")
      .select("position,layer,depth_rank,franchise_player_id,verification")
      .eq("franchise_id", franchiseId)
      .order("position", { ascending: true })
      .order("depth_rank", { ascending: true }),
  ]);

  const error = playersResult.error ?? fieldsResult.error ?? chartResult.error;
  if (error) {
    const detail = `${error.message ?? "unknown error"}`;
    const missing = /does not exist|not found|schema cache/i.test(detail);
    return {
      ok: false,
      message: missing
        ? "Depth-chart storage is not ready for this project yet. Migration 0007_depth_chart.sql must be applied by the owner; nothing is invented in the meantime."
        : detail,
    };
  }

  const recordedByPlayer = new Map<string, { listed: string | null; overall: number | null }>();
  for (const row of fieldsResult.data ?? []) {
    const playerId = row.franchise_player_id as string;
    const entry = recordedByPlayer.get(playerId) ?? { listed: null, overall: null };
    if (row.field_key === "listed_position") entry.listed = text(row.baseline_value);
    if (row.field_key === "overall") entry.overall = numberOrNull(row.baseline_value);
    recordedByPlayer.set(playerId, entry);
  }

  const players: ChartPlayer[] = (playersResult.data ?? []).map((row) => {
    const id = row.id as string;
    const recorded = recordedByPlayer.get(id);
    return {
      id,
      fullName: row.full_name as string,
      rosterStatus: ((row.roster_status as RosterStatus | null) ?? "active") as RosterStatus,
      primaryPosition: recorded?.listed ?? text(row.listed_position),
      overall: recorded?.overall ?? numberOrNull(row.source_overall),
    };
  });

  const entries: DepthChartEntryRow[] = (chartResult.data ?? []).map((row) => ({
    position: row.position as string,
    layer: row.layer as "baseline" | "plan",
    rank: Number(row.depth_rank),
    playerId: row.franchise_player_id as string,
    verification: (row.verification as "provisional_published" | "owner_confirmed") ?? "provisional_published",
  }));

  return { ok: true, data: { players, entries } };
}
