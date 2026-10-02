"use client";

import Link from "next/link";
import { useActionState } from "react";
import { selectFranchise } from "../lib/actions/franchises";
import { IDLE } from "../lib/actions/state";

export function FranchisePicker({
  summaries,
  currentId,
  archived,
}: {
  summaries: { id: string; name: string; archivedAt: string | null }[];
  currentId: string;
  archived: boolean;
}) {
  const [state, formAction, pending] = useActionState(selectFranchise, IDLE);

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <form action={formAction} className="flex min-w-0 items-center gap-2">
        <label className="sr-only" htmlFor="franchiseId">
          Active franchise
        </label>
        {/* key on the server-provided id so the picker follows the active franchise
            after a server action; an uncontrolled select would keep showing the
            previous choice until a full navigation. */}
        <select
          key={currentId}
          id="franchiseId"
          name="franchiseId"
          defaultValue={currentId}
          className="min-h-11 max-w-[12rem] truncate rounded-md border border-line bg-background px-2 text-xs font-medium"
        >
          {summaries.map((franchise) => (
            <option key={franchise.id} value={franchise.id}>
              {franchise.name}
              {franchise.archivedAt ? " (archived)" : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium disabled:opacity-60"
        >
          {pending ? "Switching…" : "Switch"}
        </button>
      </form>
      <Link
        href="/franchises"
        className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-3 text-xs font-medium"
      >
        Manage
      </Link>
      {archived ? (
        <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Archived
        </span>
      ) : null}
      {state.status === "error" ? (
        <span role="alert" className="text-xs text-ink-muted">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
