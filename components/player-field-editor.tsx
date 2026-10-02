"use client";

import { useActionState } from "react";
import { setPlayerField } from "../lib/actions/franchises";
import { IDLE } from "../lib/actions/state";
import type { PlayerField } from "../lib/data/franchises";

const EDITABLE_FIELDS: { key: string; label: string; numeric: boolean }[] = [
  { key: "listed_position", label: "Listed position", numeric: false },
  { key: "jersey_number", label: "Jersey number", numeric: true },
  { key: "team", label: "Team", numeric: false },
  { key: "archetype", label: "Archetype", numeric: false },
  { key: "overall", label: "Overall", numeric: true },
  { key: "notes", label: "Notes", numeric: false },
];

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Unknown";
  return String(value);
}

function inputValue(field: PlayerField | undefined): string {
  if (!field) return "";
  const value = field.planValue !== null && field.planValue !== undefined ? field.planValue : field.baselineValue;
  if (value === null || value === undefined) return "";
  return String(value);
}

function FieldRow({
  playerId,
  revision,
  label,
  fieldKey,
  numeric,
  existing,
}: {
  playerId: string;
  revision: number;
  label: string;
  fieldKey: string;
  numeric: boolean;
  existing: PlayerField | undefined;
}) {
  const [state, formAction, pending] = useActionState(setPlayerField, IDLE);
  const recorded = existing?.baselineValue ?? null;
  const planned = existing?.planValue ?? null;

  return (
    <form
      action={formAction}
      className="grid gap-2 rounded-md border border-line bg-background p-3 sm:grid-cols-[minmax(0,1fr)_9rem_11rem_auto] sm:items-end"
    >
      <input type="hidden" name="playerId" value={playerId} />
      <input type="hidden" name="fieldKey" value={fieldKey} />
      <input type="hidden" name="revision" value={revision} />
      <div className="min-w-0">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-ink-muted">
          Recorded: {display(recorded)}
          {planned === null || planned === undefined ? "" : ` · Planned: ${display(planned)}`}
        </p>
      </div>
      <label className="flex flex-col gap-1">
        <span className="sr-only">{label} value</span>
        <input
          name="value"
          defaultValue={inputValue(existing)}
          inputMode={numeric ? "numeric" : "text"}
          placeholder={numeric ? "0" : "Unknown"}
          className="min-h-11 rounded-md border border-line bg-surface px-3 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="sr-only">{label} intent</span>
        <select
          name="intent"
          defaultValue="plan"
          className="min-h-11 rounded-md border border-line bg-surface px-2 text-sm"
        >
          <option value="plan">Plan it</option>
          <option value="recorded">Already happened</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md border border-line bg-surface px-3 text-xs font-medium disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="text-xs text-ink-muted sm:col-span-4"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function PlayerFieldEditor({
  playerId,
  revision,
  fields,
}: {
  playerId: string;
  revision: number;
  fields: PlayerField[];
}) {
  return (
    <div className="mt-3 space-y-2">
      {EDITABLE_FIELDS.map((field) => (
        <FieldRow
          key={field.key}
          playerId={playerId}
          revision={revision}
          label={field.label}
          fieldKey={field.key}
          numeric={field.numeric}
          existing={fields.find((row) => row.fieldKey === field.key)}
        />
      ))}
    </div>
  );
}
