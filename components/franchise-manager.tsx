"use client";

import { useActionState } from "react";
import { renameFranchise, selectFranchise, setFranchiseArchived } from "../lib/actions/franchises";
import { IDLE } from "../lib/actions/state";
import type { FranchiseSummary } from "../lib/data/franchises";

function RenameForm({ franchise }: { franchise: FranchiseSummary }) {
  const [state, formAction, pending] = useActionState(renameFranchise, IDLE);

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
  const [state, formAction, pending] = useActionState(setFranchiseArchived, IDLE);
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
          </div>
        </li>
      ))}
    </ul>
  );
}
