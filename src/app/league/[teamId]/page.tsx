import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setTradeTargetAction } from '../../actions';
import { getDefaultPlan, getLeague, getRoster, getTeams, listTradeTargets } from '@/db/repo';
import { readAttribute } from '@/domain/archetypes';
import { fitForPlayer, fitRank } from '@/domain/scouting';
import { FIT_GRADE_LABELS, FIT_GRADE_TONES, countGrades, type FitGrade } from '@/domain/schemeFit';
import { schemesForSide } from '@/domain/schemes';
import type { RosterPlayer } from '@/domain/types';
import { Badge, Card, Empty, PageHeader, Stat, ovrTone } from '@/components/ui';
import { PlayerDialog } from '@/components/PlayerDialog';
import { requireSession } from '@/lib/auth';
import { TWO_SIDED, describeSchemes, resolveSchemes, schemePair, schemeQuery } from '@/lib/scouting';

const DEV_LABEL: Record<string, string> = {
  xfactor: 'XF',
  superstar: 'SS',
  star: 'STAR',
};

const SORTS = {
  ovr: 'Overall',
  fit: 'Best fit for you',
  speed: 'Fastest first',
  strength: 'Strongest first',
  name: 'Name',
  age: 'Youngest first',
} as const;
type SortKey = keyof typeof SORTS;

const FIT_KEYS = ['all', 'ideal', 'strong', 'workable', 'mismatch', 'unrated'] as const;
type FitFilter = (typeof FIT_KEYS)[number];

/**
 * One team, scouted.
 *
 * The roster as EA publishes it — OVR, archetype, dev trait — with every player
 * graded against your schemes, filters for position, rating and fit grade, and the
 * shortlist button that feeds the trade screen.
 */
