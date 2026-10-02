"use client";

import { useActionState } from "react";
import { addCustomPlayer } from "../lib/actions/franchises";
import { IDLE } from "../lib/actions/state";
import { useIdempotentAction } from "./autosave/use-idempotent-action";

export function AddCustomPlayerForm({
  franchiseId,
  revision,
}: {
  franchiseId: string;
  revision: number;
}) {
  const idempotent = useIdempotentAction(addCustomPlayer);
  const [state, formAction, pending] = useActionState(idempotent, IDLE);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="franchiseId" value={franchiseId} />
      <input type="hidden" name="revision" value={revision} />
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-ink-muted">Custom player name</span>
        <input
          name="fullName"
          placeholder="Custom Rookie"
          className="min-h-11 w-56 rounded-md border border-line bg-background px-3 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
      >
        {pending ? "Adding…" : "Add player"}
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
