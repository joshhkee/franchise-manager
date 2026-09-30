import {
  buildResolveContext,
  getDepthChart,
  getDepthSlotVocabulary,
  getFormations,
  getRoster,
  getSubs,
} from '@/db/repo';
import { resolveFormation } from '@/domain/resolution';
import type { RosterPlayer, Side } from '@/domain/types';

/**
 * The apply checklist, built once so the screen and the export cannot disagree.
 *
 * The checklist is the product's delivery mechanism: the app decides, you type it
 * into the game. Whatever it says has to survive leaving the app, which is why the
 * Markdown and CSV renderers read from this exact structure rather than re-deriving
 * the differences on their own.
 */

export interface ChecklistChange {
  side: Side;
  slotCode: string;
  label: string;
  rank: number;
  /** Compact display form, e.g. `D. Mercer`. */
  from: string;
  to: string;
  /** Full names, for exports read outside the app. */
  fromFull: string;
  toFull: string;
}

export interface ChecklistSub {
  formationId: string;
  formationName: string;
  set: string;
  slotLabel: string;
  name: string;
  fullName: string;
  /** What the depth chart would have put there instead. */
  insteadOf: string;
}

export interface ChecklistUnit {
  id: string;
  name: string;
  set: string;
  personnel: string;
  players: { label: string; name: string; fullName: string }[];
}

export interface Checklist {
  changes: ChecklistChange[];
  subs: ChecklistSub[];
  units: ChecklistUnit[];
  vocabulary: { code: string; verified: boolean }[];
  generatedAt: string;
}

function shortName(player: RosterPlayer | undefined): string {
  return player ? `${player.firstName.charAt(0)}. ${player.lastName}` : 'nobody';
}

function fullName(player: RosterPlayer | undefined): string {
  return player ? `${player.firstName} ${player.lastName}` : 'nobody';
}

/** Depth chart differences, in the order the in-game screen presents them. */
export async function buildChecklist(): Promise<Checklist> {
  const formations = await getFormations();
  const [game, plan, vocabulary, roster, contextData, subs] = await Promise.all([
    getDepthChart('game'),
    getDepthChart('plan'),
    getDepthSlotVocabulary(),
    getRoster(),
    buildResolveContext('plan', formations),
    getSubs('plan'),
  ]);

  const { ctx } = contextData;
  const byId = new Map(roster.map((player) => [player.id, player]));
  const lookup = (id: string | null | undefined) => (id ? byId.get(id) : undefined);

  const changes: ChecklistChange[] = [];
  for (const slot of vocabulary) {
    const planRanked = plan.entries[slot.code] ?? [];
    const gameRanked = game.entries[slot.code] ?? [];
    for (let index = 0; index < Math.max(planRanked.length, gameRanked.length, slot.ranks); index += 1) {
      const want = planRanked[index] ?? null;
      const have = gameRanked[index] ?? null;
      if (want === have) continue;
      changes.push({
        side: slot.side,
        slotCode: slot.code,
        label: slot.label,
        rank: index + 1,
        from: shortName(lookup(have)),
        to: shortName(lookup(want)),
        fromFull: fullName(lookup(have)),
        toFull: fullName(lookup(want)),
      });
    }
  }

  const formationsById = new Map(formations.map((formation) => [formation.id, formation]));
  const subRows: ChecklistSub[] = [];
  for (const sub of subs) {
    if (sub.mode !== 'override' || !sub.playerId) continue;
    const formation = formationsById.get(sub.formationId);
    if (!formation) continue;
    const resolved = resolveFormation(formation, ctx);
    const slot = formation.slots.find((entry) => entry.key === sub.slotKey);
    const resolvedSlot = resolved.slots.find((entry) => entry.slotKey === sub.slotKey);
    const role = resolvedSlot?.roleUsed ?? null;
    subRows.push({
      formationId: formation.id,
      formationName: formation.name,
      set: formation.set,
      slotLabel: slot?.label ?? sub.slotKey,
      name: shortName(lookup(sub.playerId)),
      fullName: fullName(lookup(sub.playerId)),
      insteadOf: role
        ? `${role.code}${role.rank > 1 ? ` rank ${role.rank}` : ' rank 1'}`
        : (slot?.roleCode ?? 'the depth chart'),
    });
  }

  const units: ChecklistUnit[] = formations
    .filter((formation) => formation.side === 'special')
    .map((formation) => {
      const resolved = resolveFormation(formation, ctx);
      return {
        id: formation.id,
        name: formation.name,
        set: formation.set,
        personnel: formation.personnel,
        players: resolved.slots.map((slot) => ({
          label: slot.label,
          name: shortName(lookup(slot.playerId)),
          fullName: fullName(lookup(slot.playerId)),
        })),
      };
    });

  return {
    changes,
    subs: subRows,
    units,
    vocabulary: vocabulary.map((slot) => ({ code: slot.code, verified: slot.verified })),
    generatedAt: new Date().toISOString(),
  };
}

