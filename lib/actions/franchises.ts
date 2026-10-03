"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../supabase/server";
import { AUTOSAVE_MESSAGES, classifyOutcome, type AutosaveOutcome } from "./outcome";
import { FRANCHISE_COOKIE, type ActionState } from "./state";

export type { AutosaveOutcome } from "./outcome";

/**
 * A caller-supplied request id makes a retry after a lost response idempotent:
 * the server replays the stored outcome instead of applying the command twice.
 */
function requestIdFrom(formData: FormData): string {
  const provided = formData.get("requestId");
  return typeof provided === "string" && provided ? provided : randomUUID();
}

/** Translate command outcomes into truthful, actionable messages. */
function describe(error: { message: string; code?: string } | null): string {
  if (!error) return "Saved to app.";
  const text = `${error.message ?? ""}`;
  if (text.includes("stale_revision")) {
    return "This franchise changed since this page loaded, so nothing was written. Reload to see the latest revision, then retry.";
  }
  if (text.includes("cross_franchise_reference")) {
    return "That record belongs to a different franchise or owner, so it was refused.";
  }
  if (text.includes("unauthorized")) {
    return "This account is not the allowlisted owner, so the write was refused.";
  }
  if (text.includes("duplicate key")) {
    return "That record already exists in this franchise.";
  }
  if (text.includes("source_revision_unavailable")) {
    return "That source record is not available in the imported catalog.";
  }
  return `Not saved: ${text || "unknown error"}`;
}

function revalidateFranchiseViews(): void {
  for (const path of ["/", "/gm", "/franchises", "/settings"]) revalidatePath(path);
}

export async function selectFranchise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get("franchiseId");
  if (typeof id !== "string" || !id) return { status: "error", message: "No franchise selected." };

  const store = await cookies();
  store.set(FRANCHISE_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidateFranchiseViews();
  return { status: "ok", message: "Active franchise changed." };
}

export async function createFranchise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = formData.get("name");
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("create_franchise", {
    p_name: typeof name === "string" && name.trim() ? name.trim() : null,
    p_request_id: requestIdFrom(formData),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return { status: "ok", message: "Franchise created." };
}

export async function renameFranchise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = formData.get("franchiseId");
  const name = formData.get("name");
  const revision = Number(formData.get("revision"));
  if (typeof id !== "string" || typeof name !== "string" || !name.trim()) {
    return { status: "error", message: "A name is required." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_franchise_name", {
    p_franchise_id: id,
    p_name: name.trim(),
    p_expected_revision: revision,
    p_request_id: requestIdFrom(formData),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return { status: "ok", message: "Franchise renamed." };
}

export async function setFranchiseArchived(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = formData.get("franchiseId");
  const archived = formData.get("archived") === "true";
  if (typeof id !== "string" || !id) return { status: "error", message: "No franchise selected." };

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_franchise_archived", {
    p_franchise_id: id,
    p_archived: archived,
    p_request_id: requestIdFrom(formData),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return { status: "ok", message: archived ? "Franchise archived." : "Franchise resumed." };
}

const NUMERIC_FIELDS = new Set(["jersey_number", "overall", "contract_years", "contract_value"]);

export interface AutosaveResult {
  outcome: AutosaveOutcome;
  message: string;
  /** The franchise revision after a successful write, so the next edit is not stale. */
  revision?: number;
  baselineValue?: unknown;
  planValue?: unknown;
}

/**
 * Autosave one grouped field. The caller supplies a stable request id per edit,
 * so a retry after a lost response replays instead of double-applying. Ordinary
 * edits are revision-checked; a stale write is surfaced, never overwritten.
 */
export async function autosavePlayerField(input: {
  playerId: string;
  franchiseId: string;
  fieldKey: string;
  value: string | number | null;
  intent: "plan" | "recorded";
  expectedRevision: number;
  requestId: string;
}): Promise<AutosaveResult> {
  if (!input.playerId || !input.fieldKey || (input.intent !== "plan" && input.intent !== "recorded")) {
    return { outcome: "failed", message: "That edit could not be read." };
  }

  let value: unknown = null;
  const text = input.value === null || input.value === undefined ? "" : String(input.value).trim();
  if (text !== "") {
    if (NUMERIC_FIELDS.has(input.fieldKey)) {
      const parsed = Number(text);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return {
          outcome: "failed",
          message: "Enter a whole number of zero or more, or leave it empty for unknown.",
        };
      }
      value = parsed;
    } else {
      value = text;
    }
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.rpc("set_player_field", {
    p_franchise_player_id: input.playerId,
    p_field_key: input.fieldKey,
    p_value: value,
    p_intent: input.intent,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) {
    const outcome = classifyOutcome(error);
    const detail = outcome === "failed" ? `${AUTOSAVE_MESSAGES.failed} (${error.message})` : AUTOSAVE_MESSAGES[outcome];
    return { outcome, message: detail };
  }

  // Re-read the revision so a batch of edits on one roster stays in step; the
  // read-model view is the only public surface for it.
  const { data: summary } = await supabase
    .from("franchise_summaries")
    .select("revision")
    .eq("id", input.franchiseId)
    .maybeSingle();

  revalidateFranchiseViews();
  const row = (data ?? null) as { baseline_value?: unknown; plan_value?: unknown } | null;
  return {
    outcome: "saved",
    message: input.intent === "recorded" ? "Recorded as already happened." : "Planned.",
    revision: (summary as { revision?: number } | null)?.revision,
    baselineValue: row?.baseline_value ?? null,
    planValue: row?.plan_value ?? null,
  };
}

export async function addCustomPlayer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const fullName = formData.get("fullName");
  const revision = Number(formData.get("revision"));
  if (typeof franchiseId !== "string" || typeof fullName !== "string" || !fullName.trim()) {
    return { status: "error", message: "A player name is required." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("add_custom_player", {
    p_franchise_id: franchiseId,
    p_full_name: fullName.trim(),
    p_expected_revision: revision,
    p_request_id: requestIdFrom(formData),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return { status: "ok", message: "Custom player added." };
}
