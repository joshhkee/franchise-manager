import { createServerSupabase } from "../supabase/server";
import type { Loaded } from "./franchises";

export interface SourceRevisionSummary {
  id: string;
  source: string;
  revisionKey: string;
  capturedAt: string | null;
  coverageStatus: "complete_as_imported" | "partial" | "unsupported";
  recordCount: number;
}

export async function listSourceRevisions(): Promise<Loaded<SourceRevisionSummary[]>> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("source_revision_summaries")
    .select("id,source,revision_key,captured_at,coverage_status,record_count")
    .order("captured_at", { ascending: false });

  if (error) return { ok: false, message: error.message };

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: row.id as string,
      source: row.source as string,
      revisionKey: row.revision_key as string,
      capturedAt: (row.captured_at as string | null) ?? null,
      coverageStatus: row.coverage_status as SourceRevisionSummary["coverageStatus"],
      recordCount: (row.record_count as number) ?? 0,
    })),
  };
}