export default async function ScoutingTeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ teamId: string }>;
  searchParams: Promise<{
    offense?: string;
    defense?: string;
    position?: string;
    minOvr?: string;
    fit?: string;
    sort?: string;
  }>;
}) {
  await requireSession();
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const [teams, roster, plan, targets, league] = await Promise.all([
    getTeams(),
    getRoster(teamId),
    getDefaultPlan(),
    listTradeTargets(),
    getLeague(),
  ]);

  const team = teams.find((entry) => entry.id === teamId);
  if (!team) notFound();

  const schemeIds = resolveSchemes(query, plan?.playbookId ?? null);
  const schemes = schemePair(schemeIds);
  const schemeUrl = schemeQuery(schemeIds);

  const players = roster.filter(
    (player) => (player.teamId ?? player.franchise.teamId) === teamId,
  );
  const graded = players.map((player) => ({ player, fit: fitForPlayer(player, schemes) }));
  const counts = countGrades(graded.map((entry) => entry.fit));

  const positions = [...new Set(players.map((player) => player.position))].sort();
  const position =
    query.position && positions.includes(query.position) ? query.position : 'ALL';
  const minOvr = Math.min(Math.max(Number(query.minOvr) || 0, 0), 99);
  const fitFilter: FitFilter = FIT_KEYS.includes(query.fit as FitFilter)
    ? (query.fit as FitFilter)
    : 'all';
  const sort: SortKey = query.sort && query.sort in SORTS ? (query.sort as SortKey) : 'ovr';

  const shortlisted = new Set(targets.map((target) => target.playerId));

  const filtered = graded
    .filter(({ player, fit }) => {
      if (position !== 'ALL' && player.position !== position) return false;
      if (player.overall < minOvr) return false;
      if (fitFilter !== 'all' && fit.grade !== fitFilter) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sort) {
        case 'fit':
          return (
            fitRank(a.fit.grade) - fitRank(b.fit.grade) || b.player.overall - a.player.overall
          );
        case 'speed':
          return (
            (readAttribute(b.player.ratings, 'speed') ?? 0) -
              (readAttribute(a.player.ratings, 'speed') ?? 0) ||
            b.player.overall - a.player.overall
          );
        case 'strength':
          return (
            (readAttribute(b.player.ratings, 'strength') ?? 0) -
              (readAttribute(a.player.ratings, 'strength') ?? 0) ||
            b.player.overall - a.player.overall
          );
        case 'name':
          return a.player.lastName.localeCompare(b.player.lastName);
        case 'age':
          return (a.player.age ?? 99) - (b.player.age ?? 99);
        default:
          return b.player.overall - a.player.overall;
      }
    });

  const avg = players.length
    ? Math.round(players.reduce((sum, player) => sum + player.overall, 0) / players.length)
    : 0;
  const impact = players.filter(
    (player) => player.franchise.devTrait === 'xfactor' || player.franchise.devTrait === 'superstar',
  ).length;
  const isUserTeam = league?.userTeamId === team.id;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${team.name} — scouting`}
        subtitle={`Real Madden 27 roster from EA's ratings database. Fit is graded against your schemes: ${describeSchemes(
          schemes,
        )}.`}
        aside={
          <Link href={`/league?${schemeUrl}`} className="btn-ghost">
            All teams
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Players"
          value={players.length}
          hint={isUserTeam ? 'your team' : `${team.conference ?? ''} ${team.division ?? ''}`.trim()}
        />
        <Stat label="Average OVR" value={avg} hint="whole published roster" />
        <Stat label="Impact players" value={impact} hint="X-Factor or Superstar ability" />
        <Stat
          label="Ideal fits"
          value={counts.ideal}
          hint={`${counts.strong} strong · ${counts.mismatch} mismatch`}
        />
      </div>

      <Card
        title="Fit breakdown"
        subtitle="The same grade the scheme screen puts on your starters, applied to this roster."
        aside={
          <div className="flex flex-wrap gap-1">
            {(['ideal', 'strong', 'workable', 'mismatch', 'unrated'] as FitGrade[]).map((grade) =>
              counts[grade] > 0 ? (
                <Badge key={grade} tone={FIT_GRADE_TONES[grade]}>
                  {counts[grade]} {FIT_GRADE_LABELS[grade].toLowerCase()}
                </Badge>
              ) : null,
            )}
          </div>
        }
      >
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          {TWO_SIDED.map((side) => (
            <div key={side}>
              <label className="label" htmlFor={`team-${side}`}>
                {side === 'offense' ? 'Grading offense against' : 'Grading defense against'}
              </label>
              <select
                id={`team-${side}`}
                name={side}
                defaultValue={schemeIds[side]}
                className="field"
              >
                {schemesForSide(side).map((scheme) => (
                  <option key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-end">
            <button className="btn-ghost" type="submit">
              Re-grade this roster
            </button>
          </div>
        </form>
      </Card>

      <form className="card grid gap-3 sm:grid-cols-5" method="get">
        <input type="hidden" name="offense" value={schemeIds.offense} />
        <input type="hidden" name="defense" value={schemeIds.defense} />
        <div>
          <label className="label" htmlFor="position">
            Position
          </label>
          <select id="position" name="position" defaultValue={position} className="field">
            <option value="ALL">All positions</option>
            {positions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="minOvr">
            Minimum OVR
          </label>
          <input
            id="minOvr"
            name="minOvr"
            type="number"
            min={0}
            max={99}
            defaultValue={minOvr || ''}
            placeholder="0"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="fit">
            Fit grade
          </label>
          <select id="fit" name="fit" defaultValue={fitFilter} className="field">
            <option value="all">Any fit</option>
            {(['ideal', 'strong', 'workable', 'mismatch', 'unrated'] as FitGrade[]).map((grade) => (
              <option key={grade} value={grade}>
                {FIT_GRADE_LABELS[grade]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Sort
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="field">
            {(Object.keys(SORTS) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORTS[key]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button className="btn" type="submit">
            Filter
          </button>
          <Link href={`/league/${team.id}?${schemeUrl}`} className="text-xs text-muted underline">
            Reset
          </Link>
        </div>
      </form>

      <Card
        title={`${filtered.length} of ${players.length} players`}
        subtitle="Sorted by how well they suit what you want to run. Add anyone worth a trade look to the shortlist."
      >
        {players.length === 0 ? (
          <Empty>
            No players on this team yet. Run <code>npm run scrape:ratings</code> then{' '}
            <code>npm run import:ratings</code>.
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty>No player matches those filters. Widen them and try again.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Pos</th>
                  <th className="hidden sm:table-cell">Age</th>
                  <th>SPD</th>
                  <th>OVR</th>
                  <th className="hidden sm:table-cell">Archetype</th>
                  <th>Dev</th>
                  <th>Fit</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ player, fit }) => (
                  <tr key={player.id}>
                    <td>
                      <PlayerDialog
                        player={player}
                        teamAbbr={team.abbr}
                        devTrait={player.franchise.devTrait}
                        label={
                          <>
                            {player.firstName.charAt(0)}. {player.lastName}
                            {player.jersey !== null ? (
                              <span className="ml-1 text-[10px] text-muted">#{player.jersey}</span>
                            ) : null}
                          </>
                        }
                      />
                    </td>
                    <td>{player.position}</td>
                    <td className="hidden tabular-nums sm:table-cell">{player.age ?? '—'}</td>
                    <td className="tabular-nums">
                      {readAttribute(player.ratings, 'speed') ?? '—'}
                    </td>
                    <td>
                      <Badge tone={ovrTone(player.overall)}>{player.overall}</Badge>
                    </td>
                    <td className="hidden text-muted sm:table-cell">
                      {fit.archetypeName ?? '—'}
                      {fit.archetypeSource === 'derived' ? (
                        <span className="ml-1 text-[10px]">(guessed)</span>
                      ) : null}
                    </td>
                    <td>
                      {player.franchise.devTrait && DEV_LABEL[player.franchise.devTrait] ? (
                        <Badge tone="info">{DEV_LABEL[player.franchise.devTrait]}</Badge>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <Badge title={fit.reasons.join(' ')} tone={FIT_GRADE_TONES[fit.grade]}>
                        {FIT_GRADE_LABELS[fit.grade]}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <form action={setTradeTargetAction}>
                        <input type="hidden" name="playerId" value={player.id} />
                        <input
                          type="hidden"
                          name="intent"
                          value={shortlisted.has(player.id) ? 'remove' : 'add'}
                        />
                        <button
                          className={`text-xs underline ${
                            shortlisted.has(player.id) ? 'text-accent-text' : 'text-muted'
                          }`}
                          type="submit"
                        >
                          {shortlisted.has(player.id) ? 'Shortlisted' : '+ Shortlist'}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-xs leading-relaxed text-muted">
        Sort by speed to see who can run — every attribute EA publishes comes with the ratings
        import, and the table shows speed off that same map. Ratings, archetypes and dev traits are
        EA&apos;s, scraped{' '}
        <code>npm run scrape:ratings</code> and committed so this screen works offline. Contracts and
        cap figures are not published by that feed, so they stay empty until you enter them. Fit is a
        fit grade against your schemes — not a quality score, and not a trade valuation; the{' '}
        <Link href="/transactions" className="underline">
          trade analyzer
        </Link>{' '}
        does that maths.
      </p>
    </div>
  );
}
