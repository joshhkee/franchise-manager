"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  attachCatalogRecords,
  attachCatalogTeam,
  searchCatalogPlayers,
  type CatalogAttachState,
  type CatalogSearchState,
} from "../lib/actions/catalog";
import { CATALOG_ATTACH_DETAIL, CATALOG_ATTACH_LABEL, matchTeamOption } from "../lib/catalog";
import type { CatalogAttachContext } from "../lib/data/catalog";
import type { Loaded } from "../lib/data/franchises";
import { useIdempotentAction } from "./autosave/use-idempotent-action";

const IDLE_ATTACH: CatalogAttachState = { status: "idle" };
const IDLE_SEARCH: CatalogSearchState = { status: "idle" };
const SELECT_CLASS =
  "min-h-11 rounded-md border border-line bg-background px-3 text-sm";
const INPUT_CLASS =
  "min-h-11 w-56 rounded-md border border-line bg-background px-3 text-sm";

type Scope = "all" | "free_agents" | "team";

export function CatalogAttachPanel({
  franchiseId,
  franchiseName,
  revision,
  catalog,
}: {
  franchiseId: string;
  franchiseName: string;
  revision: number;
  catalog: Loaded<CatalogAttachContext | null>;
}) {
  if (!catalog.ok) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Attach published roster</h3>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">{catalog.message}</p>
      </section>
    );
  }

  if (!catalog.data) {
    return (
      <section className="rounded-lg border border-line bg-surface p-5">
        <h3 className="text-sm font-semibold">Attach published roster</h3>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          No source revision has been imported yet, so there are no published players to attach. Nothing
          is invented in the meantime.
        </p>
        <p className="mt-2 text-xs text-ink-muted">
          Import the published Madden ratings on{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          , then return here to attach your team.
        </p>
      </section>
    );
  }

  return (
    <AttachBody
      franchiseId={franchiseId}
      franchiseName={franchiseName}
      revision={revision}
      data={catalog.data}
    />
  );
}

