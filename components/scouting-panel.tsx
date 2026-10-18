"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PLAYBOOK_INVENTORY } from "../lib/formations/playbooks";
import { saveScoutingPreferences, setShortlistStatus } from "../lib/actions/scouting";
import { IDLE } from "../lib/actions/state";
import type { ScoutingData, ScoutPlayer, ShortlistKind, ShortlistStatus } from "../lib/scouting";
import { numericRating, roleNotes, SCOUTING_SOURCES, targetPoolSummary } from "../lib/scouting";
import { useIdempotentAction } from "./autosave/use-idempotent-action";

const fieldClass = "min-h-11 w-full rounded-md border border-line bg-background px-3 text-sm";
const schemeOptions = ["Unknown / not selected", "West Coast", "Vertical Power Run", "Spread", "Zone Run", "Power Run", "Multiple"];

export function ScoutingPanel({
  franchiseId,
  revision,
  data,
  view,
}: {
  franchiseId: string;
  revision: number;
  data: ScoutingData;
  view: "trade-block" | "trade-targets" | "scheme" | "gaps" | "identity";
}) {
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState("all");
  const [team, setTeam] = useState("all");
  const [numericField, setNumericField] = useState("");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const roster = data.roster.filter((player) => player.rosterStatus === "active" || player.rosterStatus === "practice_squad");
  const candidates = view === "trade-targets" ? data.targets : roster;
  const positions = [...new Set(candidates.map((player) => player.listedPosition).filter((value): value is string => Boolean(value)))].sort();
  const teams = [...new Set(candidates.map((player) => player.team).filter((value): value is string => Boolean(value)))].sort();
  const numericFields = [...new Set(candidates.flatMap((player) => [
    ...(numericRating(player.age) === null ? [] : ["age"]),
    ...Object.entries(player.ratings)
      .filter(([, value]) => numericRating(value) !== null)
      .map(([key]) => `rating:${key}`),
    ...Object.entries(player.measurements)
      .filter(([key, value]) => key !== "age" && numericRating(value) !== null)
      .map(([key]) => `measurement:${key}`),
  ]))].sort();
  const visible = candidates.filter((player) => {
    const matchesQuery = `${player.fullName} ${player.team ?? ""} ${player.archetype ?? ""}`.toLowerCase().includes(query.trim().toLowerCase());
    if (!matchesQuery || (position !== "all" && player.listedPosition !== position) || (team !== "all" && player.team !== team)) return false;
    if (!numericField || (minimum === "" && maximum === "")) return true;
    const value = numericField === "age"
      ? player.age
      : numericField.startsWith("rating:")
        ? player.ratings[numericField.slice("rating:".length)]
        : player.measurements[numericField.slice("measurement:".length)];
    const numericValue = numericRating(value);
    return numericValue !== null && (minimum === "" || numericValue >= Number(minimum)) && (maximum === "" || numericValue <= Number(maximum));
  });
  const compared = candidates.filter((player) => compareIds.includes(player.id));
  const exactTab = view === "scheme";

  if (view === "gaps" || view === "identity") {
    return <CoachReference view={view} />;
  }

  return <div className="space-y-4">
    {view === "scheme" ? <SchemePreferences franchiseId={franchiseId} revision={revision} data={data} /> : null}
    <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{exactTab ? "Compare roster players" : view === "trade-block" ? "Trade Block review" : "Trade Targets"}</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            {view === "trade-block"
              ? "Same-position counts identify depth to review, not a recommendation to trade. Check the depth chart and role before acting."
              : view === "trade-targets"
                ? "Browse unattached records from the latest published catalog. No scheme-fit or athletic-anomaly ranking is shown until the underlying rules and evidence are approved."
                : "Compare observed fields side by side. Madden archetype and practical role notes are separate; neither creates an overall fit grade."}
          </p>
        </div>
        {view === "trade-block" ? <Link className="min-h-11 rounded-md border border-line px-3 py-2 text-sm" href="/lineups">Review depth chart</Link> : null}
      </div>
      {view === "trade-targets" ? <p className="mt-3 rounded-md border border-line bg-background p-3 text-xs text-ink-muted">{targetPoolSummary(visible.length, position)} An NFL combine measurement can be relevant to a task without measuring football execution; see cited guidance below.</p> : null}
      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(180px,1fr)_12rem]">
        <label className="grid gap-1 text-xs text-ink-muted">Search name, team, or archetype
          <input className={fieldClass} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search players" />
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">Listed position
          <select className={fieldClass} value={position} onChange={(event) => setPosition(event.target.value)}>
            <option value="all">All positions</option>{positions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">Team
          <select className={fieldClass} value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">All teams</option>{teams.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">Raw numeric field
          <select className={fieldClass} value={numericField} onChange={(event) => setNumericField(event.target.value)}>
            <option value="">No numeric filter</option>{numericFields.map((item) => <option key={item} value={item}>{item === "age" ? "Age (when published)" : item.slice(item.indexOf(":") + 1).replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">Minimum
          <input className={fieldClass} aria-label="Minimum raw value" type="number" value={minimum} onChange={(event) => setMinimum(event.target.value)} disabled={!numericField} />
        </label>
        <label className="grid gap-1 text-xs text-ink-muted">Maximum
          <input className={fieldClass} aria-label="Maximum raw value" type="number" value={maximum} onChange={(event) => setMaximum(event.target.value)} disabled={!numericField} />
        </label>
      </div>
      <p className="mt-2 text-xs text-ink-muted">{visible.length} record{visible.length === 1 ? "" : "s"} in this view. Filters compare published numeric values only; missing values stay unknown and do not match a numeric range. Select up to three to compare.</p>
      <ul className="mt-3 divide-y divide-line">
        {visible.slice(0, 100).map((player) => {
          const count = roster.filter((row) => row.listedPosition === player.listedPosition).length;
          const shortlistKind: ShortlistKind = view === "trade-targets" ? "trade_target" : "trade_block";
          const existing = data.shortlist.find((entry) => entry.kind === shortlistKind && (player.identity === "franchise" ? entry.playerId === player.id : entry.sourceRecordId === player.id));
          return <li key={`${player.identity}:${player.id}`} className="py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <label className="flex min-w-0 flex-1 items-start gap-2">
                <input aria-label={`Compare ${player.fullName}`} type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={compareIds.includes(player.id)} disabled={!compareIds.includes(player.id) && compareIds.length >= 3} onChange={(event) => setCompareIds((current) => event.target.checked ? [...current, player.id] : current.filter((id) => id !== player.id))} />
                <span className="min-w-0"><strong className="text-sm">{player.fullName}</strong><span className="block text-xs text-ink-muted">{player.team ?? "Team unknown"} · {player.listedPosition ?? "Position unknown"} · {player.archetype ?? "Archetype unknown"}{player.overall === null ? " · OVR unknown" : ` · OVR ${player.overall}`}</span></span>
              </label>
              <ShortlistControl franchiseId={franchiseId} revision={revision} kind={shortlistKind} player={player} existing={existing} />
            </div>
            {view === "trade-block" ? <p className="ml-6 mt-1 text-xs text-ink-muted">{count > 1 ? `${count} roster players list ${player.listedPosition ?? "an unknown position"}; review role and chart placement.` : "No positional surplus identified from listed-position counts."}</p> : null}
          </li>;
        })}
      </ul>
      {visible.length > 100 ? <p className="mt-2 text-xs text-ink-muted">Showing the first 100 results; narrow the search to inspect more.</p> : null}
      {visible.length === 0 ? <p className="mt-4 rounded-md border border-line bg-background p-4 text-sm text-ink-muted">No players match these filters. Try another name or position.</p> : null}
      {compared.length > 0 ? <Comparison players={compared} /> : null}
      {view === "trade-targets" ? <SourceNotes /> : null}
    </section>
  </div>;
}

function SchemePreferences({ franchiseId, revision, data }: { franchiseId: string; revision: number; data: ScoutingData }) {
  const [state, action, pending] = useActionState(useIdempotentAction(saveScoutingPreferences), IDLE);
  const choices = (side: "offense" | "defense") => PLAYBOOK_INVENTORY.filter((book) => book.side === side);
  const selected = (side: "offense" | "defense", currentId: string) => PLAYBOOK_INVENTORY.find((book) => book.id === currentId);
  return <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
    <h2 className="text-base font-semibold">Scheme & playbook</h2>
    <p className="mt-1 max-w-2xl text-sm text-ink-muted">Choose scheme labels and books independently. Scheme labels are owner-entered planning preferences, not verified Madden fit data; selecting one does not change personnel, formations, or the checklist.</p>
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="franchiseId" value={franchiseId} /><input type="hidden" name="revision" value={revision} />
      <label className="grid gap-1 text-xs text-ink-muted">Offensive scheme (unverified)
        <select className={fieldClass} name="offensiveScheme" defaultValue={data.preferences.offensiveScheme ?? ""}><option value="">Unknown / not selected</option>{schemeOptions.slice(1).map((item) => <option key={item}>{item}</option>)}</select>
      </label>
      <label className="grid gap-1 text-xs text-ink-muted">Defensive scheme (unverified)
        <select className={fieldClass} name="defensiveScheme" defaultValue={data.preferences.defensiveScheme ?? ""}><option value="">Unknown / not selected</option>{schemeOptions.slice(1).map((item) => <option key={item}>{item}</option>)}</select>
      </label>
      {(["offense", "defense"] as const).map((side) => {
        const bookId = side === "offense" ? data.preferences.offensiveBookId : data.preferences.defensiveBookId;
        const book = selected(side, bookId);
        return <label key={side} className="grid gap-1 text-xs text-ink-muted">{side === "offense" ? "Offensive playbook" : "Defensive playbook"}
          <select className={fieldClass} name={side === "offense" ? "offensiveBookId" : "defensiveBookId"} defaultValue={bookId}>{choices(side).map((item) => <option key={item.id} value={item.id}>{item.teamLabel} {item.label} · {item.kind} · {item.totalPlays} listed plays</option>)}</select>
          <span>{book && (book.id === "nfl-off-falcons" || book.id === "nfl-def-falcons" || book.id === "nfl-off-bears" || book.id === "nfl-def-vikings") ? "Formation catalog available; mappings remain provisional." : "Inventory listed; formation coverage is not loaded."}</span>
        </label>;
      })}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3"><button className="min-h-11 rounded-md bg-accent px-4 text-sm font-medium text-white disabled:opacity-60" disabled={pending}>{pending ? "Saving…" : "Save preferences"}</button>{state.message ? <p role={state.status === "error" ? "alert" : "status"} className="text-xs text-ink-muted">{state.message}</p> : null}</div>
    </form>
    <p className="mt-4 text-xs text-ink-muted">The catalog is third-party observed data; Madden’s exact scheme/archetype matching rules are not independently published in the official deep dive. No fit percentage or OVR recalculation is displayed.</p>
  </section>;
}

function ShortlistControl({ franchiseId, revision, kind, player, existing }: { franchiseId: string; revision: number; kind: ShortlistKind; player: ScoutPlayer; existing?: ScoutingData["shortlist"][number] }) {
  const [state, action, pending] = useActionState(useIdempotentAction(setShortlistStatus), IDLE);
  const identity = player.identity;
  const status: ShortlistStatus = existing?.status === "pinned" ? "dismissed" : "pinned";
  const noteStatus: ShortlistStatus = existing?.status ?? "pinned";
  return <form action={action} className="flex max-w-full flex-wrap items-center justify-end gap-2">
    <input type="hidden" name="franchiseId" value={franchiseId} /><input type="hidden" name="revision" value={revision} />
    <input type="hidden" name="kind" value={kind} /><input type="hidden" name="identity" value={identity} />
    <input type="hidden" name="playerId" value={identity === "franchise" ? player.id : ""} /><input type="hidden" name="sourceRecordId" value={identity === "source" ? player.id : player.sourceRecordId ?? ""} />
    <button name="status" value={status} className="min-h-11 rounded-md border border-line px-3 text-xs font-medium" disabled={pending}>{pending ? "Saving…" : existing?.status === "pinned" ? "Pinned · dismiss" : existing?.status === "dismissed" ? "Dismissed · restore" : "Pin"}</button>
    <button name="status" value={noteStatus} className="min-h-11 rounded-md border border-line px-3 text-xs font-medium" disabled={pending}>Save note</button>
    <label className="sr-only" htmlFor={`shortlist-note-${player.identity}-${player.id}`}>Note for {player.fullName}</label>
    <input id={`shortlist-note-${player.identity}-${player.id}`} aria-label={`Note for ${player.fullName}`} name="note" defaultValue={existing?.note ?? ""} maxLength={1000} placeholder="Add note" className="min-h-10 w-28 rounded-md border border-line bg-background px-2 text-xs sm:w-36" />
    {state.message ? <span className="sr-only" role={state.status === "error" ? "alert" : "status"}>{state.message}</span> : null}
  </form>;
}

function Comparison({ players }: { players: ScoutPlayer[] }) {
  const keys = [...new Set(players.flatMap((player) => Object.keys(player.ratings).filter((key) => key !== "overallRating")))].slice(0, 8);
  return <section className="mt-5 border-t border-line pt-4" aria-label="Player comparison">
    <div className="flex flex-wrap items-baseline justify-between gap-2"><h3 className="text-sm font-semibold">Side-by-side comparison</h3><span className="text-xs text-ink-muted">Raw published values · no weighted grade</span></div>
    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{players.map((player) => <article key={player.id} className="rounded-md border border-line bg-background p-3">
      <h4 className="text-sm font-semibold">{player.fullName}</h4><p className="mt-1 text-xs text-ink-muted">{player.listedPosition ?? "Position unknown"} · {player.team ?? "Team unknown"} · OVR {player.overall ?? "unknown"} · Archetype {player.archetype ?? "unknown"}</p>
      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">{(keys.length ? keys : ["speed", "acceleration", "agility", "strength"]).map((key) => <DataValue key={key} label={key} value={player.ratings[key]} />)}
        <DataValue label="Age" value={player.age} /><DataValue label="Height" value={player.measurements.height} /><DataValue label="Weight" value={player.measurements.weight} />
      </dl>
      <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs text-ink-muted">{roleNotes(player.listedPosition).map((note) => <li key={note}>{note}</li>)}</ul>
    </article>)}</div>
  </section>;
}

function DataValue({ label, value }: { label: string; value: unknown }) {
  const shown = value === null || value === undefined || value === "" ? "Unknown" : String(value);
  return <><dt className="text-ink-muted">{label}</dt><dd className="text-right font-medium">{shown}</dd></>;
}

function SourceNotes() {
  return <div className="mt-5 border-t border-line pt-4"><h3 className="text-sm font-semibold">How to read the fields</h3><p className="mt-1 max-w-prose text-xs text-ink-muted">Combine measurements are contextual evidence, not direct measures of coverage recognition, route execution, vision, or football IQ. This view has no cross-position grade or unsupported cutoff.</p><ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">{SCOUTING_SOURCES.map((source) => <li key={source.url}><a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.label}</a></li>)}</ul></div>;
}

function CoachReference({ view }: { view: "gaps" | "identity" }) {
  const gaps = view === "gaps";
  return <section className="rounded-lg border border-line bg-surface p-4 sm:p-5">
    <h2 className="text-base font-semibold">{gaps ? "Personnel gaps" : "Formation identity"}</h2>
    <p className="mt-1 max-w-2xl text-sm text-ink-muted">{gaps ? "This view does not clone the depth-chart editor. Inspect listed-position counts and use the authoritative lineup workspace to resolve personnel." : "Formation identities, favorites, and slot assignments remain book-scoped in Lineups; this view links to that single source of truth."}</p>
    <div className="mt-4 flex flex-wrap gap-2"><Link href={gaps ? "/lineups" : "/lineups?view=formations"} className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white">{gaps ? "Review depth chart" : "Open formation subs"}</Link><Link href="/gm?view=roster" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm">Open roster</Link></div>
    {gaps ? <p className="mt-3 text-xs text-ink-muted">Gap counts are informational only. Good-player exceptions, formation-specific surplus, and game-legal eligibility are not inferred by headcount.</p> : <p className="mt-3 text-xs text-ink-muted">The loaded mappings are provisional. Madden 27 in-game evidence is still required before any mapping can be called verified (D113).</p>}
  </section>;
}
