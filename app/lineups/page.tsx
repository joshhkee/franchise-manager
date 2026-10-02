import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { Tabs, type TabItem } from "../../components/tabs";

const tabs: TabItem[] = [
  { value: "depth", label: "Depth Chart" },
  { value: "formations", label: "Formation Subs" },
];

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
        description="Depth chart and formation substitutions. Verified mappings arrive in C2/C3."
      />
      <Tabs basePath="/lineups" items={tabs} current={current} />
      <div className="mt-4">
        {current === "depth" ? (
          <EmptyState
            title="Depth chart not connected"
            detail="Verified position labels, rank limits, and roster data arrive after the C0A evidence supplement and C1B/C2 implementation."
            hint="Prototype shell: no player or rank data is shown."
          />
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
