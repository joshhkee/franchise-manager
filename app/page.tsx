import Link from "next/link";
import { EmptyState } from "../components/empty-state";
import { PageHeader } from "../components/page-header";

export default function OverviewPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        description="Restrained planning shell for Madden 27 franchise work. No franchise data is connected yet."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">Pending game changes</h2>
          <p className="mt-1 text-xs text-ink-muted">Final differences to apply in Madden.</p>
          <div className="mt-3">
            <EmptyState
              title="No franchise connected"
              detail="Pending changes appear once lineup planning and persistence exist (C1B–C2B)."
            />
          </div>
        </section>
        <section className="rounded-lg border border-line bg-surface p-5">
          <h2 className="text-sm font-semibold">Lineup issues</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Missing or conflicting personnel that needs attention.
          </p>
          <div className="mt-3">
            <EmptyState
              title="No franchise connected"
              detail="Depth-chart conflicts appear after verified position rules and roster data exist (C2A)."
            />
          </div>
        </section>
      </div>
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Books and schemes</h2>
        <p className="mt-3 max-w-prose text-sm text-ink-muted">
          Playbook and scheme selections are not configured. Formation evidence and the Falcons
          mappings supplement arrive before C3A.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/lineups"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Open Lineups
          </Link>
          <Link
            href="/gameday"
            className="inline-flex min-h-11 items-center rounded-md border border-line bg-background px-4 text-sm font-medium hover:bg-surface-muted"
          >
            Open Gameday
          </Link>
        </div>
      </section>
      <p className="max-w-prose text-xs text-ink-muted">
        Prototype shell: no player records, counts, or statistics are shown until real source data is
        imported and verified.
      </p>
    </div>
  );
}
