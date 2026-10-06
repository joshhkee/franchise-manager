import { BackupPanel } from "../../components/backup-panel";
import { ImportSourcePanel } from "../../components/import-source-panel";
import { PageHeader } from "../../components/page-header";
import { ThemeToggle } from "../../components/theme-toggle";
import { inventoryEntries } from "../../lib/formations/catalog";
import { INVENTORY_META } from "../../lib/formations/playbooks";
import { loadFranchiseContext } from "../../lib/data/current";
import { listSourceRevisions } from "../../lib/data/sources";

const COVERAGE_LABELS: Record<string, string> = {
  complete_as_imported: "Complete as imported",
  partial: "Partial",
  unsupported: "Unsupported",
};

const INVENTORY_ENTRIES = inventoryEntries();
const loadedCount = INVENTORY_ENTRIES.filter((entry) => entry.loaded).length;

export default async function SettingsPage() {
  const [context, revisions] = await Promise.all([loadFranchiseContext(), listSourceRevisions()]);
  const current = context.ok ? context.data.current : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Owner preferences that never create Madden checklist items."
      />
      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Light default with an optional dark theme. This preference is stored in this browser only.
        </p>
        <div className="mt-3">
          <ThemeToggle />
        </div>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Data provenance</h2>
        {!revisions.ok ? (
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Source revisions could not be read: {revisions.message}
          </p>
        ) : revisions.data.length === 0 ? (
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            No source revision has been imported yet. The immutable catalog tables and their policies
            exist; a revision appears here only after a real import with its coverage label and
            missing-field report.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {revisions.data.map((revision) => (
              <li key={revision.id} className="rounded-md border border-line bg-background p-3">
                <p className="text-sm font-medium">
                  {revision.source} · {revision.revisionKey}
                </p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {COVERAGE_LABELS[revision.coverageStatus] ?? revision.coverageStatus} ·{" "}
                  {revision.recordCount} record{revision.recordCount === 1 ? "" : "s"}
                  {revision.capturedAt ? ` · captured ${revision.capturedAt.slice(0, 10)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 max-w-prose text-xs text-ink-muted">
          &ldquo;Complete as imported&rdquo; describes what the source published, not full game
          coverage; no claim is made about records the source never listed. Published records are
          immutable: a franchise edit never changes the catalog.
        </p>
        <ImportSourcePanel hasRevision={revisions.ok && revisions.data.length > 0} />
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Madden 27 playbook inventory</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Every playbook in the game, and whether this site carries formation data for it. Loaded
          means formation records exist here — never that every mapping is verified (D128).
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-ink-muted">
            {INVENTORY_ENTRIES.length} playbooks · {loadedCount} loaded
          </summary>
          <p className="mt-1 text-xs text-ink-muted">Source: {INVENTORY_META.source} ({INVENTORY_META.crawledAt}).</p>
          <ul className="mt-2 max-h-64 space-y-0.5 overflow-y-auto text-sm">
            {INVENTORY_ENTRIES.map((entry) => (
              <li key={entry.playbook.id} className="flex items-center justify-between gap-2 rounded px-1 py-0.5">
                <span className="truncate">
                  {entry.playbook.teamLabel} {entry.playbook.label}
                  <span className="ml-1 text-xs text-ink-muted">{entry.playbook.side}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {entry.loaded
                    ? `loaded · ${entry.formationCount} formations (${entry.mappedCount} mapped)`
                    : "not loaded"}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Backup and restore</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          One versioned envelope holds every stored record for a franchise (contract section 8). The
          format adds features as later checkpoints add state.
        </p>
        <BackupPanel franchiseId={current?.id ?? null} franchiseName={current?.name ?? null} />
      </section>

      <section className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-sm font-semibold">Account</h2>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Signed in with private GitHub OAuth. Franchise data is reachable only by the allowlisted owner
          account; every other identity is refused and signed out, and the database denies it independently
          of this screen.
        </p>
        <form action="/auth/sign-out" method="post" className="mt-3">
          <button
            type="submit"
            className="min-h-11 rounded-md border border-line bg-background px-3 text-sm font-medium"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}
