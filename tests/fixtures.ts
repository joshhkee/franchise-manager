import type { ResolveContext } from '@/domain/resolution';
import type {
  DepthChartState,
  Formation,
  FormationSlot,
  FranchisePlayer,
  Player,
  RosterPlayer,
  Side,
} from '@/domain/types';

/* -------------------------------------------------------------------------- */
/* Players                                                                    */
/* -------------------------------------------------------------------------- */

interface SeedPlayer {
  id: string;
  first: string;
  last: string;
  position: string;
  overall: number;
  age?: number;
  jersey?: number;
  dev?: FranchisePlayer['devTrait'];
  injury?: FranchisePlayer['injuryStatus'];
  roster?: FranchisePlayer['rosterStatus'];
  capHit?: number;
}

const SEEDS: SeedPlayer[] = [
  { id: 'qb1', first: 'Dane', last: 'Mercer', position: 'QB', overall: 86, age: 27, jersey: 17 },
  { id: 'qb2', first: 'Rookie', last: 'Hall', position: 'QB', overall: 71, age: 22, jersey: 4 },
  { id: 'hb1', first: 'Trey', last: 'Vance', position: 'HB', overall: 89, age: 25, jersey: 22, dev: 'superstar' },
  { id: 'hb2', first: 'Marco', last: 'Reyes', position: 'HB', overall: 78, age: 24, jersey: 28 },
  { id: 'hb3', first: 'Deuce', last: 'Okafor', position: 'HB', overall: 76, age: 23, jersey: 30 },
  { id: 'fb1', first: 'Bud', last: 'Kramer', position: 'FB', overall: 71, age: 29, jersey: 44 },
  { id: 'wr1', first: 'Ash', last: 'Bellamy', position: 'WR', overall: 92, age: 26, jersey: 11, dev: 'xfactor' },
  { id: 'wr2', first: 'Kai', last: 'Sanders', position: 'WR', overall: 84, age: 28, jersey: 15 },
  { id: 'wr3', first: 'Nico', last: 'Barros', position: 'WR', overall: 81, age: 24, jersey: 5 },
  { id: 'wr4', first: 'Big', last: 'Dawson', position: 'WR', overall: 77, age: 30, jersey: 88 },
  { id: 'wr5', first: 'Zay', last: 'Petit', position: 'WR', overall: 70, age: 23, jersey: 19 },
  { id: 'te1', first: 'Cole', last: 'Whitmore', position: 'TE', overall: 85, age: 27, jersey: 87 },
  { id: 'te2', first: 'Sam', last: 'Duval', position: 'TE', overall: 74, age: 25, jersey: 82 },
  { id: 'lt1', first: 'Pace', last: 'Odom', position: 'LT', overall: 87, age: 26, jersey: 72 },
  { id: 'lg1', first: 'Miles', last: 'Ferraro', position: 'LG', overall: 79, age: 28, jersey: 64 },
  { id: 'c1', first: 'Hal', last: 'Boone', position: 'C', overall: 82, age: 30, jersey: 60 },
  { id: 'rg1', first: 'Reg', last: 'Talley', position: 'RG', overall: 76, age: 24, jersey: 66 },
  { id: 'rt1', first: 'Bo', last: 'Jennings', position: 'RT', overall: 80, age: 25, jersey: 70 },
  { id: 'lt2', first: 'Dev', last: 'Kwan', position: 'LT', overall: 68, age: 23, jersey: 74 },
  { id: 'le1', first: 'Ras', last: 'Ellery', position: 'LE', overall: 84, age: 27, jersey: 95, dev: 'star' },
  { id: 're1', first: 'Cy', last: 'Barton', position: 'RE', overall: 80, age: 25, jersey: 91 },
  { id: 'dt1', first: 'Otis', last: 'Frame', position: 'DT', overall: 83, age: 29, jersey: 99 },
  { id: 'dt2', first: 'Hank', last: 'Roose', position: 'DT', overall: 75, age: 24, jersey: 98 },
  { id: 'lolb1', first: 'Jon', last: 'Pike', position: 'LOLB', overall: 79, age: 26, jersey: 52 },
  { id: 'mlb1', first: 'Ade', last: 'Cortez', position: 'MLB', overall: 86, age: 28, jersey: 54, dev: 'star' },
  { id: 'rolb1', first: 'Kip', last: 'Vaughn', position: 'ROLB', overall: 82, age: 25, jersey: 58 },
  { id: 'cb1', first: 'Rell', last: 'Mackey', position: 'CB', overall: 88, age: 26, jersey: 24, dev: 'star' },
  { id: 'cb2', first: 'Tune', last: 'Ferris', position: 'CB', overall: 81, age: 27, jersey: 21 },
  { id: 'cb3', first: 'Ike', last: 'Nwosu', position: 'CB', overall: 78, age: 23, jersey: 29 },
  { id: 'fs1', first: 'Kade', last: 'Rowan', position: 'FS', overall: 83, age: 26, jersey: 31 },
  { id: 'ss1', first: 'Bram', last: 'Ochoa', position: 'SS', overall: 84, age: 25, jersey: 26 },
  { id: 'k1', first: 'Sven', last: 'Lorentzen', position: 'K', overall: 80, age: 30, jersey: 3 },
  { id: 'p1', first: 'Ruiz', last: 'Cardo', position: 'P', overall: 78, age: 29, jersey: 9 },
  { id: 'ls1', first: 'Gil', last: 'Vandal', position: 'LS', overall: 60, age: 31, jersey: 46 },
  { id: 'practiceGuy', first: 'Practice', last: 'Squad', position: 'WR', overall: 65, age: 22, roster: 'practice-squad' },
];

