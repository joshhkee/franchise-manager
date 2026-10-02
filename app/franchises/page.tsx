import { CreateFranchiseForm } from "../../components/create-franchise-form";
import { EmptyState } from "../../components/empty-state";
import { FranchiseManager } from "../../components/franchise-manager";
import { PageHeader } from "../../components/page-header";
import { loadFranchiseContext } from "../../lib/data/current";

export default async function FranchisesPage() {
  const result = await loadFranchiseContext();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Franchises"
        description="Create, switch, rename, archive, and resume franchise records. One owner, isolated per franchise."
      />

      {!result.ok ? (
        <EmptyState
          title="Franchises could not be read"
          detail={result.message}
          hint="Nothing was changed. Reload to retry."
        />
      ) : (
        <>
          {result.data.summaries.length === 0 ? (
            <EmptyState
              title="No franchise yet"
              detail="The first franchise defaults to the Atlanta club. Archived franchises stay readable but are not planned against until resumed."
            />
          ) : (
            <FranchiseManager
              summaries={result.data.summaries}
              currentId={result.data.current?.id ?? null}
            />
          )}

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold">New franchise</h2>
            <p className="mt-1 max-w-prose text-sm text-ink-muted">
              A new franchise starts empty with its own revision counter and its own players. Nothing is
              copied from another franchise.
            </p>
            <CreateFranchiseForm />
          </section>
        </>
      )}
    </div>
  );
}
