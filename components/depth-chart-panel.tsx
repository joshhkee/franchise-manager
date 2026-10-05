"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  discardDepthChartPlan,
  generateDepthChart,
  recordDepthChartBaseline,
  recordRosterStatus,
  saveDepthChartPlan,
} from "../lib/actions/depth-chart";
import {
  DEPTH_CHART_RULES_DETAIL,
  DEPTH_CHART_RULES_LABEL,
  POSITION_GROUPS,
  SUGGESTION_LABEL,
  buildProvisionalGeneration,
  diffPosition,
  eligibilityFor,
  maxRankFor,
  positionSpec,
  positionsInGroup,
  suggestProvisionalOrder,
  type ChartPlayer,
  type Eligibility,
  type PositionGroup,
  type RosterStatus,
} from "../lib/depth-chart";
import type { DepthChartData, DepthChartEntryRow } from "../lib/data/depth-chart";
import { useAutosave, type AutosaveStatus } from "./autosave/autosave-provider";
import { EmptyState } from "./empty-state";

const DEBOUNCE_MS = 600;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

interface PositionListState {
  baseline: string[];
  plan: string[];
  verification: "provisional_published" | "owner_confirmed";
}

type PickTarget = { kind: "add" } | { kind: "replace"; rank: number };

function initialLists(entries: DepthChartEntryRow[]): Record<string, PositionListState> {
  const grouped = new Map<
    string,
    {
      baseline: { rank: number; id: string }[];
      plan: { rank: number; id: string }[];
      verification: "provisional_published" | "owner_confirmed";
    }
  >();

  for (const entry of entries) {
    const current =
      grouped.get(entry.position) ??
      { baseline: [], plan: [], verification: entry.verification };
    if (entry.layer === "baseline") current.baseline.push({ rank: entry.rank, id: entry.playerId });
    else current.plan.push({ rank: entry.rank, id: entry.playerId });
    if (entry.verification === "owner_confirmed") current.verification = "owner_confirmed";
    grouped.set(entry.position, current);
  }

  const lists: Record<string, PositionListState> = {};
  for (const [position, value] of grouped) {
    const baseline = [...value.baseline].sort((a, b) => a.rank - b.rank).map((row) => row.id);
    const planRows = [...value.plan].sort((a, b) => a.rank - b.rank).map((row) => row.id);
    lists[position] = {
      baseline,
      plan: planRows.length > 0 ? planRows : [...baseline],
      verification: value.verification,
    };
  }
  return lists;
}

function emptyList(): PositionListState {
  return { baseline: [], plan: [], verification: "provisional_published" };
}

function playerLine(player: ChartPlayer): string {
  const position = player.primaryPosition ? `\u00b7 ${player.primaryPosition}` : "\u00b7 no listed position";
  const overall = player.overall === null ? "OVR unknown" : `OVR ${player.overall}`;
  return `${overall} ${position}`;
}

function summarizePositions(positions: string[]): string {
  if (positions.length <= 6) return positions.join(", ");
  return `${positions.slice(0, 6).join(", ")} and ${positions.length - 6} more`;
}

