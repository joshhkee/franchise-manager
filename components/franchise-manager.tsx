"use client";

import { useActionState, useState } from "react";
import {
  deleteFranchise,
  renameFranchise,
  selectFranchise,
  setFranchiseArchived,
} from "../lib/actions/franchises";
import { IDLE } from "../lib/actions/state";
import { useIdempotentAction } from "./autosave/use-idempotent-action";
import type { FranchiseSummary } from "../lib/data/franchises";

function RenameForm({ franchise }: { franchise: FranchiseSummary }) {
  const idempotent = useIdempotentAction(renameFranchise);
  const [state, formAction, pending] = useActionState(idempotent, IDLE);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="franchiseId" value={franchise.id} />
      <input type="hidden" name="revision" value={franchise.revision} />
      <label className="sr-only" htmlFor={`name-${franchise.id}`}>
        Rename {franchise.name}
      </label>
      <input
        id={`name-${franchise.id}`}
        name="name"
        defaultValue={franchise.name}
        className="min-h-11 w-52 rounded-md border border-line bg-background px-3 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : "Rename"}
      </button>
      {state.message ? (
        <span
          role={state.status === "error" ? "alert" : "status"}
          className="max-w-prose text-xs text-ink-muted"
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

function ArchiveForm({ franchise }: { franchise: FranchiseSummary }) {
  const idempotent = useIdempotentAction(setFranchiseArchived);
  const [state, formAction, pending] = useActionState(idempotent, IDLE);
  const archived = Boolean(franchise.archivedAt);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="franchiseId" value={franchise.id} />
      <input type="hidden" name="archived" value={archived ? "false" : "true"} />
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : archived ? "Resume" : "Archive"}
      </button>
      {state.message ? (
        <span role={state.status === "error" ? "alert" : "status"} className="text-xs text-ink-muted">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

/**
 * Permanent deletion for franchises created by accident (D124). It stays
 * collapsed behind an explicit control and requires repeating the exact name,
 * because archive is the reversible lifecycle action and deletion is not.
 */
function DeleteForm({ franchise }: { franchise: FranchiseSummary }) {
  const idempotent = useIdempotentAction(deleteFranchise);
  const [state, formAction, pending] = useActionState(idempotent, IDLE);
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const matches = confirmName.trim() === franchise.name;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium"
      >
        Delete…
      </button>
    );
  }

  return (
    <form action={formAction} className="w-full rounded-md border border-line bg-background p-3">
      <input type="hidden" name="franchiseId" value={franchise.id} />
      <p className="max-w-prose text-xs text-ink-muted">
        Permanently deletes {franchise.name}: its players, field edits, and depth-chart plans. This
        cannot be undone. Archive keeps a franchise readable instead; export a backup first if you
        might want it back.
      </p>
      <label className="mt-2 flex flex-col gap-1">
        <span className="text-xs">
          Type <span className="font-medium">{franchise.name}</span> to confirm
        </span>
        <input
          name="confirmName"
          value={confirmName}
          onChange={(event) => setConfirmName(event.target.value)}
          autoComplete="off"
          className="min-h-11 w-full max-w-xs rounded-md border border-line bg-surface px-3 text-sm"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || !matches}
          className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium"
        >
          Cancel
        </button>
        {state.message ? (
          <span
            role={state.status === "error" ? "alert" : "status"}
            className="max-w-prose text-xs text-ink-muted"
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function SelectForm({ franchise, active }: { franchise: FranchiseSummary; active: boolean }) {
  const [state, formAction, pending] = useActionState(selectFranchise, IDLE);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="franchiseId" value={franchise.id} />
      <button
        type="submit"
        disabled={pending || active}
        className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium disabled:opacity-60"
      >
        {active ? "Active" : pending ? "Switching…" : "Make active"}
      </button>
      {state.status === "error" ? (
        <span role="alert" className="text-xs text-ink-muted">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}

export function FranchiseManager({
  summaries,
  currentId,
}: {
  summaries: FranchiseSummary[];
  currentId: string | null;
}) {
  return (
    <ul className="space-y-3">
      {summaries.map((franchise) => (
        <li key={franchise.id} className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{franchise.name}</p>
            {franchise.isDefault ? (
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Default
              </span>
            ) : null}
            {franchise.archivedAt ? (
              <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Archived
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Revision {franchise.revision} · {franchise.playerCount} player
            {franchise.playerCount === 1 ? "" : "s"} · {franchise.pendingFieldCount} pending field edit
            {franchise.pendingFieldCount === 1 ? "" : "s"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SelectForm franchise={franchise} active={franchise.id === currentId} />
            <ArchiveForm franchise={franchise} />
            <RenameForm franchise={franchise} />
            {franchise.isDefault ? null : <DeleteForm franchise={franchise} />}
          </div>
        </li>
      ))}
    </ul>
  );
}
