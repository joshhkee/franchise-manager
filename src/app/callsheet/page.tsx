import Link from 'next/link';
import { advanceDriveAction, createDriveAction, setBucketAction } from '../actions';
import { CONCEPT_LABELS } from '@/domain/concepts';
import { BUCKET_LABELS, OPPONENT_LEANS, resolveBucket, type Situation } from '@/domain/callSheet';
import { recommendCalls } from '@/domain/engine';
import {
  OUTCOME_LABELS,
  driveSituation,
  driveStatusLabel,
  looksFromDrive,
  scriptDrive,
  type CoarseOutcome,
} from '@/domain/drive';
import { resolveFormation } from '@/domain/resolution';
import { buildTendencyReport } from '@/domain/tendency';
import { getActiveDrive, getDriveState } from '@/db/repo';
import { Badge, Card, Empty, PageHeader, Stat } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { loadPlan, loadTendency } from '@/lib/loaders';

const OUTCOME_OPTIONS = Object.keys(OUTCOME_LABELS) as CoarseOutcome[];

export default async function CallSheetPage({
  searchParams,
}: {
  searchParams: Promise<{
    drive?: string;
    down?: string;
    distance?: string;
    yardLine?: string;
    quarter?: string;
    clockSeconds?: string;
    scoreDiff?: string;
    leans?: string;
  }>;
}) {
  await requireSession();
  const params = await searchParams;
  const { formations, ctx, subs, roster } = await loadPlan();
  const history = await loadTendency();

  const drive = params.drive
    ? await getDriveState(params.drive)
    : await getActiveDrive();

  const situation: Situation = drive
    ? driveSituation(drive)
    : {
        down: Number(params.down ?? 1) || 1,
        distance: Number(params.distance ?? 10) || 10,
        yardLine: Number(params.yardLine ?? 25) || 25,
        quarter: Number(params.quarter ?? 1) || 1,
        clockSeconds: Number(params.clockSeconds ?? 900) || 900,
        scoreDiff: Number(params.scoreDiff ?? 0) || 0,
      };

  const leans = (params.leans ?? '').split(',').map((value) => value.trim()).filter(Boolean);
  const looks = drive ? looksFromDrive(drive) : [];

  const recommendation = recommendCalls(formations, { situation, looks, leans });
  const tendency = buildTendencyReport(history);
  const bucket = resolveBucket(situation);

  const lookup = (id: string | null | undefined) => (id ? roster.find((p) => p.id === id) : undefined);
  const planSubs = subs.filter((sub) => sub.mode === 'override' && sub.playerId);

  // Which player is actually on the field for the called formation, by spot.
  const calledFormation = recommendation
    ? formations.find((formation) => formation.id === recommendation.primary.formationId)
    : undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Call sheet"
        subtitle="Down and distance in, one explained call out. It tracks the looks you have shown so you keep the defense guessing."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={drive ? `Drive vs ${drive.opponent}` : 'Start a drive'}
          subtitle={
            drive
              ? `${driveStatusLabel(drive.status)} · ${drive.quarter}${drive.quarter === 1 ? 'st' : drive.quarter === 2 ? 'nd' : drive.quarter === 3 ? 'rd' : 'th'} quarter · ${Math.floor(
                  drive.clockSeconds / 60,
                )}:${String(drive.clockSeconds % 60).padStart(2, '0')}`
              : 'Set the situation once and the sheet follows the drive for you.'
          }
          aside={
            drive ? (
              <Link href="/callsheet" className="btn-ghost">
                New drive
              </Link>
            ) : null
          }
        >
          {drive ? (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <Stat label="Down & distance" value={`${drive.down} & ${drive.distance}`} />
                <Stat label="Ball on" value={`${drive.yardLine >= 50 ? 'opp' : 'own'} ${drive.yardLine >= 50 ? 100 - drive.yardLine : drive.yardLine}`} />
                <Stat label="Bucket" value={bucket.replace('-', ' ')} hint={BUCKET_LABELS[bucket]} />
              </div>

              {drive.calls.length ? (
                <div className="mt-3 space-y-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    This drive
                  </h3>
                  {drive.calls.map((call) => (
                    <div
                      key={call.sequence}
                      className="flex items-center justify-between gap-2 border-b border-line py-1 text-xs last:border-0"
                    >
                      <span className="truncate">
                        {call.sequence}. {call.down} & {call.distance} · {call.playName}
                      </span>
                      <Badge
                        tone={
                          call.outcome === 'td'
                            ? 'good'
                            : call.outcome === 'turnover'
                              ? 'bad'
                              : 'muted'
                        }
                      >
                        {OUTCOME_LABELS[call.outcome] ?? call.outcome}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : null}

              {recommendation && drive.status === 'active' ? (
                <form action={advanceDriveAction} className="mt-3 space-y-2 border-t border-line pt-3">
                  <input type="hidden" name="driveId" value={drive.id} />
                  <input type="hidden" name="formationId" value={recommendation.primary.formationId} />
                  <input type="hidden" name="playId" value={recommendation.primary.playId} />
                  <input type="hidden" name="playName" value={recommendation.primary.playName} />
                  <input
                    type="hidden"
                    name="reasons"
                    value={recommendation.primary.reasons.slice(0, 3).join('|')}
                  />
                  <p className="text-xs text-muted">
                    Called: <strong>{recommendation.primary.playName}</strong> from{' '}
                    {recommendation.primary.formationName}
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="label mb-0" htmlFor="outcome">
                      Result
                    </label>
                    <select id="outcome" name="outcome" className="field" required>
                      {OUTCOME_OPTIONS.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {OUTCOME_LABELS[outcome]}
                        </option>
                      ))}
                    </select>
                    <button className="btn shrink-0" type="submit">
                      Log &amp; advance
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">
                    One tap per play. Nothing here is play-by-play bookkeeping — the coarse result is
                    only used to move the chains and to build your tendency report.
                  </p>
                </form>
              ) : drive.status !== 'active' ? (
                <p className="mt-3 rounded-lg border border-line bg-surface-2 p-2 text-xs text-muted">
                  This drive is finished ({driveStatusLabel(drive.status)}).{' '}
                  <Link href="/callsheet" className="underline">
                    Start a new one.
                  </Link>
                </p>
              ) : null}
            </>
          ) : (
            <form action={createDriveAction} className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="opponent">
                  Opponent
                </label>
                <input id="opponent" name="opponent" className="field" defaultValue="CPU" />
              </div>
              <div>
                <label className="label" htmlFor="down">
                  Down
                </label>
                <input id="down" name="down" type="number" min={1} max={4} defaultValue={1} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="distance">
                  To go
                </label>
                <input id="distance" name="distance" type="number" min={1} max={99} defaultValue={10} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="yardLine">
                  Ball on (1-99 from your goal)
                </label>
                <input id="yardLine" name="yardLine" type="number" min={1} max={99} defaultValue={25} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="quarter">
                  Quarter
                </label>
                <input id="quarter" name="quarter" type="number" min={1} max={4} defaultValue={1} className="field" />
              </div>
              <div>
                <label className="label" htmlFor="clockSeconds">
                  Clock (seconds left)
                </label>
                <input
                  id="clockSeconds"
                  name="clockSeconds"
                  type="number"
                  min={0}
                  max={900}
                  defaultValue={900}
                  className="field"
                />
              </div>
              <div>
                <label className="label" htmlFor="scoreDiff">
                  Score difference (you minus them)
                </label>
                <input id="scoreDiff" name="scoreDiff" type="number" defaultValue={0} className="field" />
              </div>
              <div className="sm:col-span-3">
                <button className="btn" type="submit">
                  Start drive
                </button>
              </div>
            </form>
          )}
        </Card>

        <Card
          title="What are you seeing?"
          subtitle="Set the situation by hand, or tick what the defense is doing to re-rank the calls."
        >
          <form method="get" className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="qDown">
                Down
              </label>
              <input id="qDown" name="down" type="number" min={1} max={4} defaultValue={situation.down} className="field" />
            </div>
            <div>
              <label className="label" htmlFor="qDistance">
                To go
              </label>
              <input
                id="qDistance"
                name="distance"
                type="number"
                min={1}
                max={99}
                defaultValue={situation.distance}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="qYardLine">
                Ball on
              </label>
              <input
                id="qYardLine"
                name="yardLine"
                type="number"
                min={1}
                max={99}
                defaultValue={situation.yardLine}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="qQuarter">
                Quarter
              </label>
              <input
                id="qQuarter"
                name="quarter"
                type="number"
                min={1}
                max={4}
                defaultValue={situation.quarter}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="qClock">
                Clock
              </label>
              <input
                id="qClock"
                name="clockSeconds"
                type="number"
                min={0}
                max={900}
                defaultValue={situation.clockSeconds}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="qScore">
                Score diff
              </label>
              <input
                id="qScore"
                name="scoreDiff"
                type="number"
                defaultValue={situation.scoreDiff}
                className="field"
              />
            </div>
            <fieldset className="sm:col-span-3">
              <legend className="label">Defensive read</legend>
              <div className="flex flex-wrap gap-2">
                {OPPONENT_LEANS.map((lean) => (
                  <label
                    key={lean.id}
                    className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-xs"
                  >
                    <input
                      type="checkbox"
                      name="leans"
                      value={lean.id}
                      defaultChecked={leans.includes(lean.id)}
                    />
                    {lean.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="sm:col-span-3">
              <button className="btn" type="submit">
                Get the call
              </button>
            </div>
          </form>
        </Card>
      </div>

      {recommendation ? (
        <Card
          title="The call"
          subtitle={`${recommendation.situationLabel} · ${BUCKET_LABELS[recommendation.bucket]}`}
          aside={<Badge tone="good">{CONCEPT_LABELS[recommendation.primary.tag.concept]}</Badge>}
        >
          <div className="rounded-xl border border-accent-border bg-accent-soft p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-lg font-bold">{recommendation.primary.playName}</p>
                <p className="text-sm text-muted">
                  from {recommendation.primary.formationName} · {recommendation.primary.look}
                </p>
              </div>
              <Badge tone="muted">score {recommendation.primary.score}</Badge>
            </div>

            <ul className="mt-3 space-y-1 text-xs text-muted">
              {recommendation.primary.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>

            {calledFormation ? (
              <div className="mt-3 rounded-lg border border-line bg-surface-2 p-2">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Your eleven in this formation
                </p>
                <p className="text-xs text-ink">
                  {resolveFormation(calledFormation, ctx)
                    .slots.map((slot) => {
                      const player = lookup(slot.playerId);
                      const marker = slot.source === 'override' ? '*' : '';
                      return `${slot.label}: ${player ? player.lastName : '—'}${marker}`;
                    })
                    .join(' · ')}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  * formation sub.{' '}
                  {planSubs.filter((sub) => sub.formationId === calledFormation.id).length} of them in
                  this formation.
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {recommendation.alternatives.map((alternative) => (
              <div key={alternative.playId} className="rounded-lg border border-line p-3">
                <p className="text-sm font-semibold">{alternative.playName}</p>
                <p className="text-xs text-muted">
                  {alternative.formationName} · {CONCEPT_LABELS[alternative.tag.concept]} · score{' '}
                  {alternative.score}
                </p>
                <p className="mt-1 text-[11px] text-muted">{alternative.reasons[0]}</p>
              </div>
            ))}
          </div>

          {recommendation.reuseableLooks.length ? (
            <div className="mt-3 rounded-lg border border-line bg-surface-2 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                Same look, different concept
              </h3>
              <ul className="mt-2 space-y-1 text-xs text-muted">
                {recommendation.reuseableLooks.slice(0, 4).map((look) => (
                  <li key={look.formationId}>
                    <Link href={`/formations/${look.formationId}`} className="underline">
                      {look.formationName}
                    </Link>
                    : you have shown {look.used.map((concept) => CONCEPT_LABELS[concept]).join(', ')} —
                    untried here: {look.unseen.map((concept) => CONCEPT_LABELS[concept]).join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-3 text-[11px] text-muted">
            {recommendation.explanation.join(' · ')}
          </p>
        </Card>
      ) : (
        <Empty>No plays are available to call. Load a playbook first.</Empty>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Tell meter"
          subtitle={`Self-scout across ${tendency.totalCalls} tracked calls. ${Math.round(
            tendency.passRate * 100,
          )}% pass overall.`}
        >
          {tendency.totalCalls === 0 ? (
            <Empty>
              Log a drive and this fills in. It is the half of the sheet that teaches you what you
              give away.
            </Empty>
          ) : tendency.tells.length === 0 ? (
            <p className="text-sm text-muted">
              No strong tendencies yet — keep logging and patterns will show up.
            </p>
          ) : (
            <div className="space-y-2">
              {tendency.tells.map((tell) => (
                <div key={tell.id} className="rounded-lg border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={tell.strength > 0.7 ? 'bad' : tell.strength > 0.4 ? 'warn' : 'muted'}>
                      {Math.round(tell.strength * 100)}%
                    </Badge>
                    <span className="text-sm font-semibold">{tell.headline}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{tell.detail}</p>
                  <p className="mt-1 text-xs text-tone-good">{tell.fix}</p>
                </div>
              ))}
            </div>
          )}

          {tendency.byLook.length ? (
            <div className="mt-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                By look
              </h3>
              <table className="grid-table mt-2">
                <thead>
                  <tr>
                    <th>Look</th>
                    <th className="w-16">Calls</th>
                    <th className="w-20">Pass %</th>
                  </tr>
                </thead>
                <tbody>
                  {tendency.byLook.slice(0, 6).map((group) => (
                    <tr key={group.key}>
                      <td>{group.label}</td>
                      <td className="tabular-nums">{group.calls}</td>
                      <td className="tabular-nums">{Math.round(group.passRate * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card
          title="Your sheet, bucket by bucket"
          subtitle="Defaults are a balanced starting point. Rewrite any bucket and the engine calls from your list."
        >
          <div className="space-y-2">
            {(Object.keys(BUCKET_LABELS) as (keyof typeof BUCKET_LABELS)[]).map((bucketId) => (
              <details key={bucketId} className="rounded-lg border border-line p-2.5">
                <summary className="cursor-pointer text-sm">
                  {BUCKET_LABELS[bucketId]}
                  {bucketId === bucket ? <span className="ml-2 text-xs text-accent-text">in use</span> : null}
                </summary>
                <form action={setBucketAction} className="mt-2 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="bucketId" value={bucketId} />
                  <input
                    name="concepts"
                    className="field flex-1"
                    placeholder="inside-zone, play-action-deep, screen"
                    defaultValue=""
                  />
                  <button className="btn-ghost" type="submit">
                    Save bucket
                  </button>
                </form>
                <p className="mt-1 text-[11px] text-muted">
                  Comma-separated concept keys, most preferred first: inside-zone, outside-zone,
                  gap-power, counter, dive, draw, qb-run, screen, rpo, quick-game, dropback-short,
                  dropback-mid, dropback-deep, play-action-short, play-action-deep, trick.
                </p>
              </details>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="Drive script"
        subtitle="A branched opening script: each line is generated for the situation that branch leads to."
      >
        {formations.length === 0 ? (
          <Empty>Load a playbook to generate a script.</Empty>
        ) : (
          <DriveScript formations={formations} situation={situation} />
        )}
      </Card>
    </div>
  );
}

function DriveScript({
  formations,
  situation,
}: {
  formations: Awaited<ReturnType<typeof loadPlan>>['formations'];
  situation: Situation;
}) {
  const script = scriptDrive(formations, { situation }, 8);

  if (script.length === 0) return <Empty>Nothing to script from yet.</Empty>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        Opening call first, then the branches. Each line is a fresh recommendation for the situation
        that branch creates — same look, new concept where the engine thinks it matters.
      </p>
      <ol className="space-y-1">
        {script.map((call) => (
          <li key={`${call.order}-${call.playId}`} className="rounded-lg border border-line p-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">
                {call.order}. {call.playName}{' '}
                <span className="font-normal text-muted">from {call.formationName}</span>
              </span>
              <span className="text-xs text-muted">
                {call.situationLabel} · {call.contingency}
              </span>
            </div>
            {call.path ? (
              <p className="mt-0.5 text-[11px] text-muted">Branch: {call.path}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
