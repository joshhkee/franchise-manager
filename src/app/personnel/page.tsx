import Link from 'next/link';
import { bulkAssignAction } from '../actions';
import { auditPlan, groupConflicts } from '@/domain/conflicts';
import { findPlayerAssignments, previewDepthChange } from '@/domain/impact';
import { formationsUsingRole } from '@/domain/resolution';
import { DEPTH_SLOTS } from '@/domain/depthSlots';
import type { RosterPlayer } from '@/domain/types';
import { Badge, Card, Empty, PageHeader, Stat } from '@/components/ui';
import { PlayerSelect } from '@/components/pickers';
import { requireSession } from '@/lib/auth';
import { loadPlan } from '@/lib/loaders';

export default async function PersonnelPage({
  searchParams,
}: {
  searchParams: Promise<{
    slotCode?: string;
    rank?: string;
    playerId?: string;
    bulk?: string;
    count?: string;
    skipped?: string;
    lookupPlayerId?: string;
  }>;
}) {
  await requireSession();
  const params = await searchParams;
  const { formations, ctx, roster, subs } = await loadPlan();

  const conflicts = auditPlan(formations, ctx);
  const grouped = groupConflicts(conflicts);
  const errors = conflicts.filter((c) => c.severity === 'error').length;
  const warnings = conflicts.filter((c) => c.severity === 'warning').length;

  const lookup = (id: string | null | undefined): RosterPlayer | undefined =>
    id ? roster.find((player) => player.id === id) : undefined;

  // Impact preview: rendered straight from the query string, so it works with no
  // client JavaScript at all.
  const previewSlot = params.slotCode ?? '';
  const previewRank = Number(params.rank ?? 1) || 1;
  const previewPlayerId = params.playerId === undefined ? undefined : params.playerId || null;
  const preview =
    previewSlot && params.playerId !== undefined
      ? previewDepthChange(formations, ctx, {
          slotCode: previewSlot,
          rank: previewRank,
          toPlayerId: previewPlayerId ?? null,
        })
      : null;

  // Which role does each spot consume, and how dependent is the playbook on it?
  const roleUsage = DEPTH_SLOTS.map((slot) => {
    const using = formationsUsingRole(formations, ctx, slot.code);
    const pinned = using.filter(({ formation, slots }) => {
      const index = new Map(subs.map((sub) => [`${sub.formationId}:${sub.slotKey}`, sub]));
      return slots.every((formationSlot) => {
        const sub = index.get(`${formation.id}:${formationSlot.key}`);
        return sub?.mode === 'override' && sub.playerId;
      });
    });
    return {
      code: slot.code,
      label: slot.label,
      formations: using.length,
      pinned: pinned.length,
      starter: lookup((ctx.depthChart.entries[slot.code] ?? [])[0]),
    };
  })
    .filter((entry) => entry.formations > 0)
    .sort((a, b) => b.formations - a.formations);

  const pinnedTotal = subs.filter((sub) => sub.mode === 'override' && sub.playerId).length;
  const lookupPlayerId = params.lookupPlayerId ?? '';
  const assignments = lookupPlayerId
    ? findPlayerAssignments(formations, ctx, lookupPlayerId)
    : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Personnel control"
        subtitle="One place to see who is on the field, what a depth chart change touches, and what is broken."
      />

      {params.bulk ? (
        <p className="note note-good">
          Bulk assignment {params.bulk}: {params.count ?? 0} formation spots changed,{' '}
          {params.skipped ?? 0} formations skipped because they do not use that role.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Errors" value={errors} hint="spots with nobody on the field" />
        <Stat label="Warnings" value={warnings} hint="duplicates, unavailable, stale subs" />
        <Stat label="Formation subs" value={pinnedTotal} hint="players pinned per formation" />
        <Stat label="Roles in use" value={roleUsage.length} hint="depth chart roles your playbook consults" />
      </div>

      <Card
        title="What would this change touch?"
        subtitle="Pick a depth chart slot and a player. Nothing is saved — this is the preview."
      >
        <form className="grid gap-3 sm:grid-cols-4" method="get">
          <div>
            <label className="label" htmlFor="slotCode">
              Depth chart role
            </label>
            <select id="slotCode" name="slotCode" defaultValue={previewSlot} className="field">
              <option value="">Choose a role…</option>
              {DEPTH_SLOTS.map((slot) => (
                <option key={slot.code} value={slot.code}>
                  {slot.code} — {slot.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="rank">
              Rank
            </label>
            <input
              id="rank"
              name="rank"
              type="number"
              min={1}
              max={5}
              defaultValue={previewRank}
              className="field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="playerId">
              New player
            </label>
            <PlayerSelect
              players={roster}
              name="playerId"
              selected={previewPlayerId ?? ''}
              emptyLabel="— clear this spot —"
            />
          </div>
          <div className="sm:col-span-4">
            <button className="btn" type="submit">
              Preview the blast radius
            </button>
          </div>
        </form>

        {preview ? (
          <div className="mt-4 space-y-3 rounded-lg border border-line bg-surface-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="info">
                {preview.change.slotCode} rank {preview.change.rank}
              </Badge>
              <span className="text-sm">
                {lookup(preview.change.fromPlayerId)?.lastName ?? 'nobody'} →{' '}
                {lookup(preview.change.toPlayerId)?.lastName ?? 'nobody'}
              </span>
              <Badge tone={preview.changed.length ? 'warn' : 'muted'}>
                {preview.changed.length} formations change
              </Badge>
              <Badge tone={preview.pinned.length ? 'good' : 'muted'}>
                {preview.pinned.length} stay pinned
              </Badge>
              <Badge tone="muted">{preview.formationsUsingRole} consult this role</Badge>
            </div>

            {preview.notes.length ? (
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted">
                {preview.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}

            {preview.duplicateWarnings.length ? (
              <div className="note note-bad">
                <strong>Would put one player on the field twice:</strong>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {preview.duplicateWarnings.slice(0, 5).map((warning) => (
                    <li key={`${warning.formationId}-${warning.label}`}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.unavailableWarnings.length ? (
              <div className="note note-warn">
                <strong>Would field an unavailable player:</strong>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {preview.unavailableWarnings.slice(0, 5).map((warning) => (
                    <li key={`${warning.formationId}-${warning.label}`}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.emptyWarnings.length ? (
              <div className="note note-bad">
                <strong>Would leave spots empty:</strong>
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {preview.emptyWarnings.slice(0, 5).map((warning) => (
                    <li key={`${warning.formationId}-${warning.label}`}>{warning.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {preview.changed.length ? (
              <div className="overflow-x-auto">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Formation</th>
                      <th>Spot</th>
                      <th>Becomes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.changed.slice(0, 12).map((delta) => (
                      <tr key={delta.formationId}>
                        <td>
                          <Link href={`/formations/${delta.formationId}`} className="underline">
                            {delta.formationName}
                          </Link>
                          {delta.pinnedCount ? (
                            <span className="ml-2 text-[11px] text-muted">
                              {delta.pinnedCount} pinned
                            </span>
                          ) : null}
                        </td>
                        <td>{delta.changes.map((change) => change.label).join(', ')}</td>
                        <td>
                          {delta.changes
                            .map((change) => lookup(change.toPlayerId)?.lastName ?? 'nobody')
                            .join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.changed.length > 12 ? (
                  <p className="mt-2 text-xs text-muted">
                    +{preview.changed.length - 12} more formations
                  </p>
                ) : null}
              </div>
            ) : null}

            {preview.playersAffected.length ? (
              <p className="text-xs text-muted">
                Snap swing: {preview.playersAffected
                  .slice(0, 4)
                  .map(
                    (entry) =>
                      `${lookup(entry.playerId)?.lastName ?? entry.playerId} ${
                        entry.gained ? `+${entry.gained}` : ''
                      }${entry.lost ? ` -${entry.lost}` : ''}`,
                  )
                  .join(', ')}
              </p>
            ) : null}

            <p className="text-[11px] text-muted">
              Apply it on the{' '}
              <Link href="/depth-chart" className="underline">
                depth chart
              </Link>{' '}
              screen, then check the{' '}
              <Link href="/checklist" className="underline">
                apply checklist
              </Link>{' '}
              to set it in game.
            </p>
          </div>
        ) : null}
      </Card>

      <Card
        title="Role usage"
        subtitle="If you change the player at a role, every formation listed here that is not pinned follows."
      >
        {roleUsage.length === 0 ? (
          <Empty>No formation in your playbooks consults a depth chart role yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Now starting</th>
                  <th className="w-24">Formations</th>
                  <th className="w-24">Pinned</th>
                  <th>Where</th>
                </tr>
              </thead>
              <tbody>
                {roleUsage.map((entry) => {
                  const using = formationsUsingRole(formations, ctx, entry.code);
                  return (
                    <tr key={entry.code}>
                      <td className="font-semibold">{entry.code}</td>
                      <td>
                        {entry.starter
                          ? `${entry.starter.firstName.charAt(0)}. ${entry.starter.lastName} (${entry.starter.overall})`
                          : '—'}
                      </td>
                      <td className="tabular-nums">{entry.formations}</td>
                      <td className="tabular-nums">{entry.pinned}</td>
                      <td className="text-xs text-muted">
                        {using
                          .slice(0, 4)
                          .map(({ formation }) => formation.name)
                          .join(', ')}
                        {using.length > 4 ? ` +${using.length - 4}` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Bulk assign one role across formations"
        subtitle="Setting the same slot receiver in a dozen Trips sets one screen at a time is the tedium this removes."
      >
        <form action={bulkAssignAction} className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select id="role" name="role" className="field" required>
              <option value="">Choose a role…</option>
              {roleUsage.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.code} — {entry.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bulkPlayer">
              Player (blank clears the subs)
            </label>
            <PlayerSelect players={roster} name="playerId" emptyLabel="— clear overrides —" />
          </div>
          <div>
            <label className="label" htmlFor="bulkSet">
              Only this set (optional)
            </label>
            <select id="bulkSet" name="set" className="field">
              <option value="">All sets</option>
              {[...new Set(formations.map((formation) => formation.set))]
                .sort()
                .map((set) => (
                  <option key={set} value={set}>
                    {set}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bulkPersonnel">
              Personnel (optional)
            </label>
            <select id="bulkPersonnel" name="personnel" className="field">
              <option value="">Any</option>
              {[...new Set(formations.map((formation) => formation.personnel))]
                .sort()
                .map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bulkDistribution">
              Distribution (optional)
            </label>
            <select id="bulkDistribution" name="distribution" className="field">
              <option value="">Any</option>
              {[...new Set(formations.map((formation) => formation.distribution))]
                .sort()
                .map((distribution) => (
                  <option key={distribution} value={distribution}>
                    {distribution}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="bulkSearch">
              Name contains (optional)
            </label>
            <input id="bulkSearch" name="search" className="field" placeholder="trips" />
          </div>
          <div className="sm:col-span-3">
            <button className="btn" type="submit">
              Apply across matching formations
            </button>
          </div>
        </form>
      </Card>

      <Card
        title="Everything that is wrong"
        subtitle="Grouped so repeats across formations collapse into one row."
        aside={
          <Badge tone={errors ? 'bad' : 'good'}>{errors ? `${errors} errors` : 'no errors'}</Badge>
        }
      >
        {grouped.length === 0 ? (
          <Empty>Nothing to fix. Every spot in your plan resolves to an available player.</Empty>
        ) : (
          <div className="space-y-2">
            {grouped.slice(0, 40).map((entry) => (
              <div
                key={`${entry.conflict.kind}-${entry.conflict.signature}`}
                className="rounded-lg border border-line p-2.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    tone={
                      entry.conflict.severity === 'error'
                        ? 'bad'
                        : entry.conflict.severity === 'warning'
                          ? 'warn'
                          : 'muted'
                    }
                  >
                    {entry.conflict.kind}
                  </Badge>
                  <span className="text-sm">{entry.conflict.message}</span>
                  {entry.count > 1 ? (
                    <Badge tone="muted">{entry.count}×</Badge>
                  ) : null}
                </div>
                {entry.formations.length > 1 ? (
                  <p className="mt-1 text-[11px] text-muted">
                    {entry.formations.slice(0, 6).join(', ')}
                    {entry.formations.length > 6 ? ` +${entry.formations.length - 6}` : ''}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="Which formations would field a given player?"
        subtitle="The reverse lookup: pick a player and see every spot he lands in."
      >
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="label" htmlFor="lookupPlayerId">
              Player
            </label>
            <PlayerSelect
              players={roster}
              name="lookupPlayerId"
              selected={lookupPlayerId ?? ''}
              emptyLabel="— choose a player —"
            />
          </div>
          <button className="btn" type="submit">
            Look up
          </button>
        </form>

        {lookupPlayerId ? (
          <div className="mt-3 space-y-1">
            {assignments.length === 0 ? (
              <Empty>
                {lookup(lookupPlayerId)?.lastName ?? 'That player'} is not on the field in any
                formation in the current plan.
              </Empty>
            ) : (
              <>
                <p className="text-xs text-muted">
                  On the field in {assignments.length} formation spots:
                </p>
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th>Formation</th>
                      <th className="w-24">Spot</th>
                      <th className="w-28">Because</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.slice(0, 20).map((entry) => (
                      <tr key={`${entry.formationId}:${entry.label}`}>
                        <td>
                          <Link href={`/formations/${entry.formationId}`} className="underline">
                            {entry.formationName}
                          </Link>
                        </td>
                        <td>{entry.label}</td>
                        <td className="text-xs text-muted">
                          {entry.source === 'override' ? 'formation sub' : entry.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {assignments.length > 20 ? (
                  <p className="text-xs text-muted">+{assignments.length - 20} more</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
