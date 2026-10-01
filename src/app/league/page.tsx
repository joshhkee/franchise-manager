import Link from 'next/link';
import { setTradeTargetAction } from '../actions';
import {
  getDataSourceCounts,
  getDefaultPlan,
  getRoster,
  getTeams,
  listTradeTargets,
} from '@/db/repo';
import { fitCounts, fitForPlayer } from '@/domain/scouting';
import { FIT_GRADE_LABELS, FIT_GRADE_TONES } from '@/domain/schemeFit';
import { schemesForSide } from '@/domain/schemes';
import type { RosterPlayer } from '@/domain/types';
import { Badge, Card, Empty, PageHeader, Stat, ovrTone } from '@/components/ui';
import { PlayerDialog } from '@/components/PlayerDialog';
import { requireSession } from '@/lib/auth';
import { TWO_SIDED, describeSchemes, resolveSchemes, schemePair, schemeQuery } from '@/lib/scouting';

function summarize(players: RosterPlayer[]) {
  const count = players.length;
  const avg = count ? Math.round(players.reduce((sum, player) => sum + player.overall, 0) / count) : 0;
  const impact = players.filter(
    (player) => player.franchise.devTrait === 'xfactor' || player.franchise.devTrait === 'superstar',
  ).length;
  const top = [...players].sort((a, b) => b.overall - a.overall).slice(0, 3);
  return { count, avg, impact, top };
}

/**
 * Scout the league.
 *
 * Every real Madden 27 team, its roster, and each player's fit with the schemes you
 * want to run — the same grade `/scheme` puts on your own starters, applied to the
 * other 31 teams, with a shortlist to build trade targets from.
 *
 * Filtering by fit happens on the team page, where a table is useful; this page is
 * the map: who has talent, and where. Owner goal #4 in [`HANDOFF.md`](HANDOFF.md) §1.
 */
