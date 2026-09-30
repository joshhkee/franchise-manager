import type { DepthSlot, Side } from './types';

/**
 * Seed of Madden's depth-chart vocabulary.
 *
 * The game's depth chart is not just base positions: it also exposes situational
 * roles (`SLWR`, `3DRB`, `PWHB`, `NT`, `SUBLB`, `NB`, `RLE`, `RRE`, `RDT`) that
 * formations consult when deciding who lines up. Those roles are the whole point
 * of this app, so they are modelled as first-class slots.
 *
 * Nothing here is taken on faith: `verified` is false until a slot has been
 * confirmed against a real Madden 27 depth chart screen. The UI surfaces that
 * distinction instead of pretending the vocabulary is certain.
 */

interface SlotSeed {
  code: string;
  label: string;
  group: string;
  eligible: string[];
  ranks: number;
  situational?: boolean;
  description: string;
}

const OFFENSE: SlotSeed[] = [
  {
    code: 'QB',
    label: 'Quarterback',
    group: 'Quarterbacks',
    eligible: ['QB'],
    ranks: 3,
    description: 'Starting and backup passers.',
  },
  {
    code: 'HB',
    label: 'Halfback',
    group: 'Running Backs',
    eligible: ['HB', 'RB', 'FB'],
    ranks: 4,
    description: 'Primary ball carrier.',
  },
  {
    code: 'FB',
    label: 'Fullback',
    group: 'Running Backs',
    eligible: ['FB', 'HB', 'RB', 'TE'],
    ranks: 2,
    description: 'Lead blocker in two-back sets.',
  },
  {
    code: '3DRB',
    label: 'Third Down Back',
    group: 'Running Backs',
    eligible: ['HB', 'RB', 'FB'],
    ranks: 2,
    situational: true,
    description:
      'The game\u2019s receiving/blocking back. Used by pass-oriented packages rather than only third downs.',
  },
  {
    code: 'PWHB',
    label: 'Power Halfback',
    group: 'Running Backs',
    eligible: ['HB', 'RB', 'FB'],
    ranks: 2,
    situational: true,
    description: 'Short-yardage and goal-line back.',
  },
  {
    code: 'WR',
    label: 'Wide Receiver',
    group: 'Wide Receivers',
    eligible: ['WR', 'TE', 'HB'],
    ranks: 5,
    description: 'Outside and general receiver depth, ranked 1-5.',
  },
  {
    code: 'SLWR',
    label: 'Slot Wide Receiver',
    group: 'Wide Receivers',
    eligible: ['WR', 'TE', 'HB'],
    ranks: 2,
    situational: true,
    description:
      'The receiver who lines up off the ball inside. This is the role you most often swap in formation subs.',
  },
  {
    code: 'TE',
    label: 'Tight End',
    group: 'Tight Ends',
    eligible: ['TE', 'FB', 'WR', 'LT', 'RT'],
    ranks: 3,
    description: 'In-line and flexed tight ends.',
  },
  {
    code: 'LT',
    label: 'Left Tackle',
    group: 'Offensive Line',
    eligible: ['LT', 'LG', 'RT', 'RG', 'C'],
    ranks: 2,
    description: 'Blind-side tackle.',
  },
  {
    code: 'LG',
    label: 'Left Guard',
    group: 'Offensive Line',
    eligible: ['LG', 'LT', 'C', 'RG', 'RT'],
    ranks: 2,
    description: 'Left guard.',
  },
  {
    code: 'C',
    label: 'Center',
    group: 'Offensive Line',
    eligible: ['C', 'LG', 'RG'],
    ranks: 2,
    description: 'Snapper and line communicator.',
  },
  {
    code: 'RG',
    label: 'Right Guard',
    group: 'Offensive Line',
    eligible: ['RG', 'C', 'LG', 'RT', 'LT'],
    ranks: 2,
    description: 'Right guard.',
  },
  {
    code: 'RT',
    label: 'Right Tackle',
    group: 'Offensive Line',
    eligible: ['RT', 'RG', 'LT', 'LG', 'C'],
    ranks: 2,
    description: 'Right tackle.',
  },
];

