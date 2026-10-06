import type { ChartPlayer } from "../depth-chart";
import { buildChecklist, type Checklist } from "../checklist";
import { createServerSupabase } from "../supabase/server";
import { loadDepthChart, type DepthChartEntryRow } from "./depth-chart";
import type { Loaded } from "./franchises";

export interface ChecklistHistoryRow {
  id: string;
  command: string;
  label: string;
  positions: string[];
  createdAt: string;
  undoneAt: string | null;
  undoable: boolean;
}

export interface ChecklistData {
  franchiseId: string;
  revision: number;
  players: ChartPlayer[];
  checklist: Checklist;
  history: ChecklistHistoryRow[];
  /** False when migration 0011 is not applied yet; history is absent, never faked. */
  historyAvailable: boolean;
  /** Owner-readable note when history could not be read for another reason. */
  historyMessage: string | null;
}

/**
 * Collapse stored chart entries into per-position baseline/plan id lists. A position with
 * no stored plan rows is not a pending difference: its plan falls back to the baseline,
 * exactly like the depth-chart editor, so the checklist only shows real differences.
 */
export function listsFromEntries(
  entries: readonly DepthChartEntryRow[],
): Record<string, { baseline: string[]; plan: string[] }> {
  const grouped = new Map<string, { baseline: { rank: number; id: string }[]; plan: { rank: number; id: string }[] }>();
  for (const entry of entries) {
    const current = grouped.get(entry.position) ?? { baseline: [], plan: [] };
    if (entry.layer === "baseline") current.baseline.push({ rank: entry.rank, id: entry.playerId });
    else current.plan.push({ rank: entry.rank, id: entry.playerId });
    grouped.set(entry.position, current);
  }

  const lists: Record<string, { baseline: string[]; plan: string[] }> = {};
  for (const [position, value] of grouped) {
    const baseline = [...value.baseline].sort((a, b) => a.rank - b.rank).map((row) => row.id);
    const planRows = [...value.plan].sort((a, b) => a.rank - b.rank).map((row) => row.id);
    lists[position] = { baseline, plan: planRows.length > 0 ? planRows : [...baseline] };
  }
  return lists;
}

/**
 * Read the checklist surface for one franchise: the derived pending action units plus the
 * retained confirmation history. The derivation is the same pure diff the depth-chart editor
 * uses, so the two surfaces can never disagree.
 */
export async function loadChecklist(
  franchiseId: string,
  revision: number,
): Promise<Loaded<ChecklistData>> {
  const chart = await loadDepthChart(franchiseId);
  if (!chart.ok) return chart;

  const lists = listsFromEntries(chart.data.entries);
  const checklist = buildChecklist({
    franchiseId,
    revision,
    players: chart.data.players,
    lists,
  });

  const supabase = await createServerSupabase();
  const historyResult = await supabase
    .from("action_batches_view")
    .select("id,command,summary,created_at,undone_at")
    .eq("franchise_id", franchiseId)
    .order("created_at", { ascending: false })
    .limit(50);

  let history: ChecklistHistoryRow[] = [];
  let historyAvailable = true;
  let historyMessage: string | null = null;

  if (historyResult.error) {
    historyAvailable = false;
    const detail = historyResult.error.message ?? "unknown error";
    historyMessage = /does not exist|not found|schema cache/i.test(detail)
      ? "Confirmation history is not ready for this project yet. Migration 0011_checklist.sql must be applied by the owner; nothing is invented in the meantime."
      : `Confirmation history could not be read: ${detail}`;
  } else {
    history = (historyResult.data ?? []).map((row) => {
      const summary = (row.summary ?? {}) as {
        label?: string;
        units?: string[];
        positions?: string[];
      };
      const undoneAt = (row.undone_at as string | null) ?? null;
      return {
        id: row.id as string,
        command: row.command as string,
        label: summary.label ?? "Recorded change",
        positions: summary.positions ?? summary.units ?? [],
        createdAt: row.created_at as string,
        undoneAt,
        undoable: (row.command as string) === "confirm_checklist_units" && undoneAt === null,
      };
    });
  }

  return {
    ok: true,
    data: {
      franchiseId,
      revision,
      players: chart.data.players,
      checklist,
      history,
      historyAvailable,
      historyMessage,
    },
  };
}