export function DepthChartPanel({
  franchise,
  data,
}: {
  franchise: { id: string; name: string; revision: number };
  data: DepthChartData;
}) {
  const { getRevision, setRevision, runSerialized, report, clear } = useAutosave();

  const [lists, setLists] = useState<Record<string, PositionListState>>(() => initialLists(data.entries));
  const listsRef = useRef(lists);
  useEffect(() => {
    listsRef.current = lists;
  }, [lists]);

  const savedPlanRef = useRef<Record<string, string[]>>(
    (() => {
      const saved: Record<string, string[]> = {};
      for (const [position, value] of Object.entries(initialLists(data.entries))) {
        saved[position] = [...value.plan];
      }
      return saved;
    })(),
  );

  const requestIdsRef = useRef<Record<string, string>>({});
  const timersRef = useRef<Record<string, number>>({});
  const [statusByPosition, setStatusByPosition] = useState<
    Record<string, { status: AutosaveStatus; message?: string; source?: "plan" | "action" }>
  >({});
  const [selectedPosition, setSelectedPosition] = useState<string>("QB");
  const [selectedGroup, setSelectedGroup] = useState<PositionGroup>("offense");
  const [view, setView] = useState<"plan" | "baseline">("plan");
  const [picker, setPicker] = useState<PickTarget | null>(null);
  const [query, setQuery] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [statusOverrides, setStatusOverrides] = useState<Record<string, RosterStatus>>({});
  const [busy, setBusy] = useState(false);
  const [generateStatus, setGenerateStatus] = useState<{ status: AutosaveStatus; message: string } | null>(
    null,
  );
  const dragIndexRef = useRef<number | null>(null);

  const players = useMemo(
    () =>
      data.players.map((player) =>
        statusOverrides[player.id] ? { ...player, rosterStatus: statusOverrides[player.id] } : player,
      ),
    [data.players, statusOverrides],
  );
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const listFor = useCallback(
    (position: string): PositionListState => listsRef.current[position] ?? emptyList(),
    [],
  );

  const setStatus = useCallback(
    (position: string, status: AutosaveStatus, message?: string, source: "plan" | "action" = "plan") => {
      setStatusByPosition((prev) => ({ ...prev, [position]: { status, message, source } }));
    },
    [],
  );

  const focusPosition = useCallback((position: string) => {
    const spec = positionSpec(position);
    if (spec) setSelectedGroup(spec.group);
    setSelectedPosition(position);
    setView("plan");
    window.setTimeout(() => {
      document.getElementById(`depth-position-${position}`)?.focus();
    }, 0);
  }, []);

  const persistRef = useRef<(position: string, options?: { isRetry?: boolean }) => Promise<void>>(
    async () => {},
  );

  const discardLocal = useCallback(
    (position: string, message = "Unsaved changes discarded; the list matches the last saved plan.") => {
      setLists((prev) => ({
        ...prev,
        [position]: {
          ...(prev[position] ?? emptyList()),
          plan: [...(savedPlanRef.current[position] ?? [])],
        },
      }));
      clear(`depth:${position}`);
      setStatus(position, "idle", message);
    },
    [clear, setStatus],
  );

  const persist = useCallback(
    async (position: string, options: { isRetry?: boolean } = {}) => {
      const ids = [...(listsRef.current[position] ?? emptyList()).plan];
      if (!options.isRetry) requestIdsRef.current[position] = newId();

      const label = `Depth chart \u2014 ${positionSpec(position)?.label ?? position}`;
      const pending = {
        retry: () => persistRef.current(position, { isRetry: true }),
        discard: () => discardLocal(position),
        focus: () => focusPosition(position),
      };

      setStatus(position, "saving", "Saving\u2026");
      report({ id: `depth:${position}`, label, status: "saving", ...pending });

      const result = await runSerialized(() =>
        saveDepthChartPlan({
          franchiseId: franchise.id,
          position,
          playerIds: ids,
          expectedRevision: getRevision(),
          requestId: requestIdsRef.current[position],
        }),
      );

      if (result.outcome === "saved") {
        const saved = result.playerIds ?? ids;
        savedPlanRef.current[position] = [...saved];
        setLists((prev) => ({
          ...prev,
          [position]: { ...(prev[position] ?? emptyList()), plan: [...saved] },
        }));
        if (typeof result.revision === "number") setRevision(result.revision);
        setStatus(position, "saved", "Saved to app.");
        if (sameIds(listsRef.current[position]?.plan ?? [], saved)) clear(`depth:${position}`);
        return;
      }

      const failedStatus: AutosaveStatus = result.outcome === "conflict" ? "conflict" : "failed";
      setStatus(position, failedStatus, result.message);
      report({ id: `depth:${position}`, label, status: failedStatus, message: result.message, ...pending });
    },
    [clear, discardLocal, focusPosition, franchise.id, getRevision, report, runSerialized, setRevision, setStatus],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const updatePlan = useCallback(
    (position: string, ids: string[]) => {
      setLists((prev) => ({
        ...prev,
        [position]: { ...(prev[position] ?? emptyList()), plan: ids },
      }));
      const label = `Depth chart \u2014 ${positionSpec(position)?.label ?? position}`;
      report({
        id: `depth:${position}`,
        label,
        status: "saving",
        message: "Unsaved changes",
        retry: () => persistRef.current(position, { isRetry: true }),
        discard: () => discardLocal(position),
        focus: () => focusPosition(position),
      });
      window.clearTimeout(timersRef.current[position]);
      timersRef.current[position] = window.setTimeout(() => {
        void persistRef.current(position);
      }, DEBOUNCE_MS);
    },
    [discardLocal, focusPosition, report],
  );

  const runExplicit = useCallback(
    async function runExplicit<T extends { outcome: string; message: string; revision?: number }>(
      position: string,
      task: () => Promise<T>,
      onSaved: (result: T) => void,
    ): Promise<void> {
      setBusy(true);
      const label = `Depth chart \u2014 ${positionSpec(position)?.label ?? position}`;
      const run = async () => {
        const result = await runSerialized(task);
        if (result.outcome === "saved") {
          onSaved(result);
          if (typeof result.revision === "number") setRevision(result.revision);
          setStatus(position, "saved", result.message, "action");
          return;
        }
        const failedStatus: AutosaveStatus = result.outcome === "conflict" ? "conflict" : "failed";
        setStatus(position, failedStatus, result.message, "action");
        report({
          id: `depth-action:${position}`,
          label,
          status: failedStatus,
          message: result.message,
          retry: run,
          discard: () => clear(`depth-action:${position}`),
          focus: () => focusPosition(position),
        });
      };
      await run();
      setBusy(false);
    },
    [clear, focusPosition, report, runSerialized, setRevision, setStatus],
  );

  const move = useCallback(
    (position: string, id: string, delta: -1 | 1) => {
      const plan = [...listFor(position).plan];
      const index = plan.indexOf(id);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= plan.length) return;
      plan.splice(index, 1);
      plan.splice(target, 0, id);
      updatePlan(position, plan);
    },
    [listFor, updatePlan],
  );

  const dropOn = useCallback(
    (position: string, index: number) => {
      const from = dragIndexRef.current;
      dragIndexRef.current = null;
      if (from === null || from === index) return;
      const plan = [...listFor(position).plan];
      const [moved] = plan.splice(from, 1);
      plan.splice(index, 0, moved);
      updatePlan(position, plan);
    },
    [listFor, updatePlan],
  );

  const removeFromPlan = useCallback(
    (position: string, id: string) => {
      updatePlan(
        position,
        listFor(position).plan.filter((candidate) => candidate !== id),
      );
    },
    [listFor, updatePlan],
  );

  const addToPlan = useCallback(
    (position: string, id: string, rank?: number) => {
      const plan = [...listFor(position).plan];
      if (rank !== undefined && rank >= 0 && rank < plan.length) plan[rank] = id;
      else plan.push(id);
      updatePlan(position, plan);
      setPicker(null);
      setQuery("");
    },
    [listFor, updatePlan],
  );

  const keepInPlan = useCallback(
    (position: string, id: string) => {
      const plan = [...listFor(position).plan];
      if (plan.includes(id)) return;
      if (plan.length >= maxRankFor(position)) {
        setStatus(position, "failed", `The provisional limit for this position is ${maxRankFor(position)}.`);
        return;
      }
      plan.push(id);
      updatePlan(position, plan);
    },
    [listFor, setStatus, updatePlan],
  );

  const suggest = useCallback(
    (position: string) => {
      const ids = suggestProvisionalOrder(players, position);
      if (ids.length === 0) {
        setStatus(
          position,
          "failed",
          "No eligible players to suggest for this slot. Provisional rules leave secondary/specialist slots manual.",
        );
        return;
      }
      updatePlan(position, ids);
    },
    [players, setStatus, updatePlan],
  );

  const seedBaseline = useCallback(
    (position: string) => {
      const ids = suggestProvisionalOrder(players, position);
      if (ids.length === 0) {
        setStatus(position, "failed", "No eligible players to seed this provisional list.");
        return;
      }
      void runExplicit(
        position,
        () =>
          recordDepthChartBaseline({
            franchiseId: franchise.id,
            position,
            playerIds: ids,
            intent: "provisional",
            expectedRevision: getRevision(),
            requestId: newId(),
          }),
        (result) => {
          const saved = result.playerIds ?? ids;
          setLists((prev) => ({
            ...prev,
            [position]: { baseline: [...saved], plan: [...saved], verification: "provisional_published" },
          }));
          savedPlanRef.current[position] = [...saved];
          clear(`depth:${position}`);
        },
      );
    },
    [clear, franchise.id, getRevision, players, runExplicit, setStatus],
  );

  const recordBaseline = useCallback(
    (position: string) => {
      const list = listFor(position);
      const ids = [...list.plan];
      void runExplicit(
        position,
        () =>
          recordDepthChartBaseline({
            franchiseId: franchise.id,
            position,
            playerIds: ids,
            intent: "recorded",
            expectedRevision: getRevision(),
            requestId: newId(),
          }),
        (result) => {
          const saved = result.playerIds ?? ids;
          const planKept = result.planKept ?? false;
          setLists((prev) => ({
            ...prev,
            [position]: {
              baseline: [...saved],
              plan: planKept ? [...ids] : [...saved],
              verification: "owner_confirmed",
            },
          }));
          savedPlanRef.current[position] = planKept ? [...ids] : [...saved];
          if (!planKept) clear(`depth:${position}`);
        },
      );
    },
    [clear, franchise.id, getRevision, listFor, runExplicit],
  );

  const discardStored = useCallback(
    (position: string) => {
      void runExplicit(
        position,
        () =>
          discardDepthChartPlan({
            franchiseId: franchise.id,
            position,
            expectedRevision: getRevision(),
            requestId: newId(),
          }),
        () => {
          const baseline = [...listFor(position).baseline];
          setLists((prev) => ({
            ...prev,
            [position]: { ...(prev[position] ?? emptyList()), plan: [...baseline] },
          }));
          savedPlanRef.current[position] = [...baseline];
          clear(`depth:${position}`);
        },
      );
    },
    [clear, franchise.id, getRevision, listFor, runExplicit],
  );

  const correctRoster = useCallback(
    (playerId: string, status: RosterStatus) => {
      void runExplicit(
        selectedPosition,
        () =>
          recordRosterStatus({
            franchiseId: franchise.id,
            playerId,
            status,
            expectedRevision: getRevision(),
            requestId: newId(),
          }),
        () => {
          setStatusOverrides((prev) => ({ ...prev, [playerId]: status }));
        },
      );
    },
    [franchise.id, getRevision, runExplicit, selectedPosition],
  );

  const generateAll = useCallback(() => {
    const plansByPosition: Record<string, readonly string[]> = {};
    for (const [key, value] of Object.entries(listsRef.current)) plansByPosition[key] = value.plan;
    const generation = buildProvisionalGeneration(players, plansByPosition);

    if (generation.plans.length === 0) {
      const parts: string[] = [];
      if (generation.alreadyPlanned.length > 0) {
        parts.push(`every primary position with eligible players already has a planned list`);
      }
      if (generation.noEligiblePlayers.length > 0) {
        parts.push(
          `no eligible players under the provisional rules for ${summarizePositions(generation.noEligiblePlayers)}`,
        );
      }
      setGenerateStatus({
        status: "idle",
        message:
          parts.length > 0
            ? `Nothing to generate: ${parts.join("; ")}.`
            : "Nothing to generate: there are no primary positions to fill.",
      });
      return;
    }

    const run = async () => {
      setBusy(true);
      setGenerateStatus({
        status: "saving",
        message: `Generating provisional lists for ${generation.plans.length} positions\u2026`,
      });
      try {
        const result = await runSerialized(() =>
          generateDepthChart({
            franchiseId: franchise.id,
            plans: generation.plans,
            expectedRevision: getRevision(),
            requestId: newId(),
          }),
        );

        if (result.outcome === "saved") {
          const returned = result.plans ?? [];
          setLists((prev) => {
            const next = { ...prev };
            for (const plan of returned) {
              const current = next[plan.position] ?? emptyList();
              next[plan.position] = plan.baselineSeeded
                ? {
                    baseline: [...plan.playerIds],
                    plan: [...plan.playerIds],
                    verification: "provisional_published",
                  }
                : { ...current, plan: [...plan.playerIds] };
            }
            return next;
          });
          for (const plan of returned) {
            savedPlanRef.current[plan.position] = [...plan.playerIds];
            clear(`depth:${plan.position}`);
          }
          if (typeof result.revision === "number") setRevision(result.revision);

          const written = returned.filter((plan) => !plan.noop);
          const seeded = written.filter((plan) => plan.baselineSeeded);
          const untouched = generation.alreadyPlanned.length + generation.noEligiblePlayers.length;
          const summaryParts: string[] = [
            written.length > 0
              ? `Generated provisional lists for ${written.length} position${written.length === 1 ? "" : "s"}`
              : "Nothing changed; every requested position already matched its recorded list",
          ];
          if (seeded.length > 0) summaryParts.push(`${seeded.length} seeded as an unverified baseline`);
          if (untouched > 0) {
            summaryParts.push(`${untouched} position${untouched === 1 ? "" : "s"} left untouched`);
          }
          setGenerateStatus({ status: "saved", message: `${summaryParts.join(" \u2014 ")}.` });
          return;
        }

        const failedStatus: AutosaveStatus = result.outcome === "conflict" ? "conflict" : "failed";
        setGenerateStatus({ status: failedStatus, message: result.message });
        report({
          id: "depth-action:generate",
          label: "Depth chart \u2014 all positions",
          status: failedStatus,
          message: result.message,
          retry: run,
          discard: () => {
            clear("depth-action:generate");
            setGenerateStatus(null);
          },
          focus: () => {},
        });
      } finally {
        setBusy(false);
      }
    };
    void run();
  }, [
    clear,
    franchise.id,
    getRevision,
    players,
    report,
    runSerialized,
    setRevision,
  ]);

  const position = selectedPosition;
  const spec = positionSpec(position);
  const list = lists[position] ?? emptyList();
  const diff = diffPosition(list.baseline, list.plan);
  const issues = useMemo(() => {
    const allowed: Eligibility = { ok: true, blocked: null, note: "" };
    return new Map(
      list.plan.map((id) => {
        const player = playersById.get(id);
        return [id, player ? eligibilityFor(player, position) : allowed] as const;
      }),
    );
  }, [list.plan, playersById, position]);
  const status = statusByPosition[position];
  const groupPositions = positionsInGroup(selectedGroup);
  const practiceSquad = players.filter((player) => player.rosterStatus === "practice_squad");
  const selectedPlayer = selectedPlayerId ? (playersById.get(selectedPlayerId) ?? null) : null;

  const candidates = useMemo(() => {
    const inPlan = new Set(list.plan);
    const replacementId = picker?.kind === "replace" ? list.plan[picker.rank] : null;
    const needle = query.trim().toLowerCase();
    return players
      .filter((player) => !inPlan.has(player.id) || player.id === replacementId)
      .filter((player) => needle === "" || player.fullName.toLowerCase().includes(needle))
      .map((player) => ({ player, eligibility: eligibilityFor(player, position) }))
      .sort((a, b) => Number(b.eligibility.ok) - Number(a.eligibility.ok));
  }, [list.plan, picker, players, position, query]);

  const removed = list.baseline.filter((id) => !list.plan.includes(id));

  if (players.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          title="No players to chart yet"
          detail="The depth chart works from this franchise's players. Open GM War Room → Roster to attach a published team roster or add custom players — a franchise whose name matches a published team attaches its roster automatically. Importing the catalog alone does not put players on a roster."
          hint="Nothing is invented: an empty roster stays visibly empty."
        />
        <Link
          href="/gm?view=roster"
          className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
        >
          Open GM Roster
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{franchise.name} depth chart</h2>
          <p className="text-xs text-ink-muted">
            Revision {franchise.revision} · {players.length} player{players.length === 1 ? "" : "s"}
          </p>
        </div>
        <p className="mt-1 max-w-prose text-xs text-ink-muted">
          <span className="font-medium text-ink">{DEPTH_CHART_RULES_LABEL}.</span> {DEPTH_CHART_RULES_DETAIL}
        </p>

        <div className="mt-3 rounded-md border border-line bg-background p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={generateAll}
              disabled={busy}
              className="min-h-11 rounded-md border border-line bg-surface px-4 text-sm font-medium disabled:opacity-60"
            >
              Generate all positions (provisional)
            </button>
            <p className="max-w-prose text-xs text-ink-muted">
              One action fills every primary position that has no planned list yet, using the provisional
              suggestion order. Positions you already planned are left alone; secondary/specialist slots stay
              manual.
            </p>
          </div>
          {generateStatus ? (
            <p
              role="status"
              aria-live="polite"
              className={`mt-2 text-xs ${
                generateStatus.status === "failed" || generateStatus.status === "conflict"
                  ? "text-ink"
                  : "text-ink-muted"
              }`}
            >
              {generateStatus.message}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Position groups">
          {POSITION_GROUPS.map((group) => (
            <button
              key={group.key}
              type="button"
              role="tab"
              aria-selected={selectedGroup === group.key}
              onClick={() => {
                setSelectedGroup(group.key);
                const first = positionsInGroup(group.key)[0];
                if (first) setSelectedPosition(first.key);
              }}
              className={`min-h-11 rounded-md border px-4 text-sm font-medium ${
                selectedGroup === group.key ? "border-ink bg-background" : "border-line bg-surface"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        <ul className="mt-3 flex flex-wrap gap-2" aria-label="Positions">
          {groupPositions.map((positionSpecItem) => {
            const positionList = lists[positionSpecItem.key] ?? emptyList();
            const pending = diffPosition(positionList.baseline, positionList.plan).changed;
            return (
              <li key={positionSpecItem.key}>
                <button
                  id={`depth-position-${positionSpecItem.key}`}
                  type="button"
                  onClick={() => {
                    setSelectedPosition(positionSpecItem.key);
                    setView("plan");
                    setPicker(null);
                    setQuery("");
                  }}
                  aria-pressed={position === positionSpecItem.key}
                  className={`min-h-11 rounded-md border px-3 text-sm ${
                    position === positionSpecItem.key ? "border-ink bg-background font-semibold" : "border-line"
                  }`}
                >
                  {positionSpecItem.label}
                  {pending ? " •" : ""}
                  {positionSpecItem.unverifiedMeaning ? " (meaning unverified)" : ""}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">
              {spec?.label ?? position} — {view === "plan" ? "planned list" : "recorded baseline"}
            </h3>
            <p className="text-xs text-ink-muted">
              Provisional limit {maxRankFor(position)} ·{" "}
              {list.verification === "owner_confirmed"
                ? "recorded baseline confirmed by you as already happened"
                : "baseline is provisional/unverified"}
            </p>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setView("plan")}
              aria-pressed={view === "plan"}
              className={`min-h-9 rounded-md border px-3 text-xs font-medium ${
                view === "plan" ? "border-ink bg-background" : "border-line"
              }`}
            >
              Planned (editing)
            </button>
            <button
              type="button"
              onClick={() => setView("baseline")}
              aria-pressed={view === "baseline"}
              className={`min-h-9 rounded-md border px-3 text-xs font-medium ${
                view === "baseline" ? "border-ink bg-background" : "border-line"
              }`}
            >
              Recorded baseline
            </button>
          </div>

          {status ? (
            <p
              role="status"
              aria-live="polite"
              className={`mt-2 text-xs ${status.status === "failed" || status.status === "conflict" ? "text-ink" : "text-ink-muted"}`}
            >
              {status.message ?? status.status}
            </p>
          ) : null}

          {status && status.source !== "action" && (status.status === "failed" || status.status === "conflict") ? (
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => void persistRef.current(position, { isRetry: true })}
                className="min-h-9 rounded-md border border-line px-2 text-xs font-medium"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => discardLocal(position)}
                className="min-h-9 rounded-md border border-line px-2 text-xs font-medium"
              >
                Discard
              </button>
            </div>
          ) : null}

          {view === "baseline" ? (
            list.baseline.length === 0 ? (
              <p className="mt-3 max-w-prose text-sm text-ink-muted">
                No baseline is recorded for {spec?.label ?? position} yet. Nothing is invented — seed a
                provisional planning list or add players manually, then record the real chart when you have it.
              </p>
            ) : (
              <ol className="mt-3 divide-y divide-line">
                {list.baseline.map((id, index) => {
                  const player = playersById.get(id);
                  return (
                    <li key={id} className="flex items-center gap-3 py-2">
                      <span className="w-5 text-xs text-ink-muted">{index + 1}</span>
                      <span className="text-sm font-medium">{player?.fullName ?? "Unknown player"}</span>
                      <span className="text-xs text-ink-muted">{player ? playerLine(player) : ""}</span>
                    </li>
                  );
                })}
              </ol>
            )
          ) : (
            <>
              {list.plan.length === 0 ? (
                <p className="mt-3 max-w-prose text-sm text-ink-muted">
                  This plan list is empty. Add players below, or use the provisional suggestion for primary
                  positions.
                </p>
              ) : (
                <ol className="mt-3 divide-y divide-line">
                  {list.plan.map((id, index) => {
                    const player = playersById.get(id);
                    const eligibility = issues.get(id);
                    const isPracticeSquad = player?.rosterStatus === "practice_squad";
                    return (
                      <li
                        key={id}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => dropOn(position, index)}
                        className="flex flex-wrap items-center gap-2 py-2"
                      >
                        <span
                          draggable
                          onDragStart={(event) => {
                            dragIndexRef.current = index;
                            event.dataTransfer?.setData?.("text/plain", String(index));
                          }}
                          role="img"
                          aria-label={`Drag ${player?.fullName ?? "player"} to reorder`}
                          title="Drag to reorder (or use the move buttons)"
                          className="cursor-grab select-none px-1 text-ink-muted"
                        >
                          ⠿
                        </span>
                        <span className="w-5 text-xs text-ink-muted">{index + 1}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPlayerId(id)}
                          className="min-h-9 text-left text-sm font-medium"
                        >
                          {player?.fullName ?? "Unknown player"}
                        </button>
                        <span className="text-xs text-ink-muted">{player ? playerLine(player) : ""}</span>
                        {isPracticeSquad ? (
                          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            Practice squad — promotion required
                          </span>
                        ) : null}
                        {eligibility && !eligibility.ok ? (
                          <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                            Unverified placement
                          </span>
                        ) : null}
                        <div className="ml-auto flex flex-wrap gap-1">
                          <button
                            type="button"
                            aria-label={`Move ${player?.fullName ?? "player"} up`}
                            disabled={index === 0}
                            onClick={() => move(position, id, -1)}
                            className="min-h-9 rounded-md border border-line px-2 text-xs font-medium disabled:opacity-50"
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${player?.fullName ?? "player"} down`}
                            disabled={index === list.plan.length - 1}
                            onClick={() => move(position, id, 1)}
                            className="min-h-9 rounded-md border border-line px-2 text-xs font-medium disabled:opacity-50"
                          >
                            Move down
                          </button>
                          <button
                            type="button"
                            aria-label={`Replace ${player?.fullName ?? "player"}`}
                            onClick={() => {
                              setPicker({ kind: "replace", rank: index });
                              setQuery("");
                            }}
                            className="min-h-9 rounded-md border border-line px-2 text-xs font-medium"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${player?.fullName ?? "player"} from the plan`}
                            onClick={() => removeFromPlan(position, id)}
                            className="min-h-9 rounded-md border border-line px-2 text-xs font-medium"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}

              {removed.length > 0 ? (
                <div className="mt-3 rounded-md border border-line bg-background p-3">
                  <p className="text-xs font-medium">Removed from the plan (still in the recorded baseline)</p>
                  <ul className="mt-2 space-y-1">
                    {removed.map((id) => {
                      const player = playersById.get(id);
                      return (
                        <li key={id} className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                          <span>{player?.fullName ?? "Unknown player"}</span>
                          <button
                            type="button"
                            onClick={() => keepInPlan(position, id)}
                            className="min-h-9 rounded-md border border-line px-2 font-medium"
                          >
                            Keep in plan
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPicker({ kind: "add" });
                    setQuery("");
                  }}
                  disabled={list.plan.length >= maxRankFor(position)}
                  className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
                >
                  Add player
                </button>
                {spec && !spec.manual ? (
                  <button
                    type="button"
                    onClick={() => suggest(position)}
                    title={SUGGESTION_LABEL}
                    className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium"
                  >
                    Suggest order (provisional)
                  </button>
                ) : null}
                {list.baseline.length === 0 && spec && !spec.manual ? (
                  <button
                    type="button"
                    onClick={() => seedBaseline(position)}
                    disabled={busy}
                    className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
                  >
                    Seed provisional list
                  </button>
                ) : null}
              </div>

              {picker ? (
                <div className="mt-3 rounded-md border border-line bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      {picker.kind === "add"
                        ? `Add a player to ${spec?.label ?? position}`
                        : `Replace rank ${picker.rank + 1} in ${spec?.label ?? position}`}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPicker(null);
                        setQuery("");
                      }}
                      className="min-h-9 rounded-md border border-line px-2 text-xs font-medium"
                    >
                      Close
                    </button>
                  </div>
                  <label className="mt-2 block text-xs">
                    <span className="sr-only">Search players</span>
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name"
                      autoFocus
                      className="min-h-11 w-full rounded-md border border-line bg-surface px-3 text-sm"
                    />
                  </label>
                  <ul className="mt-2 max-h-72 space-y-1 overflow-auto">
                    {candidates.length === 0 ? (
                      <li className="text-xs text-ink-muted">
                        No matching players. Only this franchise&apos;s roster is searched — nothing is invented.
                      </li>
                    ) : (
                      candidates.map(({ player, eligibility }) => (
                        <li
                          key={player.id}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-surface p-2"
                        >
                          <span className="text-xs font-medium">{player.fullName}</span>
                          <span className="text-xs text-ink-muted">{playerLine(player)}</span>
                          {!eligibility.ok ? (
                            <span className="max-w-prose text-xs text-ink-muted">{eligibility.note}</span>
                          ) : null}
                          <div className="ml-auto flex gap-1">
                            <button
                              type="button"
                              disabled={!eligibility.ok}
                              onClick={() => addToPlan(position, player.id, picker.kind === "replace" ? picker.rank : undefined)}
                              className="min-h-9 rounded-md border border-line px-2 text-xs font-medium disabled:opacity-50"
                            >
                              {picker.kind === "replace" ? "Use here" : "Add"}
                            </button>
                            {player.rosterStatus === "practice_squad" ? (
                              <button
                                type="button"
                                onClick={() => correctRoster(player.id, "active")}
                                className="min-h-9 rounded-md border border-line px-2 text-xs font-medium"
                              >
                                Record as active roster
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ) : null}

              {diff.changed ? (
                <div className="mt-3 rounded-md border border-line bg-background p-3">
                  <p className="text-xs font-medium">
                    Pending vs recorded baseline: {diff.moved.length} moved · {diff.added.length} added ·{" "}
                    {diff.removed.length} removed
                  </p>
                  <p className="mt-1 max-w-prose text-xs text-ink-muted">
                    Editing saves a plan, never a claimed game change. Record it as already happened only when
                    you have done it in Madden; if a promotion or trade is still pending, confirmation waits for
                    that step (C2B/C4A).
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => recordBaseline(position)}
                      disabled={busy}
                      className="min-h-11 rounded-md border border-line bg-surface px-4 text-sm font-medium disabled:opacity-60"
                    >
                      Record as already happened
                    </button>
                    <button
                      type="button"
                      onClick={() => discardStored(position)}
                      disabled={busy}
                      className="min-h-11 rounded-md border border-line bg-surface px-4 text-sm font-medium disabled:opacity-60"
                    >
                      Discard pending changes
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </section>

        <aside className="rounded-lg border border-line bg-surface p-5">
          <h3 className="text-sm font-semibold">Player detail</h3>
          {selectedPlayer ? (
            <div className="mt-2 space-y-2">
              <p className="text-sm font-medium">{selectedPlayer.fullName}</p>
              <p className="text-xs text-ink-muted">
                {playerLine(selectedPlayer)} ·{" "}
                {selectedPlayer.primaryPosition ? `listed ${selectedPlayer.primaryPosition}` : "listed position unknown"}
              </p>
              <p className="text-xs text-ink-muted">
                Roster: {selectedPlayer.rosterStatus === "practice_squad" ? "Practice squad" : "Active roster"}
              </p>
              {issues.get(selectedPlayer.id) && !issues.get(selectedPlayer.id)?.ok ? (
                <p className="max-w-prose text-xs text-ink-muted">{issues.get(selectedPlayer.id)?.note}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                {selectedPlayer.rosterStatus === "practice_squad" ? (
                  <button
                    type="button"
                    onClick={() => correctRoster(selectedPlayer.id, "active")}
                    className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium"
                  >
                    Record as active roster
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => correctRoster(selectedPlayer.id, "practice_squad")}
                    className="min-h-11 rounded-md border border-line bg-background px-3 text-xs font-medium"
                  >
                    Record as practice squad
                  </button>
                )}
              </div>
              <p className="max-w-prose text-xs text-ink-muted">
                Roster corrections record what is already true in Madden. Real promotion and signing tools
                arrive with C4A — this button never pretends to move a player for you.
              </p>
            </div>
          ) : (
            <p className="mt-2 max-w-prose text-sm text-ink-muted">
              Select a player in the list to see their detail and record roster corrections. Unknown values
              stay visibly unknown.
            </p>
          )}
        </aside>
      </div>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Practice squad ({practiceSquad.length})</h3>
        <p className="mt-1 max-w-prose text-xs text-ink-muted">
          Practice-squad players are separate from active plans and cannot silently enter one: placing them
          requires a promotion first. Record the roster correction only if you already promoted them in Madden.
        </p>
        {practiceSquad.length === 0 ? (
          <p className="mt-2 text-xs text-ink-muted">No players are recorded on the practice squad.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {practiceSquad.map((player) => (
              <li key={player.id} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-medium">{player.fullName}</span>
                <span className="text-ink-muted">{playerLine(player)}</span>
                <button
                  type="button"
                  onClick={() => correctRoster(player.id, "active")}
                  className="min-h-9 rounded-md border border-line px-2 font-medium"
                >
                  Record as active roster
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