export function makeRoster(): RosterPlayer[] {
  return SEEDS.map((seed) => {
    const player: Player = {
      id: seed.id,
      firstName: seed.first,
      lastName: seed.last,
      position: seed.position,
      jersey: seed.jersey ?? null,
      teamId: 'TST',
      overall: seed.overall,
      age: seed.age ?? 26,
      heightInches: 72,
      college: 'Test U',
      ratings: { speed_rating: seed.overall - 5 },
      salary: 2_000_000,
    };
    const franchise: FranchisePlayer = {
      playerId: seed.id,
      teamId: 'TST',
      contractYears: 3,
      capHit: seed.capHit ?? 4_000_000,
      devTrait: seed.dev ?? 'normal',
      injuryStatus: seed.injury ?? 'healthy',
      injuryWeeks: 0,
      rosterStatus: seed.roster ?? 'active',
      notes: null,
    };
    return { ...player, franchise };
  });
}

/* -------------------------------------------------------------------------- */
/* Formations                                                                 */
/* -------------------------------------------------------------------------- */

export function slot(
  key: string,
  label: string,
  roleCode: string | null,
  x: number,
  y: number,
  eligiblePositions: string[] = [],
  roleRank = 1,
  positionFallback: string | null = null,
): FormationSlot {
  return { key, label, roleCode, roleRank, x, y, eligiblePositions, positionFallback };
}

const OL_SLOTS = (baseY = 0.94): FormationSlot[] => [
  slot('LT', 'LT', 'LT', 0.37, baseY, ['LT', 'LG', 'RT', 'RG', 'C']),
  slot('LG', 'LG', 'LG', 0.43, baseY, ['LG', 'LT', 'C', 'RG']),
  slot('C', 'C', 'C', 0.5, baseY, ['C', 'LG', 'RG']),
  slot('RG', 'RG', 'RG', 0.57, baseY, ['RG', 'C', 'LG', 'RT']),
  slot('RT', 'RT', 'RT', 0.63, baseY, ['RT', 'RG', 'LT', 'LG']),
];

function offense(
  id: string,
  name: string,
  set: string,
  personnel: string,
  distribution: string,
  slots: FormationSlot[],
  plays: string[],
): Formation {
  return {
    id,
    playbookId: 'pb-test-off',
    name,
    set,
    personnel,
    distribution,
    side: 'offense' as Side,
    family: `${set.toLowerCase()}-${distribution.toLowerCase()}`,
    slots,
    plays: plays.map((playName) => ({ id: `${id}:${playName}`, name: playName })),
    notes: null,
  };
}

