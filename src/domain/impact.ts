import { resolveAll, type ResolveContext } from './resolution';
import {
  availabilityProblem,
  indexSubs,
  setDepthPlayer,
  subKey,
  type Formation,
  type FormationSub,
  type Side,
} from './types';

function pinnedCountFor(
  formation: Formation,
  subsIndex: Map<string, FormationSub>,
): number {
  return formation.slots.filter((slot) => {
    const sub = subsIndex.get(subKey(formation.id, slot.key));
    return sub?.mode === 'override' && !!sub.playerId;
  }).length;
}

export interface DepthChange {
  slotCode: string;
  /** 1 = starter. */
  rank: number;
  /** `null` empties the slot. */
  toPlayerId: string | null;
}

export interface SlotDelta {
  slotKey: string;
  label: string;
  fromPlayerId: string | null;
  toPlayerId: string | null;
}

export interface FormationDelta {
  formationId: string;
  formationName: string;
  side: Side;
  family: string;
  /** Slots whose player changes. */
  changes: SlotDelta[];
  /** Slots in this formation pinned by a formation sub, so they ignore the depth chart. */
  pinnedCount: number;
}

export interface ImpactWarning {
  formationId: string;
  formationName: string;
  playerId: string;
  label: string;
  message: string;
}

export interface ImpactReport {
  change: DepthChange & { fromPlayerId: string | null };
  /** Formations that consult this role, at any rank. */
  formationsUsingRole: number;
  /** Formations where the on-field personnel actually changes. */
  changed: FormationDelta[];
  /** Formations that consult the role but are pinned by your own formation subs. */
  pinned: FormationDelta[];
  /** Formations that consult the role, are not pinned, but end up identical (e.g. same player). */
  unaffected: number;
  /** Net snap changes per player across the playbook. */
  playersAffected: { playerId: string; gained: number; lost: number }[];
  /** A player would appear twice on the field in the same formation (impossible in game). */
  duplicateWarnings: ImpactWarning[];
  /** The change lands an unavailable player on the field. */
  unavailableWarnings: ImpactWarning[];
  /** The change leaves spots empty. */
  emptyWarnings: ImpactWarning[];
  notes: string[];
}

/**
 * Answers "if I make this depth chart change, what happens everywhere?"
 *
 * The approach is deliberately brute force: resolve the whole playbook before and
 * after, then diff. The playbook is small (hundreds of formations at most) and
 * re-resolving gives an answer that is exactly consistent with what the app will
 * show afterwards, rather than an approximation.
 */
