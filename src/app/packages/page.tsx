import Link from 'next/link';
import { Badge, Card, Empty, PageHeader } from '@/components/ui';
import { filterFormations } from '@/domain/bulk';
import { DEPTH_SLOTS } from '@/domain/depthSlots';
import { resolveAll } from '@/domain/resolution';
import type { Side } from '@/domain/types';
import { requireSession } from '@/lib/auth';
import { loadPlan } from '@/lib/loaders';

const SIDES: Side[] = ['offense', 'defense', 'special'];

/** The role you most often rotate, so the default view is the useful one. */
const PREFERRED_ROLE: Record<Side, string> = { offense: 'WR', defense: 'CB', special: 'K' };

/**
 * Packages — one role, every formation, side by side.
 *
 * The planner is formation-by-formation, which is right when you are fixing one
 * look and wrong when you are deciding *who the third receiver is* across every
 * three-receiver set you run. This screen collapses that question into columns:
 * pick the role, and every formation in a personnel grouping shows its first,
 * second and third man for it.
 */
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ side?: string; role?: string }>;
}) {
  await requireSession();
  const params = await searchParams;
  const { formations, ctx, roster } = await loadPlan();

  const side: Side = SIDES.includes(params.side as Side) ? (params.side as Side) : 'offense';
  const sideFormations = filterFormations(formations, { side });

  const rolesUsed = new Set(
    sideFormations.flatMap((formation) => formation.slots.map((slot) => slot.roleCode)),
  );
  const roleOptions = DEPTH_SLOTS.filter((slot) => rolesUsed.has(slot.code));
  const role =
    roleOptions.find((slot) => slot.code === params.role)?.code ??
    roleOptions.find((slot) => slot.code === PREFERRED_ROLE[side])?.code ??
    roleOptions[0]?.code ??
    '';

  const resolved = resolveAll(sideFormations, ctx);
  const byId = new Map(roster.map((player) => [player.id, player]));
  const nameOf = (id: string | null) => {
    const player = id ? byId.get(id) : undefined;
    return player ? `${player.firstName.charAt(0)}. ${player.lastName}` : 'nobody';
  };

  /** The spots in one formation that consult the chosen role, in rank order. */
  const spotsIn = (formationId: string) =>
    (resolved.get(formationId)?.slots ?? [])
      .filter((slot) => slot.viaSlotCode === role)
      .sort((a, b) => (a.viaRank ?? 1) - (b.viaRank ?? 1));

  // A formation that never consults the role is noise on this screen, so it is
  // hidden and counted instead of filling a row with dashes.
  const relevant = role ? sideFormations.filter((f) => spotsIn(f.id).length > 0) : [];
  const hidden = sideFormations.length - relevant.length;

  const groups = new Map<string, typeof sideFormations>();
  for (const formation of relevant) {
    const key = formation.personnel || 'sub';
    groups.set(key, [...(groups.get(key) ?? []), formation]);
  }
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const maxRanks = Math.max(1, ...relevant.map((formation) => spotsIn(formation.id).length));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Packages"
        subtitle="Every formation in a personnel grouping, with the player each spot consults — so a role you rotate shows up in one column."
      />

      <Card title="Spotlight">
        <form className="grid gap-3 sm:grid-cols-3" method="get">
          <div>
            <label className="label" htmlFor="side">
              Side
            </label>
            <select id="side" name="side" defaultValue={side} className="field">
              {SIDES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="role">
              Role
            </label>
            <select id="role" name="role" defaultValue={role} className="field">
              {roleOptions.map((slot) => (
                <option key={slot.code} value={slot.code}>
                  {slot.code} — {slot.label}
                  {slot.situational ? ' (situational)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn" type="submit">
              Show
            </button>
          </div>
        </form>
      </Card>

      {roleOptions.length === 0 || !role ? (
        <Card title="Nothing to show">
          <Empty>
            No formations are loaded for this side. Load playbooks from{' '}
            <Link href="/formations" className="underline">
              formations
            </Link>
            .
          </Empty>
        </Card>
      ) : relevant.length === 0 ? (
        <Card title="Nothing to show">
          <Empty>
            No formation on this side uses <code>{role}</code>.
          </Empty>
        </Card>
      ) : (
        sortedGroups.map(([personnel, groupFormations], index) => (
          <Card
            key={personnel}
            title={`${personnel} personnel`}
            subtitle={`${groupFormations.length} formation${groupFormations.length === 1 ? '' : 's'} using ${role}${index === 0 && hidden > 0 ? ` · ${hidden} elsewhere on this side do not` : ''}`}
          >
            <div className="overflow-x-auto">
              <table className="grid-table">
                <thead>
                  <tr>
                    <th>Formation</th>
                    {Array.from({ length: maxRanks }, (_, index) => (
                      <th key={index}>
                        {role} {index + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupFormations.map((formation) => {
                    const spots = spotsIn(formation.id);
                    return (
                      <tr key={formation.id}>
                        <td>
                          <Link href={`/formations/${formation.id}`} className="underline">
                            {formation.name}
                          </Link>
                          <span className="ml-2 text-xs text-muted">{formation.set}</span>
                        </td>
                        {Array.from({ length: maxRanks }, (_, index) => {
                          const spot = spots[index];
                          if (!spot) return <td key={index} className="text-muted">—</td>;
                          return (
                            <td key={index}>
                              <span
                                className={spot.source === 'override' ? 'font-medium text-accent-text' : ''}
                              >
                                {nameOf(spot.playerId)}
                              </span>
                              {spot.source === 'override' ? (
                                <Badge tone="info">sub</Badge>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}

      <Card title="How to read this" subtitle="What a column means, and what it does not.">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
          <li>
            A cell is the man that spot puts on the field: inherited from the depth chart, or pinned
            for that formation (marked <Badge tone="info">sub</Badge>).
          </li>
          <li>
            A dash means this formation has fewer spots bound to <code>{role}</code> than the widest
            one in the group — usually it simply does not use a third man there.
          </li>
          <li>
            Formations whose layout was inferred rather than read from a diagram are marked unverified
            on the{' '}
            <Link href="/formations" className="underline">
              formation page
            </Link>
            ; confirm the ones you care about in game.
          </li>
        </ul>
      </Card>
    </div>
  );
}
