import Link from 'next/link';
import { distinctValues, filterFormations } from '@/domain/bulk';
import { classifyFormation, describeLook } from '@/domain/families';
import { resolveAll } from '@/domain/resolution';
import { requireSession } from '@/lib/auth';
import { loadPlan } from '@/lib/loaders';
import { Badge, Card, Empty, PageHeader } from '@/components/ui';

export default async function FormationsPage({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; set?: string; personnel?: string; search?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const { formations, ctx, subs } = await loadPlan();

  const filtered = filterFormations(formations, {
    side: params.side as never,
    set: params.set || undefined,
    personnel: params.personnel || undefined,
    search: params.search || undefined,
  });

  const resolved = resolveAll(filtered, ctx);
  const overrideCounts = new Map<string, number>();
  for (const sub of subs) {
    if (sub.mode !== 'override' || !sub.playerId) continue;
    overrideCounts.set(sub.formationId, (overrideCounts.get(sub.formationId) ?? 0) + 1);
  }

  const sets = distinctValues(formations, 'set');
  const personnelGroups = distinctValues(formations, 'personnel');
  const sides = ['offense', 'defense', 'special'];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Formations"
        subtitle="Every formation in your loaded playbooks, with the role each spot inherits from."
      />

      <Card title="Filter">
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <div>
            <label className="label" htmlFor="side">
              Side
            </label>
            <select id="side" name="side" defaultValue={params.side ?? ''} className="field">
              <option value="">All</option>
              {sides.map((side) => (
                <option key={side} value={side}>
                  {side}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="set">
              Set
            </label>
            <select id="set" name="set" defaultValue={params.set ?? ''} className="field">
              <option value="">All</option>
              {sets.map((set) => (
                <option key={set} value={set}>
                  {set}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="personnel">
              Personnel
            </label>
            <select
              id="personnel"
              name="personnel"
              defaultValue={params.personnel ?? ''}
              className="field"
            >
              <option value="">All</option>
              {personnelGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              name="search"
              defaultValue={params.search ?? ''}
              className="field"
              placeholder="trips, bunch, nickel…"
            />
          </div>
          <div className="sm:col-span-4">
            <button className="btn" type="submit">
              Apply filters
            </button>
          </div>
        </form>
      </Card>

      {filtered.length === 0 ? (
        <Empty>No formations match those filters.</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((formation) => {
            const klass = classifyFormation(formation);
            const result = resolved.get(formation.id);
            const problems = (result?.unresolved.length ?? 0) + (result?.duplicates.length ?? 0);
            const overrides = overrideCounts.get(formation.id) ?? 0;
            return (
              <Link
                key={formation.id}
                href={`/formations/${formation.id}`}
                className="card block transition hover:border-accent"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold">{formation.name}</h3>
                  <Badge tone={problems ? 'warn' : 'good'}>
                    {problems ? `${problems} issue${problems === 1 ? '' : 's'}` : 'clean'}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted">{describeLook(klass)}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone="muted">{formation.slots.length} spots</Badge>
                  <Badge tone="muted">{formation.plays.length} plays</Badge>
                  {overrides ? <Badge tone="info">{overrides} sub{overrides === 1 ? '' : 's'}</Badge> : null}
                  {formation.slots.some((slot) => slot.roleCode === 'SLWR') ? (
                    <Badge tone="muted">uses SLWR</Badge>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
