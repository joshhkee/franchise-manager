import { EmptyState } from "../../components/empty-state";
import { GamedayPanel } from "../../components/gameday-panel";
import { PageHeader } from "../../components/page-header";
import { Tabs } from "../../components/tabs";
import { loadFranchiseContext } from "../../lib/data/current";
import { loadGameday } from "../../lib/data/gameday";
import { gamedayTabs } from "../../lib/tabs";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GamedayPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const side = typeof params.side === "string" ? params.side : undefined;
  const current = side === "defense" ? "defense" : "offense";

  const context = await loadFranchiseContext();
  let content;
  if (!context.ok) content = <EmptyState title="Franchise could not be read" detail={context.message} hint="Nothing was changed. Reload to retry." />;
  else if (!context.data.current) content = <EmptyState title="No franchise yet" detail="Create a franchise before opening its call sheet." />;
  else {
    const franchise = context.data.current;
    const data = await loadGameday(franchise.id);
    content = data.ok
      ? <GamedayPanel franchiseId={franchise.id} revision={franchise.revision} side={current} data={data.data} />
      : <EmptyState title="Gameday data could not be read" detail={data.message} hint="Confirm the existing franchise and formation migrations are applied; nothing was changed." />;
  }
  return (
    <div>
      <PageHeader title="Gameday" description="A phone-first call sheet built from observed Civil.GG Madden 27 calls. Coaching fit is heuristic; mappings remain provisional." />
      <Tabs basePath="/gameday" items={gamedayTabs} current={current} param="side" />
      <div className="mt-4 space-y-4">{content}</div>
    </div>
  );
}
