import { AutosaveScope } from "../../components/autosave/autosave-provider";
import { DepthChartPanel } from "../../components/depth-chart-panel";
import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { Tabs } from "../../components/tabs";
import { loadFranchiseContext } from "../../lib/data/current";
import { loadDepthChart } from "../../lib/data/depth-chart";
import { lineupsTabs } from "../../lib/tabs";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LineupsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = typeof params.view === "string" ? params.view : undefined;
  const current = view === "formations" ? "formations" : "depth";

  return (
    <div>
      <PageHeader
        title="Lineups"
        description="Depth chart planning against this franchise's players; formation substitutions arrive in C3."
      />
      <Tabs basePath="/lineups" items={lineupsTabs} current={current} />
      <div className="mt-4">
        {current === "depth" ? (
          <DepthView />
        ) : (
          <EmptyState
            title="Formation substitutions not connected"
            detail="Formation diagrams and slot evidence arrive in C3A. The Falcons representative mappings are part of the C0A evidence supplement."
            hint="Offense line top, defense line bottom — orientation evidence still required."
          />
        )}
      </div>
    </div>
  );
}

async function DepthView() {
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
        detail="The depth chart plans against one franchise's players. Create a franchise first; the first one defaults to the Atlanta team."
        hint="Nothing is invented: an empty franchise stays visibly empty."
      />
    );
  }

  if (franchise.archivedAt) {
    return (
      <EmptyState
        title={`${franchise.name} is archived`}
        detail="Archived franchises stay readable but are not planned against until resumed, so nothing is edited silently."
        hint="Resume it on the Franchises page to plan lineups here."
      />
    );
  }

  const chart = await loadDepthChart(franchise.id);
  if (!chart.ok) {
    return (
      <EmptyState
        title="Depth chart could not be read"
        detail={chart.message}
        hint="Nothing was changed. Reload to retry."
      />
    );
  }

  return (
    <AutosaveScope franchiseId={franchise.id} revision={franchise.revision}>
      <DepthChartPanel
        franchise={{ id: franchise.id, name: franchise.name, revision: franchise.revision }}
        data={chart.data}
      />
    </AutosaveScope>
  );
}