export default async function LeaguePage({
  searchParams,
}: {
  searchParams: Promise<{ offense?: string; defense?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const [teams, roster, targets, sources, plan] = await Promise.all([
    getTeams(),
    getRoster(),
    listTradeTargets(),
    getDataSourceCounts(),
    getDefaultPlan(),
  ]);

  const schemeIds = resolveSchemes(params, plan?.playbookId ?? null);
  const schemes = schemePair(schemeIds);

  // Every club in the database is a real Madden 27 roster now: they arrive with the
  // ratings import, so a scouting screen is simply the teams the players belong to.
  const teamIds = new Set(teams.map((team) => team.id));
  const rosters = new Map<string, RosterPlayer[]>();
  const leaguePlayers: RosterPlayer[] = [];
  for (const player of roster) {
    const teamId = player.teamId ?? player.franchise.teamId;
    if (!teamId || !teamIds.has(teamId)) continue;
    const list = rosters.get(teamId) ?? [];
    list.push(player);
    rosters.set(teamId, list);
    leaguePlayers.push(player);
  }

  const byId = new Map(roster.map((player) => [player.id, player]));
  const shortlisted = targets.flatMap((target) => {
    const player = byId.get(target.playerId);
    return player ? [{ target, player, fit: fitForPlayer(player, schemes) }] : [];
  });

  const leagueCounts = fitCounts(leaguePlayers, schemes);

  const divisions = new Map<string, typeof teams>();
  for (const team of teams) {
    const key =
      [team.conference, team.division].filter(Boolean).join(' ') || 'Teams';
    const list = divisions.get(key) ?? [];
    list.push(team);
    divisions.set(key, list);
  }
  const divisionKeys = [...divisions.keys()].sort();

  const schemeUrl = schemeQuery(schemeIds);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scouting"
        subtitle="All 32 real Madden 27 rosters, every player graded on how he fits the schemes you want to run. Fit is about your plan, not how good he is — sort the team pages by fit to find trade targets."
        aside={
          <Link href={`/scheme?${schemeUrl}`} className="btn-ghost">
            Grade my starters
          </Link>
        }
      />

      <form className="card grid gap-3 sm:grid-cols-3" method="get">
        {TWO_SIDED.map((side) => (
          <div key={side}>
            <label className="label" htmlFor={`league-${side}`}>
              {side === 'offense' ? 'Offensive scheme' : 'Defensive scheme'}
            </label>
            <select
              id={`league-${side}`}
              name={side}
              defaultValue={schemeIds[side]}
              className="field"
            >
              {schemesForSide(side).map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name} — {scheme.tagline}
                </option>
              ))}
            </select>
          </div>
        ))}
        <div className="flex items-end">
          <button className="btn" type="submit">
            Grade the league
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Teams" value={teams.length} hint="real Madden 27 rosters" />
        <Stat
          label="Players"
          value={sources['ea-ratings'] ?? leaguePlayers.length}
          hint="imported from EA's ratings database"
        />
        <Stat
          label="Ideal fits"
          value={leagueCounts.ideal}
          hint={`against ${describeSchemes(schemes)}`}
        />
        <Stat
          label="Shortlisted"
          value={shortlisted.length}
          hint="trade targets you are tracking"
        />
      </div>

      {teams.length === 0 ? (
        <Empty>
          No Madden 27 rosters yet. Run <code>npm run scrape:ratings</code> then{' '}
          <code>npm run import:ratings</code>.
        </Empty>
      ) : null}

      <Card
        title="Trade shortlist"
        subtitle="Players you are tracking on other teams. Add them from any team page; the trade analyzer does the valuing."
        aside={
          <Link href="/transactions" className="btn-ghost">
            Trades &amp; draft
          </Link>
        }
      >
        {shortlisted.length === 0 ? (
          <Empty>
            Nothing shortlisted yet. Open a team below and add candidates — ideal fits for{' '}
            {describeSchemes(schemes)} are the ones worth a look first.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Pos</th>
                  <th>OVR</th>
                  <th>Fit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shortlisted.map(({ player, fit }) => {
                  const team = teams.find((entry) => entry.id === (player.teamId ?? player.franchise.teamId));
                  return (
                    <tr key={player.id}>
                      <td>
                        <PlayerDialog
                          player={player}
                          teamAbbr={team?.abbr ?? null}
                          devTrait={player.franchise.devTrait}
                        />
                      </td>
                      <td className="text-muted">
                        {team ? (
                          <Link href={`/league/${team.id}?${schemeUrl}`} className="underline">
                            {team.abbr}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{player.position}</td>
                      <td>
                        <Badge tone={ovrTone(player.overall)}>{player.overall}</Badge>
                      </td>
                      <td>
                        <Badge tone={FIT_GRADE_TONES[fit.grade]} title={fit.reasons.join(' ')}>
                          {FIT_GRADE_LABELS[fit.grade]}
                        </Badge>
                      </td>
                      <td className="text-right">
                        <form action={setTradeTargetAction}>
                          <input type="hidden" name="playerId" value={player.id} />
                          <input type="hidden" name="intent" value="remove" />
                          <button className="text-xs text-muted underline" type="submit">
                            Remove
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {divisionKeys.map((key) => (
        <Card key={key} title={key} subtitle={`${divisions.get(key)?.length ?? 0} teams`}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(divisions.get(key) ?? [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => {
                const players = rosters.get(team.id) ?? [];
                const summary = summarize(players);
                return (
                  <Link
                    key={team.id}
                    href={`/league/${team.id}?${schemeUrl}`}
                    className="rounded-lg border border-line bg-surface-2 p-3 transition hover:border-accent-border"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{team.abbr}</span>
                      <Badge tone={ovrTone(summary.avg)}>{summary.avg} avg</Badge>
                    </div>
                    <div className="truncate text-xs text-muted">{team.name}</div>
                    <div className="mt-1 text-[11px] text-muted">
                      {summary.count} players
                      {summary.impact > 0 ? ` · ${summary.impact} impact` : ''}
                    </div>
                    {summary.top.length ? (
                      <div className="mt-1 truncate text-[11px] text-muted">
                        {summary.top
                          .map((player) => `${player.lastName} ${player.overall}`)
                          .join(' · ')}
                      </div>
                    ) : null}
                  </Link>
                );
              })}
          </div>
        </Card>
      ))}

      <Card title="How to read this" subtitle="What is real, what is ours, and what is missing.">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            Rosters, ratings, heights, ages, colleges, jersey numbers and EA&apos;s own archetypes are
            real Madden 27 data, scraped from EA&apos;s ratings database (
            <code>npm run scrape:ratings</code>) and committed so the app works offline. Team names
            carry their own attribution; this project is unaffiliated with EA.
          </li>
          <li>
            <span className="text-ink">Contracts and cap figures do not exist in that feed</span>, so
            every imported player starts with an empty contract. Fill them in on the team page, and
            label them as the estimates they are.
          </li>
          <li>
            Development traits come from the ability list: an X-Factor ability means X-Factor, a
            Superstar ability means Superstar. Everyone else is <span className="text-ink">unknown</span>{' '}
            — Star and Normal cannot be told apart from outside the game.
          </li>
          <li>
            Fit is graded against <span className="text-ink">{describeSchemes(schemes)}</span> — your
            schemes, not each player&apos;s current team&apos;s. A player is graded at his primary
            position; the feed publishes no depth chart.
          </li>
        </ul>
      </Card>
    </div>
  );
}
