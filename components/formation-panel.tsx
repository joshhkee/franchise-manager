"use client";

import { useMemo, useState, useTransition } from "react";
import {
  setFormationOverride,
  resetFormation,
  resetFormationSlot,
  toggleFormationFavorite,
} from "../lib/actions/formations";
import type { FormationState, ResolvedFormationResult } from "../lib/data/formations";
import { formationsOf } from "../lib/formations/catalog";
import { resolveFormation } from "../lib/formations/resolver";
import { EVIDENCE_LABELS, type FormationDef } from "../lib/formations/types";
import { FormationDiagram, type MarkerMode } from "./formation-diagram";

/**
 * Formation Subs panel (C3A). Book-scoped by design: switching books never
 * transplants state (overrides and favorites live on (book, formation) identity,
 * C0B-v2 §6). Unmapped formations render as honest pending catalog entries.
 */
export function FormationPanel({
  franchise,
  state,
}: {
  franchise: { id: string; name: string; revision: number };
  state: FormationState;
}) {
  const [side, setSide] = useState<"offense" | "defense">("offense");
  const [bookId, setBookId] = useState("nfl-off-falcons");
  const [formationId, setFormationId] = useState("nfl-off-falcons:singleback:tight-y-off");
  const [mode, setMode] = useState<MarkerMode>("name");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "saved" | "failed"; message: string }>({
    kind: "idle",
    message: "",
  });
  const [pending, startTransition] = useTransition();

  const bookFormations = useMemo(() => formationsOf(bookId), [bookId]);
  const playersById = useMemo(() => new Map(state.players.map((p) => [p.id, p])), [state.players]);
  const favorites = useMemo(
    () => new Set(state.favorites.filter((f) => f.bookId === bookId).map((f) => f.formationId)),
    [state.favorites, bookId],
  );

  const resolved: ResolvedFormationResult | null = useMemo(() => {
    const formation = bookFormations.find((entry) => entry.id === formationId) ?? null;
    if (!formation || formation.status !== "mapped") return null;
    return resolveFormation({
      formation,
      playersById,
      chartLists: state.chartLists,
      overrides: state.overrides,
    });
  }, [bookFormations, formationId, playersById, state.chartLists, state.overrides]);

  const selectedFormation: FormationDef | null =
    bookFormations.find((entry) => entry.id === formationId) ?? null;
  const isFavorite = favorites.has(formationId);

  const run = (fn: () => Promise<{ outcome: string; message: string }>) => {
    startTransition(async () => {
      try {
        const result = await fn();
        setStatus({
          kind: result.outcome === "saved" ? "saved" : "failed",
          message: result.message,
        });
      } catch {
        setStatus({ kind: "failed", message: "The request failed before it reached the server. Your input is kept; retry." });
      }
    });
  };

  const pickFormation = (id: string) => {
    setFormationId(id);
    setSelectedSlotId(null);
    setStatus({ kind: "idle", message: "" });
  };

  const switchSide = (next: "offense" | "defense") => {
    setSide(next);
    const nextBook = next === "offense" ? "nfl-off-falcons" : "nfl-def-falcons";
    setBookId(nextBook);
    const first = formationsOf(nextBook)[0];
    setFormationId(first?.id ?? "");
    setSelectedSlotId(null);
    setStatus({ kind: "idle", message: "" });
  };

  const selectedSlot = resolved?.slots.find((slot) => slot.slot.id === selectedSlotId) ?? null;
  const pendingCount = resolved?.slots.filter((slot) => slot.pendingOverride).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Formation side" className="flex gap-1">
          {(["offense", "defense"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={side === value}
              onClick={() => switchSide(value)}
              className="min-h-11 rounded-md border border-line px-3 text-sm font-medium aria-[selected=true]:bg-brand-outline"
            >
              {value === "offense" ? "Offense" : "Defense"}
            </button>
          ))}
        </div>
        <select
          aria-label="Playbook"
          value={bookId}
          onChange={(event) => {
            const next = event.target.value;
            setBookId(next);
            const first = formationsOf(next)[0];
            setFormationId(first?.id ?? "");
            setSelectedSlotId(null);
          }}
          className="min-h-11 rounded-md border border-line bg-background px-2 text-sm"
        >
          <option value="nfl-off-falcons">Atlanta Falcons (offense)</option>
          <option value="nfl-off-bears">Chicago Bears (offense)</option>
          <option value="nfl-def-falcons">Atlanta Falcons (defense)</option>
          <option value="nfl-def-vikings">Minnesota Vikings (defense)</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-ink-muted">
            <input
              type="checkbox"
              checked={mode === "compact"}
              onChange={(event) => setMode(event.target.checked ? "compact" : "name")}
            />
            Compact number circles
          </label>
          <button
            type="button"
            onClick={() => run(() => toggleFormationFavorite({
              franchiseId: franchise.id,
              bookId,
              formationId,
              favorite: !isFavorite,
              requestId: crypto.randomUUID(),
            }))}
            aria-pressed={isFavorite}
            className="min-h-11 rounded-md border border-line px-3 text-sm"
          >
            {isFavorite ? "★ Favorited" : "☆ Favorite"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(180px,240px)_1fr]">
        <ul className="max-h-[480px] space-y-1 overflow-y-auto rounded-md border border-line bg-surface p-2" aria-label="Formations in this playbook">
          {bookFormations.map((formation) => (
            <li key={formation.id}>
              <button
                type="button"
                onClick={() => pickFormation(formation.id)}
                aria-current={formationId === formation.id}
                className={
                  "flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-brand-outline/40 aria-[current=true]:bg-brand-outline " +
                  (formation.status === "unmapped" ? "text-ink-muted" : "")
                }
              >
                <span className="truncate">
                  {favorites.has(formation.id) ? "★ " : ""}
                  {formation.name}
                  <span className="ml-1 text-xs text-ink-muted">{formation.set}</span>
                </span>
                {formation.status === "unmapped" && <span className="text-xs text-ink-muted">unmapped</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-3">
          {!selectedFormation ? (
            <p className="text-sm text-ink-muted">Select a formation.</p>
          ) : selectedFormation.status === "unmapped" ? (
            <div className="rounded-md border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold">{selectedFormation.name}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                This formation is in the playbook catalog but has no slot mapping yet, so no diagram
                is rendered — mapping it without evidence would invent personnel. It stays visible
                and honest here.
              </p>
            </div>
          ) : (
            resolved && (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {selectedFormation.name} <span className="font-normal text-ink-muted">· {selectedFormation.set}</span>
                  </h3>
                  <span className="text-xs text-ink-muted">
                    {EVIDENCE_LABELS.unverified_default} · D128
                  </span>
                </div>
                <FormationDiagram
                  slots={resolved.slots}
                  side={selectedFormation.side}
                  mode={mode}
                  selectedSlotId={selectedSlotId}
                  jerseyNumbers={state.jerseyNumbers}
                  onSelectSlot={setSelectedSlotId}
                />

                {resolved.conflicts.length > 0 && (
                  <div className="rounded-md border border-amber-500/60 bg-amber-500/10 p-3" role="status">
                    <h4 className="text-sm font-semibold">Conflicts ({resolved.conflicts.length})</h4>
                    <ul className="mt-1 space-y-1 text-sm">
                      {resolved.conflicts.map((conflict) => (
                        <li key={`${conflict.kind}:${conflict.slotId}`}>
                          <strong>{conflict.slotId}</strong> — {conflict.note}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-ink-muted">
                      Offered repairs: fill the missing rank on the depth chart, reset the departed
                      override, or pick a replacement below. Nothing is silently substituted.
                    </p>
                  </div>
                )}

                {selectedSlot ? (
                  <div className="rounded-md border border-line bg-surface p-3">
                    <h4 className="text-sm font-semibold">
                      Slot {selectedSlot.slot.label} ({selectedSlot.slot.id})
                    </h4>
                    <p className="mt-1 text-sm text-ink-muted">
                      {selectedSlot.player
                        ? `Currently: ${selectedSlot.player.fullName}${selectedSlot.player.overall !== null ? ` (OVR ${selectedSlot.player.overall})` : " (OVR unknown)"} — ${selectedSlot.source === "inherited" ? "inherited from the depth chart" : "explicit override"}`
                        : "Currently unfilled."}
                      {selectedSlot.samePlayerOverride &&
                        " A deliberate override on this player is recorded (persists even when it matches the chart)."}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SlotPlayerPicker
                        players={state.players}
                        value={selectedSlot.player?.id ?? ""}
                        disabled={pending}
                        onPick={(playerId) => run(() => setFormationOverride({
                          franchiseId: franchise.id,
                          formationId,
                          slotId: selectedSlot.slot.id,
                          playerId: playerId || null,
                          expectedRevision: franchise.revision,
                          requestId: crypto.randomUUID(),
                        }))}
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => resetFormationSlot({
                          franchiseId: franchise.id,
                          formationId,
                          slotId: selectedSlot.slot.id,
                          expectedRevision: franchise.revision,
                          requestId: crypto.randomUUID(),
                        }))}
                        className="min-h-11 rounded-md border border-line px-3 text-sm"
                      >
                        Reset slot to inherited
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink-muted">
                    Select a slot on the diagram to inspect or override it.
                  </p>
                )}

                {pendingCount > 0 && (
                  <div className="rounded-md border border-sky-500/60 bg-sky-500/10 p-3">
                    <h4 className="text-sm font-semibold">
                      Pending overrides on this formation: {pendingCount}
                    </h4>
                    <ul className="mt-1 space-y-1 text-sm">
                      {resolved.slots.filter((slot) => slot.pendingOverride).map((slot) => (
                        <li key={slot.slot.id}>
                          <strong>{slot.slot.label}</strong>: {slot.baselinePlayer?.fullName ?? "inherited (empty)"} →{" "}
                          {slot.player?.fullName}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-xs text-ink-muted">
                      They enter the Checklist as reviewed formation units. Confirm or cancel them there.
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || pendingCount === 0}
                    onClick={() => run(() => resetFormation({
                      franchiseId: franchise.id,
                      formationId,
                      slotIds: resolved.slots.filter((slot) => slot.pendingOverride || slot.samePlayerOverride).map((slot) => slot.slot.id),
                      expectedRevision: franchise.revision,
                      requestId: crypto.randomUUID(),
                    }))}
                    className="min-h-11 rounded-md border border-line px-3 text-sm disabled:opacity-50"
                  >
                    Reset this formation&rsquo;s overrides
                  </button>
                  <span className="text-xs text-ink-muted">
                    Reset scope is explicit: this button touches only {selectedFormation.name}. Broader
                    resets would need a reviewed batch.
                  </span>
                </div>
              </>
            )
          )}
          {status.kind !== "idle" && (
            <p
              role="status"
              className={
                "text-sm " + (status.kind === "saved" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")
              }
            >
              {status.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SlotPlayerPicker({
  players,
  value,
  disabled,
  onPick,
}: {
  players: { id: string; fullName: string }[];
  value: string;
  disabled: boolean;
  onPick: (playerId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const base = needle
      ? players.filter((player) => player.fullName.toLowerCase().includes(needle))
      : players;
    return base.slice(0, 8);
  }, [players, query]);

  return (
    <div className="flex items-center gap-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find player…"
        aria-label="Find a player for this slot"
        className="min-h-11 w-44 rounded-md border border-line bg-background px-2 text-sm"
      />
      <select
        aria-label="Set override player"
        value={value}
        disabled={disabled}
        onChange={(event) => onPick(event.target.value)}
        className="min-h-11 max-w-52 rounded-md border border-line bg-background px-2 text-sm"
      >
        <option value="">— inherit from depth chart —</option>
        {matches.map((player) => (
          <option key={player.id} value={player.id}>
            {player.fullName}
          </option>
        ))}
      </select>
    </div>
  );
}
