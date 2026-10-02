"use client";

import { useActionState } from "react";
import { restoreBackup } from "../lib/actions/backup";
import { IDLE } from "../lib/actions/state";
import { useIdempotentAction } from "./autosave/use-idempotent-action";

export function BackupPanel({
  franchiseId,
  franchiseName,
}: {
  franchiseId: string | null;
  franchiseName: string | null;
}) {
  const idempotent = useIdempotentAction(restoreBackup);
  const [state, formAction, pending] = useActionState(idempotent, IDLE);

  return (
    <div className="mt-3 space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Export</h3>
        {franchiseId ? (
          <>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              Download every stored record for {franchiseName}: players, grouped field values with
              recorded-versus-planned intent, and custom-player ids. Credentials and session data are never
              included.
            </p>
            <a
              href={`/api/backup/export?franchiseId=${encodeURIComponent(franchiseId)}`}
              className="mt-2 inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
            >
              Download backup
            </a>
          </>
        ) : (
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Create a franchise first; exports are per franchise.
          </p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Restore</h3>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Restoring always creates a <strong>new</strong> franchise: ids are remapped, the export&apos;s
          owner identity grants nothing, and a file that fails validation changes nothing.
        </p>
        <form action={formAction} className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="sr-only">Backup file</span>
            <input
              type="file"
              name="file"
              accept="application/json,.json"
              className="min-h-11 rounded-md border border-line bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
          >
            {pending ? "Validating…" : "Restore as new franchise"}
          </button>
          {state.message ? (
            <p
              role={state.status === "error" ? "alert" : "status"}
              className="w-full max-w-prose text-xs text-ink-muted"
            >
              {state.message}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
