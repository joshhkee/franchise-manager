import Link from 'next/link';
import { getLeague, getRoster, getTeams } from '@/db/repo';
import { requireSession } from '@/lib/auth';
import {
  ALL_SORTS,
  FREE_AGENT_TEAM,
  SORT_GROUPS,
  compareBySort,
  filterPlayers,
  formatHeight,
  formatWeight,
  isPlayerSort,
  sortLabel,
  sortValue,
  teamOfPlayer,
  type PlayerSort,
} from '@/domain/playerTable';
import { Badge, Card, Empty, PageHeader, Stat, ovrTone } from '@/components/ui';
import { PlayerDialog } from '@/components/PlayerDialog';

/**
 * Every player, ranked by anything.
 *
 * The ratings import stores all 53 of EA's attributes per player, so this is the screen
 * that answers "who is the fastest man in the league", "who has the best man coverage
 * available", "who is the heaviest nose tackle". It opens on **your own roster** — the
 * team checklist starts on your club, because that is the question an owner has first —
 * and the same checklist can add any other club, all 32, or the unsigned pool.
 *
 * The filter, sort and pagination logic is pure and lives in
 * [`playerTable.ts`](src/domain/playerTable.ts); this file is the rendering.
 */

const PAGE_SIZE = 100;

type SearchParams = Record<string, string | string[] | undefined>;

/** A form sends repeats as an array; a hand-typed URL sends one string. */
function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[value.length - 1] : value;
}

