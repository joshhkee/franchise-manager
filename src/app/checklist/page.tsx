import Link from 'next/link';
import { markPlanAppliedAction } from '../actions';
import { depthSlotGroups } from '@/domain/depthSlots';
import { resolveFormation } from '@/domain/resolution';
import { DEFAULT_LEAGUE_ID } from '@/db/repo';
import type { RosterPlayer, Side } from '@/domain/types';
import { Badge, Card, Empty, PageHeader, Stat } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { loadGameAndPlan, loadPlan } from '@/lib/loaders';

void DEFAULT_LEAGUE_ID;

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ applied?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const [{ game, plan: planChart, vocabulary }, { formations, ctx, roster, subs }] =
    await Promise.all([loadGameAndPlan(), loadPlan()]);

  const lookup = (id: string | null | undefined): RosterPlayer | undefined =>
    id ? roster.find((player) => player.id === id) : undefined;

  const nameOf = (id: string | null | undefined) => {
    const player = lookup(id);
    return player ? `${player.firstName.charAt(0)}. ${player.lastName}` : 'nobody';
  };

  // Depth chart differences, in the order the in-game screen presents them.
  const chartChanges: { slotCode: string; label: string; rank: number; from: string; to: string }[] = [];
  for (const slot of vocabulary) {
    const planRanked = planChart.entries[slot.code] ?? [];
    const gameRanked = game.entries[slot.code] ?? [];
    for (let index = 0; index < Math.max(planRanked.length, gameRanked.length, slot.ranks); index += 1) {
      const want = planRanked[index] ?? null;
      const have = gameRanked[index] ?? null;
      if (want === have) continue;
      chartChanges.push({
        slotCode: slot.code,
        label: slot.label,
        rank: index + 1,
        from: nameOf(have),
        to: nameOf(want),
      });
    }
  }

  const formationSubs = subs.filter((sub) => sub.mode === 'override' && sub.playerId);
  const subsByFormation = new Map<string, typeof formationSubs>();
  for (const sub of formationSubs) {
    const list = subsByFormation.get(sub.formationId) ?? [];
    list.push(sub);
    subsByFormation.set(sub.formationId, list);
  }

  const stUnits = formations.filter((formation) => formation.side === 'special');

  return (
    <div className="space-y-4">
      <PageHeader
        title="Apply checklist"
        subtitle="Your plan versus what the game currently has. Work down the list in game and tick it off."
      />

      {params.applied ? (
        <p className="note note-good">
          Marked the depth chart as applied — the in-game layer now matches your plan.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Depth chart changes" value={chartChanges.length} hint="slots that differ" />
        <Stat
          label="Formation subs to set"
          value={formationSubs.length}
          hint={`across ${subsByFormation.size} formations`}
        />
        <Stat label="Special teams units" value={stUnits.length} hint="planned separately" />
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
        {chartChanges.length === 0 ? (
          <Empty>
            The in-game depth chart already matches your plan. When you change something, come back
            here and it will list exactly what to move.
          </Empty>
        ) : (
          <div className="space-y-4">
            {(['offense', 'defense', 'special'] as Side[]).map((side) => {
              const groups = depthSlotGroups(side)
                .map((group) => ({
                  group: group.group,
                  changes: chartChanges.filter((change) =>
                    group.slots.some((slot) => slot.code === change.slotCode),
                  ),
                }))
                .filter((entry) => entry.changes.length > 0);
              if (groups.length === 0) return null;
              return (
                <div key={side}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {side === 'special' ? 'Special teams' : side}
                  </h3>
                  <div className="space-y-3">
                    {groups.map((entry) => (
                      <div key={entry.group}>
                        <p className="mb-1 text-xs text-muted">{entry.group}</p>
                        <ul className="space-y-1">
                          {entry.changes.map((change) => (
                            <li
                              key={`${change.slotCode}-${change.rank}`}
                              className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
                            >
                              <span className="font-semibold">
                                {change.slotCode} rank {change.rank}
                              </span>
                              <span className="text-muted">
                                {change.from} →{' '}
                                <span className="font-medium text-tone-good">{change.to}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title="Step 2 — Formation subs"
        subtitle="In game: the Formation Subs screen. Every row below is a spot where the player on the field differs from your depth chart."
      >
        {subsByFormation.size === 0 ? (
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
            {[...subsByFormation.entries()].map(([formationId, list]) => {
              const formation = formations.find((entry) => entry.id === formationId);
              if (!formation) return null;
              const resolved = resolveFormation(formation, ctx);
              return (
                <div key={formationId} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Link href={`/formations/${formationId}`} className="font-semibold underline">
                      {formation.name}
                    </Link>
                    <Badge tone="muted">{formation.set}</Badge>
                    <Badge tone="info">
                      {list.length} sub{list.length === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {list.map((sub) => {
                      const slot = formation.slots.find((entry) => entry.key === sub.slotKey);
                      const resolvedSlot = resolved.slots.find((entry) => entry.slotKey === sub.slotKey);
                      const roleRank = resolvedSlot?.roleUsed;
                      return (
                        <li key={sub.slotKey} className="flex flex-wrap items-center gap-2">
                          <span className="w-14 text-muted">{slot?.label ?? sub.slotKey}</span>
                          <span className="font-medium">{nameOf(sub.playerId)}</span>
                          <span className="text-xs text-muted">
                            (instead of the {roleRank?.code ?? slot?.roleCode ?? 'depth chart'}{' '}
                            {roleRank && roleRank.rank > 1 ? `rank ${roleRank.rank} ` : ''}player)
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card
        title="Step 3 — Check it in game"
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
          {vocabulary.map((slot) => (
            <Badge key={slot.code} tone={slot.verified ? 'good' : 'warn'}>
              {slot.code} {slot.verified ? 'confirmed' : 'unconfirmed'}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
