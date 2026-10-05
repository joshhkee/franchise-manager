"use server";

import { revalidatePath } from "next/cache";
import {
  attachResultMessage,
  escapeSearchTerm,
  overallFromRatings,
  type AttachSummary,
} from "../catalog";
import { createServerSupabase } from "../supabase/server";
import type { ActionState } from "./state";

export interface CatalogAttachState extends ActionState {
  summary?: AttachSummary;
  /** Every requested record id that is on the roster after this request. */
  attachedIds?: string[];
}

export interface CatalogSearchRow {
  id: string;
  fullName: string;
  team: string | null;
  listedPosition: string | null;
  overall: number | null;
  attached: boolean;
}

export interface CatalogSearchState extends ActionState {
  results?: CatalogSearchRow[];
  /** True when more matches exist than the shown page. */
  truncated?: boolean;
}

const SEARCH_LIMIT = 25;
const MISSING_MIGRATION_HINT =
  "Catalog attachment is not available in this project yet: apply migration 0009_catalog_attach.sql in the Supabase SQL editor, then retry.";

function missingStorage(error: { message?: string } | null): boolean {
  return /could not find the function|does not exist|schema cache/i.test(`${error?.message ?? ""}`);
}

/** Translate attachment command failures into truthful, actionable messages. */
function describeAttachError(error: { message: string; code?: string } | null): string {
  if (!error) return "Nothing was attached: unknown error.";
  const text = `${error.message ?? ""}`;
  if (text.includes("stale_revision")) {
    return "This franchise changed since this page loaded, so nothing was attached. Reload to see the latest revision, then retry.";
  }
  if (text.includes("cross_franchise_reference")) {
    return "That franchise belongs to a different owner, so nothing was attached.";
  }
  if (text.includes("unauthorized")) {
    return "This account is not the allowlisted owner, so nothing was attached.";
  }
  if (text.includes("source_revision_unavailable")) {
    return "Those published records are not available in the imported catalog, so nothing was attached.";
  }
  if (text.includes("validation_failed")) {
    const detail = text.split("validation_failed:").slice(1).join(":").trim();
    return `${detail || "That request is not valid."} Nothing was attached.`;
  }
  if (missingStorage(error)) return `${MISSING_MIGRATION_HINT} Nothing was attached.`;
  return `Nothing was attached: ${text || "unknown error"}`;
}

