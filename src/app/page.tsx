import Link from 'next/link';
import { importRatingsAction } from './actions';
import { getDataSourceCounts, getPlaybookSummary } from '@/db/repo';
import { readAttribute } from '@/domain/archetypes';
import { auditPlan, conflictCounts } from '@/domain/conflicts';
import { resolveAll } from '@/domain/resolution';
import { DEPTH_SLOTS } from '@/domain/depthSlots';
import { requireSession } from '@/lib/auth';
import { loadOverview, loadPlan } from '@/lib/loaders';
import { Badge, Card, Empty, PageHeader, Stat, money, ovrTone } from '@/components/ui';
import { PlayerDialog } from '@/components/PlayerDialog';

const SOURCE_LABELS: Record<string, string> = {
  'ea-ratings': 'EA ratings feed',
  manual: 'entered by you',
  save: 'franchise save file',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; slug?: string; importError?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const [{ league, roster, userTeam }, plan, sources, playbooks] = await Promise.all([
    loadOverview(),
    loadPlan(),
    getDataSourceCounts(),
    getPlaybookSummary(),
  ]);

  const resolved = resolveAll(plan.formations, plan.ctx);
  const conflicts = auditPlan(plan.formations, plan.ctx);
  const counts = conflictCounts(conflicts);

  const myRoster = userTeam ? roster.filter((player) => player.franchise.teamId === userTeam.id) : [];
  const capHit = myRoster.reduce((sum, player) => sum + (player.franchise.capHit ?? 0), 0);
  const capSpace = (league?.capTotal ?? 0) - capHit;

  // Speed decides returners, sub packages and who can run away from a linebacker, so
  // it is the one attribute worth a standing card. Every other attribute is on the
  // scouting screens, off the same EA attribute map.
  const speedOf = (player: (typeof myRoster)[number]) => readAttribute(player.ratings, 'speed');
  const fastest = myRoster
    .map((player) => ({
      player,
      speed: speedOf(player),
      acceleration: readAttribute(player.ratings, 'acceleration'),
    }))
    .filter((entry) => entry.speed !== null)
    .sort((a, b) => (b.speed ?? 0) - (a.speed ?? 0) || b.player.overall - a.player.overall)
    .slice(0, 8);
  const withAttributes = myRoster.filter((player) => speedOf(player) !== null).length;

  // Team strength from the rank-1 player at every base depth slot.
  const sideStrength = (side: 'offense' | 'defense' | 'special') => {
    const codes = DEPTH_SLOTS.filter((slot) => slot.side === side && !slot.situational).map((s) => s.code);
    const overalls: number[] = [];
    for (const code of codes) {
      const playerId = (plan.ctx.depthChart.entries[code] ?? [])[0];
      if (!playerId) continue;
      const player = plan.roster.find((entry) => entry.id === playerId);
      if (player) overalls.push(player.overall);
    }
    if (overalls.length === 0) return null;
    return Math.round(overalls.reduce((sum, value) => sum + value, 0) / overalls.length);
  };

  const pinnedSlots = plan.subs.filter((sub) => sub.mode === 'override' && sub.playerId).length;
  const formationsWithOverrides = new Set(
    plan.subs.filter((sub) => sub.mode === 'override' && sub.playerId).map((sub) => sub.formationId),
  ).size;

  return (
    <div className="space-y-4">
      <PageHeader
        title={userTeam ? `${userTeam.name}` : 'Your franchise'}
        subtitle={
          league
            ? `Season ${league.season} · week ${league.week} · ${userTeam?.conference ?? ''} ${userTeam?.division ?? ''}`.trim()
            : undefined
        }
        aside={
          <Link href="/team" className="btn-ghost">
            Team overview
          </Link>
        }
      />

      {params.imported ? (
        <p className="note note-good">
          Imported {params.imported} players from {params.slug}. Franchise rows you had already edited
          were left untouched.
        </p>
      ) : null}
      {params.importError ? (
        <p className="note note-bad">
          Import failed: {params.importError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Roster" value={myRoster.length} hint={`${roster.length} players tracked`} />
        <Stat label="Cap space" value={money(capSpace)} hint={`${money(capHit)} committed`} />
        <Stat
          label="Offense"
          value={sideStrength('offense') ?? '—'}
          hint="average starter rating"
        />
        <Stat
          label="Defense"
          value={sideStrength('defense') ?? '—'}
          hint="average starter rating"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card
          title="Where the data comes from"
          subtitle="Nothing here is implicit: you can always see which layer a number came from."
        >
          <div className="space-y-2">
            {Object.entries(sources).length === 0 ? (
              <Empty>No players yet. Run the Madden 27 ratings import to load the league.</Empty>
            ) : (
              Object.entries(sources).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between text-sm">
                  <span className="text-muted">{SOURCE_LABELS[source] ?? source}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
              ))
            )}
            <form action={importRatingsAction} className="pt-2">
              <button className="btn w-full text-center" type="submit">
                Import Madden 27 ratings
              </button>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Reads the committed Madden 27 artifact scraped from EA&apos;s own ratings database
                (<code>npm run scrape:ratings</code> re-scrapes it after a ratings update). Contract
                figures are not published by that feed, so cap fields start empty for you to fill in.
              </p>
            </form>
          </div>
        </Card>

        <Card
          title="Planning status"
          subtitle="Your plan layer, checked against every formation."
          aside={
            <Link href="/personnel" className="btn-ghost">
              Personnel control
            </Link>
          }
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Formations planned</span>
              <span className="font-semibold tabular-nums">{plan.formations.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Formation subs set</span>
              <span className="font-semibold tabular-nums">
                {pinnedSlots} across {formationsWithOverrides} formations
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Unresolved spots</span>
              <span className="font-semibold tabular-nums">{resolved.size ? counts.error : 0}</span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge tone={counts.error ? 'bad' : 'good'}>{counts.error} errors</Badge>
              <Badge tone={counts.warning ? 'warn' : 'muted'}>{counts.warning} warnings</Badge>
              <Badge tone="info">{counts.info} notes</Badge>
            </div>
            <p className="pt-1 text-[11px] leading-relaxed text-muted">
              Playbooks loaded: {playbooks.length}. Formations from civil.gg keep their own slot
              layouts until you edit them; layouts derived from a set name are our reading of the
              personnel group, so treat them as a starting point.
            </p>
          </div>
        </Card>
      </div>

      <Card
        title="Your starting eleven, by group"
        subtitle="Straight from the plan layer of your depth chart."
        aside={
          <Link href="/depth-chart" className="btn-ghost">
            Edit depth chart
          </Link>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(['offense', 'defense', 'special'] as const).map((side) => {
            const slots = DEPTH_SLOTS.filter((slot) => slot.side === side && !slot.situational);
            return (
              <div key={side} className="rounded-lg border border-line p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {side === 'special' ? 'Special teams' : side}
                </h3>
                <div className="space-y-1 text-sm">
                  {slots.slice(0, 7).map((slot) => {
                    const playerId = (plan.ctx.depthChart.entries[slot.code] ?? [])[0];
                    const player = playerId
                      ? plan.roster.find((entry) => entry.id === playerId)
                      : undefined;
                    const speed = player ? readAttribute(player.ratings, 'speed') : null;
                    return (
                      <div key={slot.code} className="flex items-center justify-between gap-2">
                        <span className="text-muted">{slot.code}</span>
                        {player ? (
                          <span className="flex items-center gap-2">
                            <PlayerDialog
                              player={player}
                              teamAbbr={userTeam?.abbr ?? null}
                              devTrait={player.franchise.devTrait}
                              className="truncate"
                            />
                            {speed !== null ? (
                              <span className="text-[11px] text-muted tabular-nums">SPD {speed}</span>
                            ) : null}
                            <Badge tone={ovrTone(player.overall)}>{player.overall}</Badge>
                          </span>
                        ) : (
                          <Badge tone="bad">empty</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card
        title="Fastest on your roster"
        subtitle="Speed and acceleration straight from EA's own attribute sheet — the numbers behind returners, sub packages and who can win the corner."
        aside={
          <Link href="/players?filters=1&team=FA" className="btn-ghost">
            Free agents
          </Link>
        }
      >
        {fastest.length === 0 ? (
          <Empty>
            No attributes yet. Import the Madden 27 ratings to get EA's full attribute set for
            every player.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>SPD</th>
                  <th className="hidden sm:table-cell">ACC</th>
                  <th>OVR</th>
                </tr>
              </thead>
              <tbody>
                {fastest.map(({ player, speed, acceleration }) => (
                  <tr key={player.id}>
                    <td>
                      <PlayerDialog
                        player={player}
                        teamAbbr={userTeam?.abbr ?? null}
                        devTrait={player.franchise.devTrait}
                      />
                    </td>
                    <td className="text-muted">{player.position}</td>
                    <td className="font-semibold tabular-nums">{speed}</td>
                    <td className="hidden tabular-nums sm:table-cell">
                      {acceleration ?? '—'}
                    </td>
                    <td>
                      <Badge tone={ovrTone(player.overall)}>{player.overall}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {withAttributes} of {myRoster.length} players on your roster carry EA&apos;s attribute
          sheet (speed, acceleration, and the rest — open any team on{' '}
          <Link href="/league" className="underline">
            scouting
          </Link>{' '}
          to sort a roster by it). Unsigned players keep the ratings they launched with, because
          EA&apos;s weekly updates only republish players who are on a team.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/callsheet" className="card block">
          <h3 className="text-sm font-semibold">Call sheet</h3>
          <p className="mt-1 text-xs text-muted">
            Down-and-distance calls, drive scripts, and a tell meter for your own tendencies.
          </p>
        </Link>
        <Link href="/checklist" className="card block">
          <h3 className="text-sm font-semibold">Apply checklist</h3>
          <p className="mt-1 text-xs text-muted">
            Exactly what to change in game, in the order the menus ask for it.
          </p>
        </Link>
        <Link href="/transactions" className="card block">
          <h3 className="text-sm font-semibold">Trades &amp; draft</h3>
          <p className="mt-1 text-xs text-muted">
            Log CPU trades and add drafted rookies so the roster stays current.
          </p>
        </Link>
        <Link href="/players" className="card block">
          <h3 className="text-sm font-semibold">Player stats</h3>
          <p className="mt-1 text-xs text-muted">
            Every player in the game ranked by any attribute, starting on your own roster.
          </p>
        </Link>
      </div>
    </div>
  );
}
