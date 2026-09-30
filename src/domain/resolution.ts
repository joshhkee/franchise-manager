import {
  getDepthPlayer,
  indexSubs,
  isAvailable,
  subKey,
  availabilityProblem,
  type DepthChartState,
  type Formation,
  type FormationResolution,
  type FormationSlot,
  type FormationSub,
  type FranchisePlayer,
  type SlotResolution,
} from './types';

/** Minimal player facts the resolver needs. */
export interface ResolvePlayer {
  id: string;
  position: string;
  franchise?: Pick<FranchisePlayer, 'injuryStatus' | 'rosterStatus'>;
}

export interface ResolveContext {
  depthChart: DepthChartState;
  subs: FormationSub[];
  playersById: Record<string, ResolvePlayer>;
}

/**
 * The role a slot consults, accounting for a plan-level rebind.
 *
 * A formation slot knows its default role (`SLWR`), but a plan may redirect one
 * formation to pull from a different role instead.
 */
export function effectiveRole(
  slot: Pick<FormationSlot, 'roleCode' | 'roleRank'>,
  sub?: FormationSub | null,
): { code: string; rank: number } | null {
  const code = sub?.inheritSlotCode ?? slot.roleCode;
  if (!code) return null;
  const rank = sub?.inheritRank ?? slot.roleRank ?? 1;
  return { code, rank: rank < 1 ? 1 : rank };
}

export function resolveSlot(
  formation: Formation,
  slot: FormationSlot,
  ctx: ResolveContext,
  subsIndex: Map<string, FormationSub>,
): SlotResolution {
  const sub = subsIndex.get(subKey(formation.id, slot.key)) ?? null;
  const role = effectiveRole(slot, sub);
  const base: Omit<SlotResolution, 'playerId' | 'source' | 'problem'> = {
    formationId: formation.id,
    slotKey: slot.key,
    label: slot.label,
    viaSlotCode: role?.code ?? null,
    viaRank: role?.rank ?? null,
    roleUsed: role,
  };

  // 1. An explicit formation sub wins. This is the in-game "formation sub".
  if (sub && sub.mode === 'override' && sub.playerId) {
    return { ...base, playerId: sub.playerId, source: 'override', problem: null };
  }

  // 2. Otherwise inherit from the depth chart through the slot's role.
  if (role) {
    const playerId = getDepthPlayer(ctx.depthChart, role.code, role.rank);
    if (playerId) {
      return { ...base, playerId, source: 'inherit', problem: null };
    }
    return {
      ...base,
      playerId: null,
      source: 'unresolved',
      problem: `Depth chart is empty at ${role.code}${role.rank}`,
    };
  }

  // 3. No role at all: fall back to the slot's declared position if we can.
  const fallbackCode = slot.positionFallback;
  if (fallbackCode) {
    const playerId = getDepthPlayer(ctx.depthChart, fallbackCode, 1);
    if (playerId) {
      return {
        ...base,
        playerId,
        source: 'fallback',
        viaSlotCode: fallbackCode,
        viaRank: 1,
        problem: null,
      };
    }
  }

  return {
    ...base,
    playerId: null,
    source: 'unresolved',
    problem: slot.eligiblePositions.length
      ? `No role bound and no ${slot.eligiblePositions.join('/')} on the depth chart`
      : 'No role bound to this spot',
  };
}

/**
 * Give every spot in a formation a distinct rank within the role it consumes.
 *
 * A formation with three receivers cannot have all three bound to `WR` rank 1 —
 * that puts one player at three spots, and the game can only field him once. The
 * rule is the one Madden uses: the second spot bound to a role is that role's
 * second man, the third is the third man.
 *
 * Declared ranks are respected when they are already unique, so a formation that
 * deliberately wants `WR` rank 2 in a spot keeps it; only genuine clashes are
 * renumbered, and always to the next free rank for that role.
 */
export function normalizeSlotRanks(slots: FormationSlot[]): FormationSlot[] {
  const taken = new Map<string, Set<number>>();
  return slots.map((slot) => {
    if (!slot.roleCode) return slot;
    const used = taken.get(slot.roleCode) ?? new Set<number>();
    let rank = slot.roleRank ?? 1;
    while (used.has(rank)) rank += 1;
    used.add(rank);
    taken.set(slot.roleCode, used);
    return rank === slot.roleRank ? slot : { ...slot, roleRank: rank };
  });
}

export function resolveFormation(formation: Formation, ctx: ResolveContext): FormationResolution {
  const subsIndex = indexSubs(ctx.subs);
  const slots = formation.slots.map((slot) => resolveSlot(formation, slot, ctx, subsIndex));

  const byPlayer = new Map<string, SlotResolution[]>();
  for (const slot of slots) {
    if (!slot.playerId) continue;
    const list = byPlayer.get(slot.playerId) ?? [];
    list.push(slot);
    byPlayer.set(slot.playerId, list);
  }

  const duplicates = [...byPlayer.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([playerId, list]) => ({
      playerId,
      slotKeys: list.map((s) => s.slotKey),
      labels: list.map((s) => s.label),
    }));

  const unavailable: FormationResolution['unavailable'] = [];
  for (const slot of slots) {
    if (!slot.playerId) continue;
    const player = ctx.playersById[slot.playerId];
    if (!player?.franchise) continue;
    if (!isAvailable(player.franchise)) {
      unavailable.push({
        playerId: slot.playerId,
        label: slot.label,
        problem: availabilityProblem(player.franchise) ?? 'unavailable',
      });
    }
  }

  return {
    formation,
    slots,
    personnelIds: [...byPlayer.keys()],
    duplicates,
    unavailable,
    unresolved: slots
      .filter((slot) => !slot.playerId)
      .map((slot) => ({ label: slot.label, slotKey: slot.slotKey })),
  };
}

export function resolveAll(
  formations: Formation[],
  ctx: ResolveContext,
): Map<string, FormationResolution> {
  const out = new Map<string, FormationResolution>();
  for (const formation of formations) out.set(formation.id, resolveFormation(formation, ctx));
  return out;
}

/** Every formation that consults a given role, at any rank. */
export function formationsUsingRole(
  formations: Formation[],
  ctx: ResolveContext,
  roleCode: string,
): { formation: Formation; slots: FormationSlot[] }[] {
  const subsIndex = indexSubs(ctx.subs);
  const out: { formation: Formation; slots: FormationSlot[] }[] = [];
  for (const formation of formations) {
    const matched = formation.slots.filter(
      (slot) =>
        effectiveRole(slot, subsIndex.get(subKey(formation.id, slot.key)) ?? null)?.code === roleCode,
    );
    if (matched.length) out.push({ formation, slots: matched });
  }
  return out;
}