const DEFENSE: SlotSeed[] = [
  {
    code: 'LE',
    label: 'Left End',
    group: 'Defensive Line',
    eligible: ['LE', 'RE', 'DT', 'LOLB', 'ROLB', 'DE'],
    ranks: 3,
    description: 'Base left defensive end.',
  },
  {
    code: 'RE',
    label: 'Right End',
    group: 'Defensive Line',
    eligible: ['RE', 'LE', 'DT', 'ROLB', 'LOLB', 'DE'],
    ranks: 3,
    description: 'Base right defensive end.',
  },
  {
    code: 'DT',
    label: 'Defensive Tackle',
    group: 'Defensive Line',
    eligible: ['DT', 'NT', 'LE', 'RE', 'DE'],
    ranks: 3,
    description: 'Interior defender in four-man fronts.',
  },
  {
    code: 'NT',
    label: 'Nose Tackle',
    group: 'Defensive Line',
    eligible: ['NT', 'DT', 'LE', 'RE'],
    ranks: 2,
    situational: true,
    description: 'Zero/one-technique in odd fronts and goal line.',
  },
  {
    code: 'RLE',
    label: 'Rush Left End',
    group: 'Defensive Line',
    eligible: ['LE', 'RE', 'DT', 'ROLB', 'LOLB'],
    ranks: 2,
    situational: true,
    description: 'Pass-rush left end used in nickel and dime.',
  },
  {
    code: 'RRE',
    label: 'Rush Right End',
    group: 'Defensive Line',
    eligible: ['RE', 'LE', 'DT', 'LOLB', 'ROLB'],
    ranks: 2,
    situational: true,
    description: 'Pass-rush right end used in nickel and dime.',
  },
  {
    code: 'RDT',
    label: 'Rush Defensive Tackle',
    group: 'Defensive Line',
    eligible: ['DT', 'NT', 'LE', 'RE'],
    ranks: 2,
    situational: true,
    description: 'Interior rusher in sub packages.',
  },
  {
    code: 'LOLB',
    label: 'Left Outside Linebacker',
    group: 'Linebackers',
    eligible: ['LOLB', 'ROLB', 'MLB', 'LE', 'RE'],
    ranks: 3,
    description: 'Strong-side outside linebacker.',
  },
  {
    code: 'MLB',
    label: 'Middle Linebacker',
    group: 'Linebackers',
    eligible: ['MLB', 'LOLB', 'ROLB', 'SS'],
    ranks: 3,
    description: 'Mike linebacker.',
  },
  {
    code: 'ROLB',
    label: 'Right Outside Linebacker',
    group: 'Linebackers',
    eligible: ['ROLB', 'LOLB', 'MLB', 'RE'],
    ranks: 3,
    description: 'Weak-side outside linebacker.',
  },
  {
    code: 'SUBLB',
    label: 'Sub Linebacker',
    group: 'Linebackers',
    eligible: ['MLB', 'LOLB', 'ROLB', 'SS'],
    ranks: 2,
    situational: true,
    description: 'Coverage linebacker who replaces a lineman in nickel and dime.',
  },
  {
    code: 'CB',
    label: 'Cornerback',
    group: 'Secondary',
    eligible: ['CB', 'FS', 'SS'],
    ranks: 4,
    description: 'Cornerback depth, ranked 1-4.',
  },
  {
    code: 'NB',
    label: 'Nickel Back',
    group: 'Secondary',
    eligible: ['CB', 'FS', 'SS', 'MLB'],
    ranks: 2,
    situational: true,
    description: 'Nickel corner in sub packages.',
  },
  {
    code: 'FS',
    label: 'Free Safety',
    group: 'Secondary',
    eligible: ['FS', 'SS', 'CB'],
    ranks: 3,
    description: 'Deep middle safety.',
  },
  {
    code: 'SS',
    label: 'Strong Safety',
    group: 'Secondary',
    eligible: ['SS', 'FS', 'MLB'],
    ranks: 3,
    description: 'In-the-box safety.',
  },
];

