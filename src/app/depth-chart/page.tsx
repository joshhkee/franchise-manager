import Link from 'next/link';
import {
  copyGameDepthChartToPlanAction,
  seedDepthChartAction,
  setDepthSlotAction,
} from '../actions';
import { depthSlotGroups } from '@/domain/depthSlots';
import type { Side } from '@/domain/types';
import { requireSession } from '@/lib/auth';
import { loadGameAndPlan, loadOverview } from '@/lib/loaders';
import { Badge, Card, PageHeader } from '@/components/ui';
import { EligiblePlayerSelect, TeamSelect } from '@/components/pickers';

const SIDES: Side[] = ['offense', 'defense', 'special'];

export default async function DepthChartPage({
  searchParams,
}: {
  searchParams: Promise<{
    layer?: string;
    copied?: string;
    seeded?: string;
    teamSet?: string;
    unfilled?: string;
    seedError?: string;
  }>;
}) {
  await requireSession();
  const params = await searchParams;
  const layer = params.layer === 'game' ? 'game' : 'plan';
  const otherLayer = layer === 'game' ? 'plan' : 'game';

  const [{ game, plan, vocabulary }, { teams, roster, userTeam }] = await Promise.all([
    loadGameAndPlan(),
    loadOverview(),
  ]);
  const seededTeam = params.seeded
    ? (teams.find((team) => team.id === params.seeded) ?? null)
    : null;
  const active = layer === 'game' ? game : plan;
  const other = otherLayer === 'game' ? game : plan;

  const teamRoster = userTeam
    ? roster.filter(
        (player) =>
          player.franchise.teamId === userTeam.id && player.franchise.rosterStatus !== 'free-agent',
      )
    : roster;

  const counts = vocabulary.reduce(
    (acc, slot) => {
      const filled = (active.entries[slot.code] ?? []).filter(Boolean).length;
      acc.filled += filled;
      acc.capacity += slot.ranks;
      return acc;
    },
    { filled: 0, capacity: 0 },
  );

  const changedSlots = vocabulary.filter((slot) => {
    const a = (active.entries[slot.code] ?? []).join(',');
    const b = (other.entries[slot.code] ?? []).join(',');
    return a !== b;
  }).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Depth chart"
        subtitle="Madden's real role slots, including the situational ones. This is the layer every formation inherits from."
        aside={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/depth-chart?layer=${layer === 'plan' ? 'game' : 'plan'}`}
              className="btn-ghost"
            >
              Viewing: {layer === 'plan' ? 'my plan' : 'in game'} · switch
            </Link>
            {layer === 'plan' ? (
              <form action={copyGameDepthChartToPlanAction}>
                <button className="btn-ghost" type="submit">
                  Copy in-game into my plan
                </button>
              </form>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge tone="info">{layer === 'plan' ? 'Planning layer' : 'In-game layer'}</Badge>
        <span>
          {counts.filled} of {counts.capacity} ranked spots filled
        </span>
        <span>·</span>
        <span>{changedSlots} slots differ from the other layer</span>
        <span>·</span>
        <span>Slots marked ? are vocabulary not yet confirmed against Madden 27</span>
      </div>

      {params.seeded ? (
        <p className="note note-good">
          Seeded the depth chart from the{' '}
          {seededTeam ? `${seededTeam.abbr} · ${seededTeam.name}` : params.seeded} roster. It is derived
          from position and overall, so treat it as a starting point and edit it here like any other
          chart.
          {params.teamSet ? ' This franchise now plays as that team.' : ''}
        </p>
      ) : null}
      {params.seedError ? (
        <p className="note note-bad">Could not seed the depth chart: {params.seedError}</p>
      ) : null}
      {params.unfilled ? (
        <p className="note note-warn">
          No eligible player on the roster for: {params.unfilled.split(',').join(', ')}. Those roles
          stay empty until you fill them.
        </p>
      ) : null}
      {params.copied ? (
        <p className="note note-good">
          Copied the in-game depth chart into your plan.
        </p>
      ) : null}

      <Card
        title="Seed from a real roster"
        subtitle="The ratings feed is a flat player list, so this derives a chart from position and overall — a starting point you edit, not Madden's own chart."
      >
        <form action={seedDepthChartAction} className="space-y-3">
          <p className="text-xs leading-relaxed text-muted">
            Best eligible player takes each primary role, package roles go to the next man up (the slot
            receiver is the second receiver, the nickel back the second corner), returners go to the
            fastest men, and everyone else backs up. Both layers are written; formation subs are left
            alone.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[15rem] flex-1">
              <span className="label">Seed from</span>
              <TeamSelect
                teams={teams}
                name="teamId"
                selected={userTeam?.id ?? null}
                includeEmpty={false}
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="force" value="1" defaultChecked={counts.filled === 0} />
              Replace the current chart
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="makeTeam" value="1" />
              Make it my franchise team
            </label>
            <button className="btn" type="submit">
              Seed depth chart
            </button>
          </div>
          {counts.filled > 0 ? (
            <p className="text-xs text-muted">
              Your chart already has {counts.filled} ranked spots. Seeding overwrites them in both
              layers, so it refuses unless you tick Replace.
            </p>
          ) : null}
        </form>
      </Card>

      <Card
        title="How this works"
        subtitle="Change a role here and every formation that consults it follows — unless you pinned a player for that formation."
      >
        <p className="text-xs leading-relaxed text-muted">
          Example: swapping SLWR changes the slot receiver in every Trips and Bunch formation at once.
          The{' '}
          <Link href="/personnel" className="underline">
            personnel control
          </Link>{' '}
          screen shows the blast radius before you commit, and which formations you have overridden.
        </p>
      </Card>

      {SIDES.map((side) => (
        <Card key={side} title={side === 'special' ? 'Special teams' : side}>
          <div className="space-y-4">
            {depthSlotGroups(side).map((group) => (
              <div key={group.group}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {group.group}
                </h3>
                <div className="grid gap-2 lg:grid-cols-2">
                  {group.slots.map((slot) => {
                    const ranked = active.entries[slot.code] ?? [];
                    const otherRanked = other.entries[slot.code] ?? [];
                    const differs = ranked.join(',') !== otherRanked.join(',');
                    return (
                      <div
                        key={slot.code}
                        className="rounded-lg border border-line bg-surface-2 p-3"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{slot.code}</span>
                          <span className="text-xs text-muted">{slot.label}</span>
                          {slot.situational ? <Badge tone="info">situational</Badge> : null}
                          {!slot.verified ? <Badge tone="warn">unconfirmed</Badge> : null}
                          {differs ? <Badge tone="muted">≠ other layer</Badge> : null}
                        </div>
                        <p className="mb-2 text-[11px] leading-relaxed text-muted">
                          {slot.description}
                        </p>
                        <div className="space-y-2">
                          {Array.from({ length: slot.ranks }).map((_, index) => {
                            const rank = index + 1;
                            const current = ranked[index] ?? null;
                            return (
                              <form
                                key={rank}
                                action={setDepthSlotAction}
                                className="flex items-center gap-2"
                              >
                                <input type="hidden" name="layer" value={layer} />
                                <input type="hidden" name="slotCode" value={slot.code} />
                                <input type="hidden" name="rank" value={rank} />
                                <span className="w-6 shrink-0 text-xs text-muted">{rank}</span>
                                <EligiblePlayerSelect
                                  players={teamRoster}
                                  positions={slot.eligiblePositions}
                                  name="playerId"
                                  selected={current}
                                  emptyLabel="— empty —"
                                />
                                <button className="btn-ghost shrink-0" type="submit">
                                  Set
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
