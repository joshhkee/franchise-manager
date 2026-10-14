import type { ReactNode } from "react";
import Link from "next/link";
import { EmptyState } from "../../components/empty-state";
import { PageHeader } from "../../components/page-header";
import { RosterPanel } from "../../components/roster-panel";
import { Tabs } from "../../components/tabs";
import { loadFranchiseContext } from "../../lib/data/current";
import { loadCatalogAttach } from "../../lib/data/catalog";
import { listFranchisePlayers, listPlayerFields } from "../../lib/data/franchises";
import { gmTabs } from "../../lib/tabs";
import { loadGmLedger } from "../../lib/data/gm";
import { GmLedgerPanel } from "../../components/gm-ledger-panel";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function GmPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const view = typeof params.view === "string" ? params.view : undefined;
  const current = gmTabs.some((tab) => tab.value === view) ? (view as string) : "roster";

  let roster: ReactNode = null;
  let assets: ReactNode = null;
  if (current === "roster" || current === "assets") {
    const context = await loadFranchiseContext();
    if (!context.ok) {
      roster = (
        <EmptyState
          title="Roster could not be read"
          detail={context.message}
          hint="Nothing was changed. Reload to retry."
        />
      );
    } else if (!context.data.current) {
      roster = (
        <EmptyState
          title="No franchise yet"
          detail="Create your franchise on the Overview page, then this roster stores real player and field state."
          hint="The first franchise defaults to the Atlanta team."
        />
      );
    } else {
      const franchise = context.data.current;
      const [players, fields, catalog, ledger] = await Promise.all([
        listFranchisePlayers(franchise.id),
        listPlayerFields(franchise.id),
        loadCatalogAttach(franchise.id),
        current === "assets" ? loadGmLedger(franchise.id) : loadGmLedger(franchise.id).then(() => null),
      ]);
      roster = (
        <RosterPanel franchise={franchise} players={players} fields={fields} catalog={catalog} />
      );
      if (current === "assets") {
        if (!players.ok || !fields.ok || !ledger?.ok) {
          assets = <EmptyState title="Assets & Moves could not be read" detail={!players.ok ? players.message : !fields.ok ? fields.message : ledger && !ledger.ok ? ledger.message : "Reload to retry."} hint="Nothing was changed." />;
        } else {
          const data = ledger.data;
          assets = <GmLedgerPanel franchiseId={franchise.id} revision={franchise.revision} teamName={franchise.name} players={players.data} fields={fields.data} picks={data.picks} proposals={data.proposals} settings={data.settings} sourcePlayers={data.sourcePlayers} storageAvailable={data.storageAvailable} />;
        }
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="GM War Room"
        description="Roster, manual assets, and owner-entered transactions. No generated trades or cap simulation."
      />
      <Tabs basePath="/gm" items={gmTabs} current={current} />
      <div className="mt-4">
        {current === "roster" ? (
          roster
        ) : current === "assets" ? (
          assets
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
          assets
        )}
      </div>
      {current === "roster" ? (
        <p className="mt-4 max-w-prose text-xs text-ink-muted">
          Recording a change as already-happened updates that field&apos;s recorded value and keeps
          unrelated plans. Planned edits stay separate until you record them.
        </p>
      ) : null}
      {current === "roster" ? (
        <p className="mt-2 max-w-prose text-xs text-ink-muted">
          Looking for lifecycle controls? Use{" "}
          <Link href="/franchises" className="underline">
            Franchises
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
