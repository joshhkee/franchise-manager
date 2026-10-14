"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../supabase/server";
import type { ActionState } from "./state";

function requestId(formData: FormData): string {
  const provided = formData.get("requestId");
  return typeof provided === "string" && provided ? provided : randomUUID();
}

function integer(formData: FormData, key: string, fallback = -1): number {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : fallback;
}

function decimal(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}

function messageFor(error: { message?: string } | null, action: string): string {
  const text = error?.message ?? "unknown error";
  if (text.includes("stale_revision")) return "This franchise changed since the page loaded, so nothing was saved. Reload, review the latest state, and retry.";
  if (text.includes("dependency_blocked")) return "A prerequisite is still pending. Nothing was confirmed; review the roster and try again.";
  if (text.includes("cross_franchise_reference")) return "A selected record belongs to another franchise or is not an owned asset. Nothing changed.";
  if (text.includes("source_revision_unavailable")) return "That player is not in the available catalog. Nothing changed.";
  if (text.includes("duplicate key") || text.includes("transaction_asset_claims")) return "That asset is already on another open deal. Cancel or complete that proposal first.";
  if (text.includes("validation_failed")) return `The request was rejected: ${text.split("validation_failed:").slice(1).join(":").trim()}. Nothing changed.`;
  if (/does not exist|not found|schema cache/i.test(text)) return "The GM ledger migration is not applied yet. Ask the owner to apply 0013_gm_ledger.sql, then retry.";
  return `${action} failed; nothing was reported as saved. ${text}`;
}

function resultState(error: { message?: string } | null, action: string): ActionState {
  return error ? { status: "error", message: messageFor(error, action) } : { status: "ok", message: `${action} saved.` };
}

function revalidateGm(): void {
  for (const path of ["/gm", "/lineups", "/checklist", "/", "/franchises", "/settings"]) revalidatePath(path);
}

export async function saveContractSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  if (typeof franchiseId !== "string" || !franchiseId) return { status: "error", message: "No active franchise was selected." };
  const teamCap = decimal(formData, "teamCap");
  const availableCap = decimal(formData, "availableCap");
  const threshold = integer(formData, "expiryThresholdYears", 0);
  if (Number.isNaN(teamCap) || Number.isNaN(availableCap) || threshold < 0 || threshold > 20) {
    return { status: "error", message: "Enter non-negative dollar amounts and a 0–20 year flag threshold; leave unknown amounts blank." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_franchise_contract_settings", {
    p_franchise_id: franchiseId, p_team_cap: teamCap, p_available_cap: availableCap,
    p_expiry_threshold_years: threshold, p_expected_revision: integer(formData, "revision"),
    p_request_id: requestId(formData),
  });
  const state = resultState(error, "Contract settings");
  if (!error) revalidateGm();
  return state;
}

export async function addDraftPick(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const originalTeam = formData.get("originalTeam");
  const currentOwner = formData.get("currentOwner");
  const note = formData.get("note");
  if (typeof franchiseId !== "string" || !franchiseId || typeof originalTeam !== "string" ||
      !originalTeam.trim() || typeof currentOwner !== "string" || !currentOwner.trim()) {
    return { status: "error", message: "Enter the draft year, round, original team, and current owner. Unknown picks are not added." };
  }
  const year = integer(formData, "year", -1);
  const round = integer(formData, "round", -1);
  if (year < 2000 || year > 2200 || round < 1 || round > 7 || (typeof note === "string" && note.length > 500)) {
    return { status: "error", message: "Enter a year from 2000–2200, round 1–7, and an optional note under 500 characters." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("add_franchise_draft_pick", {
    p_franchise_id: franchiseId, p_draft_year: year, p_draft_round: round,
    p_original_team: originalTeam.trim(), p_current_owner: currentOwner.trim(),
    p_note: typeof note === "string" && note.trim() ? note.trim() : null,
    p_expected_revision: integer(formData, "revision"), p_request_id: requestId(formData),
  });
  const state = resultState(error, "Draft pick");
  if (!error) revalidateGm();
  return state;
}

function jsonArray<T>(formData: FormData, key: string): T[] | null {
  const raw = formData.get(key);
  if (typeof raw !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as T[] : null;
  } catch {
    return null;
  }
}

export async function saveProposal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const kind = formData.get("kind");
  const counterparty = formData.get("counterparty");
  const note = formData.get("note");
  const playerMoves = jsonArray<{ direction: "incoming" | "outgoing" | "promotion"; playerId?: string; sourceRecordId?: string }>(formData, "playerMoves");
  const pickMoves = jsonArray<{ direction: "incoming" | "outgoing"; pickId: string }>(formData, "pickMoves");
  if (typeof franchiseId !== "string" || !franchiseId || typeof kind !== "string" ||
      !["trade", "sign", "cut", "promotion"].includes(kind) || typeof counterparty !== "string" ||
      !counterparty.trim() || playerMoves === null || pickMoves === null) {
    return { status: "error", message: "Review the proposal fields and selected assets; nothing was saved." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("save_transaction_proposal", {
    p_franchise_id: franchiseId, p_kind: kind, p_counterparty: counterparty.trim(),
    p_note: typeof note === "string" && note.trim() ? note.trim() : null,
    p_player_moves: playerMoves, p_pick_moves: pickMoves,
    p_expected_revision: integer(formData, "revision"), p_request_id: requestId(formData),
  });
  const state = resultState(error, "Proposal");
  if (!error) revalidateGm();
  return state;
}

async function mutateProposal(action: "finish" | "cancel", formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const proposalId = formData.get("proposalId");
  if (typeof franchiseId !== "string" || !franchiseId || typeof proposalId !== "string" || !proposalId) {
    return { status: "error", message: "Choose a proposal before continuing." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc(action === "finish" ? "finish_transaction_proposal" : "cancel_transaction_proposal", {
    p_franchise_id: franchiseId, p_proposal_id: proposalId,
    p_expected_revision: integer(formData, "revision"), p_request_id: requestId(formData),
  });
  const state = resultState(error, action === "finish" ? "Completion confirmation" : "Proposal cancellation");
  if (!error) revalidateGm();
  return state;
}

export async function confirmProposalComplete(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProposal("finish", formData);
}

export async function cancelProposal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return mutateProposal("cancel", formData);
}
