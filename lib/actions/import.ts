"use server";

import { revalidatePath } from "next/cache";
import {
  LAUNCH_ITERATION,
  SOURCE_NAME,
  buildMissingFieldReport,
  classifyIncoming,
  coverageStatusFor,
  fetchLaunchPlayers,
  normalizeSourcePlayer,
  toBatches,
  type PlannedRecord,
} from "../source-import";
import type { ExistingSourceRecord } from "../identity";
import { createPrivilegedSupabase, createServerSupabase } from "../supabase/server";
import type { ActionState } from "./state";

const PAGE_SIZE = 1000;

/**
 * Existing records of this source, so CB-1 can classify a re-import across
 * revisions instead of blindly appending. Read through the owner session, so
 * row level security applies and nothing is read with a widened key.
 */
async function loadExistingRecords(): Promise<ExistingSourceRecord[]> {
  const supabase = await createServerSupabase();
  const existing: ExistingSourceRecord[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("source_player_records_view")
      .select("id,source_id,full_name,birthdate,team,listed_position")
      .eq("source", SOURCE_NAME)
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);
    const rows = data ?? [];
    for (const row of rows) {
      existing.push({
        id: row.id as string,
        sourceId: row.source_id as string,
        fullName: row.full_name as string,
        birthdate: (row.birthdate as string | null) ?? null,
        team: (row.team as string | null) ?? null,
        listedPosition: (row.listed_position as string | null) ?? null,
      });
    }
    if (rows.length < PAGE_SIZE) break;
  }

  return existing;
}

/**
 * Import the published Launch ratings into the immutable catalog as one
 * labelled revision. Read-only until the source is fully in hand: a truncated
 * fetch fails and records nothing, and the write commands are service-role only.
 */
export async function importLaunchRatings(
  _prev: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const session = await createServerSupabase();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) {
    return { status: "error", message: "Sign in first; the import runs as the allowlisted owner." };
  }

  let fetched;
  try {
    fetched = await fetchLaunchPlayers();
  } catch (error) {
    return {
      status: "error",
      message: `The source could not be read, so nothing was imported: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }

  // Normalizing and planning are pure functions of the fetched payload; an
  // unexpected published shape must surface as a truthful failed import (and
  // record nothing), not as an unhandled 500 from the server action.
  let normalized: ReturnType<typeof normalizeSourcePlayer>[];
  let coverage: ReturnType<typeof coverageStatusFor>;
  let planned: PlannedRecord[];
  let conflicts: number;
  try {
    normalized = fetched.players.map(normalizeSourcePlayer);
    coverage = coverageStatusFor(normalized, fetched.reportedTotal);

    let existing: ExistingSourceRecord[];
    try {
      existing = await loadExistingRecords();
    } catch (error) {
      return {
        status: "error",
        message: `The existing catalog could not be read, so nothing was imported: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      };
    }

    planned = normalized.map((record) => {
      const classification = classifyIncoming(record, existing);
      return {
        ...record,
        reconciliationOutcome: classification.outcome,
        reconciliationReason: classification.reason,
      };
    });
    conflicts = planned.filter((record) => record.reconciliationOutcome === "conflict").length;
  } catch (error) {
    return {
      status: "error",
      message: `The published payload could not be read as expected, so nothing was imported: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    };
  }

  const privileged = createPrivilegedSupabase();

  const { data: revisionRow, error: beginError } = await privileged.rpc("begin_source_revision", {
    p_source: SOURCE_NAME,
    p_revision_key: LAUNCH_ITERATION,
    p_coverage_status: coverage,
    p_missing_field_report: buildMissingFieldReport(normalized),
    p_provenance: {
      fetchedFrom: "https://www.ea.com/games/madden-nfl/ratings",
      buildId: fetched.buildId,
      reportedTotal: fetched.reportedTotal,
      iteration: LAUNCH_ITERATION,
    },
    p_access_basis: "public Madden ratings page",
  });

  if (beginError) {
    return { status: "error", message: `The revision could not be recorded: ${beginError.message}` };
  }

  const revisionId = (revisionRow as { id: string } | null)?.id;
  if (!revisionId) {
    return { status: "error", message: "The revision could not be recorded: no revision id returned." };
  }

  let inserted = 0;
  let skipped = 0;
  for (const batch of toBatches(planned)) {
    const { data, error } = await privileged.rpc("append_source_records", {
      p_revision_id: revisionId,
      p_records: batch,
    });
    if (error) {
      return {
        status: "error",
        message: `Import stopped after ${inserted} records: ${error.message} Re-running continues where it left off.`,
      };
    }
    const summary = data as { inserted: number; skipped: number } | null;
    inserted += summary?.inserted ?? 0;
    skipped += summary?.skipped ?? 0;
  }

  revalidatePath("/settings");
  return {
    status: "ok",
    message:
      `Imported ${planned.length} records as ${coverage} — ${inserted} new, ${skipped} already present` +
      (conflicts > 0 ? `, ${conflicts} need conflict review` : "") +
      ".",
  };
}
