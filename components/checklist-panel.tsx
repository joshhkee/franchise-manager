"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  cancelChecklistUnits,
  confirmChecklistUnits,
  undoActionBatch,
  type ChecklistMutationResult,
} from "../lib/actions/checklist";
import {
  buildConfirmation,
  describeConfirmation,
  formatBatchTimestamp,
  summarizeChecklist,
  type ChecklistUnit,
} from "../lib/checklist";
import type { FormationChecklistUnit } from "../lib/checklist-formation";
import type { ChartPlayer } from "../lib/depth-chart";
import type { ChecklistData } from "../lib/data/checklist";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type Status = { kind: "idle" | "ok" | "error"; message: string } | null;

function playerName(playersById: ReadonlyMap<string, ChartPlayer>, id: string): string {
  return playersById.get(id)?.fullName ?? "Unknown player";
}

function listLine(playersById: ReadonlyMap<string, ChartPlayer>, ids: readonly string[]): string {
  if (ids.length === 0) return "Empty";
  return ids.map((id) => playerName(playersById, id)).join(" → ");
}

export function ChecklistPanel({
  franchise,
  data,
}: {
  franchise: { id: string; name: string; revision: number };
  data: ChecklistData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyUnit, setBusyUnit] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  const { checklist, players, history, historyAvailable, historyMessage } = data;
  const formationUnits = data.formationUnits ?? [];
  const formationBlocked = data.formationBlocked ?? [];
  const formationsAvailable = data.formationsAvailable ?? true;
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const summary = summarizeChecklist(checklist);

  // Selection starts on the currently ready units. Confirmed units disappear from the derived
  // checklist, so a mutation never leaves a stale unit actionable; the status line stays visible.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(checklist.ready.map((unit) => unit.unitId)),
  );

  const effectiveSelected = useMemo(
    () => checklist.units.filter((unit) => selected.has(unit.unitId)).map((unit) => unit.unitId),
    [checklist.units, selected],
  );

  const plan = useMemo(
    () => buildConfirmation(checklist, effectiveSelected, { includePromotions: true }),
    [checklist, effectiveSelected],
  );
  const actionable = plan.units.filter((unit) => unit.type === "depth_chart_list").length;

  const toggle = (unitId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const selectAllReady = () => setSelected(new Set(checklist.ready.map((unit) => unit.unitId)));
  const clearSelection = () => setSelected(new Set());

  const run = (label: string, task: () => Promise<ChecklistMutationResult>) => {
    setBusyUnit(label);
    setStatus(null);
    startTransition(async () => {
      const result = await task();
      setBusyUnit(null);
      if (result.outcome === "saved") {
        setStatus({ kind: "ok", message: result.message });
        router.refresh();
      } else {
        setStatus({ kind: "error", message: result.message });
      }
    });
  };

  const confirmSelected = () => {
    if (actionable === 0) {
      setStatus({
        kind: "error",
        message:
          plan.excluded.length > 0
            ? "Nothing can be confirmed yet: the selected unit has an unresolved prerequisite."
            : "Select at least one ready unit to confirm.",
      });
      return;
    }
    run("confirm", () =>
      confirmChecklistUnits({
        franchiseId: franchise.id,
        units: plan.units,
        expectedRevision: franchise.revision,
        requestId: newId(),
      }),
    );
  };

  const cancelUnit = (unit: ChecklistUnit) => {
    run(`cancel:${unit.unitId}`, () =>
      cancelChecklistUnits({
        franchiseId: franchise.id,
        positions: [unit.position],
        expectedRevision: franchise.revision,
        requestId: newId(),
      }),
    );
  };

  const cancelFormationUnit = (unit: FormationChecklistUnit) => {
    run(`cancel:${unit.unitId}`, () =>
      cancelChecklistUnits({
        franchiseId: franchise.id,
        formations: [
          {
            type: "formation_slot",
            bookId: unit.bookId,
            formationId: unit.formationId,
            slotId: unit.slotId,
            label: unit.label,
          },
        ],
        expectedRevision: franchise.revision,
        requestId: newId(),
      }),
    );
  };

  const undoBatch = (batchId: string) => {
    run(`undo:${batchId}`, () =>
      undoActionBatch({
        franchiseId: franchise.id,
        batchId,
        expectedRevision: franchise.revision,
        requestId: newId(),
      }),
    );
  };

  const busy = pending || busyUnit !== null;

  const renderUnit = (unit: ChecklistUnit) => {
    const isBlocked = unit.status === "blocked";
    const checked = selected.has(unit.unitId);
    return (
      <li key={unit.unitId} className="rounded-md border border-line bg-background p-3">
        <div className="flex flex-wrap items-start gap-2">
          <label className="flex min-h-11 flex-1 items-start gap-2">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(unit.unitId)}
              className="mt-1 h-4 w-4"
              aria-label={`Include ${unit.label} in this confirmation`}
            />
            <span>
              <span className="text-sm font-medium">{unit.label}</span>
              <span className="ml-2 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                {isBlocked ? "Blocked" : "Ready"}
              </span>
              <span className="mt-1 block text-xs text-ink-muted">
                {unit.diff.moved.length} moved · {unit.diff.added.length} added · {unit.diff.removed.length} removed
              </span>
              <span className="mt-1 block text-xs text-ink-muted">
                Now: {listLine(playersById, unit.baseline)}
              </span>
              <span className="mt-0.5 block text-xs">
                After confirming: {listLine(playersById, unit.planned)}
              </span>
              {unit.blocked.map((block) => (
                <span key={`${block.kind}:${block.playerId}`} className="mt-1 block max-w-prose text-xs text-ink-muted">
                  {block.note}
                </span>
              ))}
            </span>
          </label>
          <button
            type="button"
            onClick={() => cancelUnit(unit)}
            disabled={busy}
            className="min-h-11 rounded-md border border-line bg-surface px-3 text-xs font-medium disabled:opacity-60"
          >
            Cancel pending change
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{franchise.name} checklist</h2>
          <p className="text-xs text-ink-muted">Revision {franchise.revision}</p>
        </div>
        <p className="mt-1 max-w-prose text-xs text-ink-muted">
          Final differences between your recorded baseline and your plan, derived fresh from the depth chart — not
          a history of clicks. Confirming records what you already did in Madden and never connects to the game. The
          app does not show in-game menu wording that has not been verified (the D113 supplement is still pending).
        </p>
        {summary.pendingUnits > 0 ? (
          <p className="mt-2 text-xs text-ink-muted">
            {summary.pendingUnits} pending unit{summary.pendingUnits === 1 ? "" : "s"} · {summary.readyUnits} ready ·{" "}
            {summary.blockedUnits} blocked
            {summary.positions.length > 0 ? ` · ${summary.positions.join(", ")}` : ""}
          </p>
        ) : null}
      </section>

      {checklist.units.length === 0 ? (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h3 className="text-sm font-semibold">No pending game changes</h3>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Your plans match the recorded baseline everywhere. Plan a change on the Lineups depth chart and it appears
            here as an actionable difference.
          </p>
        </section>
      ) : (
        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Pending action units</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAllReady}
                className="min-h-9 rounded-md border border-line bg-background px-3 text-xs font-medium"
              >
                Select all ready
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="min-h-9 rounded-md border border-line bg-background px-3 text-xs font-medium"
              >
                Clear selection
              </button>
            </div>
          </div>
          <ul className="mt-3 space-y-2">{checklist.units.map(renderUnit)}</ul>

          <div className="mt-4 rounded-md border border-line bg-background p-3">
            <h4 className="text-xs font-semibold">Review before confirming</h4>
            <p className="mt-1 text-xs text-ink-muted">
              Exact scope: {describeConfirmation(plan) || "nothing selected"}. A confirmation applies this whole scope
              atomically in prerequisite order; if the revision or a prerequisite changed since you reviewed it, none
              of it is applied and you review again.
            </p>
            {plan.units.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {plan.units.map((unit) => (
                  <li key={unit.unitId} className="text-xs">
                    <span className="font-medium">{unit.label}</span>
                    {unit.type === "roster_status" ? (
                      <span className="text-ink-muted"> — prerequisite recorded first</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {plan.excluded.length > 0 ? (
              <div className="mt-2">
                <p className="text-xs font-medium">Excluded (not applied):</p>
                <ul className="mt-1 space-y-1">
                  {plan.excluded.map((unit) => (
                    <li key={unit.unitId} className="max-w-prose text-xs text-ink-muted">
                      <span className="font-medium text-ink">{unit.label}</span> — {unit.reasons.join(" ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {status ? (
              <p
                role="status"
                aria-live="polite"
                className={`mt-3 text-xs ${status.kind === "error" ? "text-ink" : "text-ink-muted"}`}
              >
                {status.message}
              </p>
            ) : null}
            <div className="mt-3">
              <button
                type="button"
                onClick={confirmSelected}
                disabled={busy || actionable === 0}
                className="min-h-11 rounded-md border border-line bg-surface px-4 text-sm font-medium disabled:opacity-60"
              >
                {busyUnit === "confirm"
                  ? "Confirming…"
                  : `Confirm ${actionable} selected unit${actionable === 1 ? "" : "s"} as already done`}
              </button>
            </div>
          </div>
        </section>
      )}

      {formationsAvailable ? (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h3 className="text-sm font-semibold">Formation overrides (reviewed separately)</h3>
          <p className="mt-1 max-w-prose text-xs text-ink-muted">
            Explicit per-formation substitutions from Lineups → Formation Subs. They confirm through the same
            reviewed, atomic command as the lists below/above — mixing chart and formation units in one batch is
            allowed. Resetting a slot on the diagram cancels its pending unit; inherited-slot recomputes from chart
            edits never appear here.
          </p>
          {formationUnits.length === 0 && formationBlocked.length === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">
              No pending formation overrides. Set one on the Lineups formation diagram.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {formationUnits.map((unit) => (
                <li key={unit.unitId} className="flex flex-wrap items-start gap-2 rounded-md border border-line bg-background p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{unit.label}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {unit.bookId} · {unit.formationLabel} · slot {unit.slotLabel}: {unit.baselinePlayerName} →{" "}
                      {unit.plannedPlayerName}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelFormationUnit(unit)}
                    disabled={busy}
                    className="min-h-11 rounded-md border border-line bg-surface px-3 text-xs font-medium disabled:opacity-60"
                  >
                    Cancel pending change
                  </button>
                </li>
              ))}
              {formationBlocked.map((unit) => (
                <li key={unit.unitId} className="rounded-md border border-amber-500/60 bg-amber-500/10 p-3">
                  <p className="text-sm font-medium">{unit.label}</p>
                  <p className="mt-1 text-xs text-ink-muted">{unit.note}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="rounded-lg border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Bounded undo history</h3>
        <p className="mt-1 max-w-prose text-xs text-ink-muted">
          Retained confirmations (most recent 50, up to 30 days). Undo corrects app records only and is refused when a
          later change depends on the confirmation; it is not an activity feed.
        </p>
        {!historyAvailable ? (
          <p className="mt-2 max-w-prose text-xs text-ink-muted">{historyMessage}</p>
        ) : history.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted">No confirmations recorded yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {history.map((batch) => (
              <li key={batch.id} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-background p-2">
                <span className="text-xs font-medium">{batch.label}</span>
                <span className="text-xs text-ink-muted">
                  {formatBatchTimestamp(batch.createdAt)}
                  {batch.positions.length > 0 ? ` · ${batch.positions.join(", ")}` : ""}
                </span>
                {batch.undoneAt ? (
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Undone
                  </span>
                ) : batch.undoable ? (
                  <button
                    type="button"
                    onClick={() => undoBatch(batch.id)}
                    disabled={busy}
                    className="ml-auto min-h-9 rounded-md border border-line bg-surface px-3 text-xs font-medium disabled:opacity-60"
                  >
                    {busyUnit === `undo:${batch.id}` ? "Undoing…" : "Undo"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
