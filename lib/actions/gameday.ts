"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { catalogFor } from "../gameday/catalog";
import { DRIVE_THEME_BY_ID } from "../gameday/themes";
import { formationsOf } from "../formations/catalog";
import { createServerSupabase } from "../supabase/server";
import type { ActionState } from "./state";

export async function saveGamedayPlan(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const franchiseId = formData.get("franchiseId");
  const themeId = formData.get("themeId");
  const customName = formData.get("customName");
  const customNotes = formData.get("customNotes");
  const rawPins = formData.get("pins");
  const revision = Number(formData.get("revision"));
  if (typeof franchiseId !== "string" || !franchiseId || typeof themeId !== "string" ||
      (customName !== null && typeof customName !== "string") || (customNotes !== null && typeof customNotes !== "string") ||
      typeof rawPins !== "string" || !Number.isInteger(revision) || revision < 0) {
    return { status: "error", message: "Gameday plan details are incomplete." };
  }
  const theme = DRIVE_THEME_BY_ID.get(themeId as never);
  if (!theme) return { status: "error", message: "That drive theme is not in the curated catalog." };
  let pins: unknown;
  try { pins = JSON.parse(rawPins); } catch { return { status: "error", message: "Pinned calls could not be read." }; }
  if (!Array.isArray(pins) || pins.length > 100) return { status: "error", message: "Choose up to 100 saved favorites." };
  const plays = catalogFor(theme.defaultBookId, theme.side);
  const formations = formationsOf(theme.defaultBookId);
  const normalized: { kind: "play" | "formation"; id: string }[] = [];
  for (const item of pins) {
    if (!item || typeof item !== "object" || !("kind" in item) || !("id" in item)) return { status: "error", message: "A saved favorite is invalid." };
    const kind = (item as { kind: unknown }).kind;
    const id = (item as { id: unknown }).id;
    if (kind !== "play" && kind !== "formation" || typeof id !== "string" || !id.trim()) return { status: "error", message: "A saved favorite is invalid." };
    const allowed = kind === "play" ? plays.some((play) => play.id === id && play.themes.includes(theme.id)) : formations.some((formation) => formation.id === id && formation.status === "mapped");
    if (!allowed || normalized.some((entry) => entry.kind === kind && entry.id === id)) return { status: "error", message: "A favorite is outside this theme's loaded book or is duplicated." };
    normalized.push({ kind, id });
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("save_gameday_plan", {
    p_franchise_id: franchiseId,
    p_theme_id: theme.id,
    p_custom_name: typeof customName === "string" ? customName.trim() || null : null,
    p_custom_notes: typeof customNotes === "string" ? customNotes.trim() || null : null,
    p_pins: normalized,
    p_expected_revision: revision,
    p_request_id: formData.get("requestId") || randomUUID(),
  });
  if (error) {
    const text = error.message ?? "unknown error";
    if (text.includes("stale_revision")) return { status: "error", message: "This franchise changed while the plan was open. Reload, review, and save again." };
    if (text.includes("cross_franchise_reference")) return { status: "error", message: "That franchise is not available to this account." };
    if (/does not exist|not found|schema cache/i.test(text)) return { status: "error", message: "Gameday plan storage is not applied. Review 0015_c5b_gameday.sql; nothing was saved." };
    return { status: "error", message: `Nothing was saved. ${text}` };
  }
  revalidatePath("/gameday");
  return { status: "ok", message: "Gameday plan saved." };
}
