import { createServerSupabase } from "../supabase/server";
import type { Loaded } from "./franchises";

export interface CatalogTeamRow {
  team: string;
  playerCount: number;
  missingPositionCount: number;
}

export interface CatalogAttachContext {
  revisionId: string;
  source: string;
  revisionKey: string;
  capturedAt: string | null;
  coverageStatus: "complete_as_imported" | "partial" | "unsupported";
  recordCount: number;
  teams: CatalogTeamRow[];
  /** Records with no published team (unsigned); never presented as a team. */
  unsignedCount: number;
  unsignedMissingPositionCount: number;
  /** Source records already attached to this franchise. */
  attachedRecordIds: string[];
}

function missingStorage(error: { message?: string } | null): boolean {
  const detail = `${error?.message ?? ""}`;
  return /does not exist|not found|schema cache/i.test(detail);
}

/**
 * Read what the attach surface needs: the newest imported revision, its team
 * coverage, and which catalog records this franchise already holds. Returns
 * `null` data when no revision has been imported yet — an empty catalog is an
 * honest state, not an error. Fails honestly if migration 0009 is not applied.
 */
export async function loadCatalogAttach(
  franchiseId: string,
): Promise<Loaded<CatalogAttachContext | null>> {
  const supabase = await createServerSupabase();

  const revisionResult = await supabase
    .from("source_revision_summaries")
    .select("id,source,revision_key,captured_at,coverage_status,record_count")
    .order("captured_at", { ascending: false })
    .limit(1);

  if (revisionResult.error) {
    return { ok: false, message: revisionResult.error.message };
  }

  const revision = (revisionResult.data ?? [])[0];
  if (!revision) return { ok: true, data: null };

  const [teamsResult, attachedResult] = await Promise.all([
    supabase
      .from("source_team_summaries")
      .select("team,player_count,missing_position_count")
      .eq("revision_id", revision.id as string)
      .order("team", { ascending: true }),
    supabase
      .from("franchise_players_view")
      .select("source_player_record_id")
      .eq("franchise_id", franchiseId)
      .not("source_player_record_id", "is", null),
  ]);

  const error = teamsResult.error ?? attachedResult.error;
  if (error) {
    if (missingStorage(error) || /function .* does not exist/i.test(`${error.message ?? ""}`)) {
      return {
        ok: false,
        message:
          "Catalog attachment storage is not ready for this project yet. Migration 0009_catalog_attach.sql must be applied by the owner; nothing is invented in the meantime.",
      };
    }
    return { ok: false, message: error.message };
  }

  const teams: CatalogTeamRow[] = [];
  let unsignedCount = 0;
  let unsignedMissingPositionCount = 0;

  for (const row of teamsResult.data ?? []) {
    const playerCount = Number(row.player_count) || 0;
    const missingPositionCount = Number(row.missing_position_count) || 0;
    if (row.team === null || row.team === undefined) {
      unsignedCount += playerCount;
      unsignedMissingPositionCount += missingPositionCount;
      continue;
    }
    teams.push({
      team: row.team as string,
      playerCount,
      missingPositionCount,
    });
  }
  teams.sort((a, b) => a.team.localeCompare(b.team));

  return {
    ok: true,
    data: {
      revisionId: revision.id as string,
      source: revision.source as string,
      revisionKey: revision.revision_key as string,
      capturedAt: (revision.captured_at as string | null) ?? null,
      coverageStatus: revision.coverage_status as CatalogAttachContext["coverageStatus"],
      recordCount: Number(revision.record_count) || 0,
      teams,
      unsignedCount,
      unsignedMissingPositionCount,
      attachedRecordIds: ((attachedResult.data ?? []) as { source_player_record_id: string }[]).map(
        (row) => row.source_player_record_id,
      ),
    },
  };
}
