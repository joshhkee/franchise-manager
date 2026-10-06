/**
 * C2B checklist — consolidated baseline→plan differences, action units, prerequisites,
 * reviewed bulk confirmation, cancellation, and bounded-undo eligibility.
 *
 * Contract: `C0B-v2` §3 (derived differences, never an append-only click log),
 * §4 (one position's ordered list is the action unit; rank ticks are not; partial
 * application only between complete independent units; prerequisites block a dependent
 * unit until satisfied; a confirmation request applies its reviewed scope atomically),
 * §5 (revision + retry safety live in the command layer), ACCEPTANCE A11–A13/A31/A34.
 *
 * This module is deliberately pure: it computes what the checklist shows and which
 * confirmation request would be sent. The database re-validates the exact revision,
 * the exact reviewed scope, and prerequisites at apply time; nothing here is trusted
 * as the last word. Provisional depth-chart rules live in `./depth-chart` and stay the
 * single source for eligibility labels.
 */

import {
  POSITIONS,
  diffPosition,
  eligibilityFor,
  positionSpec,
  type ChartPlayer,
  type PositionDiff,
} from "./depth-chart";

export interface ChecklistList {
  baseline: readonly string[];
  plan: readonly string[];
}

export interface ChecklistInput {
  franchiseId: string;
  revision: number;
  players: readonly ChartPlayer[];
  lists: Readonly<Record<string, ChecklistList>>;
  /**
   * C4A seam: players whose incoming trade/promotion transaction is not yet confirmed.
   * There is no transaction state in C2B, so the real app passes nothing here; tests
   * (and later C4A) seed it to prove a dependent lineup unit is blocked, never skipped.
   */
  pendingIncoming?: ReadonlySet<string>;
}

export type UnitBlockKind = "practice_squad" | "pending_transaction" | "ineligible_placement";

export interface UnitBlock {
  kind: UnitBlockKind;
  playerId: string;
  playerName: string;
  note: string;
}

export interface UnitPrerequisite {
  kind: "promotion" | "transaction" | "placement";
  playerId: string;
  playerName: string;
  /** The roster_status unit that can satisfy a promotion prerequisite in-batch, else null. */
  unitRef: string | null;
  note: string;
}

export interface ChecklistUnit {
  unitId: string;
  type: "depth_chart_list";
  position: string;
  label: string;
  baseline: string[];
  planned: string[];
  diff: PositionDiff;
  status: "ready" | "blocked";
  blocked: UnitBlock[];
  prerequisites: UnitPrerequisite[];
  revision: number;
}

/** A prerequisite unit the owner may include in a confirmation batch to unblock a list. */
export interface PromotionUnit {
  type: "roster_status";
  unitId: string;
  playerId: string;
  playerName: string;
  status: "active";
  label: string;
}

export interface Checklist {
  franchiseId: string;
  revision: number;
  /** Pending action units in chart order. Only positions with a real difference appear. */
  units: ChecklistUnit[];
  ready: ChecklistUnit[];
  blocked: ChecklistUnit[];
  /** Distinct promotion prerequisites for the blocked units, deduplicated by player. */
  promotions: PromotionUnit[];
}

/**
 * Derive the complete checklist from the stored baseline/plan layers. Because this is a
 * diff (not a click log), A→B→C consolidates to A→C and reverting to A removes the unit.
 */
