"use client";

import { useActionState } from "react";
import { importLaunchRatings } from "../lib/actions/import";
import { IDLE } from "../lib/actions/state";

export function ImportSourcePanel({ hasRevision }: { hasRevision: boolean }) {
  const [state, formAction, pending] = useActionState(importLaunchRatings, IDLE);

  return (
    <form action={formAction} className="mt-3">
      <p className="max-w-prose text-sm text-ink-muted">
        Reads the published Madden ratings into one immutable revision, with a missing-field report.
        The fetch must finish before anything is recorded, so a dropped connection imports nothing; and
        re-running skips records that are already present instead of duplicating them.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-3 min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Reading the source…" : hasRevision ? "Re-check the source" : "Import launch ratings"}
      </button>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="mt-2 max-w-prose text-xs text-ink-muted"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
