import { effectiveRole, resolveAll, type ResolveContext } from './resolution';
import { indexSubs, subKey, type Formation, type FormationSub, type Side } from './types';

export interface FormationFilter {
  ids?: string[];
  playbookId?: string;
  side?: Side;
  set?: string;
  personnel?: string;
  distribution?: string;
  family?: string;
  /** Case-insensitive substring match on the formation name. */
  search?: string;
}

export function filterFormations(formations: Formation[], filter: FormationFilter): Formation[] {
  return formations.filter((formation) => {
    if (filter.ids && !filter.ids.includes(formation.id)) return false;
    if (filter.playbookId && formation.playbookId !== filter.playbookId) return false;
    if (filter.side && formation.side !== filter.side) return false;
    if (filter.set && formation.set !== filter.set) return false;
    if (filter.personnel && formation.personnel !== filter.personnel) return false;
    if (filter.distribution && formation.distribution !== filter.distribution) return false;
    if (filter.family && formation.family !== filter.family) return false;
    if (filter.search && !formation.name.toLowerCase().includes(filter.search.toLowerCase())) {
      return false;
    }
    return true;
  });
}

export interface BulkTarget {
  formationId: string;
  formationName: string;
  slotKey: string;
  label: string;
  currentPlayerId: string | null;
  currentlyOverridden: boolean;
}

export interface BulkAssignmentPlan {
  /** Formation subs to write. */
  overrides: FormationSub[];
  /** Slots whose override should be removed, reverting to the depth chart. */
  cleared: { formationId: string; slotKey: string; label: string }[];
  /** Formations that do not contain the role at all. */
  skipped: { formationId: string; formationName: string; reason: string }[];
  targets: BulkTarget[];
}

/**
 * Apply one assignment across many formations at once.
 *
 * This exists because setting the same slot receiver in a dozen Trips formations
 * one screen at a time is exactly the tedium the app is meant to remove.
 */
export function planBulkAssignment(
  formations: Formation[],
  ctx: ResolveContext,
  filter: FormationFilter,
  options: { role: string; playerId: string | null; rank?: number; note?: string | null },
): BulkAssignmentPlan {
  const targets = filterFormations(formations, filter);
  const subsIndex = indexSubs(ctx.subs);
  const resolved = resolveAll(formations, ctx);

  const plan: BulkAssignmentPlan = { overrides: [], cleared: [], skipped: [], targets: [] };

  for (const formation of targets) {
    const matched = formation.slots.filter((slot) => {
      const sub = subsIndex.get(subKey(formation.id, slot.key)) ?? null;
      const role = effectiveRole(slot, sub);
      if (!role || role.code !== options.role) return false;
      if (options.rank && role.rank !== options.rank) return false;
      return true;
    });

    if (matched.length === 0) {
      plan.skipped.push({
        formationId: formation.id,
        formationName: formation.name,
        reason: `does not use ${options.role}`,
      });
      continue;
    }

    const formationResolution = resolved.get(formation.id)!;

    for (const slot of matched) {
      const existing = subsIndex.get(subKey(formation.id, slot.key)) ?? null;
      const currentPlayerId =
        formationResolution.slots.find((s) => s.slotKey === slot.key)?.playerId ?? null;

      plan.targets.push({
        formationId: formation.id,
        formationName: formation.name,
        slotKey: slot.key,
        label: slot.label,
        currentPlayerId,
        currentlyOverridden: existing?.mode === 'override' && !!existing.playerId,
      });

      if (options.playerId) {
        plan.overrides.push({
          formationId: formation.id,
          slotKey: slot.key,
          mode: 'override',
          playerId: options.playerId,
          inheritSlotCode: null,
          inheritRank: null,
          note: options.note ?? null,
        });
      } else if (existing?.mode === 'override') {
        plan.cleared.push({ formationId: formation.id, slotKey: slot.key, label: slot.label });
      }
    }
  }

  return plan;
}

/** Merge sub changes into a plan's sub list, replacing existing entries. */
export function mergeSubs(
  subs: FormationSub[],
  changes: { subs?: FormationSub[]; clears?: { formationId: string; slotKey: string }[] },
): FormationSub[] {
  const map = new Map(subs.map((sub) => [subKey(sub.formationId, sub.slotKey), sub]));
  for (const clear of changes.clears ?? []) {
    map.delete(subKey(clear.formationId, clear.slotKey));
  }
  for (const sub of changes.subs ?? []) {
    map.set(subKey(sub.formationId, sub.slotKey), sub);
  }
  return [...map.values()];
}

/** Every distinct value of an attribute across a formation list, for filter dropdowns. */
export function distinctValues(formations: Formation[], key: 'set' | 'personnel' | 'distribution' | 'family'): string[] {
  return [...new Set(formations.map((f) => f[key]))].sort();
}
