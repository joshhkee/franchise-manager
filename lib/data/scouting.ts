import { createServerSupabase } from "../supabase/server";
import { PLAYBOOK_INVENTORY } from "../formations/playbooks";
import { EMPTY_PREFERENCES, type ScoutingData, type ScoutPlayer, type ShortlistEntry } from "../scouting";
import type { Loaded } from "./franchises";

const missing = (error: { message?: string } | null) => /does not exist|not found|schema cache/i.test(error?.message ?? "");

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadScouting(franchiseId: string): Promise<Loaded<ScoutingData>> {
  const supabase = await createServerSupabase();
  const [preferencesResult, shortlistResult, franchisePlayersResult, fieldsResult, sourceResult] = await Promise.all([
    supabase.from("franchise_scouting_preferences_view").select("offensive_scheme,defensive_scheme,offensive_book_id,defensive_book_id").eq("franchise_id", franchiseId).maybeSingle(),
    supabase.from("franchise_scouting_shortlist_view").select("kind,player_id,source_player_record_id,status,note").eq("franchise_id", franchiseId),
    supabase.from("franchise_players_view").select("id,full_name,team,listed_position,archetype,roster_status,source_overall,source_player_record_id,source_id,source_revision_key").eq("franchise_id", franchiseId).order("full_name"),
    supabase.from("franchise_player_fields_view").select("franchise_player_id,field_key,baseline_value").eq("franchise_id", franchiseId),
    supabase.from("source_revision_summaries").select("id").order("captured_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const fatal = franchisePlayersResult.error ?? fieldsResult.error ?? (preferencesResult.error && !missing(preferencesResult.error) ? preferencesResult.error : null) ?? (shortlistResult.error && !missing(shortlistResult.error) ? shortlistResult.error : null) ?? sourceResult.error;
  if (fatal) return { ok: false, message: fatal.message ?? "Scouting data could not be read." };
  const pref = preferencesResult.data as { offensive_scheme: string | null; defensive_scheme: string | null; offensive_book_id: string; defensive_book_id: string } | null;
  const fields = new Map<string, Record<string, unknown>>();
  for (const row of fieldsResult.data ?? []) {
    const playerId = row.franchise_player_id as string;
    const ratings = fields.get(playerId) ?? {};
    ratings[row.field_key as string] = row.baseline_value;
    fields.set(playerId, ratings);
  }
  const sourceIdentityRows = (franchisePlayersResult.data ?? []) as unknown as {
    id: string;
    source_player_record_id: string | null;
    source_id: string | null;
    source_revision_key: string | null;
  }[];
  const sourceRows = sourceIdentityRows;
  const sourceBacked = new Map(sourceRows.filter((row) => row.source_player_record_id).map((row) => [row.id, row.source_player_record_id as string]));
  const sourceBackedByRecord = new Map([...sourceBacked].map(([playerId, sourceId]) => [sourceId, playerId]));
  const roster: ScoutPlayer[] = ((franchisePlayersResult.data ?? []) as { id: string; full_name: string; team: string | null; listed_position: string | null; archetype: string | null; roster_status: string | null; source_overall: unknown; source_player_record_id: string | null }[]).map((row) => {
    const values = fields.get(row.id) ?? {};
    return {
      id: row.id, identity: "franchise", fullName: row.full_name, team: row.team,
      listedPosition: row.listed_position, archetype: row.archetype, age: null,
      overall: numberOrNull(values.overall ?? row.source_overall), ratings: {}, measurements: {}, rosterStatus: row.roster_status ?? "active",
      ...(row.source_player_record_id ? { sourceRecordId: row.source_player_record_id } : {}),
    };
  });
  let targets: ScoutPlayer[] = [];
  const sourceRevision = sourceResult.data as { id: string } | null;
  if (sourceRevision) {
    const { data, error } = await supabase.from("source_player_records_view").select("id,full_name,team,listed_position,archetype,birthdate,ratings,measurements,source_id,revision_key").eq("revision_id", sourceRevision.id).order("full_name").limit(5000);
    if (error && !missing(error)) return { ok: false, message: error.message ?? "Target catalog could not be read." };
    const attached = new Set(sourceRows.map((row) => row.source_player_record_id).filter((id): id is string => Boolean(id)));
    targets = ((data ?? []) as { id: string; full_name: string; team: string | null; listed_position: string | null; archetype: string | null; birthdate: string | null; ratings: Record<string, unknown>; measurements: Record<string, unknown> }[]).filter((row) => !attached.has(row.id)).map((row) => ({
      id: row.id, identity: "source", fullName: row.full_name, team: row.team, listedPosition: row.listed_position,
      archetype: row.archetype, age: numberOrNull(row.measurements?.age), overall: numberOrNull(row.ratings?.overallRating), ratings: row.ratings ?? {}, measurements: row.measurements ?? {}, sourceRecordId: row.id,
    }));
  }
  const sourceById = new Map(targets.map((player) => [player.id, player]));
  if (sourceBacked.size) {
    const { data, error } = await supabase.from("source_player_records_view").select("id,full_name,team,listed_position,archetype,birthdate,ratings,measurements,source_id,revision_key").in("id", [...sourceBacked.values()]);
    if (error && !missing(error)) return { ok: false, message: error.message ?? "Attached source facts could not be read." };
    for (const row of (data ?? []) as { id: string; full_name: string; team: string | null; listed_position: string | null; archetype: string | null; ratings: Record<string, unknown>; measurements: Record<string, unknown>; source_id: string; revision_key: string }[]) {
      const playerId = sourceBackedByRecord.get(row.id);
      if (playerId) sourceById.set(playerId, { id: playerId, identity: "franchise", fullName: row.full_name, team: row.team, listedPosition: row.listed_position, archetype: row.archetype, age: numberOrNull(row.measurements?.age), overall: numberOrNull(fields.get(playerId)?.overall ?? row.ratings?.overallRating), ratings: row.ratings ?? {}, measurements: row.measurements ?? {}, rosterStatus: "active", sourceRecordId: row.id });
    }
  }
  const enrichedRoster = roster.map((player) => sourceById.get(player.id) ?? player);
  const shortlist = ((shortlistResult.data ?? []) as { kind: ShortlistEntry["kind"]; player_id: string | null; source_player_record_id: string | null; status: ShortlistEntry["status"]; note: string | null }[]).map((row) => ({
    kind: row.kind, identity: row.player_id ? "franchise" as const : "source" as const,
    playerId: row.player_id, sourceRecordId: row.source_player_record_id, status: row.status, note: row.note,
  }));
  const inventory = new Map(PLAYBOOK_INVENTORY.map((book) => [book.id, book]));
  const requestedOffense = pref?.offensive_book_id ?? EMPTY_PREFERENCES.offensiveBookId;
  const requestedDefense = pref?.defensive_book_id ?? EMPTY_PREFERENCES.defensiveBookId;
  return { ok: true, data: {
    preferences: {
      offensiveScheme: pref?.offensive_scheme ?? null, defensiveScheme: pref?.defensive_scheme ?? null,
      offensiveBookId: inventory.get(requestedOffense)?.side === "offense" ? requestedOffense : EMPTY_PREFERENCES.offensiveBookId,
      defensiveBookId: inventory.get(requestedDefense)?.side === "defense" ? requestedDefense : EMPTY_PREFERENCES.defensiveBookId,
    },
    roster: enrichedRoster, targets, shortlist,
  } };
}
