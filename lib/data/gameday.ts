import { playbookById } from "../formations/catalog";
import { formationsOf } from "../formations/catalog";
import { DRIVE_THEME_TEMPLATES } from "../gameday/themes";
import { loadFormationState, resolveFromState, type FormationState } from "./formations";
import { createServerSupabase } from "../supabase/server";
import type { Loaded } from "./franchises";
import type { BackupGamedayState } from "../backup";

export interface GamedayData {
  plans: BackupGamedayState["plans"];
  formationState: FormationState;
  bookIdBySide: { offense: string; defense: string };
}

export async function loadGameday(franchiseId: string): Promise<Loaded<GamedayData>> {
  const supabase = await createServerSupabase();
  const [preferences, planRows, pinRows, formationState] = await Promise.all([
    supabase.from("franchise_scouting_preferences_view").select("offensive_book_id,defensive_book_id").eq("franchise_id", franchiseId).maybeSingle(),
    supabase.from("franchise_gameday_plans_view").select("theme_id,custom_name,custom_notes").eq("franchise_id", franchiseId),
    supabase.from("franchise_gameday_pins_view").select("theme_id,target_kind,target_id,pin_rank").eq("franchise_id", franchiseId).order("pin_rank", { ascending: true }),
    loadFormationState(franchiseId),
  ]);
  if (!formationState.ok) return formationState;
  const missing = /does not exist|not found|schema cache/i.test(planRows.error?.message ?? "");
  if (preferences.error && !/does not exist|not found|schema cache/i.test(preferences.error.message ?? "")) return { ok: false, message: preferences.error.message };
  if (!missing && (planRows.error || pinRows.error)) return { ok: false, message: planRows.error?.message ?? pinRows.error?.message ?? "Gameday data could not be read." };
  const plans = new Map<string, BackupGamedayState["plans"][number]>();
  for (const row of planRows.data ?? []) plans.set(row.theme_id as string, { themeId: row.theme_id as string, customName: row.custom_name as string | null, customNotes: row.custom_notes as string | null, pinnedPlayIds: [], pinnedFormationIds: [] });
  for (const row of pinRows.data ?? []) {
    const themeId = row.theme_id as string;
    const plan = plans.get(themeId) ?? { themeId, customName: null, customNotes: null, pinnedPlayIds: [], pinnedFormationIds: [] };
    (row.target_kind === "play" ? plan.pinnedPlayIds : plan.pinnedFormationIds).push(row.target_id as string);
    plans.set(themeId, plan);
  }
  const pref = preferences.data as { offensive_book_id?: string; defensive_book_id?: string } | null;
  const bookIdBySide = {
    offense: playbookById(pref?.offensive_book_id ?? "")?.side === "offense" ? pref!.offensive_book_id! : "nfl-off-falcons",
    defense: playbookById(pref?.defensive_book_id ?? "")?.side === "defense" ? pref!.defensive_book_id! : "nfl-def-falcons",
  };
  return { ok: true, data: { plans: [...plans.values()], formationState: formationState.data, bookIdBySide } };
}

export function resolveGamedayFormation(state: FormationState, formationId: string) {
  for (const theme of DRIVE_THEME_TEMPLATES) {
    const formation = formationsOf(theme.defaultBookId).find((item) => item.id === formationId);
    if (formation) return resolveFromState(state, theme.defaultBookId, formationId);
  }
  return { ok: false as const, message: "That formation is not in a loaded book." };
}
