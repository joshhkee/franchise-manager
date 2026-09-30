import Link from 'next/link';
import { Badge, Card, Empty, PageHeader, Row, Stat } from '@/components/ui';
import { depthSlot } from '@/domain/depthSlots';
import { diffPlaybooks, diffSummary } from '@/domain/planDiff';
import {
  FIT_FLOOR,
  FIT_GRADE_LABELS,
  FIT_GRADE_TONES,
  countGrades,
  gradeDepthChart,
  schemeIdForPlaybook,
  type RoleFit,
} from '@/domain/schemeFit';
import { PLAYBOOK_SCHEME, SCHEME_BY_ID, schemesForSide } from '@/domain/schemes';
import { DEFAULT_DEFENSE_PLAYBOOK_IDS, DEFAULT_OFFENSE_PLAYBOOK_IDS } from '@/data/seed/playbooks';
import { getPlans } from '@/db/repo';
import { requireSession } from '@/lib/auth';
import { loadPlan } from '@/lib/loaders';
import { isDemoRatings } from '@/lib/seedRatings';
import type { Side } from '@/domain/types';

type TwoSided = Exclude<Side, 'special'>;

const SIDES: TwoSided[] = ['offense', 'defense'];

/** A role belongs to whichever side of the ball its slot does. */
function sideOf(roleCode: string): Side | null {
  return depthSlot(roleCode)?.side ?? null;
}

function orderOf(roleCode: string): number {
  return depthSlot(roleCode)?.order ?? 999;
}

/**
 * Which scheme to grade a side against.
 *
 * The plan stores one playbook, so only one side of the ball can come from it; the other
 * falls back to the first seeded playbook for its side. Either way the playbook we used
 * is printed on the card, because "which scheme am I graded against" is exactly the kind
 * of assumption this project refuses to hide.
 */
function defaultSchemeFor(side: TwoSided, planPlaybookId: string | null): string | null {
  if (planPlaybookId) {
    const mapped = SCHEME_BY_ID.get(schemeIdForPlaybook(planPlaybookId) ?? '');
    if (mapped && mapped.side === side) return mapped.id;
  }
  const fallback =
    side === 'offense' ? DEFAULT_OFFENSE_PLAYBOOK_IDS[0] : DEFAULT_DEFENSE_PLAYBOOK_IDS[0];
  return schemeIdForPlaybook(fallback);
}

