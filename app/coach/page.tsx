import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { Tabs } from "../../components/tabs";
import { coachTabs } from "../../lib/tabs";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const view = typeof params.view === "string" ? params.view : undefined;
  const current = coachTabs.some((tab) => tab.value === view) ? (view as string) : "scheme";

  return (
    <div>
      <PageHeader
        title="Coach View"
        description="Scheme fit and personnel context, separated from official game facts."
      />
      <Tabs basePath="/coach" items={coachTabs} current={current} />
      <div className="mt-4">
        {current === "scheme" ? (
          <EmptyState
            title="Scheme and playbook not configured"
            detail="Verified Falcons scheme defaults and independent playbook selection arrive after formation evidence (C3/C4B)."
          />
        ) : current === "gaps" ? (
          <EmptyState
            title="Personnel gaps arrive with roster read models"
            detail="Chosen-formation needs and role concentration are analyzed in C4B."
          />
        ) : (
          <EmptyState
            title="Formation identity arrives with verified mappings"
            detail="Favorites, look families, and complementary concepts arrive with formation coverage (C3/C4B)."
          />
        )}
      </div>
    </div>
  );
}
