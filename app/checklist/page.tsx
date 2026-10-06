import { ChecklistPanel } from "../../components/checklist-panel";
import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { loadChecklist } from "../../lib/data/checklist";
import { loadFranchiseContext } from "../../lib/data/current";

export default async function ChecklistPage() {
  return (
    <div>
      <PageHeader
        title="Checklist"
        description="Final differences to apply in Madden — confirmations correct app records only."
      />
      <div className="mt-4">
        <ChecklistView />
      </div>
    </div>
  );
}

async function ChecklistView() {
  const context = await loadFranchiseContext();

  if (!context.ok) {
    return (
      <EmptyState
        title="Franchise could not be read"
        detail={context.message}
        hint="Nothing was changed. Reload to retry."
      />
    );
  }

  const franchise = context.data.current;
  if (!franchise) {
    return (
      <EmptyState
        title="No franchise yet"
        detail="The checklist derives from one franchise's plan and recorded baseline. Create a franchise first; the first one defaults to the Atlanta team."
        hint="Nothing is invented: an empty franchise stays visibly empty."
      />
    );
  }

  if (franchise.archivedAt) {
    return (
      <EmptyState
        title={`${franchise.name} is archived`}
        detail="Archived franchises stay readable but are not planned against until resumed, so nothing is confirmed silently."
        hint="Resume it on the Franchises page to work the checklist here."
      />
    );
  }

  const loaded = await loadChecklist(franchise.id, franchise.revision);
  if (!loaded.ok) {
    return (
      <EmptyState
        title="Checklist could not be read"
        detail={loaded.message}
        hint="Nothing was changed. Reload to retry."
      />
    );
  }

  if (loaded.data.players.length === 0) {
    return (
      <EmptyState
        title="No players to check yet"
        detail="The checklist works from this franchise's depth-chart plan and recorded baseline. Attach a published team roster or add players from GM War Room → Roster first."
        hint="An empty roster stays visibly empty — nothing is invented."
      />
    );
  }

  return (
    // Keyed per franchise only: a mutation keeps its status line and selection, while switching
    // franchises starts with a clean default selection.
    <ChecklistPanel
      key={franchise.id}
      franchise={{ id: franchise.id, name: franchise.name, revision: franchise.revision }}
      data={loaded.data}
    />
  );
}
