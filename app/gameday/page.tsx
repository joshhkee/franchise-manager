import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { Tabs, type TabItem } from "../../components/tabs";

const tabs: TabItem[] = [
  { value: "offense", label: "Offense" },
  { value: "defense", label: "Defense" },
];

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GamedayPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const side = typeof params.side === "string" ? params.side : undefined;
  const current = side === "defense" ? "defense" : "offense";

  return (
    <div>
      <PageHeader
        title="Gameday"
        description="Phone-first drive call sheet. Only verified play metadata may enter suggestions."
      />
      <Tabs basePath="/gameday" items={tabs} current={current} param="side" />
      <div className="mt-4 space-y-4">
        <EmptyState
          title="No verified play metadata yet"
          detail="The three-call drive sheet arrives after researched play metadata and owner-reviewed theme coverage (C5A/C5B). No filler calls are invented."
          hint="Optional situation controls (down/distance, field zone, personnel) will appear here."
        />
      </div>
    </div>
  );
}
