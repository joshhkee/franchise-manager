import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  assignFormationSlotAction,
  clearFormationSlotAction,
  rebindFormationSlotAction,
} from '../../actions';
import { tagPlay, CONCEPT_LABELS } from '@/domain/concepts';
import { classifyFormation, describeLook } from '@/domain/families';
import { resolveFormation } from '@/domain/resolution';
import { depthSlot, DEPTH_SLOTS } from '@/domain/depthSlots';
import { FormationDiagram, type DiagramPlayer } from '@/components/FormationDiagram';
import { Badge, Card, PageHeader } from '@/components/ui';
import { EligiblePlayerSelect } from '@/components/pickers';
import { requireSession } from '@/lib/auth';
import { loadPlan } from '@/lib/loaders';

export default async function FormationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSession();
  const { id } = await params;
  const { formations, ctx, subs, roster } = await loadPlan();
  const formation = formations.find((entry) => entry.id === id);
  if (!formation) notFound();

  const resolved = resolveFormation(formation, ctx);
  const klass = classifyFormation(formation);
  const subsBySlot = new Map(
    subs
      .filter((sub) => sub.formationId === formation.id)
      .map((sub) => [sub.slotKey, sub]),
  );

  const lookup = (playerId: string | null | undefined) =>
    playerId ? roster.find((player) => player.id === playerId) : undefined;

  const diagramPlayers: Record<string, DiagramPlayer | undefined> = {};
  for (const slot of resolved.slots) {
    const player = lookup(slot.playerId);
    if (!player) continue;
    diagramPlayers[slot.slotKey] = {
      name: `${player.lastName} ${player.overall}`,
      overall: player.overall,
      source: slot.source,
      unavailable:
        player.franchise.injuryStatus === 'out' ||
        player.franchise.injuryStatus === 'ir' ||
        player.franchise.rosterStatus !== 'active',
    };
  }

  const personnelCount = resolved.personnelIds.length;
  const teamRoles = DEPTH_SLOTS.filter((slot) => slot.side === formation.side);

  return (
    <div className="space-y-4">
      <PageHeader
        title={formation.name}
        subtitle={describeLook(klass)}
        aside={
          <Link href="/formations" className="btn-ghost">
            All formations
          </Link>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tone="muted">{formation.set}</Badge>
        <Badge tone="muted">{formation.personnel || '—'} personnel</Badge>
        <Badge tone="muted">{formation.distribution}</Badge>
        <Badge tone={personnelCount === 11 ? 'good' : 'bad'}>{personnelCount} on the field</Badge>
        {resolved.duplicates.length ? (
          <Badge tone="bad">{resolved.duplicates.length} duplicate player</Badge>
        ) : null}
        {resolved.unavailable.length ? (
          <Badge tone="warn">{resolved.unavailable.length} unavailable</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Who lines up where"
          subtitle="Accent rings inherit from your depth chart; purple rings are formation subs you set."
        >
          <FormationDiagram formation={formation} players={diagramPlayers} />
          <p className="mt-2 text-[11px] text-muted">
            Spots: {formation.slots.map((slot) => slot.label).join(' · ')}
          </p>
        </Card>

        <Card
          title="Slots"
          subtitle="Set a player to pin him here, or leave it inheriting so a depth chart change flows through."
        >
          <div className="space-y-3">
            {formation.slots.map((slot) => {
              const slotRes = resolved.slots.find((entry) => entry.slotKey === slot.key)!;
              const sub = subsBySlot.get(slot.key);
              const player = lookup(slotRes.playerId);
              const roleInfo = slotRes.roleUsed ? depthSlot(slotRes.roleUsed.code) : null;
              return (
                <div key={slot.key} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{slot.label}</span>
                    <span className="text-xs text-muted">{slot.key}</span>
                    {slotRes.source === 'override' ? (
                      <Badge tone="info">formation sub</Badge>
                    ) : slotRes.source === 'inherit' ? (
                      <Badge tone="muted">
                        inherits {slotRes.roleUsed?.code}
                        {(slotRes.roleUsed?.rank ?? 1) > 1 ? ` r${slotRes.roleUsed?.rank}` : ''}
                      </Badge>
                    ) : slotRes.source === 'fallback' ? (
                      <Badge tone="warn">fallback</Badge>
                    ) : (
                      <Badge tone="bad">unassigned</Badge>
                    )}
                    {sub?.inheritSlotCode ? <Badge tone="warn">rebound</Badge> : null}
                  </div>

                  <p className="mb-2 text-sm">
                    {player ? (
                      <>
                        {player.firstName} {player.lastName}{' '}
                        <span className="text-muted">
                          {player.position} · {player.overall}
                        </span>
                      </>
                    ) : (
                      <span className="text-tone-bad">{slotRes.problem ?? 'no player'}</span>
                    )}
                  </p>

                  <div className="grid gap-2">
                    <form action={assignFormationSlotAction} className="flex items-center gap-2">
                      <input type="hidden" name="formationId" value={formation.id} />
                      <input type="hidden" name="slotKey" value={slot.key} />
                      <EligiblePlayerSelect
                        players={roster}
                        positions={slot.eligiblePositions}
                        name="playerId"
                        selected={slotRes.playerId}
                        emptyLabel="— clear sub —"
                      />
                      <button className="btn shrink-0" type="submit">
                        Set
                      </button>
                    </form>

                    <div className="flex flex-wrap items-center gap-2">
                      {sub ? (
                        <form action={clearFormationSlotAction}>
                          <input type="hidden" name="formationId" value={formation.id} />
                          <input type="hidden" name="slotKey" value={slot.key} />
                          <button className="btn-ghost" type="submit">
                            Revert to depth chart
                          </button>
                        </form>
                      ) : null}
                      <form action={rebindFormationSlotAction} className="flex items-center gap-2">
                        <input type="hidden" name="formationId" value={formation.id} />
                        <input type="hidden" name="slotKey" value={slot.key} />
                        <select name="roleCode" defaultValue={sub?.inheritSlotCode ?? ''} className="field">
                          <option value="">Default role ({slot.roleCode ?? 'none'})</option>
                          {teamRoles.map((role) => (
                            <option key={role.code} value={role.code}>
                              {role.code} — {role.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          name="roleRank"
                          min={1}
                          max={5}
                          defaultValue={sub?.inheritRank ?? 1}
                          className="field w-16"
                          aria-label="role rank"
                        />
                        <button className="btn-ghost shrink-0" type="submit">
                          Rebind
                        </button>
                      </form>
                    </div>
                    {roleInfo && slotRes.source !== 'override' ? (
                      <p className="text-[11px] text-muted">{roleInfo.description}</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card
        title="Plays"
        subtitle="Concept tags are guessed from play names, then stored. Low-confidence tags are worth a pass."
      >
        {formation.plays.length === 0 ? (
          <p className="text-sm text-muted">
            No plays recorded for this formation yet. The public dataset does not cover every
            formation; add plays when you want the call sheet to use them.
          </p>
        ) : (
          <table className="grid-table">
            <thead>
              <tr>
                <th>Play</th>
                <th>Concept</th>
                <th className="w-24">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {formation.plays.map((play) => {
                const tag = tagPlay(play.name, {
                  conceptOverride: play.conceptOverride ?? null,
                  familyOverride: play.familyOverride ?? null,
                });
                return (
                  <tr key={play.id}>
                    <td>{play.name}</td>
                    <td>
                      <span className="flex flex-wrap items-center gap-2">
                        <span>{CONCEPT_LABELS[tag.concept]}</span>
                        <Badge tone="muted">{tag.family}</Badge>
                        {tag.source === 'manual' ? <Badge tone="info">edited</Badge> : null}
                      </span>
                    </td>
                    <td className="tabular-nums text-muted">
                      {Math.round(tag.confidence * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
