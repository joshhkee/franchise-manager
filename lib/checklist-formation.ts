/**
 * C3A checklist integration (C0B-v2 §6, ACCEPTANCE A14/A32).
 *
 * Checklist units come only from EXPLICIT formation-override set/reset differences
 * (plan layer vs effective baseline). A chart edit that changes an inherited player
 * creates NO formation unit — the diagram recomputes, the checklist does not grow.
 * A same-player override (plan equals baseline) is persisted intent, not a unit.
 * Reset scope is explicit: one slot, or a reviewed whole-formation batch.
 */

import type { ChartPlayer } from "./depth-chart";
import { formationsOf, LOADED_BOOK_IDS } from "./formations/catalog";
import { overrideKey, resolveFormation, type OverrideMap } from "./formations/resolver";
import type { FormationDef } from "./formations/types";

export interface FormationChecklistUnit {
  unitId: string;
  type: "formation_slot";
  bookId: string;
  formationId: string;
  formationLabel: string;
  slotId: string;
  slotLabel: string;
  /** The effective baseline player (override or inherited) before the pending change. */
  baselinePlayerId: string | null;
  baselinePlayerName: string;
  /** The pending plan override. */
  plannedPlayerId: string;
  plannedPlayerName: string;
  label: string;
}

export interface FormationChecklist {
  units: FormationChecklistUnit[];
}

export function buildFormationChecklist(input: {
  bookId: string;
  formation: FormationDef;
  playersById: ReadonlyMap<string, ChartPlayer>;
  chartLists: Readonly<Record<string, { baseline: readonly string[]; plan: readonly string[] }>>;
  overrides: OverrideMap;
}): FormationChecklist {
  const resolved = resolveFormation(input);
  const units: FormationChecklistUnit[] = [];

  for (const slot of resolved.slots) {
    if (!slot.pendingOverride || !slot.player) continue;
    const baselineName = slot.baselinePlayer?.fullName ?? "Inherited chart slot (empty)";
    units.push({
      unitId: `formation_slot:${input.bookId}:${input.formation.id}:${slot.slot.id}`,
      type: "formation_slot",
      bookId: input.bookId,
      formationId: input.formation.id,
      formationLabel: input.formation.name,
      slotId: slot.slot.id,
      slotLabel: slot.slot.label,
      baselinePlayerId: slot.baselinePlayer?.id ?? null,
      baselinePlayerName: baselineName,
      plannedPlayerId: slot.player.id,
      plannedPlayerName: slot.player.fullName,
      label: `${input.formation.name} — ${slot.slot.label} override`,
    });
  }

  return { units };
}

/** Pending formation units grouped by formation for the diagram's review panel. */
export function unitsByFormation(
  units: readonly FormationChecklistUnit[],
): Map<string, FormationChecklistUnit[]> {
  const grouped = new Map<string, FormationChecklistUnit[]>();
  for (const unit of units) {
    const existing = grouped.get(unit.formationId) ?? [];
    existing.push(unit);
    grouped.set(unit.formationId, existing);
  }
  return grouped;
}

/**
 * Franchise-wide formation checklist: every pending explicit override across the
 * loaded books, derived the same way the diagram derives it, so the two surfaces
 * can never disagree. A chart edit that changes an inherited player creates no unit
 * here (C0B-v2 §6); a same-player override is persisted intent, not a unit.
 *
 * A unit whose planned player is not on the active roster (practice squad) is
 * still reported — honestly — but is not confirmable until the promotion is
 * recorded, mirroring the depth-chart prerequisite rule without inventing a
 * formation-specific exception.
 */
export interface FranchiseFormationUnits {
  units: FormationChecklistUnit[];
  blocked: (FormationChecklistUnit & { note: string })[];
}

export function buildFormationChecklistForFranchise(input: {
  players: readonly ChartPlayer[];
  lists: Readonly<Record<string, { baseline: readonly string[]; plan: readonly string[] }>>;
  overrides: OverrideMap;
}): FranchiseFormationUnits {
  const playersById = new Map(input.players.map((player) => [player.id, player]));
  const units: FormationChecklistUnit[] = [];
  const blocked: (FormationChecklistUnit & { note: string })[] = [];

  for (const bookId of LOADED_BOOK_IDS) {
    for (const formation of formationsOf(bookId)) {
      if (formation.status !== "mapped") continue;
      const derived = buildFormationChecklist({
        bookId,
        formation,
        playersById,
        chartLists: input.lists,
        overrides: input.overrides,
      });
      for (const unit of derived.units) {
        const player = playersById.get(unit.plannedPlayerId);
        if (player && player.rosterStatus !== "active") {
          blocked.push({
            ...unit,
            note:
              player.rosterStatus === "practice_squad"
                ? `${player.fullName} is recorded on the practice squad. Record the promotion before confirming this override.`
                : `${player.fullName} is not on the active roster. Reset the slot or repair the roster first.`,
          });
          continue;
        }
        units.push(unit);
      }
    }
  }

  return { units, blocked };
}

/** Human-readable scope line for a reviewed formation confirmation. */
export function describeFormationScope(count: number): string {
  return `${count} formation override${count === 1 ? "" : "s"}`;
}

/**
 * The confirm payload for the reviewed formation units, in the order given.
 * Reset (cancel) is handled by the cancel command with the same slot identity.
 */
export function toConfirmUnits(units: readonly FormationChecklistUnit[]) {
  return units.map((unit) => ({
    type: "formation_slot" as const,
    unitId: unit.unitId,
    bookId: unit.bookId,
    formationId: unit.formationId,
    slotId: unit.slotId,
    playerId: unit.plannedPlayerId,
    planPlayerIds: [unit.plannedPlayerId],
  }));
}

export { overrideKey };