function AttachBody({
  franchiseId,
  franchiseName,
  revision,
  data,
}: {
  franchiseId: string;
  franchiseName: string;
  revision: number;
  data: CatalogAttachContext;
}) {
  const router = useRouter();
  const teamOptions = useMemo(() => data.teams.map((row) => row.team), [data.teams]);
  const [team, setTeam] = useState(() => matchTeamOption(franchiseName, teamOptions) ?? "");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");

  const teamRequest = useIdempotentAction(attachCatalogTeam);
  const [teamState, teamFormAction, teamPending] = useActionState(teamRequest, IDLE_ATTACH);
  const recordsRequest = useIdempotentAction(attachCatalogRecords);
  const [recordsState, recordsFormAction, recordsPending] = useActionState(recordsRequest, IDLE_ATTACH);
  const [searchState, searchFormAction, searchPending] = useActionState(searchCatalogPlayers, IDLE_SEARCH);

  useEffect(() => {
    if (teamState.status === "ok" || recordsState.status === "ok") router.refresh();
  }, [teamState, recordsState, router]);

  /** The published team this franchise is named for, when unambiguous. */
  const matchedTeam = useMemo(
    () => matchTeamOption(franchiseName, teamOptions),
    [franchiseName, teamOptions],
  );

  const submitTeam = useCallback(
    (target: string) => {
      const formData = new FormData();
      formData.set("franchiseId", franchiseId);
      formData.set("revisionId", data.revisionId);
      formData.set("revision", String(revision));
      formData.set("team", target);
      // Required by React 19 when dispatching a form action outside a form or event.
      startTransition(() => teamFormAction(formData));
    },
    [data.revisionId, franchiseId, revision, teamFormAction],
  );

  // Auto-attach (D126): a franchise with no attached published players and an
  // unambiguous team name attaches that team's whole roster on first open. The
  // ref guards a second run on refresh; a failed attempt stays visible with a
  // retry, and an unmatched name falls back to the manual picker only.
  const autoAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoAttemptedRef.current) return;
    if (!matchedTeam) return;
    if (data.attachedRecordIds.length > 0) return;
    autoAttemptedRef.current = true;
    submitTeam(matchedTeam);
  }, [data.attachedRecordIds.length, matchedTeam, submitTeam]);

  const attachedIds = useMemo(() => {
    const ids = new Set(data.attachedRecordIds);
    if (recordsState.status === "ok") {
      for (const id of recordsState.attachedIds ?? []) ids.add(id);
    }
    return ids;
  }, [data.attachedRecordIds, recordsState]);

  const selectedTeam = data.teams.find((row) => row.team === team) ?? null;
  const missingPositionNote =
    selectedTeam && selectedTeam.missingPositionCount > 0
      ? ` ${selectedTeam.missingPositionCount} of them have no listed position in the published data — they attach with position unknown and cannot be charted until you record one.`
      : "";

  return (
    <section className="rounded-lg border border-line bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Attach published roster</h3>
        <p className="text-xs text-ink-muted">
          {data.source} · {data.revisionKey} — {data.recordCount} records · coverage{" "}
          {data.coverageStatus}
        </p>
      </div>
      <p className="mt-1 max-w-prose text-xs text-ink-muted">
        <span className="font-medium text-ink">{CATALOG_ATTACH_LABEL}</span> {CATALOG_ATTACH_DETAIL}
      </p>

      {matchedTeam && data.attachedRecordIds.length === 0 ? (
        <p className="mt-2 max-w-prose text-xs text-ink-muted">
          This franchise matches {matchedTeam}, so the published {matchedTeam} roster attaches
          automatically — no extra pick is needed. Use the picker below only for a different team.
        </p>
      ) : null}

      {teamState.message ? (
        <p
          role={teamState.status === "error" ? "alert" : "status"}
          className="mt-2 max-w-prose text-xs text-ink-muted"
        >
          {teamState.message}
        </p>
      ) : null}
      {matchedTeam && teamState.status === "error" ? (
        <button
          type="button"
          onClick={() => submitTeam(matchedTeam)}
          disabled={teamPending}
          className="mt-1 min-h-9 rounded-md border border-line px-2 text-xs font-medium disabled:opacity-60"
        >
          Retry automatic attach
        </button>
      ) : null}

      <form action={teamFormAction} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="franchiseId" value={franchiseId} />
        <input type="hidden" name="revisionId" value={data.revisionId} />
        <input type="hidden" name="revision" value={revision} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Team</span>
          <select
            name="team"
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">Choose a team…</option>
            {data.teams.map((option) => (
              <option key={option.team} value={option.team}>
                {option.team} ({option.playerCount})
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={!team || teamPending}
          className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
        >
          {teamPending ? "Attaching…" : team ? `Attach ${team} roster` : "Attach team roster"}
        </button>
      </form>

      {selectedTeam ? (
        <p className="mt-2 max-w-prose text-xs text-ink-muted">
          {selectedTeam.playerCount} published player{selectedTeam.playerCount === 1 ? "" : "s"} for{" "}
          {selectedTeam.team}.{missingPositionNote}
        </p>
      ) : null}
      <p className="mt-1 max-w-prose text-xs text-ink-muted">
        {data.unsignedCount} unsigned record{data.unsignedCount === 1 ? "" : "s"} (free agents) can be
        added individually below; an unsigned record never joins a team by itself.
      </p>

      <form action={searchFormAction} className="mt-5 flex flex-wrap items-end gap-2">
        <input type="hidden" name="franchiseId" value={franchiseId} />
        <input type="hidden" name="revisionId" value={data.revisionId} />
        <input type="hidden" name="team" value={team} />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Search the catalog</span>
          <input
            type="search"
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Player name"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-ink-muted">Scope</span>
          <select
            name="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as Scope)}
            className={SELECT_CLASS}
          >
            <option value="all">All published records</option>
            <option value="free_agents">Unsigned (free agents)</option>
            <option value="team" disabled={!team}>
              {team || "Choose a team first"}
            </option>
          </select>
        </label>
        <button
          type="submit"
          disabled={searchPending || (scope === "team" && !team)}
          className="min-h-11 rounded-md border border-line bg-background px-4 text-sm font-medium disabled:opacity-60"
        >
          {searchPending ? "Searching…" : "Search"}
        </button>
      </form>

      {searchState.status === "error" && searchState.message ? (
        <p role="alert" className="mt-2 max-w-prose text-xs text-ink-muted">
          {searchState.message}
        </p>
      ) : null}

      {searchState.status === "ok" && (searchState.results?.length ?? 0) === 0 ? (
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          No published records match. Nothing is invented — widen the scope or check the name.
        </p>
      ) : null}

      {(searchState.results?.length ?? 0) > 0 ? (
        <>
          <ul className="mt-3 divide-y divide-line">
            {searchState.results!.map((row) => {
              const isAttached = attachedIds.has(row.id);
              return (
                <li key={row.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="text-sm font-medium">{row.fullName}</span>
                  <span className="text-xs text-ink-muted">
                    {row.team ?? "Free agent (unsigned)"} ·{" "}
                    {row.listedPosition ?? "Position unknown"} ·{" "}
                    {row.overall === null ? "OVR unknown" : `OVR ${row.overall}`}
                  </span>
                  {isAttached ? (
                    <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                      On roster
                    </span>
                  ) : (
                    <form action={recordsFormAction} className="ml-auto">
                      <input type="hidden" name="franchiseId" value={franchiseId} />
                      <input type="hidden" name="revision" value={revision} />
                      <input type="hidden" name="recordIds" value={JSON.stringify([row.id])} />
                      <button
                        type="submit"
                        disabled={recordsPending}
                        className="min-h-9 rounded-md border border-line bg-background px-3 text-xs font-medium disabled:opacity-60"
                      >
                        Attach
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
          {searchState.truncated ? (
            <p className="mt-2 max-w-prose text-xs text-ink-muted">
              Showing the first 25 matches — refine the search for the rest.
            </p>
          ) : null}
        </>
      ) : null}

      {recordsState.message ? (
        <p
          role={recordsState.status === "error" ? "alert" : "status"}
          className="mt-2 max-w-prose text-xs text-ink-muted"
        >
          {recordsState.message}
        </p>
      ) : null}
    </section>
  );
}
