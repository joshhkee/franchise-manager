import { AutosaveScope } from "../../components/autosave/autosave-provider";
import { DepthChartPanel } from "../../components/depth-chart-panel";
import { EmptyState } from "../../components/empty-state";
import { FormationPanel } from "../../components/formation-panel";
import { PageHeader } from "../../components/page-header";
import { Tabs } from "../../components/tabs";
import { loadFranchiseContext } from "../../lib/data/current";
import { loadDepthChart } from "../../lib/data/depth-chart";
import { loadFormationState } from "../../lib/data/formations";
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
        description="Depth chart and formation-sub planning against this franchise's players."
      />
      <Tabs basePath="/lineups" items={lineupsTabs} current={current} />
      <div className="mt-4">
        {current === "depth" ? <DepthView /> : <FormationsView />}
      </div>
    </div>
  );
}

async function FormationsView() {
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
        detail="Formation subs plan against one franchise's players. Create a franchise first."
        hint="Nothing is invented: an empty franchise stays visibly empty."
      />
    );
  }

  if (franchise.archivedAt) {
    return (
      <EmptyState
        title={`${franchise.name} is archived`}
        detail="Archived franchises stay readable but are not planned against until resumed."
        hint="Resume it on the Franchises page to plan formations here."
      />
    );
  }

  const state = await loadFormationState(franchise.id);
  if (!state.ok) {
    const missing = /does not exist|not found|schema cache/i.test(state.message);
    return (
      <EmptyState
        title={missing ? "Formation storage is not ready yet" : "Formation state could not be read"}
        detail={
          missing
            ? "Migration 0012_formations.sql must be applied by the owner before overrides and favorites can be stored. The catalog can be inspected once it lands."
            : state.message
        }
        hint="Nothing was changed. Reload to retry."
      />
    );
  }

  return (
    <FormationPanel
      franchise={{ id: franchise.id, name: franchise.name, revision: franchise.revision }}
      state={state.data}
    />
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
