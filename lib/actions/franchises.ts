"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../supabase/server";
import { FRANCHISE_COOKIE, type ActionState } from "./state";

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
    p_request_id: randomUUID(),
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
    p_request_id: randomUUID(),
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
    p_request_id: randomUUID(),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return { status: "ok", message: archived ? "Franchise archived." : "Franchise resumed." };
}

const NUMERIC_FIELDS = new Set(["jersey_number", "overall", "contract_years", "contract_value"]);

export async function setPlayerField(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const playerId = formData.get("playerId");
  const fieldKey = formData.get("fieldKey");
  const raw = formData.get("value");
  const intent = formData.get("intent");
  const revision = Number(formData.get("revision"));

  if (
    typeof playerId !== "string" ||
    typeof fieldKey !== "string" ||
    !playerId ||
    !fieldKey ||
    (intent !== "plan" && intent !== "recorded")
  ) {
    return { status: "error", message: "That edit could not be read." };
  }

  let value: unknown = null;
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text !== "") {
    if (NUMERIC_FIELDS.has(fieldKey)) {
      const parsed = Number(text);
      if (!Number.isFinite(parsed) || parsed < 0) {
        return {
          status: "error",
          message: "Enter a whole number of zero or more, or leave it empty for unknown.",
        };
      }
      value = parsed;
    } else {
      value = text;
    }
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_player_field", {
    p_franchise_player_id: playerId,
    p_field_key: fieldKey,
    p_value: value,
    p_intent: intent,
    p_expected_revision: revision,
    p_request_id: randomUUID(),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return {
    status: "ok",
    message: intent === "recorded" ? "Recorded as already happened." : "Planned.",
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
    p_request_id: randomUUID(),
  });

  if (error) return { status: "error", message: describe(error) };
  revalidateFranchiseViews();
  return { status: "ok", message: "Custom player added." };
}
