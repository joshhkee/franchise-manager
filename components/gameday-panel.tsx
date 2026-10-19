"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { FormationDiagram } from "./formation-diagram";
import { saveGamedayPlan } from "../lib/actions/gameday";
import { CATALOG_PLAYS, catalogFor, SOURCE_NOTE } from "../lib/gameday/catalog";
import { DRIVE_THEME_TEMPLATES, coachingReferencesForSide } from "../lib/gameday/themes";
import { evaluateGameday, familyFilters } from "../lib/gameday/rules";
import { SITUATION_BUCKETS, type DriveThemeId, type GamedaySide, type PlayFamilyId, type SituationBucketId } from "../lib/gameday/types";
import type { GamedayData } from "../lib/data/gameday";
import { resolveGamedayFormation } from "../lib/gameday/formation";
import { PLAYBOOK_INVENTORY } from "../lib/formations/playbooks";

const initial = { status: "idle", message: "" } as const;
const pill = (active: boolean) => `min-h-10 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${active ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink hover:border-accent"}`;

export function GamedayPanel({ franchiseId, revision, side: initialSide, data }: { franchiseId: string; revision: number; side: GamedaySide; data: GamedayData }) {
  const [state, action] = useActionState(saveGamedayPlan, initial);
  const [side, setSide] = useState<GamedaySide>(initialSide);
  const books = PLAYBOOK_INVENTORY.filter((book) => book.side === side && ["nfl-off-falcons", "nfl-off-bears", "nfl-def-falcons", "nfl-def-vikings"].includes(book.id));
  const [bookId, setBookId] = useState(data.bookIdBySide[initialSide]);
  const themes = DRIVE_THEME_TEMPLATES.filter((theme) => theme.side === side);
  const [themeId, setThemeId] = useState<DriveThemeId>(themes[0]?.id ?? DRIVE_THEME_TEMPLATES[0].id);
  const theme = DRIVE_THEME_TEMPLATES.find((item) => item.id === themeId) ?? DRIVE_THEME_TEMPLATES[0];
  const [plans, setPlans] = useState(data.plans);
  const planFor = (id: DriveThemeId) => plans.find((item) => item.themeId === id);
  const saved = planFor(theme.id);
  const [situation, setSituation] = useState<SituationBucketId>("first_10");
  const [family, setFamily] = useState<PlayFamilyId | "all">("all");
  const [refresh, setRefresh] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [pinIds, setPinIds] = useState<string[]>([...(saved?.pinnedPlayIds ?? []), ...(saved?.pinnedFormationIds ?? [])]);
  const [planName, setPlanName] = useState(saved?.customName ?? "");
  const [planNotes, setPlanNotes] = useState(saved?.customNotes ?? "");
  const [planPinIds, setPlanPinIds] = useState<string[]>([...(saved?.pinnedPlayIds ?? []), ...(saved?.pinnedFormationIds ?? [])]);

  const bookPlays = catalogFor(bookId, side);
  const result = useMemo(() => evaluateGameday({
    bookId, side, themeId, situationId: situation, familyFilter: family,
    recentlyDisplayedPlayIds: recent, refreshSeed: refresh,
    pinnedPlayIds: pinIds.filter((id) => bookPlays.some((play) => play.id === id)),
    pinnedFormationIds: pinIds.filter((id) => data.formationState.favorites.some((favorite) => `${favorite.bookId}:${favorite.formationId}` === id)),
  }, bookPlays), [bookId, side, themeId, situation, family, recent, refresh, pinIds, bookPlays, data.formationState.favorites]);
  const selectedPlay = CATALOG_PLAYS.find((play) => play.id === selectedPlayId) ?? result.recommendations[0]?.play ?? null;
  const resolved = selectedPlay ? resolveGamedayFormation(data.formationState, selectedPlay.formationId) : null;
  const view = resolved?.ok ? resolved.data : null;
  const pendingWarnings = view?.slots.flatMap((slot) => {
    const player = slot.player;
    if (!player) return slot.conflict ? [`${slot.slot.label}: ${slot.conflict.note}`] : [];
    if (player.rosterStatus === "pending_incoming") return [`${slot.slot.label}: ${player.fullName} is pending an incoming transaction.`];
    if (player.rosterStatus === "practice_squad") return [`${slot.slot.label}: ${player.fullName} needs promotion before game use.`];
    return slot.conflict ? [`${slot.slot.label}: ${slot.conflict.note}`] : [];
  }) ?? [];
  const numbers = data.formationState.jerseyNumbers;
  const refs = coachingReferencesForSide(side);

  function switchSide(next: GamedaySide) {
    setSide(next);
    setBookId(data.bookIdBySide[next]);
    const nextTheme = DRIVE_THEME_TEMPLATES.find((item) => item.side === next)!;
    setThemeId(nextTheme.id);
    const plan = planFor(nextTheme.id);

    setPinIds([...(plan?.pinnedPlayIds ?? []), ...(plan?.pinnedFormationIds ?? [])]);
    setPlanName(plan?.customName ?? ""); setPlanNotes(plan?.customNotes ?? "");
    setPlanPinIds([...(plan?.pinnedPlayIds ?? []), ...(plan?.pinnedFormationIds ?? [])]);
    setPlans(data.plans);
    setSituation("first_10"); setFamily("all"); setRefresh(0); setRecent([]); setSelectedPlayId(null); setSelectedSlotId(null);
  }
  function selectTheme(next: DriveThemeId) {
    setThemeId(next); setRefresh(0); setRecent([]); setSelectedPlayId(null);
    const plan = planFor(next);

    setPinIds([...(plan?.pinnedPlayIds ?? []), ...(plan?.pinnedFormationIds ?? [])]);
    setPlanName(plan?.customName ?? ""); setPlanNotes(plan?.customNotes ?? "");
    setPlanPinIds([...(plan?.pinnedPlayIds ?? []), ...(plan?.pinnedFormationIds ?? [])]);
    setPlans(data.plans);
  }
  function refreshCalls() {
    setRecent((items) => [...new Set([...items, ...result.recommendations.map((entry) => entry.play.id)])]);
    setRefresh((value) => value + 1); setSelectedPlayId(null);
  }
  function togglePin(id: string) {
    const toggle = (items: string[]) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
    setPinIds(toggle);
    setPlanPinIds(toggle);
  }
  function togglePlanPin(id: string) {
    const toggle = (items: string[]) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
    setPlanPinIds(toggle);
    setPinIds(toggle);
  }
  const planPins = planPinIds.map((id) => ({ kind: bookPlays.some((play) => play.id === id) ? "play" : "formation", id }));

  return <div className="space-y-4 pb-20">
    <section className="rounded-xl border border-line bg-surface p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-surface-muted p-1" role="group" aria-label="Choose side">
          {(["offense", "defense"] as const).map((item) => <button key={item} className={`min-h-10 rounded-md px-4 text-sm font-semibold capitalize ${side === item ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`} onClick={() => switchSide(item)}>{item}</button>)}
        </div>
        <label className="sr-only" htmlFor="gameday-book">Playbook</label>
        <select id="gameday-book" className="min-h-11 min-w-48 flex-1 rounded-lg border border-line bg-background px-3 text-sm" value={bookId} onChange={(event) => { setBookId(event.target.value); setRefresh(0); setRecent([]); setSelectedPlayId(null); setPinIds(event.target.value === theme.defaultBookId ? [...(saved?.pinnedPlayIds ?? []), ...(saved?.pinnedFormationIds ?? [])] : []); }}>
          {books.map((book) => <option key={book.id} value={book.id}>{book.teamLabel} {book.label}{book.id === "nfl-off-bears" || book.id === "nfl-def-vikings" ? " · alternate" : ""}</option>)}
        </select>
      </div>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1" aria-label="Drive theme">
        {themes.map((item) => <button key={item.id} className={pill(themeId === item.id)} onClick={() => selectTheme(item.id)}>{planFor(item.id)?.customName || item.name}</button>)}
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-muted">{theme.identitySummary}</p>
      {saved?.customNotes ? <p className="mt-2 rounded-lg border-l-2 border-accent bg-surface-muted px-3 py-2 text-sm">{saved.customNotes}</p> : null}
    </section>

    <section className="rounded-xl border border-line bg-surface p-3 sm:p-4" aria-label="Call sheet filters">
      <div>
        <h2 className="text-sm font-semibold">Down & distance</h2>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {SITUATION_BUCKETS.map((item) => <button key={item.id} className={pill(situation === item.id)} aria-pressed={situation === item.id} onClick={() => { setSituation(item.id); setSelectedPlayId(null); }}>{item.shortLabel}</button>)}
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-sm font-semibold">Play type</h2>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {familyFilters(side).map((item) => <button key={item} className={pill(family === item)} aria-pressed={family === item} onClick={() => { setFamily(item); setSelectedPlayId(null); }}>{item === "all" ? "All types" : item.replaceAll("_", " ")}</button>)}
        </div>
      </div>
    </section>

    <section aria-labelledby="spotlight-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div><h2 id="spotlight-title" className="text-lg font-bold">Three-call spotlight</h2><p className="text-xs text-ink-muted">Curated ideas, not a guaranteed best play.</p></div>
        <button className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-surface" onClick={refreshCalls}>Refresh calls</button>
      </div>
      {!result.bookSupported || !result.recommendations.length ? <div className="rounded-xl border border-dashed border-line bg-surface p-5"><h3 className="font-semibold">No calls for this selection</h3><p className="mt-1 text-sm text-ink-muted">{result.unsupportedSituationMessage}</p></div> : <div className="grid gap-3 md:grid-cols-3">
        {result.recommendations.map(({ play, isPinnedPlay, isPinnedFormation, wasRecentlyDisplayed }, index) => <button key={play.id} onClick={() => { setSelectedPlayId(play.id); setRecent((items) => [...new Set([...items, play.id])]); }} className={`min-h-36 rounded-xl border bg-surface p-4 text-left transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${selectedPlayId === play.id ? "border-accent ring-1 ring-accent" : "border-line"}`}>
          <div className="flex items-start justify-between gap-2"><span className="rounded-md bg-surface-muted px-2 py-1 text-xs font-bold">CALL {index + 1}</span>{isPinnedPlay || isPinnedFormation ? <span aria-label="Pinned" className="text-accent">★</span> : null}</div>
          <span className="mt-3 block text-base font-bold leading-snug">{play.playName}</span>
          <span className="mt-1 block text-xs text-ink-muted">{play.setName} / {play.formationName}</span>
          <span className="mt-3 block text-sm leading-5">{play.cue}</span>
          {wasRecentlyDisplayed ? <span className="mt-2 block text-xs text-ink-muted">Displayed this session</span> : null}
        </button>)}
      </div>}
      {!result.bookSupported && result.unsupportedBookMessage ? <p className="mt-2 text-sm text-amber-700">{result.unsupportedBookMessage}</p> : null}
      {result.unsupportedSituationMessage ? <p className="mt-2 text-sm text-ink-muted">{result.unsupportedSituationMessage}</p> : null}
      {result.incompatiblePinnedPlays.length ? <details className="mt-2 rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm font-medium">{result.incompatiblePinnedPlays.length} pinned call(s) outside this filter</summary><ul className="mt-2 list-inside list-disc text-sm">{result.incompatiblePinnedPlays.map(({ play, exclusionReason }) => <li key={play.id}>{play.playName} — {exclusionReason}</li>)}</ul></details> : null}
      {result.varietyExhaustionNote ? <p className="mt-2 text-xs text-ink-muted">{result.varietyExhaustionNote}</p> : null}
      {result.overflowPinnedPlays.length ? <details className="mt-3 rounded-lg border border-line p-3"><summary className="cursor-pointer text-sm font-medium">{result.overflowPinnedPlays.length} pinned call(s) beyond the spotlight</summary><ul className="mt-2 list-inside list-disc text-sm">{result.overflowPinnedPlays.map((play) => <li key={play.id}>{play.playName} — {play.formationName}</li>)}</ul></details> : null}
    </section>

    {selectedPlay ? <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]" aria-label="Selected call detail">
      <article className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-start justify-between gap-3 border-b border-line p-4"><div><p className="text-xs text-ink-muted">{selectedPlay.setName} / {selectedPlay.formationName}</p><h2 className="mt-1 text-xl font-bold">{selectedPlay.playName}</h2><p className="mt-2 text-sm">{selectedPlay.cue}</p></div><button aria-label={pinIds.includes(selectedPlay.id) ? "Unpin selected play" : "Pin selected play"} className="min-h-11 min-w-11 rounded-lg border border-line text-xl text-accent" onClick={() => togglePin(selectedPlay.id)}>{pinIds.includes(selectedPlay.id) ? "★" : "☆"}</button></div>
        <div className="p-3">
          <p className="mb-2 text-xs text-ink-muted">Civil.GG play art · source image</p>
          {/* eslint-disable-next-line @next/next/no-img-element -- Civil.GG hosts the original public WebP diagram; optimization would require redistribution or a custom loader. */}
          <img src={selectedPlay.playArtUrl} alt={`${selectedPlay.playName} play art from Civil.GG`} className="max-h-80 w-full rounded-lg border border-line bg-white object-contain" onError={(event) => { event.currentTarget.hidden = true; const fallback = event.currentTarget.nextElementSibling; if (fallback instanceof HTMLElement) fallback.hidden = false; }} />
          <p hidden className="rounded-lg bg-surface-muted p-4 text-sm">Civil.GG play art is unavailable. Use the play name, formation, and planned personnel diagram below.</p>
          <p className="mt-2 text-xs text-ink-muted">{SOURCE_NOTE}</p>
          <a href={selectedPlay.civilPageUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block min-h-10 py-2 text-sm font-semibold text-accent underline">Open Civil.GG source</a>
        </div>
        <details className="border-t border-line p-4"><summary className="cursor-pointer font-semibold">Coaching notes <span className="text-xs font-normal text-ink-muted">football heuristic</span></summary><dl className="mt-3 space-y-3 text-sm"><div><dt className="font-semibold">Read</dt><dd className="text-ink-muted">{selectedPlay.coachingDetails.reads}</dd></div><div><dt className="font-semibold">Complement</dt><dd className="text-ink-muted">{selectedPlay.coachingDetails.disguiseAndComplements}</dd></div><div><dt className="font-semibold">Risk</dt><dd className="text-ink-muted">{selectedPlay.coachingDetails.risks}</dd></div><div><dt className="font-semibold">Adjustments</dt><dd className="text-ink-muted">{selectedPlay.coachingDetails.adjustmentsNote}</dd></div></dl></details>
      </article>
      <article className="rounded-xl border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-2"><div><p className="text-xs text-ink-muted">Planned lineup (unconfirmed changes flagged)</p><h3 className="mt-1 font-bold">{selectedPlay.formationName}</h3></div><button className="min-h-10 rounded-lg border border-line px-3 text-sm" onClick={() => togglePin(selectedPlay.formationId)}>{pinIds.includes(selectedPlay.formationId) ? "★ Formation" : "☆ Formation"}</button></div>
        {view ? <><FormationDiagram slots={view.slots} side={selectedPlay.side} mode="name" selectedSlotId={selectedSlotId} jerseyNumbers={numbers} onSelectSlot={setSelectedSlotId} />
          {selectedSlotId ? (() => { const slot = view.slots.find((item) => item.slot.id === selectedSlotId); return slot ? <div className="mt-3 rounded-lg bg-surface-muted p-3 text-sm"><p className="font-semibold">{slot.slot.label}: {slot.player?.fullName ?? "Unfilled"}</p><p className="mt-1 text-ink-muted">{slot.conflict?.note ?? (slot.pendingOverride ? "Planned override — not confirmed." : "Resolved from the planned depth chart. Mapping is provisional.")}</p></div> : null; })() : null}
          {pendingWarnings.length > 0 ? <div className="mt-3 rounded-lg border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100"><h4 className="font-bold">Lineup needs review</h4><ul className="mt-1 list-inside list-disc">{pendingWarnings.slice(0, 8).map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div> : <p className="mt-3 text-sm text-ink-muted">No pending conflicts detected. Formation mappings remain provisional under D128.</p>}
        </> : <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-ink-muted">{resolved && !resolved.ok ? resolved.message : "Formation data is unavailable."}</p>}
      </article>
    </section> : null}

    <section className="rounded-xl border border-line bg-surface">
      <button className="flex min-h-12 w-full items-center justify-between px-4 text-left font-semibold" aria-expanded={referenceOpen} onClick={() => setReferenceOpen((open) => !open)}>Coach’s reference <span aria-hidden="true">{referenceOpen ? "−" : "+"}</span></button>
      {referenceOpen ? <div className="grid gap-3 border-t border-line p-4 md:grid-cols-2">{refs.map((section) => <article key={section.id} className="rounded-lg bg-surface-muted p-4"><h3 className="font-bold">{section.title}</h3><p className="mt-1 text-xs text-ink-muted">{section.evidenceLabel}</p><div className="mt-3 space-y-3">{section.items.map((item) => <div key={item.heading}><p className="text-sm font-semibold">{item.heading}</p><p className="text-sm text-ink-muted">{item.detail}</p><p className="mt-1 text-sm">{item.actionCue}</p></div>)}</div></article>)}</div> : null}
    </section>

    <section className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Drive plan</h2><p className="text-sm text-ink-muted">Names, notes and favorites save per franchise and theme.</p></div>{bookId === theme.defaultBookId ? <button className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold" onClick={() => setEditorOpen((open) => !open)}>{editorOpen ? "Close editor" : "Edit plan"}</button> : <span className="text-xs text-ink-muted">Plan edits use the theme’s default book.</span>}</div>
      {editorOpen && bookId === theme.defaultBookId ? <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="franchiseId" value={franchiseId} /><input type="hidden" name="revision" value={revision} /><input type="hidden" name="themeId" value={themeId} /><input type="hidden" name="pins" value={JSON.stringify(planPins)} />
        <label className="text-sm font-semibold">Plan name<input name="customName" maxLength={80} value={planName} onChange={(event) => setPlanName(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-background px-3 font-normal" placeholder={theme.name} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Coaching notes<textarea name="customNotes" maxLength={1000} value={planNotes} onChange={(event) => setPlanNotes(event.target.value)} className="mt-1 min-h-24 w-full rounded-lg border border-line bg-background p-3 font-normal" placeholder="Your plan reminders" /></label>
        <div className="sm:col-span-2"><p className="text-sm font-semibold">Favorites in this book</p><div className="mt-2 flex max-h-52 flex-wrap gap-2 overflow-y-auto">{bookPlays.filter((play) => play.themes.includes(themeId)).map((play) => <button type="button" key={play.id} className={pill(planPinIds.includes(play.id))} aria-pressed={planPinIds.includes(play.id)} onClick={() => togglePlanPin(play.id)}>{planPinIds.includes(play.id) ? "★ " : "☆ "}{play.playName}</button>)}{data.formationState && data.formationState.favorites.filter((fav) => fav.bookId === bookId).map((fav) => <button type="button" key={fav.formationId} className={pill(planPinIds.includes(`${fav.bookId}:${fav.formationId}`))} onClick={() => togglePlanPin(`${fav.bookId}:${fav.formationId}`)}>☆ {fav.formationId.split(":").slice(-1)[0]}</button>)}</div></div>
        <div className="sm:col-span-2"><button className="min-h-11 rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-strong">Save plan</button><p role="status" className="mt-2 text-sm text-ink-muted">{state.message}</p>{state.status === "ok" ? <button type="button" className="mt-2 min-h-10 text-sm text-accent underline" onClick={() => { const next = { themeId: theme.id, customName: planName.trim() || null, customNotes: planNotes.trim() || null, pinnedPlayIds: planPins.filter((item) => item.kind === "play").map((item) => item.id), pinnedFormationIds: planPins.filter((item) => item.kind === "formation").map((item) => item.id) }; setPlans((items) => [...items.filter((item) => item.themeId !== theme.id), next]); setPinIds([...next.pinnedPlayIds, ...next.pinnedFormationIds]); setEditorOpen(false); }}>Show saved plan</button> : null}</div>
      </form> : null}
    </section>
    <p className="text-xs text-ink-muted">Recently displayed is remembered only in this browser session. No called-play log is kept. Coaching fit is heuristic.</p>
  </div>;
}