export function buildChecklist(input: ChecklistInput): Checklist {
  const playersById = new Map(input.players.map((player) => [player.id, player]));
  const pendingIncoming = input.pendingIncoming ?? new Set<string>();
  const units: ChecklistUnit[] = [];
  const promotionByPlayer = new Map<string, PromotionUnit>();

  for (const spec of POSITIONS) {
    const list = input.lists[spec.key];
    if (!list) continue;
    const baseline = [...list.baseline];
    const planned = [...list.plan];
    const diff = diffPosition(baseline, planned);
    if (!diff.changed) continue;

    const blocked: UnitBlock[] = [];
    const prerequisites: UnitPrerequisite[] = [];
    const seenPlayers = new Set<string>();

    for (const id of planned) {
      if (seenPlayers.has(id)) continue;
      seenPlayers.add(id);
      const player = playersById.get(id);
      const playerName = player?.fullName ?? "Unknown player";

      if (pendingIncoming.has(id)) {
        blocked.push({
          kind: "pending_transaction",
          playerId: id,
          playerName,
          note: `${playerName} is in a pending incoming transaction; confirm that transaction before this lineup unit.`,
        });
        prerequisites.push({
          kind: "transaction",
          playerId: id,
          playerName,
          unitRef: null,
          note: "Transaction dependencies arrive with the GM War Room (C4A); nothing is applied silently.",
        });
        continue;
      }

      if (!player) {
        blocked.push({
          kind: "ineligible_placement",
          playerId: id,
          playerName,
          note: "This player is not part of the franchise roster any more — remove or replace them in the plan.",
        });
        prerequisites.push({
          kind: "placement",
          playerId: id,
          playerName,
          unitRef: null,
          note: "Repair the plan before confirming.",
        });
        continue;
      }

      const eligibility = eligibilityFor(player, spec.key);
      if (eligibility.ok) continue;

      if (eligibility.blocked === "practice_squad") {
        const unitId = `roster_status:${id}`;
        blocked.push({
          kind: "practice_squad",
          playerId: id,
          playerName,
          note: `${playerName} is recorded on the practice squad, so this list cannot be confirmed until they are promoted and that is recorded.`,
        });
        prerequisites.push({
          kind: "promotion",
          playerId: id,
          playerName,
          unitRef: unitId,
          note: "Confirm the promotion prerequisite in the same reviewed batch, or record the roster correction first.",
        });
        if (!promotionByPlayer.has(id)) {
          promotionByPlayer.set(id, {
            type: "roster_status",
            unitId,
            playerId: id,
            playerName,
            status: "active",
            label: `Record ${playerName} as active roster (promotion already happened in Madden)`,
          });
        }
        continue;
      }

      blocked.push({
        kind: "ineligible_placement",
        playerId: id,
        playerName,
        note: eligibility.note,
      });
      prerequisites.push({
        kind: "placement",
        playerId: id,
        playerName,
        unitRef: null,
        note: "Repair the placement (listed position or plan) before confirming; the provisional rules do not place them here.",
      });
    }

    units.push({
      unitId: `depth_chart_list:${spec.key}`,
      type: "depth_chart_list",
      position: spec.key,
      label: `${spec.label} depth chart`,
      baseline,
      planned,
      diff,
      status: blocked.length > 0 ? "blocked" : "ready",
      blocked,
      prerequisites,
      revision: input.revision,
    });
  }

  return {
    franchiseId: input.franchiseId,
    revision: input.revision,
    units,
    ready: units.filter((unit) => unit.status === "ready"),
    blocked: units.filter((unit) => unit.status === "blocked"),
    promotions: [...promotionByPlayer.values()],
  };
}

/**
 * Deterministic timestamp for retained history rows. Locale- and timezone-dependent
 * formatting (toLocaleString) renders differently on the server and in the browser and
 * causes a hydration mismatch, so the app states an explicit UTC value instead.
 */
export function formatBatchTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "unknown time";
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  );
}

export interface ChecklistSummary {
  pendingUnits: number;
  readyUnits: number;
  blockedUnits: number;
  positions: string[];
}

export function summarizeChecklist(checklist: Checklist): ChecklistSummary {
  return {
    pendingUnits: checklist.units.length,
    readyUnits: checklist.ready.length,
    blockedUnits: checklist.blocked.length,
    positions: checklist.units.map((unit) => positionSpec(unit.position)?.label ?? unit.position),
  };
}

