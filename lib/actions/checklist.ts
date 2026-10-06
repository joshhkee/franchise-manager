"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../supabase/server";
import { AUTOSAVE_MESSAGES, classifyOutcome, type AutosaveOutcome } from "./outcome";

/**
 * C2B checklist commands (C0B-v2 §4/§5). Confirmation applies the exact reviewed scope
 * atomically in the order given; cancellation reverts a pending scope to its baseline;
 * undo reverses a retained confirmation batch only when no later dependent change
 * conflicts. Every command carries the reviewed revision and a request id so a
 * lost-response retry replays instead of double-applying.
 */

export interface ChecklistMutationResult {
  outcome: AutosaveOutcome;
  message: string;
  revision?: number;
  applied?: string[];
  cancelled?: string[];
  dependent?: string[];
  restored?: string[];
  batchId?: string;
}

export interface ChecklistUnitInput {
  type: "depth_chart_list" | "roster_status";
  unitId: string;
  position?: string;
  playerIds?: string[];
  playerId?: string;
  status?: "active" | "practice_squad";
}

const FAILURE_MESSAGES: [RegExp, string][] = [
  [
    /dependency_blocked/,
    "A prerequisite is not satisfied, so nothing was applied. Promote the practice-squad player in Madden, record it, then review again.",
  ],
  [
    /no longer pending/,
    "The plan changed since you reviewed it, so nothing was applied. Reload to review the current checklist.",
  ],
  [/already undone/, "That action was already undone; nothing changed."],
  [/only confirmations can be undone/, "Only a confirmation can be undone. A cancelled plan is re-planned from the depth chart."],
  [
    /not available to undo/,
    "That action is no longer available to undo (it may have aged out of the retained history).",
  ],
  [/no pending plan/, "That position has no pending change to cancel."],
  [/unauthorized/, AUTOSAVE_MESSAGES.unauthorized],
];

function classify(error: { message: string; code?: string }): { outcome: AutosaveOutcome; message: string } {
  const outcome = classifyOutcome(error);
  if (outcome !== "failed") return { outcome, message: AUTOSAVE_MESSAGES[outcome] };
  const raw = error.message ?? "unknown error";
  for (const [pattern, message] of FAILURE_MESSAGES) {
    if (pattern.test(raw)) return { outcome: "failed", message };
  }
  return { outcome: "failed", message: `${AUTOSAVE_MESSAGES.failed} (${raw})` };
}

function revalidateChecklist(): void {
  for (const path of ["/checklist", "/lineups", "/", "/franchises"]) revalidatePath(path);
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

export async function confirmChecklistUnits(input: {
  franchiseId: string;
  units: ChecklistUnitInput[];
  expectedRevision: number;
  requestId: string;
}): Promise<ChecklistMutationResult> {
  if (input.units.length === 0) {
    return { outcome: "failed", message: "Select at least one ready unit to confirm." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("confirm_checklist_units", {
    p_franchise_id: input.franchiseId,
    p_units: input.units,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) return classify(error);

  revalidateChecklist();
  const row = (data ?? null) as {
    applied?: string[];
    batchId?: string;
    revision?: number;
  } | null;
  const applied = row?.applied ?? input.units.map((unit) => unit.unitId);

  return {
    outcome: "saved",
    message:
      `Confirmed ${applied.length} unit${applied.length === 1 ? "" : "s"} as already done and recorded them as the confirmed baseline. ` +
      "This corrects app records only — it never changes Madden.",
    revision: row?.revision ?? (await currentRevision(input.franchiseId)),
    applied,
    batchId: row?.batchId,
  };
}

export async function cancelChecklistUnits(input: {
  franchiseId: string;
  positions: string[];
  expectedRevision: number;
  requestId: string;
}): Promise<ChecklistMutationResult> {
  if (input.positions.length === 0) {
    return { outcome: "failed", message: "Select at least one pending position to cancel." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("cancel_checklist_units", {
    p_franchise_id: input.franchiseId,
    p_units: input.positions.map((position) => ({ type: "depth_chart_list", position })),
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) return classify(error);

  revalidateChecklist();
  const row = (data ?? null) as {
    cancelled?: string[];
    dependent?: string[];
    batchId?: string;
    revision?: number;
  } | null;
  const cancelled = row?.cancelled ?? input.positions;
  const dependent = row?.dependent ?? [];

  return {
    outcome: "saved",
    message:
      `Cancelled ${cancelled.length} pending change${cancelled.length === 1 ? "" : "s"}; those positions match their baseline again.` +
      (dependent.length > 0
        ? ` Review ${dependent.length} other pending position${dependent.length === 1 ? "" : "s"} that still reference the same player${dependent.length === 1 ? "" : "s"}.`
        : ""),
    revision: row?.revision ?? (await currentRevision(input.franchiseId)),
    cancelled,
    dependent,
    batchId: row?.batchId,
  };
}

export async function undoActionBatch(input: {
  franchiseId: string;
  batchId: string;
  expectedRevision: number;
  requestId: string;
}): Promise<ChecklistMutationResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("undo_action_batch", {
    p_franchise_id: input.franchiseId,
    p_batch_id: input.batchId,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) return classify(error);

  revalidateChecklist();
  const row = (data ?? null) as { restored?: string[]; revision?: number } | null;
  return {
    outcome: "saved",
    message:
      "Undone. The app records are back to before that confirmation; if you already made the change in Madden, re-confirm or correct the list.",
    revision: row?.revision ?? (await currentRevision(input.franchiseId)),
    restored: row?.restored ?? [],
  };
}