export function previewDepthChange(
  formations: Formation[],
  ctx: ResolveContext,
  change: DepthChange,
): ImpactReport {
  const beforeChart = ctx.depthChart;
  const fromPlayerId =
    (beforeChart.entries[change.slotCode] ?? [])[change.rank - 1] ?? null;

  const subsIndex = indexSubs(ctx.subs);
  const before = resolveAll(formations, ctx);
  const afterChart = setDepthPlayer(beforeChart, change.slotCode, change.rank, change.toPlayerId);
  const after = resolveAll(formations, { ...ctx, depthChart: afterChart });

  const changed: FormationDelta[] = [];
  const pinned: FormationDelta[] = [];
  const duplicateWarnings: ImpactWarning[] = [];
  const unavailableWarnings: ImpactWarning[] = [];
  const emptyWarnings: ImpactWarning[] = [];
  const netPlayers = new Map<string, { gained: number; lost: number }>();

  let formationsUsingRole = 0;
  let unaffected = 0;

  for (const formation of formations) {
    const beforeRes = before.get(formation.id)!;
    const afterRes = after.get(formation.id)!;
    const usesRole = afterRes.slots.some((slot) => slot.roleUsed?.code === change.slotCode);
    if (usesRole) formationsUsingRole += 1;

    const changes: SlotDelta[] = [];
    for (const afterSlot of afterRes.slots) {
      const beforeSlot = beforeRes.slots.find((s) => s.slotKey === afterSlot.slotKey)!;
      if (beforeSlot.playerId !== afterSlot.playerId) {
        changes.push({
          slotKey: afterSlot.slotKey,
          label: afterSlot.label,
          fromPlayerId: beforeSlot.playerId,
          toPlayerId: afterSlot.playerId,
        });
      }
    }

    const isPinnedSlot = (slotKey: string) => {
      const sub = subsIndex.get(subKey(formation.id, slotKey));
      return sub?.mode === 'override' && !!sub.playerId;
    };
    const roleSlots = afterRes.slots.filter((slot) => slot.roleUsed?.code === change.slotCode);
    const pinnedCount = pinnedCountFor(formation, subsIndex);

    if (changes.length === 0) {
      if (!usesRole) continue;
      // A formation can consult the role and still be immune because every spot
      // that does so is pinned by an explicit formation sub.
      const allRoleSlotsPinned =
        roleSlots.length > 0 && roleSlots.every((slot) => isPinnedSlot(slot.slotKey));
      if (allRoleSlotsPinned) {
        pinned.push({
          formationId: formation.id,
          formationName: formation.name,
          side: formation.side,
          family: formation.family,
          changes: [],
          pinnedCount,
        });
      } else {
        unaffected += 1;
      }
      continue;
    }

    changed.push({
      formationId: formation.id,
      formationName: formation.name,
      side: formation.side,
      family: formation.family,
      changes,
      pinnedCount,
    });

    for (const c of changes) {
      if (c.fromPlayerId) {
        const entry = netPlayers.get(c.fromPlayerId) ?? { gained: 0, lost: 0 };
        entry.lost += 1;
        netPlayers.set(c.fromPlayerId, entry);
      }
      if (c.toPlayerId) {
        const entry = netPlayers.get(c.toPlayerId) ?? { gained: 0, lost: 0 };
        entry.gained += 1;
        netPlayers.set(c.toPlayerId, entry);
      }
    }

    // Warnings are scoped to formations this change actually touches.
    for (const dup of afterRes.duplicates) {
      duplicateWarnings.push({
        formationId: formation.id,
        formationName: formation.name,
        playerId: dup.playerId,
        label: dup.labels.join(' + '),
        message: `${formation.name} would have the same player at ${dup.labels.join(' and ')}`,
      });
    }
    for (const u of afterRes.unavailable) {
      if (u.playerId === fromPlayerId) continue;
      unavailableWarnings.push({
        formationId: formation.id,
        formationName: formation.name,
        playerId: u.playerId,
        label: u.label,
        message: `${formation.name}: ${u.label} would be ${u.problem}`,
      });
    }
    for (const empty of afterRes.unresolved) {
      const wasEmptyBefore = beforeRes.unresolved.some((e) => e.slotKey === empty.slotKey);
      if (wasEmptyBefore) continue;
      emptyWarnings.push({
        formationId: formation.id,
        formationName: formation.name,
        playerId: '',
        label: empty.label,
        message: `${formation.name}: ${empty.label} would be left empty`,
      });
    }
  }

  const playersAffected = [...netPlayers.entries()]
    .map(([playerId, counts]) => ({ playerId, ...counts }))
    .sort((a, b) => b.gained + b.lost - (a.gained + a.lost));

  const notes: string[] = [];
  if (pinned.length) {
    notes.push(
      `${pinned.length} formation${pinned.length === 1 ? '' : 's'} consume this role but keep a pinned player, so they will not change.`,
    );
  }
  if (unaffected > 0) {
    notes.push(
      `${unaffected} formation${unaffected === 1 ? '' : 's'} already field this player through another role.`,
    );
  }
  if (formationsUsingRole === 0) {
    notes.push('No formation in your playbook currently consults this role.');
  }

  return {
    change: { ...change, fromPlayerId },
    formationsUsingRole,
    changed: changed.sort((a, b) => b.changes.length - a.changes.length),
    pinned,
    unaffected,
    playersAffected,
    duplicateWarnings,
    unavailableWarnings,
    emptyWarnings,
    notes,
  };
}

/** Convenience: which formations would field a given player at all, and where. */
export function findPlayerAssignments(
  formations: Formation[],
  ctx: ResolveContext,
  playerId: string,
): { formationId: string; formationName: string; label: string; source: string }[] {
  const out: { formationId: string; formationName: string; label: string; source: string }[] = [];
  const resolved = resolveAll(formations, ctx);
  for (const formation of formations) {
    const res = resolved.get(formation.id)!;
    for (const slot of res.slots) {
      if (slot.playerId === playerId) {
        out.push({
          formationId: formation.id,
          formationName: formation.name,
          label: slot.label,
          source: slot.source,
        });
      }
    }
  }
  return out;
}

/** Availability lookup used by the UI to explain a warning inline. */
export function availabilityNote(ctx: ResolveContext, playerId: string): string | null {
  const player = ctx.playersById[playerId];
  if (!player?.franchise) return null;
  return availabilityProblem(player.franchise);
}