export const GUN_TRIPS_TE: Formation = offense(
  'gun-trips-te',
  'Gun Trips TE Offset',
  'Gun',
  '11',
  'Trips',
  [
    slot('QB', 'QB', 'QB', 0.5, 0.8, ['QB']),
    slot('HB', 'HB', 'HB', 0.44, 0.72, ['HB', 'FB']),
    slot('TE', 'TE', 'TE', 0.68, 0.96, ['TE', 'FB']),
    slot('WR_L', 'WR1', 'WR', 0.12, 0.98, ['WR'], 1),
    slot('SLOT', 'SLWR', 'SLWR', 0.24, 0.95, ['WR', 'TE', 'HB'], 1),
    slot('WR_R', 'WR2', 'WR', 0.9, 0.98, ['WR'], 2),
    ...OL_SLOTS(),
  ],
  ['Inside Zone Split', 'HB Dive', 'PA Deep Post', 'Mesh', 'Four Verts', 'Quick Slant', 'WR Screen'],
);

export const GUN_BUNCH: Formation = offense(
  'gun-bunch',
  'Gun Bunch Open',
  'Gun',
  '11',
  'Bunch',
  [
    slot('QB', 'QB', 'QB', 0.5, 0.8, ['QB']),
    slot('HB', 'HB', 'HB', 0.42, 0.72, ['HB', 'FB']),
    slot('SLOT', 'SLWR', 'SLWR', 0.78, 0.94, ['WR', 'TE', 'HB'], 1),
    slot('WR_L', 'WR1', 'WR', 0.1, 0.98, ['WR'], 1),
    slot('WR_R', 'WR2', 'WR', 0.86, 0.96, ['WR'], 2),
    slot('TE', 'TE', 'TE', 0.72, 0.96, ['TE', 'FB']),
    ...OL_SLOTS(),
  ],
  ['Mesh', 'Levels', 'HB Draw', 'PA Boot Over', 'Verticals'],
);

export const GUN_EMPTY: Formation = offense(
  'gun-empty',
  'Gun Empty Trey',
  'Gun',
  '10',
  'Empty',
  [
    slot('QB', 'QB', 'QB', 0.5, 0.8, ['QB']),
    slot('SLOT', 'SLWR', 'SLWR', 0.7, 0.95, ['WR', 'TE', 'HB'], 1),
    slot('WR_L', 'WR1', 'WR', 0.08, 0.98, ['WR'], 1),
    slot('WR_R', 'WR2', 'WR', 0.92, 0.98, ['WR'], 2),
    slot('WR_X', 'WR3', 'WR', 0.5, 0.99, ['WR'], 4),
    slot('TE', 'TE', 'TE', 0.28, 0.98, ['TE', 'FB']),
    ...OL_SLOTS(),
  ],
  ['Quick Slant', 'Four Verts', 'Stick', 'Mesh'],
);

export const SINGLEBACK_ACE: Formation = offense(
  'singleback-ace',
  'Singleback Ace',
  'Singleback',
  '12',
  'Doubles',
  [
    slot('QB', 'QB', 'QB', 0.5, 0.82, ['QB']),
    slot('HB', 'HB', 'HB', 0.5, 0.7, ['HB', 'FB']),
    slot('TE_L', 'TE1', 'TE', 0.66, 0.97, ['TE', 'FB'], 1),
    slot('TE_R', 'TE2', 'TE', 0.34, 0.97, ['TE', 'FB'], 2),
    slot('WR_L', 'WR1', 'WR', 0.1, 0.98, ['WR'], 1),
    slot('WR_R', 'WR2', 'WR', 0.9, 0.98, ['WR'], 2),
    ...OL_SLOTS(0.93),
  ],
  ['HB Dive', 'Power O', 'PA Boot Over', 'Play Action Deep Shot'],
);

export const I_FORM_PRO: Formation = offense(
  'iform-pro',
  'I Form Pro',
  'I Form',
  '21',
  'Doubles',
  [
    slot('QB', 'QB', 'QB', 0.5, 0.84, ['QB']),
    slot('FB', 'FB', 'FB', 0.5, 0.74, ['FB', 'HB']),
    slot('HB', 'HB', 'HB', 0.5, 0.66, ['HB', 'FB']),
    slot('TE_L', 'TE1', 'TE', 0.66, 0.97, ['TE', 'FB'], 1),
    slot('WR_L', 'WR1', 'WR', 0.1, 0.98, ['WR'], 1),
    slot('WR_R', 'WR2', 'WR', 0.9, 0.98, ['WR'], 2),
    ...OL_SLOTS(0.94),
  ],
  ['Power O', 'Counter Trey', 'Play Action Deep Shot', 'HB Dive', 'Trap'],
);

