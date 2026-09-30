import Link from 'next/link';
import { markPlanAppliedAction } from '../actions';
import { Badge, Card, Empty, PageHeader, Stat } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { buildChecklist, changesBySide } from '@/lib/checklist';

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const checklist = await buildChecklist();

  const formationsWithSubs = new Set(checklist.subs.map((sub) => sub.formationId)).size;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Apply checklist"
        subtitle="Your plan versus what the game currently has. Work down the list in game and tick it off."
        aside={
          <div className="flex gap-2">
            <a className="btn-ghost" href="/api/checklist/export?format=md">
              Export .md
            </a>
            <a className="btn-ghost" href="/api/checklist/export?format=csv">
              Export .csv
            </a>
          </div>
        }
      />

      {params.applied ? (
        <p className="note note-good">
          Marked the depth chart as applied — the in-game layer now matches your plan.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Depth chart changes" value={checklist.changes.length} hint="slots that differ" />
        <Stat
          label="Formation subs to set"
          value={checklist.subs.length}
          hint={`across ${formationsWithSubs} formations`}
        />
        <Stat label="Special teams units" value={checklist.units.length} hint="one lineup each" />
      </div>

      <Card
        title="Step 1 — Depth chart"
        subtitle="In game: My Team → Depth Chart. These are the exact differences, in screen order."
        aside={
          <form action={markPlanAppliedAction}>
            <input type="hidden" name="scope" value="depth-chart" />
            <button className="btn-ghost" type="submit">
              I applied these
            </button>
          </form>
        }
      >
        {checklist.changes.length === 0 ? (
          <Empty>
            The in-game depth chart already matches your plan. When you change something, come back
            here and it will list exactly what to move.
          </Empty>
        ) : (
          <div className="space-y-4">
            {changesBySide(checklist).map((group) => (
              <div key={group.side}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.label}
                </h3>
                <ul className="space-y-1">
                  {group.changes.map((change) => (
                    <li
                      key={`${change.slotCode}-${change.rank}`}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
                    >
                      <span className="font-semibold">
                        {change.slotCode} rank {change.rank}
                      </span>
                      <span className="text-muted">
                        {change.from} → <span className="font-medium text-tone-good">{change.to}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Step 2 — Special teams units"
        subtitle="In game: the special teams screen. Each unit below is eleven men, in the spots the diagram shows."
      >
        {checklist.units.length === 0 ? (
          <Empty>
            No special teams units are loaded. They arrive with the seeded playbooks, or with{' '}
            <code>npm run scrape:playbooks</code>.
          </Empty>
        ) : (
          <div className="space-y-3">
            {checklist.units.map((unit) => (
              <div key={unit.id} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Link href={`/formations/${unit.id}`} className="font-semibold underline">
                    {unit.name}
                  </Link>
                  {unit.set && unit.set !== unit.name ? <Badge tone="muted">{unit.set}</Badge> : null}
                  <Badge tone="info">{unit.personnel}</Badge>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  {unit.players.map((player) => (
                    <span
                      key={`${unit.id}-${player.label}`}
                      className="rounded-lg border border-line px-2 py-1"
                    >
                      <span className="text-muted">{player.label}</span>{' '}
                      <span className="font-medium">{player.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Step 3 — Formation subs"
        subtitle="In game: the Formation Subs screen. Every row below is a spot where the player on the field differs from your depth chart."
      >
        {checklist.subs.length === 0 ? (
          <Empty>
            No formation subs yet. Set them per formation on a{' '}
            <Link href="/formations" className="underline">
              formation page
            </Link>
            , or apply one across a group at once from{' '}
            <Link href="/personnel" className="underline">
              personnel control
            </Link>
            .
          </Empty>
        ) : (
          <div className="space-y-3">
            {[...new Set(checklist.subs.map((sub) => sub.formationId))].map((formationId) => {
              const rows = checklist.subs.filter((sub) => sub.formationId === formationId);
              const first = rows[0]!;
              return (
                <div key={formationId} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Link href={`/formations/${formationId}`} className="font-semibold underline">
                      {first.formationName}
                    </Link>
                    <Badge tone="muted">{first.set}</Badge>
                    <Badge tone="info">
                      {rows.length} sub{rows.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {rows.map((row) => (
                      <li key={`${row.formationId}-${row.slotLabel}`} className="flex flex-wrap items-center gap-2">
                        <span className="w-14 text-muted">{row.slotLabel}</span>
                        <span className="font-medium">{row.name}</span>
                        <span className="text-xs text-muted">(instead of the {row.insteadOf} player)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title="Step 4 — Check it in game"
        subtitle="Two things the app cannot verify for you, and what to do about them."
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            Madden&apos;s own packaging decides which situational roles a formation actually consults
            (<code>SLWR</code>, <code>3DRB</code>, <code>NB</code>). Load the game, step into a
            formation, and confirm the player you expect is on the field. If a spot disagrees,{' '}
            <Link href="/personnel" className="underline">
              rebind that spot
            </Link>{' '}
            to the role the game really uses.
          </li>
          <li>
            Once you own the game and can point the importer at your franchise save, the in-game
            depth chart and formation subs read in automatically and this checklist shrinks to just
            the differences.
          </li>
        </ul>
      </Card>

      <Card title="Vocabulary status" subtitle="Which depth chart roles you have confirmed in game.">
        <div className="flex flex-wrap gap-2">
          {checklist.vocabulary.map((slot) => (
            <Badge key={slot.code} tone={slot.verified ? 'good' : 'warn'}>
              {slot.code} {slot.verified ? 'confirmed' : 'unconfirmed'}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
