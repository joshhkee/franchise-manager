import type { DepthSlot, Side } from './types';

/**
 * Seed of Madden's depth-chart vocabulary.
 *
 * Madden 26 split positions into two lists, and the distinction is the whole reason
 * this app exists:
 *
 * - **Primary positions** are a player's position. One per player, shown on the
 *   player card, and what progression, scheme fit and trade value use.
 * - **Package positions** (EA calls them *secondary* positions) are jobs. They only
 *   exist on the depth chart, they are longer than the roster list, and a formation
 *   consults them instead of a primary position — `SLWR` before base `WR`, `SUBLB`
 *   before a base linebacker.
 *
 * `situational: true` is exactly that split: true means the slot is a package role
 * that only some formations consult. Primary positions (`QB`, `LEDG`, `MIKE`, `K`,
 * `P`, `LS`, ...) are false.
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
    description: 'Lead blocker in two-back sets. Optional on a roster that does not carry one.',
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
  {
    code: 'GAD',
    label: 'Gadget',
    group: 'Gadget',
    eligible: ['QB', 'HB', 'FB', 'WR', 'TE'],
    ranks: 1,
    situational: true,
    description:
      'Trick-play specialist who moves between roles — the man a formation hands the ball to on a gadget play. Added in Madden 26 alongside the primary/secondary split.',
  },
];

/**
 * Madden 26 replaced `LE`/`RE` with `LEDG`/`REDG` and `LOLB`/`MLB`/`ROLB` with
 * `SAM`/`MIKE`/`WILL`. An EDGE covers defensive ends *and* 3-4 outside linebackers,
 * so a 3-4 edge is a lineman now: the game tallies the Falcons 3-4 as
 * `5 DL / 2 LB / 4 DB`, not 3 DL + 4 LB. See `POSITIONS.md` §4.
 */
const DEFENSE: SlotSeed[] = [
  {
    code: 'LEDG',
    label: 'Left Edge',
    group: 'Defensive Line',
    eligible: ['LEDG', 'REDG', 'DT', 'NT', 'DE'],
    ranks: 3,
    description: 'Base left edge. Absorbs the 3-4 left outside linebacker.',
  },
  {
    code: 'REDG',
    label: 'Right Edge',
    group: 'Defensive Line',
    eligible: ['REDG', 'LEDG', 'DT', 'NT', 'DE'],
    ranks: 3,
    description: 'Base right edge. Absorbs the 3-4 right outside linebacker.',
  },
  {
    code: 'DT',
    label: 'Defensive Tackle',
    group: 'Defensive Line',
    eligible: ['DT', 'NT', 'LEDG', 'REDG', 'DE'],
    ranks: 3,
    description: 'Interior defender. A 3-4 lines up two of them either side of the nose.',
  },
  {
    code: 'NT',
    label: 'Nose Tackle',
    group: 'Defensive Line',
    eligible: ['NT', 'DT', 'LEDG', 'REDG'],
    ranks: 2,
    situational: true,
    description: 'Zero/one-technique in odd fronts, and the shaded interior in sub packages.',
  },
  {
    code: 'RLE',
    label: 'Rush Left End',
    group: 'Defensive Line',
    eligible: ['LEDG', 'REDG', 'DT', 'NT', 'DE'],
    ranks: 2,
    situational: true,
    description: 'Pass-rush edge used in nickel and dime fronts.',
  },
  {
    code: 'RRE',
    label: 'Rush Right End',
    group: 'Defensive Line',
    eligible: ['REDG', 'LEDG', 'DT', 'NT', 'DE'],
    ranks: 2,
    situational: true,
    description: 'Pass-rush edge used in nickel and dime fronts.',
  },
  {
    code: 'RDT',
    label: 'Rush Defensive Tackle',
    group: 'Defensive Line',
    eligible: ['DT', 'NT', 'LEDG', 'REDG'],
    ranks: 2,
    situational: true,
    description: 'Interior rusher in sub packages.',
  },
  {
    code: 'SAM',
    label: 'Strong-side Linebacker',
    group: 'Linebackers',
    eligible: ['SAM', 'MIKE', 'WILL', 'SS'],
    ranks: 3,
    description: 'The strong-side off-ball linebacker. Replaces the old LOLB.',
  },
  {
    code: 'MIKE',
    label: 'Middle Linebacker',
    group: 'Linebackers',
    eligible: ['MIKE', 'SAM', 'WILL', 'SS'],
    ranks: 3,
    description: 'The middle off-ball linebacker and defensive signal-caller. Replaces the old MLB.',
  },
  {
    code: 'WILL',
    label: 'Weak-side Linebacker',
    group: 'Linebackers',
    eligible: ['WILL', 'MIKE', 'SAM', 'SS'],
    ranks: 3,
    description: 'The weak-side off-ball linebacker. Replaces the old ROLB.',
  },
  {
    code: 'SUBLB',
    label: 'Sub Linebacker',
    group: 'Linebackers',
    eligible: ['MIKE', 'SAM', 'WILL', 'SS'],
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
    description: 'Cornerback depth, ranked 1-4. The third corner is who nickel and dime fronts use.',
  },
  {
    code: 'SLCB',
    label: 'Slot Cornerback',
    group: 'Secondary',
    eligible: ['CB', 'FS', 'SS', 'MIKE'],
    ranks: 2,
    situational: true,
    description: 'The corner who covers the slot in nickel and dime.',
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
    eligible: ['SS', 'FS', 'MIKE'],
    ranks: 3,
    description: 'In-the-box safety.',
  },
];

/**
 * `K`, `P` and `LS` are primary positions; `KOS`, `KR` and `PR` are package ones.
 * A long snapper is a roster position now, not a job you hand to a tight end.
 */
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
    description: 'Punts. Also the holder on field goals, which is why the field-goal unit binds him.',
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
    code: 'LS',
    label: 'Long Snapper',
    group: 'Specialists',
    eligible: ['LS', 'TE', 'C'],
    ranks: 1,
    description: 'Long snapper on punts and kicks. A roster position since Madden 26.',
  },
  {
    code: 'KR',
    label: 'Kick Returner',
    group: 'Returners',
    eligible: ['WR', 'HB', 'CB', 'RB'],
    ranks: 2,
    situational: true,
    description: 'Kick return depth.',
  },
  {
    code: 'PR',
    label: 'Punt Returner',
    group: 'Returners',
    eligible: ['WR', 'HB', 'CB', 'RB'],
    ranks: 2,
    situational: true,
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

/**
 * Primary positions: what a player can actually *be*. Everything else is a
 * package role the depth chart offers on top.
 */
export function primaryPositions(): string[] {
  return DEPTH_SLOTS.filter((slot) => !slot.situational).map((slot) => slot.code);
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
