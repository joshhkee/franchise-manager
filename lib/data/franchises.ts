import { createServerSupabase } from "../supabase/server";

export interface FranchiseSummary {
  id: string;
  name: string;
  isDefault: boolean;
  archivedAt: string | null;
  revision: number;
  playerCount: number;
  pendingFieldCount: number;
  pinnedRevisionId: string | null;
}

export interface FranchisePlayer {
  id: string;
  franchiseId: string;
  origin: "source" | "custom";
  customKey: string | null;
  fullName: string;
  team: string | null;
  listedPosition: string | null;
  archetype: string | null;
  birthdate: string | null;
}

export interface PlayerField {
  franchisePlayerId: string;
  fieldKey: string;
  baselineValue: unknown;
  planValue: unknown;
  fieldClass: "game_edit_action" | "app_fact";
}

export type Loaded<T> = { ok: true; data: T } | { ok: false; message: string };

interface SummaryRow {
  id: string;
  name: string;
  is_default: boolean;
  archived_at: string | null;
  revision: number;
  player_count: number;
  pending_field_count: number;
  pinned_revision_id: string | null;
}

export async function listFranchises(): Promise<Loaded<FranchiseSummary[]>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("franchise_summaries")
    .select(
      "id,name,is_default,archived_at,revision,player_count,pending_field_count,pinned_revision_id",
    )
    .order("name", { ascending: true });

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    data: ((data ?? []) as SummaryRow[]).map((row) => ({
      id: row.id,
      name: row.name,
      isDefault: row.is_default,
      archivedAt: row.archived_at,
      revision: row.revision,
      playerCount: row.player_count,
      pendingFieldCount: row.pending_field_count,
      pinnedRevisionId: row.pinned_revision_id,
    })),
  };
}

export async function listFranchisePlayers(franchiseId: string): Promise<Loaded<FranchisePlayer[]>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("franchise_players_view")
    .select("id,franchise_id,origin,custom_key,full_name,team,listed_position,archetype,birthdate")
    .eq("franchise_id", franchiseId)
    .order("full_name", { ascending: true });

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      franchiseId: row.franchise_id as string,
      origin: row.origin as "source" | "custom",
      customKey: (row.custom_key as string | null) ?? null,
      fullName: row.full_name as string,
      team: (row.team as string | null) ?? null,
      listedPosition: (row.listed_position as string | null) ?? null,
      archetype: (row.archetype as string | null) ?? null,
      birthdate: (row.birthdate as string | null) ?? null,
    })),
  };
}

export async function listPlayerFields(franchiseId: string): Promise<Loaded<PlayerField[]>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("franchise_player_fields_view")
    .select("franchise_player_id,field_key,baseline_value,plan_value,field_class")
    .eq("franchise_id", franchiseId);

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      franchisePlayerId: row.franchise_player_id as string,
      fieldKey: row.field_key as string,
      baselineValue: row.baseline_value ?? null,
      planValue: row.plan_value ?? null,
      fieldClass: (row.field_class as "game_edit_action" | "app_fact") ?? "app_fact",
    })),
  };
}
