"use client";

import { useActionState } from "react";
import { createFranchise } from "../lib/actions/franchises";
import { IDLE } from "../lib/actions/state";
import { useIdempotentAction } from "./autosave/use-idempotent-action";

export function CreateFranchiseForm({ defaultName = "Atlanta Falcons" }: { defaultName?: string }) {
  const idempotent = useIdempotentAction(createFranchise);
  const [state, formAction, pending] = useActionState(idempotent, IDLE);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-medium text-ink-muted">Franchise name</span>
        <input
          name="name"
          defaultValue={defaultName}
          className="min-h-11 w-56 rounded-md border border-line bg-background px-3 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create franchise"}
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
  );
}
