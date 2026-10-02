import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { Tabs, type TabItem } from "../../components/tabs";

const tabs: TabItem[] = [
  { value: "roster", label: "Roster" },
  { value: "trade-block", label: "Trade Block" },
  { value: "trade-targets", label: "Trade Targets" },
  { value: "assets", label: "Assets & Moves" },
];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GmPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const view = typeof params.view === "string" ? params.view : undefined;
  const current = tabs.some((tab) => tab.value === view) ? (view as string) : "roster";

  return (
    <div>
      <PageHeader
        title="GM War Room"
        description="Roster, manual assets, and owner-entered transactions. No generated trades or cap simulation."
      />
      <Tabs basePath="/gm" items={tabs} current={current} />
      <div className="mt-4">
        {current === "roster" ? (
          <EmptyState
            title="Roster not connected"
            detail="Player import, free agents, and franchise rosters arrive in C1B. Unknown contract and cap values will stay visibly unknown."
          />
        ) : current === "trade-block" ? (
          <EmptyState
            title="Trade Block arrives with scouting read models"
            detail="Explained surplus and poor-fit candidates arrive in C4B. No opaque score or forced trade advice is shown."
          />
        ) : current === "trade-targets" ? (
          <EmptyState
            title="Trade Targets arrive with scouting read models"
            detail="Other-team candidates with explained scheme fit or athletic outliers arrive in C4B."
          />
        ) : (
          <EmptyState
            title="Assets and moves not connected"
            detail="Manual pick assets, contract ledger, and owner-entered deals arrive in C4A. Unentered picks remain unknown."
          />
        )}
      </div>
    </div>
  );
}