function parseRecordIds(formData: FormData): string[] | null {
  const raw = formData.get("recordIds");
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter((id): id is string => typeof id === "string" && id.trim() !== "");
    return ids.length === parsed.length && ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

function readExpectedRevision(formData: FormData): number {
  const raw = Number(formData.get("revision"));
  return Number.isFinite(raw) ? raw : -1;
}

function requestIdFrom(formData: FormData): string | null {
  const provided = formData.get("requestId");
  return typeof provided === "string" && provided ? provided : null;
}

function revalidateCatalogViews(): void {
  for (const path of ["/gm", "/lineups", "/", "/settings"]) revalidatePath(path);
}

/**
 * Attach one published team roster from one imported revision. This is the
 * "start from the published snapshot" action (also run automatically for the
 * matching team when the roster has no attached players, D126); the result is
 * the provisional published baseline until the owner records reality.
 */
export async function attachCatalogTeam(
  _prev: CatalogAttachState,
  formData: FormData,
): Promise<CatalogAttachState> {
  const franchiseId = formData.get("franchiseId");
  const revisionId = formData.get("revisionId");
  const team = formData.get("team");
  if (typeof franchiseId !== "string" || !franchiseId) {
    return { status: "error", message: "No franchise selected, so nothing was attached." };
  }
  if (typeof revisionId !== "string" || !revisionId) {
    return { status: "error", message: "No imported source revision is selected, so nothing was attached." };
  }
  if (typeof team !== "string" || !team.trim()) {
    return { status: "error", message: "Choose the team to attach, so nothing is guessed." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("attach_source_team", {
    p_franchise_id: franchiseId,
    p_revision_id: revisionId,
    p_team: team.trim(),
    p_expected_revision: readExpectedRevision(formData),
    p_request_id: requestIdFrom(formData),
  });

  if (error) return { status: "error", message: describeAttachError(error) };
  const summary = data as AttachSummary;
  revalidateCatalogViews();
  return { status: "ok", message: attachResultMessage(summary), summary };
}

/**
 * Attach an explicit catalog selection (search results, unsigned records,
 * individuals). Validates before any write, and duplicate identity is reported
 * instead of duplicated.
 */
export async function attachCatalogRecords(
  _prev: CatalogAttachState,
  formData: FormData,
): Promise<CatalogAttachState> {
  const franchiseId = formData.get("franchiseId");
  if (typeof franchiseId !== "string" || !franchiseId) {
    return { status: "error", message: "No franchise selected, so nothing was attached." };
  }

  const recordIds = parseRecordIds(formData);
  if (!recordIds) {
    return { status: "error", message: "The selected catalog records could not be read, so nothing was attached." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("attach_source_records", {
    p_franchise_id: franchiseId,
    p_record_ids: recordIds,
    p_expected_revision: readExpectedRevision(formData),
    p_request_id: requestIdFrom(formData),
  });

  if (error) return { status: "error", message: describeAttachError(error) };
  const summary = data as AttachSummary;
  revalidateCatalogViews();
  return { status: "ok", message: attachResultMessage(summary), summary, attachedIds: recordIds };
}

/**
 * Search the imported catalog. Read-only: a missing match is an empty result,
 * never invented data, and an unapplied migration is reported honestly.
 */
export async function searchCatalogPlayers(
  _prev: CatalogSearchState,
  formData: FormData,
): Promise<CatalogSearchState> {
  const franchiseId = formData.get("franchiseId");
  const revisionId = formData.get("revisionId");
  const scope = formData.get("scope");
  const team = formData.get("team");
  const term = formData.get("query");

  if (typeof franchiseId !== "string" || !franchiseId || typeof revisionId !== "string" || !revisionId) {
    return { status: "error", message: "No franchise or imported revision is selected." };
  }

  const supabase = await createServerSupabase();
  let query = supabase
    .from("source_player_records_view")
    .select("id,full_name,team,listed_position,ratings")
    .eq("revision_id", revisionId);

  if (scope === "free_agents") {
    query = query.is("team", null);
  } else if (scope === "team") {
    if (typeof team !== "string" || !team.trim()) {
      return { status: "error", message: "Choose a team before searching that team's records." };
    }
    query = query.eq("team", team.trim());
  }

  if (typeof term === "string" && term.trim() !== "") {
    query = query.ilike("full_name", `%${escapeSearchTerm(term)}%`);
  }

  const { data, error } = await query.order("full_name", { ascending: true }).limit(SEARCH_LIMIT + 1);
  if (error) {
    if (missingStorage(error)) return { status: "error", message: MISSING_MIGRATION_HINT };
    return { status: "error", message: `Could not read the catalog: ${error.message}` };
  }

  const { data: attachedRows } = await supabase
    .from("franchise_players_view")
    .select("source_player_record_id")
    .eq("franchise_id", franchiseId)
    .not("source_player_record_id", "is", null);

  const attached = new Set(
    ((attachedRows ?? []) as { source_player_record_id: string }[]).map(
      (row) => row.source_player_record_id,
    ),
  );

  const rows = (data ?? []) as {
    id: string;
    full_name: string;
    team: string | null;
    listed_position: string | null;
    ratings: unknown;
  }[];
  const truncated = rows.length > SEARCH_LIMIT;

  return {
    status: "ok",
    results: rows.slice(0, SEARCH_LIMIT).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      team: (row.team as string | null) ?? null,
      listedPosition: (row.listed_position as string | null) ?? null,
      overall: overallFromRatings(row.ratings),
      attached: attached.has(row.id),
    })),
    truncated,
  };
}
