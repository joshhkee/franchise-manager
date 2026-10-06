import Link from "next/link";
import { CreateFranchiseForm } from "../components/create-franchise-form";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";
import { summarizeChecklist, type ChecklistSummary } from "../lib/checklist";
import { loadChecklist } from "../lib/data/checklist";
import { loadFranchiseContext } from "../lib/data/current";

export default async function OverviewPage() {
  const result = await loadFranchiseContext();
  const context = result.ok ? result.data : null;
  const current = context?.current ?? null;

  let checklist: ChecklistSummary | null = null;
  let checklistNote: string | null = null;
  if (current && !current.archivedAt) {
    const loaded = await loadChecklist(current.id, current.revision);
    if (loaded.ok) checklist = summarizeChecklist(loaded.data.checklist);
    else checklistNote = loaded.message;
  }

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
            defaults to the Atlanta team.
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
              <h2 className="text-sm font-semibold">Pending game changes</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Final differences between your recorded baseline and your plan, derived fresh from the depth chart.
              </p>
              <div className="mt-3">
                {checklistNote ? (
                  <p className="max-w-prose text-xs text-ink-muted">{checklistNote}</p>
                ) : checklist === null ? (
                  <EmptyState title="Not available" detail="The checklist could not be derived for this franchise." />
                ) : checklist.pendingUnits === 0 ? (
                  <EmptyState
                    title="Nothing pending"
                    detail="Your plans match the recorded baseline everywhere. Plan a change on the Lineups depth chart and it appears here."
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm">
                      {checklist.pendingUnits} pending unit{checklist.pendingUnits === 1 ? "" : "s"} —{" "}
                      {checklist.readyUnits} ready, {checklist.blockedUnits} blocked
                      {checklist.positions.length > 0 ? ` (${checklist.positions.join(", ")})` : ""}.
                    </p>
                    <Link
                      href="/checklist"
                      className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
                    >
                      Open checklist
                    </Link>
                  </div>
                )}
              </div>
            </section>
            <section className="rounded-lg border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold">Lineup issues</h2>
              <p className="mt-1 text-xs text-ink-muted">
                Pending units blocked by a prerequisite (practice squad, pending transaction, or an invalid placement).
              </p>
              <div className="mt-3">
                {checklistNote ? (
                  <p className="max-w-prose text-xs text-ink-muted">{checklistNote}</p>
                ) : checklist === null || checklist.blockedUnits === 0 ? (
                  <EmptyState
                    title="No blocked lineup units"
                    detail="Nothing in your plan is waiting on a promotion, transaction, or placement repair right now."
                  />
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm">
                      {checklist.blockedUnits} blocked unit{checklist.blockedUnits === 1 ? "" : "s"}:{" "}
                      {checklist.positions.join(", ")}.
                    </p>
                    <Link
                      href="/checklist"
                      className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
                    >
                      Review blocked units
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Books and schemes</h2>
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          Formation Subs is available on Lineups with four provisional books loaded (Falcons
          offense/defense, Bears offense, Vikings defense — D128); the full 86-book inventory is on
          Settings. Scheme selections are not configured yet.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/lineups"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
          >
            Open Lineups
          </Link>
          <Link
            href="/checklist"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium"
          >
            Open Checklist
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
        Player counts and pending edits above are computed from stored app records only. Imported
        source-catalog coverage and its labels live on Settings; nothing here is presented as a
        game-verified fact.
      </p>
    </div>
  );
}