export interface ConfirmDepthUnit {
  type: "depth_chart_list";
  unitId: string;
  position: string;
  playerIds: string[];
  label: string;
}

export interface ConfirmRosterUnit {
  type: "roster_status";
  unitId: string;
  playerId: string;
  status: "active" | "practice_squad";
  label: string;
}

export type ConfirmUnit = ConfirmDepthUnit | ConfirmRosterUnit;

export interface ExcludedUnit {
  unitId: string;
  label: string;
  reasons: string[];
}

export interface ConfirmationPlan {
  /** The exact reviewed scope, prerequisites first, ready for the command layer. */
  units: ConfirmUnit[];
  /** Selected units that cannot be applied yet, with owner-readable reasons. */
  excluded: ExcludedUnit[];
}

/**
 * Build the exact reviewed scope for a confirmation request. Selected ready units are
 * included in chart order. A selected blocked unit is included only when the owner opts
 * into recording its promotion prerequisite(s); its prerequisite unit is placed before
 * the dependent list so the ordered batch applies prerequisites first. Units blocked by a
 * transaction or an invalid placement are never silently dropped — they are returned as
 * excluded with their reasons.
 */
export function buildConfirmation(
  checklist: Checklist,
  selectedUnitIds: readonly string[],
  options: { includePromotions?: boolean } = {},
): ConfirmationPlan {
  const selected = new Set(selectedUnitIds);
  const promotionsByUnitRef = new Map(checklist.promotions.map((unit) => [unit.unitId, unit]));
  const units: ConfirmUnit[] = [];
  const excluded: ExcludedUnit[] = [];
  const alreadyQueued = new Set<string>();

  const queuePromotion = (unitId: string) => {
    const promotion = promotionsByUnitRef.get(unitId);
    if (!promotion || alreadyQueued.has(promotion.unitId)) return;
    alreadyQueued.add(promotion.unitId);
    units.push({
      type: "roster_status",
      unitId: promotion.unitId,
      playerId: promotion.playerId,
      status: "active",
      label: promotion.label,
    });
  };

  for (const unit of checklist.units) {
    if (!selected.has(unit.unitId)) continue;

    if (unit.status === "ready") {
      units.push({
        type: "depth_chart_list",
        unitId: unit.unitId,
        position: unit.position,
        playerIds: [...unit.planned],
        label: unit.label,
      });
      continue;
    }

    if (options.includePromotions) {
      const promotionPrerequisites = unit.prerequisites.filter(
        (prerequisite) => prerequisite.kind === "promotion" && prerequisite.unitRef,
      );
      const unsatisfiable = unit.blocked.filter((block) => block.kind !== "practice_squad");
      if (promotionPrerequisites.length === unit.blocked.length && unsatisfiable.length === 0) {
        for (const prerequisite of promotionPrerequisites) queuePromotion(prerequisite.unitRef as string);
        units.push({
          type: "depth_chart_list",
          unitId: unit.unitId,
          position: unit.position,
          playerIds: [...unit.planned],
          label: unit.label,
        });
        continue;
      }
    }

    excluded.push({
      unitId: unit.unitId,
      label: unit.label,
      reasons: unit.blocked.map((block) => block.note),
    });
  }

  return { units, excluded };
}

/** Human-readable one-line summary of a confirmation plan for review and status text. */
export function describeConfirmation(plan: ConfirmationPlan): string {
  const lists = plan.units.filter((unit) => unit.type === "depth_chart_list").length;
  const promotions = plan.units.filter((unit) => unit.type === "roster_status").length;
  const parts: string[] = [];
  parts.push(`${lists} position${lists === 1 ? "" : "s"}`);
  if (promotions > 0) parts.push(`${promotions} promotion prerequisite${promotions === 1 ? "" : "s"}`);
  if (plan.excluded.length > 0) parts.push(`${plan.excluded.length} excluded`);
  return parts.join(" · ");
}
