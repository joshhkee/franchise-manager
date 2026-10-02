"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { parseEnvelope, type ValidationReason } from "../backup";
import { restoreNewFranchise } from "../backup-service";
import { createServerSupabase } from "../supabase/server";
import type { ActionState } from "./state";

const REASON_MESSAGES: Record<ValidationReason, string> = {
  invalid_json: "That file is not valid JSON.",
  envelope_version_unsupported:
    "That backup was written by a newer app version than this one understands, so it was not restored.",
  backup_too_large: "That backup is larger than the supported size.",
  schema_invalid: "That backup is missing required fields or has the wrong shape.",
  duplicate_mutable_id: "That backup contains duplicate record ids.",
  dangling_player_reference: "That backup references a player record that is not in the file.",
  secret_like_content:
    "That file looks like it contains credentials. Exports never hold secrets, so it was refused.",
};

export async function restoreBackup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a backup file first." };
  }

  const parsed = parseEnvelope(await file.text());
  if (!parsed.ok) {
    return {
      status: "error",
      message: `${parsed.reasons.map((reason) => REASON_MESSAGES[reason]).join(" ")} Nothing was restored.`,
    };
  }

  const envelope = parsed.envelope;
  const required = [
    ...new Set(
      [
        envelope.franchise.pinnedRevisionKey,
        ...envelope.franchise.players.map((player) => player.sourceReference?.revisionKey ?? null),
      ].filter((key): key is string => typeof key === "string" && key.length > 0),
    ),
  ];

  if (required.length > 0) {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("source_revision_summaries")
      .select("revision_key");
    if (error) {
      return { status: "error", message: `Could not check source revisions: ${error.message}` };
    }
    const available = new Set((data ?? []).map((row) => row.revision_key as string));
    const missing = required.filter((key) => !available.has(key));
    if (missing.length > 0) {
      return {
        status: "error",
        message: `That backup needs source revision ${missing.join(", ")}, which is not in this catalog. Nothing was restored; import the revision or pin an available one.`,
      };
    }
  }

  const providedRequestId = formData.get("requestId");
  const requestId =
    typeof providedRequestId === "string" && providedRequestId ? providedRequestId : randomUUID();
  const restored = await restoreNewFranchise(envelope.franchise, requestId);
  if (!restored.ok) return { status: "error", message: restored.message };

  for (const path of ["/", "/franchises", "/gm", "/settings"]) revalidatePath(path);
  return {
    status: "ok",
    message: "Restored into a new franchise with remapped ids. Open Franchises to make it active.",
  };
}
