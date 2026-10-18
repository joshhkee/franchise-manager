import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { ScoutingPanel } from "../../components/scouting-panel";
import { Tabs } from "../../components/tabs";
import { loadFranchiseContext } from "../../lib/data/current";
import { loadScouting } from "../../lib/data/scouting";
import { coachTabs } from "../../lib/tabs";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CoachPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const view = typeof params.view === "string" ? params.view : undefined;
  const current = coachTabs.some((tab) => tab.value === view)
    ? (view as "scheme" | "gaps" | "identity")
    : "scheme";
  const context = await loadFranchiseContext();
  let content;
  if (!context.ok) {
    content = <EmptyState title="Franchise could not be read" detail={context.message} hint="Nothing was changed. Reload to retry." />;
  } else if (!context.data.current) {
    content = <EmptyState title="No franchise yet" detail="Create a franchise before setting its scheme, playbooks, or scouting shortlist." hint="The first franchise defaults to the Atlanta team." />;
  } else {
    const franchise = context.data.current;
    const result = await loadScouting(franchise.id);
    content = !result.ok
      ? <EmptyState title="Coach data could not be read" detail={result.message} hint="Nothing was changed. Reload to retry." />
      : <ScoutingPanel franchiseId={franchise.id} revision={franchise.revision} data={result.data} view={current} />;
  }
  return <div>
    <PageHeader title="Coach View" description="Scheme preferences and personnel context, separated from official game facts." />
    <Tabs basePath="/coach" items={coachTabs} current={current} />
    <div className="mt-4">{content}</div>
  </div>;
}
