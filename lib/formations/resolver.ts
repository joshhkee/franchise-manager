import type { ChartPlayer } from "../depth-chart";
import type { FormationDef, FormationSlot } from "./types";

/**
 * Formation slot resolver (C0B-v2 §6). The effective player for a slot is:
 *   explicit baseline override  >  inherited depth-chart player (plan layer first,
 *   then baseline)  >  explicit plan override (pending).
 * Inherited slots recompute from chart edits; explicit overrides persist until
 * reset. Nothing is invented: a slot with no resolvable player is a visible
 * conflict (missing/unknown), never a fabricated starter.
 */

export type OverrideLayer = "baseline" | "plan";

/** Stored override rows for one franchise/book, keyed `${formationId}:${slotId}:${layer}`. */
export type OverrideMap = ReadonlyMap<string, string>;

export function overrideKey(formationId: string, slotId: string, layer: OverrideLayer): string {
  return `${formationId}:${slotId}:${layer}`;
}

export type SlotConflictKind =
  | "missing_rank" // no player on the inherited depth-chart list at the mapped rank
  | "duplicate" // the resolved eleven contains the same player twice
  | "departed" // an override references a player no longer on the roster
  | "practice_squad"; // an override or inherited player is recorded on the practice squad

export interface SlotConflict {
  slotId: string;
  kind: SlotConflictKind;
  playerId: string | null;
  playerName: string;
  note: string;
}

export interface ResolvedSlot {
  slot: FormationSlot;
  /** The effective player, or null when unresolved (a visible conflict, never fabricated). */
  player: ChartPlayer | null;
  source: "override" | "inherited" | "unresolved";
  /** True when a plan-layer override exists that differs from the effective baseline. */
  pendingOverride: boolean;
  /** True when the plan override resolves to the same player as the baseline (A32). */
  samePlayerOverride: boolean;
  /** How the effective player is sourced for the pending-override comparison. */
  baselinePlayer: ChartPlayer | null;
  conflict: SlotConflict | null;
}

export interface ResolvedFormation {
  formation: FormationDef;
  slots: ResolvedSlot[];
  /** Slots that share a resolved player (duplicate collision detection). */
  duplicates: { playerId: string; slotIds: string[] }[];
  conflicts: SlotConflict[];
}

interface ResolverInput {
  formation: FormationDef;
  playersById: ReadonlyMap<string, ChartPlayer>;
  /** Baseline + plan depth-chart lists per position (ordered). */
  chartLists: Readonly<Record<string, { baseline: readonly string[]; plan: readonly string[] }>>;
  overrides: OverrideMap;
}

/**
 * Resolve every slot of one formation. Inheritance reads the chart PLAN first
 * (a pending chart edit previews here) and falls back to the recorded baseline —
 * that preview is what lets a chart edit recompute inherited slots without
 * creating any formation checklist unit (C0B-v2 §6, A14).
 */
export function resolveFormation(input: ResolverInput): ResolvedFormation {
  const { formation, playersById, chartLists, overrides } = input;
  const slots: ResolvedSlot[] = [];
  const byPlayer = new Map<string, string[]>();

  for (const formationSlot of formation.slots) {
    const planOverrideId = overrides.get(overrideKey(formation.id, formationSlot.id, "plan")) ?? null;
    const baselineOverrideId =
      overrides.get(overrideKey(formation.id, formationSlot.id, "baseline")) ?? null;

    const inheritedId = inheritedPlayerId(formationSlot, chartLists);
    const baselineId = baselineOverrideId ?? inheritedId;
    const baselinePlayer = baselineId ? playersById.get(baselineId) ?? null : null;

    let effectiveId = baselineId;
    // A plan override always carries the effective resolution (even when it equals
    // the baseline), so the override's persistence intent is never erased (A32).
    if (planOverrideId !== null) effectiveId = planOverrideId;

    const player = effectiveId ? playersById.get(effectiveId) ?? null : null;
    const samePlayerOverride = planOverrideId !== null && planOverrideId === baselineId;
    const pendingOverride = planOverrideId !== null && !samePlayerOverride;

    let conflict: SlotConflict | null = null;
    if (planOverrideId && !playersById.has(planOverrideId)) {
      conflict = {
        slotId: formationSlot.id,
        kind: "departed",
        playerId: planOverrideId,
        playerName: "Unknown player",
        note: "The override target is no longer part of this franchise's roster. Reset the slot or pick a replacement.",
      };
    } else if (player?.rosterStatus === "practice_squad") {
      conflict = {
        slotId: formationSlot.id,
        kind: "practice_squad",
        playerId: player.id,
        playerName: player.fullName,
        note: "This slot resolves to a practice-squad player. Record the promotion before treating this as an on-field lineup.",
      };
    } else if (!player) {
      const inheritNote = formationSlot.inherits
        ? `No ${formationSlot.inherits.position} rank ${formationSlot.inherits.rank} is recorded on the depth chart yet.`
        : "No player is recorded for this slot.";
      conflict = {
        slotId: formationSlot.id,
        kind: "missing_rank",
        playerId: null,
        playerName: "Unfilled",
        note: `${inheritNote} Fill it on the depth chart or set an explicit override — nothing is invented here.`,
      };
    }

    if (player) {
      const existing = byPlayer.get(player.id) ?? [];
      existing.push(formationSlot.id);
      byPlayer.set(player.id, existing);
    }

    slots.push({
      slot: formationSlot,
      player,
      source: player ? (planOverrideId !== null ? "override" : baselineOverrideId ? "override" : "inherited") : "unresolved",
      pendingOverride,
      samePlayerOverride,
      baselinePlayer,
      conflict,
    });
  }

  const duplicates = [...byPlayer.entries()]
    .filter(([, slotIds]) => slotIds.length > 1)
    .map(([playerId, slotIds]) => {
      const name = playersById.get(playerId)?.fullName ?? "Unknown player";
      for (const slotId of slotIds) {
        const target = slots.find((s) => s.slot.id === slotId);
        if (target && !target.conflict) {
          target.conflict = {
            slotId,
            kind: "duplicate",
            playerId,
            playerName: name,
            note: `${name} resolves into more than one on-field slot (${slotIds.join(", ")}). Fix it deliberately; nothing is silently substituted.`,
          };
        }
      }
      return { playerId, slotIds };
    });

  const conflicts = slots.flatMap((s) => (s.conflict ? [s.conflict] : []));
  return { formation, slots, duplicates, conflicts };
}

function inheritedPlayerId(
  formationSlot: FormationSlot,
  chartLists: Readonly<Record<string, { baseline: readonly string[]; plan: readonly string[] }>>,
): string | null {
  const inheritance = formationSlot.inherits;
  if (!inheritance) return null;
  const list = chartLists[inheritance.position];
  if (!list) return null;
  // Plan layer first (pending chart edits preview), then the recorded baseline.
  const fromPlan = list.plan[inheritance.rank - 1];
  if (fromPlan) return fromPlan;
  return list.baseline[inheritance.rank - 1] ?? null;
}
