import { createServerSupabase } from "../supabase/server";
import type { ChartPlayer, RosterStatus } from "../depth-chart";
import { formationsOf, isLoadedBook, playbookById } from "../formations/catalog";
import { overrideKey, resolveFormation, type OverrideMap } from "../formations/resolver";
import type { Loaded } from "./franchises";

export interface FormationFavoriteRow {
  bookId: string;
  formationId: string;
}

export interface FormationState {
  players: ChartPlayer[];
  /** Ordered baseline/plan lists per position, for inheritance. */
  chartLists: Record<string, { baseline: string[]; plan: string[] }>;
  overrides: OverrideMap;
  favorites: FormationFavoriteRow[];
  /** False when migration 0012 is not applied (overrides/favorites RPCs or views absent). */
  overridesAvailable: boolean;
  /** Recorded/published jersey numbers by player id; null = unknown, never invented. */
  jerseyNumbers: Map<string, string | null>;
}

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

function numberOrNull(value: unknown): number | null {
  const raw = text(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Load everything the formation resolver needs for one franchise. Migration 0012
 * not applied yet is an honest, named state — the UI renders the catalog read-only
 * rather than failing the page.
 */
export async function loadFormationState(
  franchiseId: string,
): Promise<Loaded<FormationState>> {
  const supabase = await createServerSupabase();

  const [playersResult, fieldsResult, chartResult, overridesResult, favoritesResult] = await Promise.all([
    supabase
      .from("franchise_players_view")
      .select("id,full_name,roster_status,listed_position,source_overall")
      .eq("franchise_id", franchiseId)
      .order("full_name", { ascending: true }),
    supabase
      .from("franchise_player_fields_view")
      .select("franchise_player_id,field_key,baseline_value")
      .eq("franchise_id", franchiseId)
      .in("field_key", ["listed_position", "overall", "jersey_number"]),
    supabase
      .from("depth_chart_view")
      .select("position,layer,depth_rank,franchise_player_id")
      .eq("franchise_id", franchiseId)
      .order("position", { ascending: true })
      .order("depth_rank", { ascending: true }),
    supabase
      .from("formation_overrides_view")
      .select("book_id,formation_id,slot_id,layer,player_id")
      .eq("franchise_id", franchiseId),
    supabase
      .from("formation_favorites_view")
      .select("book_id,formation_id")
      .eq("franchise_id", franchiseId),
  ]);

  const overrideMissing = /does not exist|not found|schema cache/i.test(
    overridesResult.error?.message ?? "",
  );
  const overridesAvailable = !overrideMissing;
  const fatal = playersResult.error ?? fieldsResult.error ?? chartResult.error;
  if (fatal) return { ok: false, message: fatal.message ?? "unknown error" };
  if (!overrideMissing && overridesResult.error) {
    return { ok: false, message: overridesResult.error.message ?? "unknown error" };
  }
  const favoritesError = favoritesResult.error;
  if (!overrideMissing && favoritesError && !/does not exist|not found|schema cache/i.test(favoritesError.message ?? "")) {
    return { ok: false, message: favoritesError.message ?? "unknown error" };
  }

  const recordedByPlayer = new Map<string, { listed: string | null; overall: number | null; jersey: string | null }>();
  for (const row of fieldsResult.data ?? []) {
    const playerId = row.franchise_player_id as string;
    const entry = recordedByPlayer.get(playerId) ?? { listed: null, overall: null, jersey: null };
    if (row.field_key === "listed_position") entry.listed = text(row.baseline_value);
    if (row.field_key === "overall") entry.overall = numberOrNull(row.baseline_value);
    if (row.field_key === "jersey_number") entry.jersey = text(row.baseline_value);
    recordedByPlayer.set(playerId, entry);
  }

  const players: ChartPlayer[] = (playersResult.data ?? []).map((row) => {
    const id = row.id as string;
    const recorded = recordedByPlayer.get(id);
    return {
      id,
      fullName: row.full_name as string,
      rosterStatus: ((row.roster_status as RosterStatus | null) ?? "active") as RosterStatus,
      primaryPosition: recorded?.listed ?? text(row.listed_position),
      overall: recorded?.overall ?? numberOrNull(row.source_overall),
    };
  });

  const chartLists: Record<string, { baseline: string[]; plan: string[] }> = {};
  for (const row of (chartResult.data ?? []) as {
    position: string;
    layer: "baseline" | "plan";
    franchise_player_id: string;
  }[]) {
    const list = chartLists[row.position] ?? { baseline: [], plan: [] };
    list[row.layer].push(row.franchise_player_id);
    chartLists[row.position] = list;
  }

  const overrides = new Map<string, string>();
  for (const row of (overridesResult.data ?? []) as {
    book_id: string;
    formation_id: string;
    slot_id: string;
    layer: "baseline" | "plan";
    player_id: string;
  }[]) {
    overrides.set(
      overrideKey(`${row.book_id}:${row.formation_id}`, row.slot_id, row.layer),
      row.player_id,
    );
  }

  const favorites = ((favoritesResult.data ?? []) as { book_id: string; formation_id: string }[]).map(
    (row) => ({ bookId: row.book_id, formationId: row.formation_id }),
  );

  const jerseyNumbers = new Map<string, string | null>();
  for (const player of players) {
    jerseyNumbers.set(player.id, recordedByPlayer.get(player.id)?.jersey ?? null);
  }

  return { ok: true, data: { players, chartLists, overrides, favorites, jerseyNumbers, overridesAvailable } };
}

/**
 * Resolve one formation against the loaded state. The stored override key uses
 * (book, formation) exactly like the resolver — formation identity is never a
 * name alone (C0B-v2 §6).
 */
export type ResolvedFormationResult = ReturnType<typeof resolveFormation>;
export function resolveFromState(
  state: FormationState,
  bookId: string,
  formationId: string,
): Loaded<ReturnType<typeof resolveFormation>> {
  const formation = formationsOf(bookId).find((entry) => entry.id === formationId) ?? null;
  if (!formation) return { ok: false, message: "That formation is not in the loaded catalog." };
  const playersById = new Map(state.players.map((player) => [player.id, player]));
  return {
    ok: true,
    data: resolveFormation({
      formation,
      playersById,
      chartLists: state.chartLists,
      overrides: state.overrides,
    }),
  };
}

export function bookIsLoaded(bookId: string): boolean {
  return isLoadedBook(bookId);
}

export function bookLabel(bookId: string): string {
  const book = playbookById(bookId);
  return book ? `${book.teamLabel} ${book.label} (${book.side})` : bookId;
}
