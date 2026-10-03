"use server";

import { revalidatePath } from "next/cache";
import { maxRankFor, positionSpec } from "../depth-chart";
import { createServerSupabase } from "../supabase/server";
import { AUTOSAVE_MESSAGES, classifyOutcome, type AutosaveOutcome } from "./outcome";

/**
 * Depth-chart writes (C2A) reuse the C0B-v2 §5 revision/idempotency contract:
 * every command carries expectedRevision and a caller-supplied requestId so a
 * lost-response retry replays instead of double-applying. One call saves one
 * whole position list — rank rows are never independent units (§4).
 */

export interface DepthChartSaveResult {
  outcome: AutosaveOutcome;
  message: string;
  /** The franchise revision after a successful write, so the next edit is not stale. */
  revision?: number;
  playerIds?: string[];
  verification?: "provisional_published" | "owner_confirmed";
  /** True when a differing plan was kept and surfaced after recording reality. */
  planKept?: boolean;
}

export interface RosterStatusResult {
  outcome: AutosaveOutcome;
  message: string;
  revision?: number;
  status?: "active" | "practice_squad";
}

function revalidateDepthChart(): void {
  for (const path of ["/lineups", "/", "/franchises"]) revalidatePath(path);
}

async function currentRevision(franchiseId: string): Promise<number | undefined> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("franchise_summaries")
    .select("revision")
    .eq("id", franchiseId)
    .maybeSingle();
  return (data as { revision?: number } | null)?.revision;
}

function validateList(position: string, playerIds: string[]): string | null {
  const spec = positionSpec(position);
  if (!spec) return "That position is not part of the provisional chart.";
  if (playerIds.length > maxRankFor(position)) {
    return `The provisional limit for ${spec.label} is ${maxRankFor(position)} listed players. Adjust the list, or treat the limit as provisional and edit the rules module once evidence lands.`;
  }
  if (new Set(playerIds).size !== playerIds.length) {
    return "The same player cannot appear twice in one position list.";
  }
  return null;
}

export async function saveDepthChartPlan(input: {
  franchiseId: string;
  position: string;
  playerIds: string[];
  expectedRevision: number;
  requestId: string;
}): Promise<DepthChartSaveResult> {
  const problem = validateList(input.position, input.playerIds);
  if (problem) return { outcome: "failed", message: problem };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("set_depth_chart_plan", {
    p_franchise_id: input.franchiseId,
    p_position: input.position,
    p_player_ids: input.playerIds,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) {
    const outcome = classifyOutcome(error);
    const detail =
      outcome === "failed" ? `${AUTOSAVE_MESSAGES.failed} (${error.message})` : AUTOSAVE_MESSAGES[outcome];
    return { outcome, message: detail };
  }

  revalidateDepthChart();
  const row = (data ?? null) as { playerIds?: string[] } | null;
  return {
    outcome: "saved",
    message: "Planned.",
    revision: await currentRevision(input.franchiseId),
    playerIds: row?.playerIds ?? input.playerIds,
  };
}

/** Record the whole list as reality: owner-confirmed, or a provisional planning baseline. */
export async function recordDepthChartBaseline(input: {
  franchiseId: string;
  position: string;
  playerIds: string[];
  intent: "recorded" | "provisional";
  expectedRevision: number;
  requestId: string;
}): Promise<DepthChartSaveResult> {
  const problem = validateList(input.position, input.playerIds);
  if (problem) return { outcome: "failed", message: problem };

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("record_depth_chart_baseline", {
    p_franchise_id: input.franchiseId,
    p_position: input.position,
    p_player_ids: input.playerIds,
    p_intent: input.intent,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) {
    const outcome = classifyOutcome(error);
    const detail =
      outcome === "failed" ? `${AUTOSAVE_MESSAGES.failed} (${error.message})` : AUTOSAVE_MESSAGES[outcome];
    return { outcome, message: detail };
  }

  revalidateDepthChart();
  const row = (data ?? null) as {
    playerIds?: string[];
    verification?: "provisional_published" | "owner_confirmed";
    planKept?: boolean;
  } | null;
  return {
    outcome: "saved",
    message:
      input.intent === "recorded"
        ? row?.planKept
          ? "Recorded as already happened. Your plan for this position differs from what you recorded, so it is kept for review."
          : "Recorded as already happened."
        : "Provisional list saved. It stays labeled unverified until you record the real chart.",
    revision: await currentRevision(input.franchiseId),
    playerIds: row?.playerIds ?? input.playerIds,
    verification: row?.verification,
    planKept: row?.planKept,
  };
}

export async function discardDepthChartPlan(input: {
  franchiseId: string;
  position: string;
  expectedRevision: number;
  requestId: string;
}): Promise<DepthChartSaveResult> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("discard_depth_chart_plan", {
    p_franchise_id: input.franchiseId,
    p_position: input.position,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) {
    const outcome = classifyOutcome(error);
    const detail =
      outcome === "failed" ? `${AUTOSAVE_MESSAGES.failed} (${error.message})` : AUTOSAVE_MESSAGES[outcome];
    return { outcome, message: detail };
  }

  revalidateDepthChart();
  return {
    outcome: "saved",
    message: "Pending changes for this position were discarded; the list matches its baseline again.",
    revision: await currentRevision(input.franchiseId),
    playerIds: [],
  };
}

/**
 * Record a roster correction (active roster vs practice squad). This is a reality
 * update, not a promotion transaction — C4A owns real promotion tools (D023).
 */
export async function recordRosterStatus(input: {
  franchiseId: string;
  playerId: string;
  status: "active" | "practice_squad";
  expectedRevision: number;
  requestId: string;
}): Promise<RosterStatusResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("set_player_roster_status", {
    p_franchise_player_id: input.playerId,
    p_status: input.status,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) {
    const outcome = classifyOutcome(error);
    const detail =
      outcome === "failed" ? `${AUTOSAVE_MESSAGES.failed} (${error.message})` : AUTOSAVE_MESSAGES[outcome];
    return { outcome, message: detail };
  }

  revalidateDepthChart();
  const row = (data ?? null) as { roster_status?: "active" | "practice_squad" } | null;
  return {
    outcome: "saved",
    message:
      input.status === "active"
        ? "Recorded as active roster."
        : "Recorded as practice squad. They cannot enter a plan until recorded as active.",
    revision: await currentRevision(input.franchiseId),
    status: row?.roster_status ?? input.status,
  };
}