function many(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireSession();
  const [query, roster, teams, league] = await Promise.all([
    searchParams,
    getRoster(),
    getTeams(),
    getLeague(),
  ]);

  const userTeamId = league?.userTeamId ?? null;
  const requested = many(query.team);
  /**
   * The screen defaults to the owner's team: a form that has never been submitted has no
   * `team` params at all. A *submitted* form that unchecked everything carries
   * `filters=1`, which means "everything" on purpose rather than "fall back to my team".
   */
  const submitted = one(query.filters) === '1';
  const teamFilter = requested.length ? requested : submitted ? [] : userTeamId ? [userTeamId] : [];

  const positions = [...new Set(roster.map((player) => player.position))].sort();
  const requestedPosition = one(query.position);
  const position =
    requestedPosition && (requestedPosition === 'ALL' || positions.includes(requestedPosition))
      ? requestedPosition
      : 'ALL';
  const minOvr = Math.min(Math.max(Number(one(query.minOvr)) || 0, 0), 99);
  const search = one(query.q)?.trim() ?? '';
  const sort: PlayerSort = isPlayerSort(one(query.sort)) ? (one(query.sort) as PlayerSort) : 'ovr';

  const sorted = filterPlayers(roster, {
    teams: teamFilter,
    position,
    minOvr,
    query: search,
  }).sort(compareBySort(sort));

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const page = Math.min(Math.max(Number(one(query.page)) || 1, 1), pageCount);
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const abbrById = new Map(teams.map((team) => [team.id, team.abbr]));
  const freeAgents = roster.filter((player) => teamOfPlayer(player) === FREE_AGENT_TEAM).length;

  const linkFor = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams();
    params.set('filters', '1');
    for (const team of teamFilter) params.append('team', team);
    if (position !== 'ALL') params.set('position', position);
    if (minOvr) params.set('minOvr', String(minOvr));
    if (search) params.set('q', search);
    if (sort !== 'ovr') params.set('sort', sort);
    for (const [key, value] of Object.entries(overrides)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const queryString = params.toString();
    return queryString ? `/players?${queryString}` : '/players';
  };

  /** The stat being ranked is shown as its own column, and it is the one that matters most. */
  const statColumn: PlayerSort | null =
    sort === 'ovr' || sort === 'name' || sort === 'age' ? null : sort;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Player stats"
        subtitle="Every player in the game, ranked by any attribute EA publishes — all 53 of them, plus height, weight and age. Starts on your own roster; add any other club, or the unsigned pool."
        aside={
          <Link href="/league" className="btn-ghost">
            Scout teams
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Players tracked"
          value={roster.length}
          hint={`${teams.length} clubs plus the unsigned pool`}
        />
        <Stat label="Free agents" value={freeAgents} hint="no team in EA's data" />
        <Stat label="Rankable" value={ALL_SORTS.length} hint="attributes and identity columns" />
        <Stat
          label="Shown"
          value={sorted.length}
          hint={teamFilter.length ? `${teamFilter.length} team(s) selected` : 'every club'}
        />
      </div>

      <form className="card space-y-4" method="get">
        <input type="hidden" name="filters" value="1" />

        <fieldset>
          <legend className="label">Teams</legend>
          <div className="mb-2 flex flex-wrap gap-2 text-xs">
            {userTeamId ? (
              <Link href={`/players?filters=1&team=${userTeamId}`} className="btn-mini">
                My team
              </Link>
            ) : null}
            <Link href="/players?filters=1" className="btn-mini">
              Everyone
            </Link>
            <Link href={`/players?filters=1&team=${FREE_AGENT_TEAM}`} className="btn-mini">
              Free agents
            </Link>
          </div>
          <div className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-lg border border-line p-3 sm:grid-cols-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="team"
                value={FREE_AGENT_TEAM}
                defaultChecked={teamFilter.includes(FREE_AGENT_TEAM)}
              />
              Free agents
            </label>
            {teams.map((team) => (
              <label key={team.id} className="flex items-center gap-2 text-sm" title={team.name}>
                <input
                  type="checkbox"
                  name="team"
                  value={team.id}
                  defaultChecked={teamFilter.includes(team.id)}
                />
                <span className="truncate">{team.abbr}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label" htmlFor="sort">
              Rank by
            </label>
            <select id="sort" name="sort" defaultValue={sort} className="field">
              {SORT_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.sorts.map((entry) => (
                    <option key={entry} value={entry}>
                      {sortLabel(entry)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
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
            <label className="label" htmlFor="q">
              Name
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="e.g. Robinson"
              className="field"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn" type="submit">
            Apply
          </button>
          <Link href="/players" className="text-xs text-muted underline">
            Reset
          </Link>
        </div>
      </form>

      <Card
        title={`${sorted.length} player${sorted.length === 1 ? '' : 's'}, ranked by ${sortLabel(sort)}`}
        subtitle={
          pageCount > 1
            ? `Page ${page} of ${pageCount}. Click any name for his full stat sheet.`
            : 'Click any name for his full stat sheet.'
        }
      >
        {sorted.length === 0 ? (
          <Empty>
            No player matches those filters. Widen them — or, if the list is empty entirely, run{' '}
            <code>npm run import:ratings</code>.
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Pos</th>
                  <th className="hidden sm:table-cell">Age</th>
                  <th className={statColumn === 'height' ? 'text-ink' : ''}>HT</th>
                  <th className={statColumn === 'weight' ? 'text-ink' : ''}>WT</th>
                  <th>OVR</th>
                  {statColumn && statColumn !== 'height' && statColumn !== 'weight' ? (
                    <th className="text-ink">{sortLabel(statColumn)}</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {visible.map((player) => {
                  const teamId = teamOfPlayer(player);
                  const abbr = abbrById.get(teamId) ?? null;
                  const rank = sortValue(player, sort);
                  return (
                    <tr key={player.id}>
                      <td>
                        <PlayerDialog
                          player={player}
                          teamAbbr={abbr}
                          devTrait={player.franchise.devTrait}
                        />
                      </td>
                      <td className="text-muted">
                        {abbr ? (
                          <Link href={`/league/${teamId}`} className="underline">
                            {abbr}
                          </Link>
                        ) : (
                          <span className="text-muted">FA</span>
                        )}
                      </td>
                      <td>{player.position}</td>
                      <td className="hidden tabular-nums sm:table-cell">{player.age ?? '—'}</td>
                      <td className={`tabular-nums ${statColumn === 'height' ? 'font-semibold' : ''}`}>
                        {formatHeight(player.heightInches)}
                      </td>
                      <td className={`tabular-nums ${statColumn === 'weight' ? 'font-semibold' : ''}`}>
                        {player.weightLbs ?? '—'}
                      </td>
                      <td>
                        <Badge tone={ovrTone(player.overall)}>{player.overall}</Badge>
                      </td>
                      {statColumn && statColumn !== 'height' && statColumn !== 'weight' ? (
                        <td className="font-semibold tabular-nums">{rank ?? '—'}</td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            {page > 1 ? (
              <Link href={linkFor({ page: String(page - 1) })} className="btn-ghost">
                Previous
              </Link>
            ) : null}
            <span className="text-muted">
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={linkFor({ page: String(page + 1) })} className="btn-ghost">
                Next
              </Link>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card title="How to read this" subtitle="Where the numbers come from, and what they are not.">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            Every attribute, height, weight, age and college is EA&apos;s own, scraped from the Madden
            27 ratings database and committed so this screen works offline. Weight arrives with the
            same import; a row the feed leaves silent reads as a dash.
          </li>
          <li>
            <span className="text-ink">Ranking is not a recommendation.</span> Speed does not make a
            corner, and a 95 in one number says nothing about the twenty that decide whether a man
            can play a role — the sheet marks the attributes Madden itself counts for his archetype.
          </li>
          <li>
            This screen is a reading of the roster, not a league simulation: contracts and cap figures
            are not published by the feed, and nothing here moves a player between teams.
          </li>
        </ul>
      </Card>
    </div>
  );
}
