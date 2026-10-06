"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../supabase/server";
import { AUTOSAVE_MESSAGES, classifyOutcome, type AutosaveOutcome } from "./outcome";

/**
 * C3A formation commands (C0B-v2 §5/§6). One call writes one slot; the whole
 * formation override batch is what the checklist reviews and confirms atomically.
 * Every command carries expectedRevision + requestId so a lost-response retry
 * replays instead of double-applying.
 */

export interface FormationMutationResult {
  outcome: AutosaveOutcome;
  message: string;
  revision?: number;
}

function revalidateFormationViews(): void {
  for (const path of ["/lineups", "/checklist", "/", "/franchises", "/settings"]) revalidatePath(path);
}

/**
 * FormationDef.id is `${bookId}:${set}:${slug}` (stable app identity, shared with
 * Coach/Gameday later). The database stores book_id and formation_id columns
 * separately, so the app identity is split at the first colon before writing.
 */
function splitFormationId(fullId: string): { bookId: string; formationId: string } | null {
  const index = fullId.indexOf(":");
  if (index <= 0 || index === fullId.length - 1) return null;
  return { bookId: fullId.slice(0, index), formationId: fullId.slice(index + 1) };
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

/** Set (playerId) or clear (null) the pending override for one formation slot. */
export async function setFormationOverride(input: {
  franchiseId: string;
  /** Full FormationDef id (`bookId:set:slug`) or an explicit bookId + formationId pair. */
  bookId?: string;
  formationId: string;
  slotId: string;
  playerId: string | null;
  expectedRevision: number;
  requestId: string;
}): Promise<FormationMutationResult> {
  const split = splitFormationId(input.formationId);
  const bookId = input.bookId ?? split?.bookId ?? null;
  const formationId = input.bookId ? input.formationId : split?.formationId ?? null;
  if (!bookId || !formationId) {
    return { outcome: "failed", message: "The formation identity is malformed; nothing was written." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("set_formation_override", {
    p_franchise_id: input.franchiseId,
    p_book_id: bookId,
    p_formation_id: formationId,
    p_slot_id: input.slotId,
    p_player_id: input.playerId,
    p_expected_revision: input.expectedRevision,
    p_request_id: input.requestId,
  });

  if (error) {
    const outcome = classifyOutcome(error);
    const detail =
      outcome === "failed" ? `${AUTOSAVE_MESSAGES.failed} (${error.message})` : AUTOSAVE_MESSAGES[outcome];
    return { outcome, message: detail };
  }

  revalidateFormationViews();
  return {
    outcome: "saved",
    message:
      input.playerId === null
        ? "Override reset. The slot inherits from the depth chart again (pending until confirmed)."
        : "Override planned. It enters the checklist as a reviewed formation change.",
    revision: await currentRevision(input.franchiseId),
  };
}

/** Explicit reset scope: one slot (per C0B-v2 §6). A formation-wide reset is a reviewed batch of slot resets. */
export async function resetFormationSlot(input: {
  franchiseId: string;
  formationId: string;
  slotId: string;
  expectedRevision: number;
  requestId: string;
}): Promise<FormationMutationResult> {
  return setFormationOverride({ ...input, playerId: null });
}

/** Explicit reset scope: the whole formation's pending overrides in one request. */
export async function resetFormation(input: {
  franchiseId: string;
  formationId: string;
  slotIds: string[];
  expectedRevision: number;
  requestId: string;
}): Promise<FormationMutationResult & { reset?: string[] }> {
  let last: FormationMutationResult = { outcome: "failed", message: "No slots to reset." };
  const reset: string[] = [];
  for (const slotId of input.slotIds) {
    last = await setFormationOverride({
      franchiseId: input.franchiseId,
      formationId: input.formationId,
      slotId,
      playerId: null,
      expectedRevision: input.expectedRevision,
      requestId: input.requestId,
    });
    if (last.outcome !== "saved") return last;
    if (typeof last.revision === "number") input.expectedRevision = last.revision;
    reset.push(slotId);
  }
  return { ...last, message: `Reset ${reset.length} slot${reset.length === 1 ? "" : "s"} to inherited chart players.`, reset };
}

export async function toggleFormationFavorite(input: {
  franchiseId: string;
  bookId: string;
  formationId: string;
  favorite: boolean;
  requestId: string;
}): Promise<FormationMutationResult> {
  const supabase = await createServerSupabase();
  // Favorites are app preferences, not game actions: a plain upsert/delete with a
  // request id is enough; they never appear on the checklist.
  if (input.favorite) {
    const { error } = await supabase.from("formation_favorites").upsert(
      { franchise_id: input.franchiseId, book_id: input.bookId, formation_id: input.formationId },
      { onConflict: "franchise_id,book_id,formation_id" },
    );
    if (error) {
      const outcome = classifyOutcome(error);
      return { outcome, message: AUTOSAVE_MESSAGES[outcome] };
    }
  } else {
    const { error } = await supabase
      .from("formation_favorites")
      .delete()
      .eq("franchise_id", input.franchiseId)
      .eq("book_id", input.bookId)
      .eq("formation_id", input.formationId);
    if (error) {
      const outcome = classifyOutcome(error);
      return { outcome, message: AUTOSAVE_MESSAGES[outcome] };
    }
  }
  revalidateFormationViews();
  return {
    outcome: "saved",
    message: input.favorite ? "Added to favorites." : "Removed from favorites.",
  };
}
