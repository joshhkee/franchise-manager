import Link from 'next/link';
import { addRookieAction, logTradeAction } from '../actions';
import { listDraftPicks, listTransactions } from '@/db/repo';
import { evaluateTrade, formatValue, pickValue, playerValue } from '@/domain/tradeValue';
import type { DevTrait } from '@/domain/types';
import { Badge, Card, Empty, PageHeader, Stat, money } from '@/components/ui';
import { PlayerSelect, TeamSelect } from '@/components/pickers';
import { requireSession } from '@/lib/auth';
import { loadOverview } from '@/lib/loaders';

const POSITIONS = [
  'QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT',
  'LE', 'RE', 'DT', 'NT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS', 'K', 'P', 'LS',
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ logged?: string; error?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const [{ roster, teams, userTeam, league }, transactions, picks] = await Promise.all([
    loadOverview(),
    listTransactions(),
    listDraftPicks(),
  ]);

  const myRoster = userTeam ? roster.filter((p) => p.franchise.teamId === userTeam.id) : [];
  const cpuTeams = teams.filter((team) => team.id !== userTeam?.id);
  const cpuRoster = roster.filter(
    (player) => player.franchise.teamId && player.franchise.teamId !== userTeam?.id,
  );

  const nameOf = (id: unknown) => {
    const player = roster.find((entry) => entry.id === id);
    return player ? `${player.firstName.charAt(0)}. ${player.lastName}` : String(id ?? '—');
  };

  const topValues = [...myRoster]
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10)
    .map((player) => ({
      player,
      value: playerValue({
        overall: player.overall,
        age: player.age,
        devTrait: player.franchise.devTrait as DevTrait | null,
        capHit: player.franchise.capHit,
      }),
    }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trades & draft"
        subtitle="Log CPU trades and add drafted rookies so the roster stays current between save imports."
      />

      {params.logged ? (
        <p className="note note-good">
          {params.logged === 'trade'
            ? 'Trade logged. Players moved between teams and the depth chart will show any fallout.'
            : 'Rookie added to the roster and logged as a draft pick.'}
        </p>
      ) : null}
      {params.error ? (
        <p className="note note-bad">
          {params.error === 'empty'
            ? 'Add at least one player or pick on either side.'
            : 'A rookie needs a first name, last name and position.'}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Trades logged" value={transactions.filter((t) => t.kind === 'trade').length} />
        <Stat label="Rookies added" value={transactions.filter((t) => t.kind === 'draft').length} />
        <Stat label="Picks tracked" value={picks.length} hint="your draft capital" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Log a trade"
          subtitle="Values use the same chart as the analyzer below, so the log matches what you judged."
        >
          <form action={logTradeAction} className="grid gap-3">
            <div>
              <label className="label" htmlFor="counterpartyTeamId">
                CPU team
              </label>
              <TeamSelect teams={cpuTeams} name="counterpartyTeamId" emptyLabel="— choose a team —" />
            </div>
            <div>
              <label className="label" htmlFor="incomingPlayerId">
                You receive — player
              </label>
              <PlayerSelect
                players={cpuRoster}
                name="incomingPlayerId"
                emptyLabel="— no player —"
              />
            </div>
            <div>
              <label className="label" htmlFor="incomingPick">
                You receive — pick (e.g. 2027 R2)
              </label>
              <input id="incomingPick" name="incomingPick" className="field" placeholder="2027 R2" />
            </div>
            <div>
              <label className="label" htmlFor="outgoingPlayerId">
                You send — player
              </label>
              <PlayerSelect players={myRoster} name="outgoingPlayerId" emptyLabel="— no player —" />
            </div>
            <div>
              <label className="label" htmlFor="outgoingPick">
                You send — pick (e.g. 2027 R1)
              </label>
              <input id="outgoingPick" name="outgoingPick" className="field" placeholder="2027 R1" />
            </div>
            <div>
              <label className="label" htmlFor="notes">
                Notes
              </label>
              <input id="notes" name="notes" className="field" placeholder="Why you did it" />
            </div>
            <button className="btn" type="submit">
              Log trade
            </button>
          </form>
        </Card>

        <Card
          title="Add a drafted rookie"
          subtitle="Type in what the draft gave you. He lands on your roster immediately."
        >
          <form action={addRookieAction} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="firstName">
                First name
              </label>
              <input id="firstName" name="firstName" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="lastName">
                Last name
              </label>
              <input id="lastName" name="lastName" className="field" required />
            </div>
            <div>
              <label className="label" htmlFor="position">
                Position
              </label>
              <select id="position" name="position" className="field" required>
                {POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="overall">
                Overall
              </label>
              <input id="overall" name="overall" type="number" min={40} max={99} defaultValue={72} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="round">
                Round drafted
              </label>
              <input id="round" name="round" type="number" min={1} max={7} defaultValue={1} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="devTrait">
                Development
              </label>
              <select id="devTrait" name="devTrait" className="field" defaultValue="normal">
                <option value="normal">Normal</option>
                <option value="star">Star</option>
                <option value="superstar">Superstar</option>
                <option value="xfactor">X-Factor</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="capHit">
                Cap hit
              </label>
              <input id="capHit" name="capHit" type="number" min={0} step={100000} defaultValue={1500000} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="contractYears">
                Contract years
              </label>
              <input id="contractYears" name="contractYears" type="number" min={1} max={7} defaultValue={4} className="field" />
            </div>
            <div className="sm:col-span-2">
              <button className="btn" type="submit">
                Add rookie
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Trade log" subtitle="Newest first, with the valuation you were working from.">
          {transactions.length === 0 ? (
            <Empty>No moves logged yet.</Empty>
          ) : (
            <div className="space-y-2">
              {transactions.map((entry) => {
                const payload = entry.payload as {
                  incoming?: { playerId?: string; pick?: string };
                  outgoing?: { playerId?: string; pick?: string };
                  name?: string;
                  position?: string;
                  overall?: number;
                };
                const verdict =
                  entry.valueIn !== null && entry.valueOut !== null
                    ? evaluateTrade(entry.valueOut, entry.valueIn)
                    : null;
                return (
                  <div key={entry.id} className="rounded-lg border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={entry.kind === 'trade' ? 'info' : 'good'}>{entry.kind}</Badge>
                      <span className="text-xs text-muted">
                        {entry.counterpartyTeamId ?? 'draft'} · week {entry.week}
                      </span>
                      {verdict ? (
                        <Badge tone={verdict.favour === 'you' ? 'good' : verdict.favour === 'them' ? 'warn' : 'muted'}>
                          {verdict.verdict}
                        </Badge>
                      ) : null}
                    </div>
                    {entry.kind === 'trade' ? (
                      <p className="mt-1 text-sm">
                        <span className="text-tone-good">
                          In: {payload.incoming?.playerId ? nameOf(payload.incoming.playerId) : ''}
                          {payload.incoming?.pick ? ` ${payload.incoming.pick}` : ''}
                          {!payload.incoming?.playerId && !payload.incoming?.pick ? '—' : ''}
                        </span>
                        <span className="text-muted"> · </span>
                        <span className="text-tone-bad">
                          Out: {payload.outgoing?.playerId ? nameOf(payload.outgoing.playerId) : ''}
                          {payload.outgoing?.pick ? ` ${payload.outgoing.pick}` : ''}
                          {!payload.outgoing?.playerId && !payload.outgoing?.pick ? '—' : ''}
                        </span>
                      </p>
                    ) : (
                      <p className="mt-1 text-sm">
                        {payload.name} · {payload.position} · {payload.overall} overall
                      </p>
                    )}
                    {verdict ? (
                      <p className="mt-1 text-xs text-muted">
                        {formatValue(entry.valueOut ?? 0)} sent for {formatValue(entry.valueIn ?? 0)}{' '}
                        received. {verdict.message}
                      </p>
                    ) : null}
                    {entry.notes ? <p className="mt-1 text-xs text-muted">{entry.notes}</p> : null}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Valuation reference"
          subtitle="A standard pick curve plus a player model that rewards youth and development."
        >
          <table className="grid-table">
            <thead>
              <tr>
                <th>Your most valuable players</th>
                <th className="w-20">Value</th>
              </tr>
            </thead>
            <tbody>
              {topValues.map((entry) => (
                <tr key={entry.player.id}>
                  <td>
                    {entry.player.firstName.charAt(0)}. {entry.player.lastName}
                    <span className="ml-2 text-muted">
                      {entry.player.position} · {entry.player.overall} · {entry.player.age ?? '—'}
                    </span>
                  </td>
                  <td className="tabular-nums">{formatValue(entry.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
            Pick values
          </h3>
          <div className="mt-1 grid grid-cols-4 gap-2 text-xs sm:grid-cols-7">
            {[1, 2, 3, 4, 5, 6, 7].map((round) => (
              <div key={round} className="rounded-lg border border-line p-2">
                <div className="text-muted">R{round}</div>
                <div className="font-semibold tabular-nums">{formatValue(pickValue(round, 1))}</div>
                <div className="text-muted">→ {formatValue(pickValue(round, 32))}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            These are approximations to sanity-check a CPU offer, not a verdict — and Madden&apos;s own
            draft AI does not use this chart. Tune it in{' '}
            <Link href="/team" className="underline">
              your team view
            </Link>{' '}
            when real contracts are imported: current spend is{' '}
            {money(myRoster.reduce((sum, player) => sum + (player.franchise.capHit ?? 0), 0))} of{' '}
            {money(league?.capTotal ?? 0)}.
          </p>

          {picks.length ? (
            <>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
                Tracked picks
              </h3>
              <table className="grid-table mt-1">
                <thead>
                  <tr>
                    <th>Season</th>
                    <th>Round</th>
                    <th>From</th>
                  </tr>
                </thead>
                <tbody>
                  {picks.map((pick) => (
                    <tr key={pick.id}>
                      <td className="tabular-nums">{pick.season}</td>
                      <td className="tabular-nums">R{pick.round}</td>
                      <td>{pick.originalTeamId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
