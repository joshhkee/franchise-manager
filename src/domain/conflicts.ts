import { depthSlot } from './depthSlots';
import { effectiveRole, resolveAll, type ResolveContext } from './resolution';
import { indexSubs, subKey, type Formation } from './types';

export type ConflictKind =
  | 'duplicate'
  | 'empty'
  | 'unavailable'
  | 'stale-override'
  | 'ineligible'
  | 'unknown-role'
  | 'duplicate-role';

export type Severity = 'error' | 'warning' | 'info';

export interface Conflict {
  kind: ConflictKind;
  severity: Severity;
  formationId: string | null;
  formationName: string | null;
  slotKey: string | null;
  label: string | null;
  playerId: string | null;
  roleCode: string | null;
  message: string;
  /** Grouping key so the UI can collapse repeats across formations. */
  signature: string;
}

const SEVERITY_ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

export function sortConflicts(conflicts: Conflict[]): Conflict[] {
  return [...conflicts].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (bySeverity !== 0) return bySeverity;
    return a.message.localeCompare(b.message);
  });
}

/**
 * Audits a plan: every way the personnel on the field can be wrong.
 *
 * Runs over the whole playbook, so it is the "am I in control?" screen rather than
 * a per-formation check.
 */
export function auditPlan(formations: Formation[], ctx: ResolveContext): Conflict[] {
  const conflicts: Conflict[] = [];
  const resolved = resolveAll(formations, ctx);
  const subsIndex = indexSubs(ctx.subs);

  for (const formation of formations) {
    const res = resolved.get(formation.id)!;

    for (const slot of res.slots) {
      if (!slot.playerId) {
        conflicts.push({
          kind: 'empty',
          severity: 'error',
          formationId: formation.id,
          formationName: formation.name,
          slotKey: slot.slotKey,
          label: slot.label,
          playerId: null,
          roleCode: slot.roleUsed?.code ?? null,
          message: `${formation.name} \u2014 ${slot.label}: ${slot.problem ?? 'no player assigned'}`,
          signature: `empty:${slot.problem ?? 'unassigned'}`,
        });
        continue;
      }

      const player = ctx.playersById[slot.playerId];
      if (player && slot.source !== 'override') {
        const eligible = formation.slots.find((s) => s.key === slot.slotKey)?.eligiblePositions ?? [];
        if (eligible.length && !eligible.includes(player.position)) {
          conflicts.push({
            kind: 'ineligible',
            severity: 'info',
            formationId: formation.id,
            formationName: formation.name,
            slotKey: slot.slotKey,
            label: slot.label,
            playerId: slot.playerId,
            roleCode: slot.roleUsed?.code ?? null,
            message: `${formation.name} \u2014 ${slot.label}: ${player.position} is outside the usual ${eligible.join('/')}`,
            signature: `ineligible:${slot.label}:${player.position}`,
          });
        }
      }
    }

    for (const dup of res.duplicates) {
      conflicts.push({
        kind: 'duplicate',
        severity: 'error',
        formationId: formation.id,
        formationName: formation.name,
        slotKey: dup.slotKeys.join(','),
        label: dup.labels.join(' + '),
        playerId: dup.playerId,
        roleCode: null,
        message: `${formation.name} has the same player at ${dup.labels.join(' and ')} \u2014 the game cannot field him twice`,
        signature: `duplicate:${dup.labels.join('+')}`,
      });
    }

    for (const u of res.unavailable) {
      const sub = res.slots.find((s) => s.playerId === u.playerId && s.label === u.label);
      const isPinned = sub
        ? subsIndex.get(subKey(formation.id, sub.slotKey))?.mode === 'override'
        : false;
      conflicts.push({
        kind: isPinned ? 'stale-override' : 'unavailable',
        severity: isPinned ? 'warning' : 'warning',
        formationId: formation.id,
        formationName: formation.name,
        slotKey: sub?.slotKey ?? null,
        label: u.label,
        playerId: u.playerId,
        roleCode: sub?.roleUsed?.code ?? null,
        message: isPinned
          ? `${formation.name} \u2014 ${u.label}: a pinned formation sub is ${u.problem}`
          : `${formation.name} \u2014 ${u.label}: ${u.problem}`,
        signature: `${isPinned ? 'stale-override' : 'unavailable'}:${u.label}:${u.problem}`,
      });
    }

    // Two spots in one formation pulling from the same role is almost always a mistake.
    const roleSeen = new Map<string, string[]>();
    for (const slot of formation.slots) {
      const sub = subsIndex.get(subKey(formation.id, slot.key)) ?? null;
      const role = effectiveRole(slot, sub);
      if (!role) continue;
      const key = `${role.code}:${role.rank}`;
      roleSeen.set(key, [...(roleSeen.get(key) ?? []), slot.label]);
    }
    for (const [key, labels] of roleSeen.entries()) {
      if (labels.length > 1) {
        conflicts.push({
          kind: 'duplicate-role',
          severity: 'warning',
          formationId: formation.id,
          formationName: formation.name,
          slotKey: null,
          label: labels.join(' + '),
          playerId: null,
          roleCode: key.split(':')[0] ?? null,
          message: `${formation.name}: ${labels.join(' and ')} both inherit from ${key.replace(':', ' rank ')}`,
          signature: `duplicate-role:${key}:${labels.join('+')}`,
        });
      }
    }

    for (const slot of formation.slots) {
      if (slot.roleCode && !depthSlot(slot.roleCode)) {
        conflicts.push({
          kind: 'unknown-role',
          severity: 'warning',
          formationId: formation.id,
          formationName: formation.name,
          slotKey: slot.key,
          label: slot.label,
          playerId: null,
          roleCode: slot.roleCode,
          message: `${formation.name}: ${slot.label} points at unknown depth role ${slot.roleCode}`,
          signature: `unknown-role:${slot.roleCode}`,
        });
      }
    }
  }

  return sortConflicts(conflicts);
}

export function conflictCounts(conflicts: Conflict[]): Record<Severity, number> {
  return conflicts.reduce(
    (acc, c) => {
      acc[c.severity] += 1;
      return acc;
    },
    { error: 0, warning: 0, info: 0 } as Record<Severity, number>,
  );
}

/** Collapse repeated conflicts (one per formation) into single rows for display. */
export function groupConflicts(
  conflicts: Conflict[],
): { conflict: Conflict; count: number; formations: string[] }[] {
  const groups = new Map<string, { conflict: Conflict; count: number; formations: string[] }>();
  for (const conflict of conflicts) {
    const key = `${conflict.kind}:${conflict.signature}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (conflict.formationName) existing.formations.push(conflict.formationName);
    } else {
      groups.set(key, {
        conflict,
        count: 1,
        formations: conflict.formationName ? [conflict.formationName] : [],
      });
    }
  }
  return [...groups.values()].sort((a, b) => {
    const bySeverity = SEVERITY_ORDER[a.conflict.severity] - SEVERITY_ORDER[b.conflict.severity];
    if (bySeverity !== 0) return bySeverity;
    return b.count - a.count;
  });
}