const SIDE_LABEL: Record<Side, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special teams',
};

/** Group the depth chart changes the way the in-game screen groups them. */
export function changesBySide(
  checklist: Checklist,
): { side: Side; label: string; changes: ChecklistChange[] }[] {
  const order: Side[] = ['offense', 'defense', 'special'];
  return order
    .map((side) => ({
      side,
      label: SIDE_LABEL[side],
      changes: checklist.changes.filter((change) => change.side === side),
    }))
    .filter((group) => group.changes.length > 0);
}

export function checklistToMarkdown(checklist: Checklist, title = 'Apply checklist'): string {
  const lines: string[] = [`# ${title}`, '', `Generated ${checklist.generatedAt}`, ''];

  lines.push(`## Step 1 — Depth chart (${checklist.changes.length} changes)`, '');
  if (checklist.changes.length === 0) {
    lines.push('The in-game depth chart already matches your plan.', '');
  }
  for (const group of changesBySide(checklist)) {
    lines.push(`### ${group.label}`, '');
    for (const change of group.changes) {
      lines.push(`- [ ] ${change.slotCode} rank ${change.rank}: ${change.fromFull} → ${change.toFull}`);
    }
    lines.push('');
  }

  if (checklist.units.length) {
    lines.push(`## Step 2 — Special teams units (${checklist.units.length})`, '');
    for (const unit of checklist.units) {
      // "Punt (Punt)" helps nobody; the set only earns its brackets when it differs.
      const heading = unit.set && unit.set !== unit.name ? `${unit.name} (${unit.set})` : unit.name;
      lines.push(`### ${heading}`, '');
      for (const player of unit.players) {
        lines.push(`- ${player.label} — ${player.fullName}`);
      }
      lines.push('');
    }
  }

  lines.push(`## Step 3 — Formation subs to set (${checklist.subs.length})`, '');
  if (checklist.subs.length === 0) {
    lines.push('No formation subs yet.', '');
  }
  for (const sub of checklist.subs) {
    lines.push(
      `- [ ] ${sub.formationName} — ${sub.slotLabel}: ${sub.fullName} (instead of ${sub.insteadOf})`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function checklistToCsv(checklist: Checklist): string {
  const rows: string[][] = [['step', 'group', 'formation', 'slot', 'rank', 'from', 'to']];

  for (const group of changesBySide(checklist)) {
    for (const change of group.changes) {
      rows.push([
        'depth-chart',
        group.label,
        '',
        change.slotCode,
        String(change.rank),
        change.fromFull,
        change.toFull,
      ]);
    }
  }

  for (const unit of checklist.units) {
    for (const player of unit.players) {
      rows.push(['special-teams', unit.name, unit.name, player.label, '', '', player.fullName]);
    }
  }

  for (const sub of checklist.subs) {
    rows.push(['formation-sub', sub.set, sub.formationName, sub.slotLabel, '', '', sub.fullName]);
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