const SPECIAL: SlotSeed[] = [
  {
    code: 'K',
    label: 'Kicker',
    group: 'Kicking',
    eligible: ['K'],
    ranks: 1,
    description: 'Field goals and extra points.',
  },
  {
    code: 'P',
    label: 'Punter',
    group: 'Kicking',
    eligible: ['P'],
    ranks: 1,
    description: 'Punts.',
  },
  {
    code: 'KOS',
    label: 'Kickoff Specialist',
    group: 'Kicking',
    eligible: ['K', 'P'],
    ranks: 1,
    situational: true,
    description: 'Kickoff duty when it differs from the placekicker.',
  },
  {
    code: 'H',
    label: 'Holder',
    group: 'Specialists',
    eligible: ['P', 'QB', 'K'],
    ranks: 1,
    situational: true,
    description: 'Holder on field goals and extra points.',
  },
  {
    code: 'LS',
    label: 'Long Snapper',
    group: 'Specialists',
    eligible: ['LS', 'TE', 'C', 'LB'],
    ranks: 1,
    situational: true,
    description: 'Long snapper on punts and kicks.',
  },
  {
    code: 'KR',
    label: 'Kick Returner',
    group: 'Returners',
    eligible: ['WR', 'HB', 'CB', 'RB'],
    ranks: 2,
    description: 'Kick return depth.',
  },
  {
    code: 'PR',
    label: 'Punt Returner',
    group: 'Returners',
    eligible: ['WR', 'HB', 'CB', 'RB'],
    ranks: 2,
    description: 'Punt return depth.',
  },
];

function expand(side: Side, seeds: SlotSeed[]): DepthSlot[] {
  return seeds.map((seed, index) => ({
    code: seed.code,
    label: seed.label,
    side,
    group: seed.group,
    eligiblePositions: seed.eligible,
    order: index,
    ranks: seed.ranks,
    situational: seed.situational === true,
    description: seed.description,
    verified: false,
  }));
}

/** Ordered exactly the way the in-game screen groups them. */
export const DEPTH_SLOTS: DepthSlot[] = [
  ...expand('offense', OFFENSE),
  ...expand('defense', DEFENSE),
  ...expand('special', SPECIAL),
];

export const DEPTH_SLOT_BY_CODE: Record<string, DepthSlot> = Object.fromEntries(
  DEPTH_SLOTS.map((slot) => [slot.code, slot]),
);

export function depthSlot(code: string): DepthSlot | null {
  return DEPTH_SLOT_BY_CODE[code] ?? null;
}

export function depthSlotsBySide(side: Side): DepthSlot[] {
  return DEPTH_SLOTS.filter((slot) => slot.side === side);
}

/** Group slots for rendering the depth chart screen, preserving seed order. */
export function depthSlotGroups(side: Side): { group: string; slots: DepthSlot[] }[] {
  const groups: { group: string; slots: DepthSlot[] }[] = [];
  for (const slot of depthSlotsBySide(side)) {
    const existing = groups.find((g) => g.group === slot.group);
    if (existing) existing.slots.push(slot);
    else groups.push({ group: slot.group, slots: [slot] });
  }
  return groups;
}

export const SIDE_LABELS: Record<Side, string> = {
  offense: 'Offense',
  defense: 'Defense',
  special: 'Special Teams',
};

/** True when the vocabulary entry has not been confirmed against the game yet. */
export function isUnverifiedVocabulary(code: string): boolean {
  const slot = depthSlot(code);
  return slot ? !slot.verified : true;
}
