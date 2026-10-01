import Link from 'next/link';
import { restoreSnapshotAction, setUserTeamAction, updateLeagueAction } from '../actions';
import { depthSlotGroups } from '@/domain/depthSlots';
import { isUnverifiedVocabulary } from '@/domain/depthSlots';
import type { RosterPlayer, Side } from '@/domain/types';
import { requireSession } from '@/lib/auth';
import { loadOverview, loadPlan } from '@/lib/loaders';
import { Badge, Card, Empty, PageHeader, Stat, money, ovrTone } from '@/components/ui';
import { PlayerDialog } from '@/components/PlayerDialog';
import { TeamSelect } from '@/components/pickers';

function PlayerLine({ player, teamAbbr }: { player: RosterPlayer; teamAbbr?: string | null }) {
  const injury = player.franchise.injuryStatus;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <PlayerDialog
        player={player}
        teamAbbr={teamAbbr}
        devTrait={player.franchise.devTrait}
        className="truncate"
      />
      <Badge tone={ovrTone(player.overall)}>{player.overall}</Badge>
      {player.franchise.devTrait && player.franchise.devTrait !== 'normal' ? (
        <Badge tone="info">
          {player.franchise.devTrait === 'xfactor'
            ? 'XF'
            : player.franchise.devTrait === 'superstar'
              ? 'SS'
              : 'STAR'}
        </Badge>
      ) : null}
      {injury && injury !== 'healthy' ? <Badge tone="bad">{injury}</Badge> : null}
      {player.franchise.contractYears !== null && player.franchise.contractYears <= 1 ? (
        <Badge tone="warn">expiring</Badge>
      ) : null}
    </span>
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{
    teamSet?: string;
    leagueSaved?: string;
    restored?: string;
    restoreError?: string;
  }>;
}) {
  await requireSession();
  const params = await searchParams;
  const [{ league, teams, roster, userTeam }, plan] = await Promise.all([loadOverview(), loadPlan()]);

  const myRoster = userTeam ? roster.filter((player) => player.franchise.teamId === userTeam.id) : [];
  const chart = plan.ctx.depthChart;

  const capHit = myRoster.reduce((sum, player) => sum + (player.franchise.capHit ?? 0), 0);
  const capTotal = league?.capTotal ?? 279_000_000;
  const topHits = [...myRoster]
    .filter((player) => player.franchise.capHit)
    .sort((a, b) => (b.franchise.capHit ?? 0) - (a.franchise.capHit ?? 0))
    .slice(0, 8);
  const expiring = myRoster
    .filter((player) => player.franchise.contractYears !== null && player.franchise.contractYears <= 1)
    .sort((a, b) => b.overall - a.overall);

  const devCounts = {
    xfactor: myRoster.filter((p) => p.franchise.devTrait === 'xfactor').length,
    superstar: myRoster.filter((p) => p.franchise.devTrait === 'superstar').length,
    star: myRoster.filter((p) => p.franchise.devTrait === 'star').length,
  };

  const abbrById = new Map(teams.map((team) => [team.id, team.abbr]));
  const abbrFor = (player: RosterPlayer) =>
    abbrById.get(player.franchise.teamId ?? player.teamId ?? '') ?? null;

  const playerById = new Map(myRoster.map((player) => [player.id, player]));
  const lookup = (id: string | null | undefined) =>
    id ? (playerById.get(id) ?? plan.roster.find((p) => p.id === id)) : undefined;

  const sideLabel: Record<Side, string> = {
    offense: 'Offense',
    defense: 'Defense',
    special: 'Special Teams',
  };

  /** Positional need: a weak starter, no depth behind him, or a deal about to expire. */
  const needsFor = (side: Side) =>
    depthSlotGroups(side)
      .map((group) => {
        const baseSlots = group.slots.filter((slot) => !slot.situational);
        const starters = baseSlots
          .map((slot) => lookup((chart.entries[slot.code] ?? [])[0]))
          .filter((player): player is RosterPlayer => Boolean(player));
        const depth = baseSlots.flatMap((slot) =>
          (chart.entries[slot.code] ?? []).slice(1).map((id) => lookup(id)),
        );
        const avg = starters.length
          ? Math.round(starters.reduce((sum, player) => sum + player.overall, 0) / starters.length)
          : 0;
        const expiringHere = [...starters, ...depth].filter(
          (player) => player?.franchise.contractYears !== null && (player?.franchise.contractYears ?? 9) <= 1,
        ).length;
        const score = (avg ? Math.max(0, 82 - avg) : 12) + (depth.length < baseSlots.length ? 4 : 0) + expiringHere * 2;
        return { group: group.group, avg, depth: depth.length, expiring: expiringHere, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Team overview"
        subtitle="Every group on offense, defense and special teams, read from your plan layer."
        aside={
          <form action={setUserTeamAction} className="flex items-end gap-2">
            <div>
              <label className="label" htmlFor="teamId">
                My team
              </label>
              <TeamSelect
                teams={teams}
                name="teamId"
                selected={userTeam?.id ?? null}
                includeEmpty={false}
              />
            </div>
            <button className="btn" type="submit">
              Set
            </button>
          </form>
        }
      />

      {params.teamSet ? (
        <p className="note note-good">
          Saved. Depth charts still point at the old team until you edit them.
        </p>
      ) : null}
      {params.leagueSaved ? (
        <p className="note note-good">
          League state saved.
        </p>
      ) : null}
      {params.restored ? (
        <p className="note note-good">
          Restored {params.restored} rows from the snapshot. Playbooks are unchanged.
        </p>
      ) : null}
      {params.restoreError ? (
        <p className="note note-bad">
          Restore failed: {params.restoreError}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Players" value={myRoster.length} hint="on your roster" />
        <Stat
          label="Cap space"
          value={money(capTotal - capHit)}
          hint={`${money(capHit)} of ${money(capTotal)}`}
        />
        <Stat
          label="Expiring deals"
          value={expiring.length}
          hint="one year or fewer remaining"
        />
        <Stat
          label="Impact players"
          value={devCounts.xfactor + devCounts.superstar}
          hint={`${devCounts.xfactor} X-factor, ${devCounts.superstar} superstar, ${devCounts.star} star`}
        />
      </div>

      {myRoster.length === 0 ? (
        <Empty>No players on this team yet. Run the Madden 27 ratings import first.</Empty>
      ) : null}

      {(['offense', 'defense', 'special'] as Side[]).map((side) => (
        <Card
          key={side}
          title={sideLabel[side]}
          subtitle={
            side === 'special'
              ? 'Kickers, punters, snappers and returners.'
              : `${side === 'offense' ? 'Skill and line' : 'Front, linebackers and secondary'}, ordered by your depth chart.`
          }
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {depthSlotGroups(side).map((group) => (
              <div key={group.group} className="rounded-lg border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {group.group}
                  </h3>
                  {group.slots.some((slot) => slot.situational) ? (
                    <Badge tone="muted">has situational roles</Badge>
                  ) : null}
                </div>
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th className="w-16">Slot</th>
                      <th>Depth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.slots.map((slot) => {
                      const ranked = (chart.entries[slot.code] ?? []).filter(Boolean) as string[];
                      return (
                        <tr key={slot.code}>
                          <td>
                            <span className="flex items-center gap-1">
                              <span className="font-semibold">{slot.code}</span>
                              {slot.situational ? <span title="situational role">•</span> : null}
                              {isUnverifiedVocabulary(slot.code) ? (
                                <span title="vocabulary not yet confirmed in game" className="text-tone-warn">
                                  ?
                                </span>
                              ) : null}
                            </span>
                          </td>
                          <td>
                            {ranked.length === 0 ? (
                              <Badge tone="bad">empty</Badge>
                            ) : (
                              <ul className="space-y-0.5">
                                {ranked.map((id, index) => {
                                  const player = lookup(id);
                                  if (!player) return null;
                                  return (
                                    <li key={id} className={index === 0 ? '' : 'opacity-60'}>
                                      <PlayerLine player={player} teamAbbr={abbrFor(player)} />
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Cap sheet" subtitle="Approximate figures; Madden's own cap rules are not fully public.">
          <div className="space-y-1">
            {topHits.map((player) => (
              <div key={player.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {player.firstName.charAt(0)}. {player.lastName}
                  <span className="ml-2 text-muted">{player.position}</span>
                </span>
                <span className="tabular-nums">{money(player.franchise.capHit)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-sm font-semibold">
              <span>Committed</span>
              <span className="tabular-nums">{money(capHit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Space remaining</span>
              <span className="tabular-nums">{money(capTotal - capHit)}</span>
            </div>
          </div>
        </Card>

        <Card
          title="Where you are thin"
          subtitle="Weak starters, missing depth, and deals about to expire."
          aside={
            <Link href="/transactions" className="btn-ghost">
              Trades &amp; draft
            </Link>
          }
        >
          {(['offense', 'defense', 'special'] as Side[]).flatMap((side) =>
            needsFor(side)
              .slice(0, 3)
              .map((need) => (
                <div
                  key={`${side}-${need.group}`}
                  className="flex items-center justify-between border-b border-line py-2 text-sm last:border-0"
                >
                  <span>
                    <span className="text-muted">{sideLabel[side]} · </span>
                    {need.group}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular-nums text-muted">avg {need.avg}</span>
                    {need.depth < 3 ? <Badge tone="warn">thin</Badge> : null}
                    {need.expiring > 0 ? <Badge tone="info">{need.expiring} expiring</Badge> : null}
                  </span>
                </div>
              )),
          )}
          {expiring.length ? (
            <p className="mt-3 text-xs text-muted">
              Expiring soon: {expiring.slice(0, 5).map((player) => player.lastName).join(', ')}
            </p>
          ) : null}
        </Card>
      </div>

      <Card
        title="League clock, cap and backups"
        subtitle="Keep the numbers matching the franchise you are actually playing, and take a copy with you."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={updateLeagueAction} className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="season">
                Season
              </label>
              <input
                id="season"
                name="season"
                type="number"
                min={2020}
                max={2040}
                defaultValue={league?.season ?? 2026}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="week">
                Week
              </label>
              <input
                id="week"
                name="week"
                type="number"
                min={1}
                max={25}
                defaultValue={league?.week ?? 1}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="capTotal">
                Cap
              </label>
              <input
                id="capTotal"
                name="capTotal"
                type="number"
                min={0}
                step={1_000_000}
                defaultValue={capTotal}
                className="field"
              />
            </div>
            <div className="sm:col-span-3">
              <button className="btn" type="submit">
                Save league state
              </button>
            </div>
          </form>

          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-muted">
              A snapshot is one JSON file with your rosters, both depth-chart layers, formation
              subs, call sheet, drives, trades and picks. It is how you pull the same state open on
              your phone. Playbooks are not included — they come from the playbook dataset.
            </p>
            <a className="btn w-full text-center" href="/api/snapshot" download>
              Download snapshot
            </a>
            <form action={restoreSnapshotAction} className="grid gap-2">
              <label className="label" htmlFor="snapshot">
                Restore a snapshot
              </label>
              <input
                id="snapshot"
                name="snapshot"
                type="file"
                accept="application/json,.json"
                className="field file:mr-3 file:rounded file:border-0 file:bg-surface-2 file:px-2 file:py-1 file:text-ink"
              />
              <button className="btn-ghost" type="submit">
                Replace current state
              </button>
              <p className="text-[11px] text-muted">
                Restoring replaces everything you have entered here — it does not merge.
              </p>
            </form>
          </div>
        </div>
      </Card>
    </div>
  );
}
