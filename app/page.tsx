import Link from "next/link";
import { CreateFranchiseForm } from "../components/create-franchise-form";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";
import { loadFranchiseContext } from "../lib/data/current";

export default async function OverviewPage() {
  const result = await loadFranchiseContext();
  const context = result.ok ? result.data : null;
  const current = context?.current ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description="Private franchise planning workspace. Everything shown here comes from stored app records."
      />

      {!context ? (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">Franchise data unavailable</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            {result.ok ? "" : result.message}
          </p>
          <p className="mt-3 max-w-prose text-xs text-ink-muted">
            Nothing was changed. Reload to retry; if this persists, check the project credentials in{" "}
            <code className="text-xs">.env.local</code>.
          </p>
        </section>
      ) : !current ? (
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">No franchise yet</h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Create your franchise to start storing roster and planning state. The first franchise
            defaults to the Atlanta club.
          </p>
          <CreateFranchiseForm />
        </section>
      ) : (
        <>
          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">Active franchise</h2>
              <p className="text-xs text-ink-muted">Revision {current.revision}</p>
            </div>
            <p className="mt-1 text-lg font-semibold">{current.name}</p>
            <p className="mt-1 text-xs text-ink-muted">
              {current.playerCount} player{current.playerCount === 1 ? "" : "s"} ·{" "}
              {current.pendingFieldCount} pending field edit
              {current.pendingFieldCount === 1 ? "" : "s"}
              {current.archivedAt ? " · Archived (read-only until resumed)" : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/gm?view=roster"
                className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
              >
                Open roster
              </Link>
              <Link
                href="/franchises"
                className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
              >
                Manage franchises
              </Link>
            </div>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold">Pending field changes</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Planned edits that are not yet recorded as already-happened.
              </p>
              <div className="mt-3">
                {current.pendingFieldCount === 0 ? (
                  <EmptyState
                    title="Nothing pending"
                    detail="Planned player-field edits open here once you plan a change on the roster."
                  />
                ) : (
                  <p className="text-sm">
                    {current.pendingFieldCount} planned field edit
                    {current.pendingFieldCount === 1 ? "" : "s"} waiting in{" "}
                    <Link href="/gm?view=roster" className="underline">
                      the roster
                    </Link>
                    .
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold">Lineup issues</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Missing or conflicting personnel that needs attention.
              </p>
              <div className="mt-3">
                <EmptyState
                  title="No depth chart yet"
                  detail="Depth-chart conflicts appear after verified position rules and roster data exist (C2A)."
                />
              </div>
            </section>
          </div>
        </>
      )}

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Books and schemes</h2>
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          Playbook and scheme selections are not configured. Formation evidence and the Falcons
          mappings supplement arrive before C3A.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/lineups"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
          >
            Open Lineups
          </Link>
          <Link
            href="/gameday"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
          >
            Open Gameday
          </Link>
        </div>
      </section>

      <p className="max-w-prose text-xs text-ink-muted">
        Player counts and pending edits above are computed from stored app records only. No Madden
        ratings, coverage, or statistics are shown until a source revision is imported and verified.
      </p>
    </div>
  );
}