export const NICKEL_335: Formation = {
  id: 'nickel-335',
  playbookId: 'pb-test-def',
  name: 'Nickel 3-3-5',
  set: 'Nickel',
  personnel: 'nickel',
  distribution: 'Doubles',
  side: 'defense',
  family: 'nickel-doubles',
  slots: [
    slot('LE', 'LE', 'LE', 0.34, 0.9, ['LE', 'RE', 'DT']),
    slot('NT', 'NT', 'NT', 0.5, 0.9, ['NT', 'DT']),
    slot('RE', 'RE', 'RE', 0.66, 0.9, ['RE', 'LE', 'DT']),
    slot('LOLB', 'LOLB', 'LOLB', 0.2, 0.82, ['LOLB', 'ROLB', 'MLB']),
    slot('MLB', 'MLB', 'MLB', 0.5, 0.8, ['MLB', 'LOLB', 'ROLB']),
    slot('ROLB', 'ROLB', 'ROLB', 0.8, 0.82, ['ROLB', 'LOLB', 'MLB']),
    slot('CB_L', 'CB1', 'CB', 0.08, 0.9, ['CB'], 1),
    slot('CB_R', 'CB2', 'CB', 0.92, 0.9, ['CB'], 2),
    slot('NB', 'NB', 'NB', 0.72, 0.88, ['CB', 'FS', 'SS'], 1),
    slot('FS', 'FS', 'FS', 0.42, 0.4, ['FS', 'SS', 'CB']),
    slot('SS', 'SS', 'SS', 0.58, 0.45, ['SS', 'FS', 'MLB']),
  ],
  plays: [
    { id: 'nickel-335:Cover 3', name: 'Cover 3 Buzz' },
    { id: 'nickel-335:Cover 1', name: 'Cover 1 Press' },
    { id: 'nickel-335:Zone Blitz', name: 'Zone Blitz' },
  ],
  notes: null,
};

export const OFFENSE_FORMATIONS: Formation[] = [
  GUN_TRIPS_TE,
  GUN_BUNCH,
  GUN_EMPTY,
  SINGLEBACK_ACE,
  I_FORM_PRO,
];

export const ALL_FORMATIONS: Formation[] = [...OFFENSE_FORMATIONS, NICKEL_335];

/* -------------------------------------------------------------------------- */
/* Depth chart                                                                */
/* -------------------------------------------------------------------------- */

export function makeDepthChart(): DepthChartState {
  return {
    entries: {
      QB: ['qb1', 'qb2', null],
      HB: ['hb1', 'hb2'],
      FB: ['fb1'],
      '3DRB': ['hb3'],
      WR: ['wr1', 'wr2', 'wr3', 'wr4', 'wr5'],
      SLWR: ['wr3', 'wr4'],
      TE: ['te1', 'te2'],
      LT: ['lt1', 'lt2'],
      LG: ['lg1'],
      C: ['c1'],
      RG: ['rg1'],
      RT: ['rt1'],
      LE: ['le1'],
      RE: ['re1'],
      DT: ['dt1', 'dt2'],
      NT: ['dt1'],
      RLE: ['re1'],
      RRE: ['le1'],
      RDT: ['dt2'],
      LOLB: ['lolb1'],
      MLB: ['mlb1'],
      ROLB: ['rolb1'],
      SUBLB: ['mlb1'],
      CB: ['cb1', 'cb2', 'cb3'],
      NB: ['cb3'],
      FS: ['fs1'],
      SS: ['ss1'],
      K: ['k1'],
      P: ['p1'],
      LS: ['ls1'],
      KR: ['wr5', 'cb3'],
      PR: ['wr5'],
    },
  };
}

export function makeContext(overrides: Partial<ResolveContext> = {}): ResolveContext {
  const roster = makeRoster();
  const playersById: ResolveContext['playersById'] = {};
  for (const player of roster) {
    playersById[player.id] = {
      id: player.id,
      position: player.position,
      franchise: player.franchise,
    };
  }
  return {
    depthChart: overrides.depthChart ?? makeDepthChart(),
    subs: overrides.subs ?? [],
    playersById: overrides.playersById ?? playersById,
  };
}
