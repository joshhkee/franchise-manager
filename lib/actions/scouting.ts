"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { PLAYBOOK_INVENTORY } from "../formations/playbooks";
import { createServerSupabase } from "../supabase/server";
import type { ScoutingSide } from "../scouting";
import type { ActionState } from "./state";

function result(error: { message?: string } | null): ActionState {
  if (!error) return { status: "ok", message: "Scouting preference saved." };
  const text = error.message ?? "unknown error";
  if (text.includes("stale_revision")) return { status: "error", message: "This franchise changed since loading. Reload and review before saving." };
  if (text.includes("cross_franchise_reference")) return { status: "error", message: "That player is not in this franchise. Nothing changed." };
  if (/does not exist|not found|schema cache/i.test(text)) return { status: "error", message: "C4B scouting storage is not applied. Ask the owner to review 0014_c4b_scouting.sql." };
  return { status: "error", message: `Nothing was saved. ${text}` };
}

function revalidate(): void {
  for (const path of ["/gm", "/coach", "/settings", "/"]) revalidatePath(path);
}

export async function saveScoutingPreferences(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const offensiveBookId = formData.get("offensiveBookId");
  const defensiveBookId = formData.get("defensiveBookId");
  if (typeof franchiseId !== "string" || !franchiseId || typeof offensiveBookId !== "string" || typeof defensiveBookId !== "string") {
    return { status: "error", message: "Choose an offensive and defensive playbook." };
  }
  const book = (id: string, side: ScoutingSide) => PLAYBOOK_INVENTORY.find((item) => item.id === id && item.side === side);
  if (!book(offensiveBookId, "offense") || !book(defensiveBookId, "defense")) return { status: "error", message: "The selected book does not match its side." };
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("save_scouting_preferences", {
    p_franchise_id: franchiseId,
    p_offensive_scheme: formData.get("offensiveScheme") || null,
    p_defensive_scheme: formData.get("defensiveScheme") || null,
    p_offensive_book_id: offensiveBookId,
    p_defensive_book_id: defensiveBookId,
    p_expected_revision: Number(formData.get("revision")),
    p_request_id: formData.get("requestId") || randomUUID(),
  });
  const state = result(error);
  if (!error) revalidate();
  return state;
}

export async function setShortlistStatus(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const kind = formData.get("kind");
  const identity = formData.get("identity");
  const playerId = formData.get("playerId");
  const sourceRecordId = formData.get("sourceRecordId");
  const status = formData.get("status");
  if (typeof franchiseId !== "string" || !franchiseId || !["trade_block", "trade_target"].includes(String(kind)) ||
      !["franchise", "source"].includes(String(identity)) || !["pinned", "dismissed"].includes(String(status))) {
    return { status: "error", message: "Shortlist information is incomplete." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_scouting_shortlist", {
    p_franchise_id: franchiseId, p_kind: kind,
    p_player_id: identity === "franchise" && typeof playerId === "string" && playerId ? playerId : null,
    p_source_player_record_id: identity === "source" && typeof sourceRecordId === "string" && sourceRecordId ? sourceRecordId : null,
    p_status: status, p_note: formData.get("note") || null,
    p_expected_revision: Number(formData.get("revision")), p_request_id: formData.get("requestId") || randomUUID(),
  });
  const state = result(error);
  if (!error) revalidate();
  return state;
}