export default async function SchemePage({
  searchParams,
}: {
  searchParams: Promise<{ offense?: string; defense?: string; side?: string; to?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const [{ formations, ctx, roster, playbooks }, plans] = await Promise.all([
    loadPlan(),
    getPlans(),
  ]);

  const byId = new Map(roster.map((player) => [player.id, player]));
  const nameOf = (id: string | null | undefined) => {
    const player = id ? byId.get(id) : undefined;
    return player ? `${player.firstName.charAt(0)}. ${player.lastName}` : 'nobody';
  };
  const isDemo = (playerId: string | null) =>
    isDemoRatings(playerId ? byId.get(playerId)?.ratings : null);

  const players = new Map(
    roster.map((player) => [player.id, { ratings: player.ratings, position: player.position }]),
  );

  const planPlaybookId = plans.find((plan) => plan.isDefault)?.playbookId ?? null;

  const schemeIds = {} as Record<TwoSided, string>;
  for (const side of SIDES) {
    const requested = side === 'offense' ? params.offense : params.defense;
    const options = schemesForSide(side);
    const fallback = defaultSchemeFor(side, planPlaybookId);
    schemeIds[side] = options.some((scheme) => scheme.id === requested)
      ? (requested as string)
      : options.some((scheme) => scheme.id === fallback)
        ? (fallback as string)
        : (options[0]?.id ?? '');
  }

  const grades = SIDES.map((side) => {
    const scheme = SCHEME_BY_ID.get(schemeIds[side]) ?? null;
    const fits = gradeDepthChart(ctx.depthChart, scheme, players).filter(
      (fit) => sideOf(fit.roleCode) === side,
    );
    const sourcePlaybook = playbooks.find((book) => PLAYBOOK_SCHEME[book.id] === scheme?.id) ?? null;
    return { side, scheme, fits, counts: countGrades(fits), sourcePlaybook };
  });

  const playbooksBySide: Record<TwoSided, typeof playbooks> = {
    offense: playbooks.filter((playbook) => playbook.side === 'offense'),
    defense: playbooks.filter((playbook) => playbook.side === 'defense'),
  };

  const diffSide: TwoSided = SIDES.includes(params.side as TwoSided)
    ? (params.side as TwoSided)
    : 'offense';
  const sidePlaybooks = playbooksBySide[diffSide];
  const currentPlaybook =
    sidePlaybooks.find((playbook) => playbook.id === planPlaybookId) ?? sidePlaybooks[0] ?? null;
  const candidates = sidePlaybooks.filter((playbook) => playbook.id !== currentPlaybook?.id);
  const targetPlaybook =
    candidates.find((playbook) => playbook.id === params.to) ?? candidates[0] ?? null;

  const diff =
    currentPlaybook && targetPlaybook
      ? diffPlaybooks({
          from: currentPlaybook,
          to: targetPlaybook,
          fromFormations: formations.filter((f) => f.playbookId === currentPlaybook.id),
          toFormations: formations.filter((f) => f.playbookId === targetPlaybook.id),
          depthChart: ctx.depthChart,
        })
      : null;

  const anyDemoAttributes = roster.some((player) => isDemoRatings(player.ratings));
  const mismatches = grades.flatMap(({ side, scheme, fits }) =>
    fits
      .filter((fit) => fit.grade === 'mismatch')
      .map((fit) => ({ side, scheme, fit })),
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Scheme fit"
        subtitle="How well the men you are starting suit the scheme you are running — graded the way the game grades it, on player archetypes, plus the attributes each archetype is built on."
      />

      <form className="card grid gap-3 sm:grid-cols-3" method="get">
        {SIDES.map((side) => (
          <div key={side}>
            <label className="label" htmlFor={`scheme-${side}`}>
              {side === 'offense' ? 'Offensive scheme' : 'Defensive scheme'}
            </label>
            <select id={`scheme-${side}`} name={side} defaultValue={schemeIds[side]} className="field">
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
            Grade my starters
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat
          label="Ideal fits"
          value={grades.reduce((sum, entry) => sum + entry.counts.ideal, 0)}
          hint="right archetype, attributes to match"
        />
        <Stat
          label="Mismatches"
          value={mismatches.length}
          hint={mismatches.length ? 'listed below' : 'nothing to fix'}
        />
        <Stat
          label="Archetypes"
          value="36"
          hint="Madden 27, committed table"
        />
        <Stat label="Schemes" value="21" hint="11 offense, 10 defense" />
      </div>

      {grades.map(({ side, scheme, fits, counts, sourcePlaybook }) => (
        <Card
          key={side}
          title={`${side} — ${scheme?.name ?? 'no scheme'}`}
          subtitle={[
            sourcePlaybook ? `Your plan's playbook reads as ${sourcePlaybook.name}.` : null,
            scheme ? `Favours ${scheme.keyArchetypes.join(', ')}.` : null,
          ]
            .filter(Boolean)
            .join(' ')}
          aside={
            <div className="flex flex-wrap gap-1">
              {(['ideal', 'strong', 'workable', 'mismatch'] as const).map((grade) =>
                counts[grade] > 0 ? (
                  <Badge key={grade} tone={FIT_GRADE_TONES[grade]}>
                    {counts[grade]} {FIT_GRADE_LABELS[grade].toLowerCase()}
                  </Badge>
                ) : null,
              )}
            </div>
          }
        >
          {fits.length === 0 ? (
            <Empty>Nobody is set at a {side} role in your plan yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Starter</th>
                    <th>Archetype</th>
                    <th>Fit</th>
                    <th className="hidden sm:table-cell">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {fits
                    .slice()
                    .sort((a, b) => orderOf(a.roleCode) - orderOf(b.roleCode))
                    .map((fit) => {
                      const starterId = ctx.depthChart.entries[fit.roleCode]?.[0] ?? null;
                      return (
                        <tr key={fit.roleCode}>
                          <td>
                            <Link href="/depth-chart" className="underline">
                              {fit.roleCode}
                            </Link>
                          </td>
                          <td>
                            {nameOf(starterId)}
                            {isDemo(starterId) ? (
                              <span className="ml-1 text-[10px] text-muted">demo</span>
                            ) : null}
                          </td>
                          <td className="text-muted">
                            {fit.archetypeName ?? '—'}
                            {fit.archetypeSource === 'derived' ? (
                              <span className="ml-1 text-[10px]">(guessed)</span>
                            ) : null}
                          </td>
                          <td>
                            <Badge tone={FIT_GRADE_TONES[fit.grade]}>
                              {FIT_GRADE_LABELS[fit.grade]}
                            </Badge>
                          </td>
                          <td className="hidden text-xs text-muted sm:table-cell">
                            {fit.reasons.join(' ')}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
          <AttributeNotes fits={fits} />
        </Card>
      ))}

      {mismatches.length > 0 ? (
        <Card
          title="Slots your scheme uses that these men cannot fill"
          subtitle={`Roles where the attributes that matter for the job miss the ${FIT_FLOOR} floor.`}
        >
          <ul className="space-y-3 text-sm">
            {mismatches.map(({ side, scheme, fit }) => {
              const starterId = ctx.depthChart.entries[fit.roleCode]?.[0] ?? null;
              return (
                <li key={`${side}-${fit.roleCode}`} className="border-b border-line pb-3 last:border-0">
                  <span className="font-medium">{fit.roleCode}</span>{' '}
                  <span className="text-muted">
                    — {nameOf(starterId)} ({fit.archetypeName ?? 'no archetype'})
                  </span>
                  <div className="text-xs text-muted">
                    {scheme?.name} wants {fit.preferredNames.join(' / ') || 'any archetype'}.{' '}
                    {fit.reasons[fit.reasons.length - 1]}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {fit.checks
                      .filter((check) => !check.clears)
                      .map((check) => (
                        <span
                          key={check.key}
                          className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted"
                        >
                          {check.label} {check.value ?? '—'}
                        </span>
                      ))}
                  </div>
                  <div className="mt-1 text-xs">
                    <Link href={`/packages?side=${side}&role=${fit.roleCode}`} className="underline">
                      Who else could play it
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Card
        title="Plan diffing across playbooks"
        subtitle="What switching playbooks would cost you: the roles you would suddenly have to fill, and the starters who would lose their spot."
      >
        {!diff || !currentPlaybook || !targetPlaybook ? (
          <Empty>Load a second playbook on one side and this comparison appears.</Empty>
        ) : (
          <>
            <form className="grid gap-3 sm:grid-cols-3" method="get">
              <div>
                <label className="label" htmlFor="side">
                  Side
                </label>
                <select id="side" name="side" defaultValue={diffSide} className="field">
                  {SIDES.map((side) => (
                    <option key={side} value={side}>
                      {side}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="to">
                  Switch to
                </label>
                <select id="to" name="to" defaultValue={targetPlaybook.id} className="field">
                  {candidates.map((playbook) => (
                    <option key={playbook.id} value={playbook.id}>
                      {playbook.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button className="btn" type="submit">
                  Compare
                </button>
              </div>
            </form>

            <p className="mt-3 text-sm">
              <span className="font-medium">{currentPlaybook.name}</span>
              <span className="text-muted"> → </span>
              <span className="font-medium">{targetPlaybook.name}</span>
            </p>
            <p className="mt-1 text-xs text-muted">{diffSummary(diff)}</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Formations
                </div>
                <Row label="In the new playbook" value={diff.formationCount.to} />
                <Row label="Shared with today's" value={diff.formationCount.shared} />
                <Row label="Only in the new one" value={diff.formationsOnlyInTo.length} />
                <Row label="You would give up" value={diff.formationsOnlyInFrom.length} />
              </div>
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">
                  Personnel groups
                </div>
                {diff.personnel.map((group) => (
                  <Row
                    key={group.group}
                    label={group.group === 'sub' ? 'sub packages' : `${group.group} personnel`}
                    value={`${group.from} → ${group.to}`}
                  />
                ))}
              </div>
            </div>

            {diff.roles.some((role) => role.status !== 'kept') ? (
              <div className="mt-4 overflow-x-auto">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Spots</th>
                      <th>Your starter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.roles
                      .filter((role) => role.status !== 'kept')
                      .sort((a, b) => a.code.localeCompare(b.code))
                      .map((role) => (
                        <tr key={role.code}>
                          <td>{role.code}</td>
                          <td>
                            <Badge
                              tone={
                                role.status === 'added' ? (role.staffed ? 'info' : 'bad') : 'warn'
                              }
                            >
                              {role.status === 'added'
                                ? role.staffed
                                  ? 'new role'
                                  : 'new role — nobody'
                                : 'goes away'}
                            </Badge>
                          </td>
                          <td className="tabular-nums">{role.slots}</td>
                          <td className="text-muted">
                            {role.starterId ? nameOf(role.starterId) : '—'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                The new playbook consults exactly the roles you already staff, so the switch costs you
                no jobs.
              </p>
            )}

            {diff.displacedStarters.length ? (
              <p className="mt-3 text-xs text-muted">
                Loses his spot:{' '}
                {diff.displacedStarters
                  .map((entry) => `${nameOf(entry.playerId)} (${entry.roleCode})`)
                  .join(', ')}
                .
              </p>
            ) : null}
          </>
        )}
      </Card>

      <Card title="How this is graded" subtitle="What the words mean, and where the line is.">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            <Badge tone="good">Ideal</Badge> — his archetype is one this scheme favours and at least
            80% of that archetype&apos;s attributes clear {FIT_FLOOR}.
          </li>
          <li>
            <Badge tone="info">Strong</Badge> — right archetype, most attributes clear.
          </li>
          <li>
            <Badge tone="muted">Workable</Badge> — either the right archetype with thin attributes, or
            a wrong archetype with good ones. Good enough to start, not what the scheme wants.
          </li>
          <li>
            <Badge tone="bad">Mismatch</Badge> — the attributes that matter for this job are not there.
            These are listed above with the attributes that fell short.
          </li>
          <li>
            Archetypes and schemes are Madden 27&apos;s, read off madden.tools and committed as a
            table (<code>SCHEME_FIT.md</code>). The {FIT_FLOOR} floor and those percentages are{' '}
            <span className="text-ink">ours</span> — Madden does not publish thresholds, so treat this
            as a strong hint rather than the game&apos;s own number.
          </li>
          <li>
            Which Madden scheme each of our playbooks <em>is</em> is our reading, not a fact from the
            game. It is printed on each card so you can disagree with it.
          </li>
          {anyDemoAttributes ? (
            <li>
              <span className="text-ink">Demo attributes.</span> Players from the seed roster carry
              synthetic ratings (marked <span className="text-ink">demo</span>) that exist so this
              screen works before you import anything, so their grades are placeholders. Run{' '}
              <code>npm run import:ratings</code> for real EA attributes and archetypes.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}

/** Small print under a table: what we could not grade, and why. */
function AttributeNotes({ fits }: { fits: RoleFit[] }) {
  const unrated = fits.filter((fit) => fit.grade === 'unrated');
  const thin = fits.filter((fit) => fit.known > 0 && fit.known < fit.checks.length);
  if (unrated.length === 0 && thin.length === 0) return null;
  return (
    <p className="mt-3 text-xs text-muted">
      {unrated.length
        ? `Not graded: ${unrated.map((fit) => fit.roleCode).join(', ')} — ${unrated[0]?.reasons[0] ?? ''}`
        : ''}
      {unrated.length && thin.length ? ' ' : ''}
      {thin.length ? `${thin.length} graded on partial attributes (the rest are not on file).` : ''}
    </p>
  );
}
