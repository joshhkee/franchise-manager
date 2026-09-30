/**
 * Seed playbook data.
 *
 * Each formation carries the labels that sit on its diagram and the depth-chart
 * role each label consumes — `SLWR`, `3DRB`, `NB` and friends — which is what lets
 * the planner propagate a depth-chart change through every formation.
 *
 * Coordinates are normalized: x runs 0 (left sideline) to 1 (right sideline), y
 * runs 0 (deep) to 1 (line of scrimmage). We render our own diagram from these
 * numbers rather than reusing anyone else's artwork.
 *
 * This is a starting set. The civil.gg scraper (`npm run scrape:playbooks`)
 * replaces and extends it, and any formation can be corrected by hand.
 */

export interface SeedSlot {
  key: string;
  label: string;
  /** Depth-chart role consumed by this spot. */
  role: string | null;
  rank?: number;
  x: number;
  y: number;
  eligible: string[];
  fallback?: string;
}

export interface SeedFormation {
  id: string;
  name: string;
  set: string;
  distribution: string;
  personnel?: string;
  slots: SeedSlot[];
  plays: string[];
  notes?: string;
}

export interface SeedPlaybook {
  id: string;
  name: string;
  team: string;
  side: 'offense' | 'defense';
  source: 'seed' | 'civil' | 'manual';
  url?: string;
  formations: SeedFormation[];
}

/* -------------------------------------------------------------------------- */
/* Builders                                                                   */
/* -------------------------------------------------------------------------- */

const OL = (y = 0.94): SeedSlot[] => [
  { key: 'LT', label: 'LT', role: 'LT', x: 0.36, y, eligible: ['LT', 'LG', 'RT', 'RG', 'C'] },
  { key: 'LG', label: 'LG', role: 'LG', x: 0.43, y, eligible: ['LG', 'LT', 'C', 'RG'] },
  { key: 'C', label: 'C', role: 'C', x: 0.5, y, eligible: ['C', 'LG', 'RG'] },
  { key: 'RG', label: 'RG', role: 'RG', x: 0.57, y, eligible: ['RG', 'C', 'LG', 'RT'] },
  { key: 'RT', label: 'RT', role: 'RT', x: 0.64, y, eligible: ['RT', 'RG', 'LT', 'LG'] },
];

const QB = (x = 0.5, y = 0.8): SeedSlot => ({
  key: 'QB',
  label: 'QB',
  role: 'QB',
  x,
  y,
  eligible: ['QB'],
});

const HB = (x = 0.44, y = 0.71): SeedSlot => ({
  key: 'HB',
  label: 'HB',
  role: 'HB',
  x,
  y,
  eligible: ['HB', 'FB'],
});

const FB = (x = 0.5, y = 0.64): SeedSlot => ({
  key: 'FB',
  label: 'FB',
  role: 'FB',
  x,
  y,
  eligible: ['FB', 'HB'],
});

const TE = (x = 0.68, y = 0.96, key = 'TE', rank = 1): SeedSlot => ({
  key,
  label: key === 'TE' ? 'TE' : key.replace('_', ''),
  role: 'TE',
  rank,
  x,
  y,
  eligible: ['TE', 'FB', 'LT', 'RT'],
});

const WR = (key: string, label: string, x: number, rank: number, y = 0.98): SeedSlot => ({
  key,
  label,
  role: 'WR',
  rank,
  x,
  y,
  eligible: ['WR', 'TE', 'HB'],
});

const SLOT = (x = 0.26, y = 0.95, rank = 1): SeedSlot => ({
  key: 'SLOT',
  label: 'SLWR',
  role: 'SLWR',
  rank,
  x,
  y,
  eligible: ['WR', 'TE', 'HB'],
});

/** A second slot-receiver spot so formations can split the role if they want to. */
const SLOT2 = (x: number, y = 0.95): SeedSlot => ({
  key: 'SLOT2',
  label: 'SLWR2',
  role: 'SLWR',
  rank: 2,
  x,
  y,
  eligible: ['WR', 'TE', 'HB'],
});

function def(key: string, role: string, x: number, y: number, eligible: string[]): SeedSlot {
  return { key, label: key, role, x, y, eligible };
}

const DEF_FRONT_43 = (): SeedSlot[] => [
  def('LE', 'LE', 0.33, 0.9, ['LE', 'RE', 'DT']),
  def('DT1', 'DT', 0.44, 0.9, ['DT', 'NT', 'LE', 'RE']),
  def('DT2', 'DT', 0.56, 0.9, ['DT', 'NT', 'LE', 'RE']),
  def('RE', 'RE', 0.67, 0.9, ['RE', 'LE', 'DT']),
];

const DEF_LB_43 = (): SeedSlot[] => [
  def('LOLB', 'LOLB', 0.24, 0.82, ['LOLB', 'ROLB', 'MLB']),
  def('MLB', 'MLB', 0.47, 0.8, ['MLB', 'LOLB', 'ROLB']),
  def('ROLB', 'ROLB', 0.72, 0.82, ['ROLB', 'LOLB', 'MLB']),
];

const DEF_LB_34 = (): SeedSlot[] => [
  def('LOLB', 'LOLB', 0.24, 0.82, ['LOLB', 'ROLB', 'MLB']),
  def('MLB1', 'MLB', 0.44, 0.8, ['MLB', 'LOLB', 'ROLB']),
  def('MLB2', 'SUBLB', 0.56, 0.8, ['MLB', 'LOLB', 'ROLB', 'SS']),
  def('ROLB', 'ROLB', 0.76, 0.82, ['ROLB', 'LOLB', 'MLB']),
];

const DEF_SECONDARY = (nb = true): SeedSlot[] => [
  def('CB_L', 'CB', 0.08, 0.9, ['CB']),
  def('CB_R', 'CB', 0.92, 0.9, ['CB']),
  ...(nb ? [def('NB', 'NB', 0.78, 0.88, ['CB', 'FS', 'SS'])] : []),
  def('FS', 'FS', 0.42, 0.38, ['FS', 'SS', 'CB']),
  def('SS', 'SS', 0.58, 0.44, ['SS', 'FS', 'MLB']),
];

/** Dime is six defensive backs, so it is not the nickel secondary plus a body. */
const DEF_DIME_SECONDARY = (): SeedSlot[] => [
  def('CB_L', 'CB', 0.08, 0.9, ['CB']),
  def('CB_R', 'CB', 0.92, 0.9, ['CB']),
  def('NB', 'NB', 0.74, 0.88, ['CB', 'FS', 'SS']),
  // The dime back is the second slot corner, so it consults `NB` rank 2 rather
  // than inventing a depth chart role Madden may not have.
  {
    key: 'NB2',
    label: 'NB2',
    role: 'NB',
    rank: 2,
    x: 0.5,
    y: 0.6,
    eligible: ['CB', 'FS', 'SS'],
  },
  def('FS', 'FS', 0.36, 0.34, ['FS', 'SS', 'CB']),
  def('SS', 'SS', 0.64, 0.38, ['SS', 'FS', 'CB']),
];

/* -------------------------------------------------------------------------- */
/* Offense: zone/wide-zone scheme                                             */
/* -------------------------------------------------------------------------- */

const SHANAHAN: SeedPlaybook = {
  id: 'pb-shanahan',
  name: 'Wide Zone Offense',
  team: 'SF',
  side: 'offense',
  source: 'seed',
  formations: [
    {
      id: 'sf-gun-trips-te',
      name: 'Gun Trips TE Offset',
      set: 'Gun',
      distribution: 'Trips',
      slots: [
        QB(),
        HB(0.4, 0.72),
        TE(0.7, 0.96),
        WR('WR_L', 'WR1', 0.1, 1),
        SLOT(0.24),
        WR('WR_R', 'WR2', 0.9, 2),
        ...OL(),
      ],
      plays: [
        'Inside Zone Split',
        'Outside Zone Wk',
        'HB Dive',
        'PA Deep Post',
        'PA Boot Over',
        'Mesh',
        'Levels',
        'Four Verts',
        'Quick Slant',
        'WR Screen',
      ],
    },
    {
      id: 'sf-gun-bunch',
      name: 'Gun Bunch Open',
      set: 'Gun',
      distribution: 'Bunch',
      slots: [
        QB(),
        HB(0.4, 0.72),
        WR('WR_L', 'WR1', 0.08, 1),
        SLOT(0.78, 0.94),
        WR('WR_R', 'WR2', 0.86, 2, 0.96),
        TE(0.72, 0.96),
        ...OL(),
      ],
      plays: ['Mesh', 'Levels', 'HB Draw', 'PA Boot Over', 'Verticals', 'Yankee', 'Spacing'],
    },
    {
      id: 'sf-gun-y-off-trio',
      name: 'Gun Y Off Trio',
      set: 'Gun',
      distribution: 'Trips',
      slots: [
        QB(),
        HB(0.42, 0.72),
        TE(0.64, 0.96),
        WR('WR_L', 'WR1', 0.08, 1),
        SLOT(0.2),
        WR('WR_R', 'WR2', 0.88, 2),
        ...OL(),
      ],
      plays: ['Inside Zone Split', 'Counter Trey', 'PA Deep Post', 'Flood', 'Stick', 'HB Draw'],
    },
    {
      id: 'sf-singleback-ace',
      name: 'Singleback Ace',
      set: 'Singleback',
      distribution: 'Doubles',
      slots: [
        QB(0.5, 0.82),
        HB(0.5, 0.7),
        TE(0.66, 0.97, 'TE_L', 1),
        TE(0.34, 0.97, 'TE_R', 2),
        WR('WR_L', 'WR1', 0.08, 1),
        WR('WR_R', 'WR2', 0.92, 2),
        ...OL(0.93),
      ],
      plays: ['HB Dive', 'Power O', 'PA Boot Over', 'Play Action Deep Shot', 'HB Stretch', 'Trap'],
    },
    {
      id: 'sf-singleback-deuce-close',
      name: 'Singleback Deuce Close',
      set: 'Singleback',
      distribution: 'Tight',
      slots: [
        QB(0.5, 0.82),
        HB(0.5, 0.7),
        TE(0.6, 0.97, 'TE_L', 1),
        TE(0.42, 0.97, 'TE_R', 2),
        WR('WR_L', 'WR1', 0.09, 1),
        WR('WR_R', 'WR2', 0.91, 2),
        ...OL(0.93),
      ],
      plays: ['Inside Zone Split', 'Power O', 'Counter Trey', 'PA Boot Over', 'HB Dive', 'Wham'],
    },
    {
      id: 'sf-i-form-pro',
      name: 'I Form Pro',
      set: 'I Form',
      distribution: 'Doubles',
      slots: [
        QB(0.5, 0.84),
        FB(),
        HB(0.5, 0.66),
        TE(0.66, 0.97, 'TE_L', 1),
        WR('WR_L', 'WR1', 0.09, 1),
        WR('WR_R', 'WR2', 0.91, 2),
        ...OL(),
      ],
      plays: ['Power O', 'Counter Trey', 'Play Action Deep Shot', 'HB Dive', 'Trap', 'Duo'],
    },
    {
      id: 'sf-pistol-strong',
      name: 'Pistol Strong',
      set: 'Pistol',
      distribution: 'Tight',
      slots: [
        QB(0.5, 0.75),
        FB(0.54, 0.68),
        HB(0.5, 0.62),
        TE(0.62, 0.97, 'TE_L', 1),
        TE(0.44, 0.97, 'TE_R', 2),
        WR('WR_R', 'WR1', 0.9, 1),
        ...OL(0.93),
      ],
      plays: ['Power O', 'Inside Zone Split', 'Counter Trey', 'PA Boot Over', 'HB Stretch'],
    },
    {
      id: 'sf-gun-empty-trey',
      name: 'Gun Empty Trey',
      set: 'Gun',
      distribution: 'Empty',
      slots: [
        QB(),
        SLOT(0.68),
        WR('WR_L', 'WR1', 0.06, 1),
        WR('WR_R', 'WR2', 0.94, 2),
        WR('WR_X', 'WR3', 0.5, 4, 0.99),
        TE(0.3, 0.98),
        ...OL(),
      ],
      plays: ['Quick Slant', 'Four Verts', 'Stick', 'Mesh', 'Verticals'],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Offense: spread passing                                                    */
/* -------------------------------------------------------------------------- */

const SPREAD: SeedPlaybook = {
  id: 'pb-spread',
  name: 'Spread Passing Offense',
  team: 'KC',
  side: 'offense',
  source: 'seed',
  formations: [
    {
      id: 'kc-gun-trips-y-flex',
      name: 'Gun Trips Y Flex',
      set: 'Gun',
      distribution: 'Trips',
      slots: [
        QB(),
        HB(0.46, 0.72),
        WR('WR_L', 'WR1', 0.07, 1),
        SLOT(0.22),
        WR('WR_R', 'WR2', 0.86, 2),
        TE(0.66, 0.95),
        ...OL(),
      ],
      plays: [
        'Quick Slant',
        'Spacing',
        'Mesh',
        'Yankee',
        'Four Verts',
        'RPO Peek',
        'HB Draw',
        'PA Deep Post',
      ],
    },
    {
      id: 'kc-gun-doubles-y-off',
      name: 'Gun Doubles Y Off',
      set: 'Gun',
      distribution: 'Doubles',
      slots: [
        QB(),
        HB(0.44, 0.72),
        SLOT(0.3),
        WR('WR_L', 'WR1', 0.08, 1),
        WR('WR_R', 'WR2', 0.9, 2),
        TE(0.66, 0.96),
        ...OL(),
      ],
      plays: ['Inside Zone Split', 'Stick', 'Levels', 'PA Boot Over', 'Quick Slant', 'Screen'],
    },
    {
      id: 'kc-gun-tight-offset',
      name: 'Gun Tight Offset TE',
      set: 'Gun',
      distribution: 'Tight',
      slots: [
        QB(),
        HB(0.46, 0.72),
        TE(0.62, 0.97, 'TE_L', 1),
        TE(0.5, 0.98, 'TE_R', 2),
        WR('WR_L', 'WR1', 0.09, 1),
        WR('WR_R', 'WR2', 0.9, 2),
        ...OL(),
      ],
      plays: ['Inside Zone Split', 'Power O', 'PA Boot Over', 'Mesh', 'HB Dive', 'RPO Peek'],
    },
    {
      id: 'kc-gun-bunch-te',
      name: 'Gun Bunch TE',
      set: 'Gun',
      distribution: 'Bunch',
      slots: [
        QB(),
        HB(0.42, 0.72),
        WR('WR_L', 'WR1', 0.08, 1),
        SLOT(0.8, 0.94),
        WR('WR_R', 'WR2', 0.88, 2, 0.96),
        TE(0.74, 0.96),
        ...OL(),
      ],
      plays: ['Mesh', 'Yankee', 'HB Draw', 'PA Deep Post', 'Levels', 'Screen'],
    },
    {
      id: 'kc-gun-empty-spread',
      name: 'Gun Empty Spread',
      set: 'Gun',
      distribution: 'Empty',
      slots: [
        QB(),
        SLOT(0.62),
        SLOT2(0.38),
        WR('WR_L', 'WR1', 0.06, 1),
        WR('WR_R', 'WR2', 0.94, 2),
        TE(0.5, 0.99, 'TE', 1),
        ...OL(),
      ],
      plays: ['Quick Slant', 'Four Verts', 'Stick', 'Mesh', 'Spacing'],
    },
    {
      id: 'kc-singleback-doubles',
      name: 'Singleback Doubles',
      set: 'Singleback',
      distribution: 'Doubles',
      slots: [
        QB(0.5, 0.82),
        HB(0.46, 0.7),
        TE(0.64, 0.97),
        SLOT(0.3, 0.95),
        WR('WR_L', 'WR1', 0.08, 1),
        WR('WR_R', 'WR2', 0.92, 2),
        ...OL(0.93),
      ],
      plays: ['HB Dive', 'Inside Zone Split', 'PA Deep Post', 'Levels', 'Quick Slant', 'Draw'],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Offense: heavy personnel                                                   */
/* -------------------------------------------------------------------------- */

const POWER: SeedPlaybook = {
  id: 'pb-power',
  name: 'Heavy Gap Scheme',
  team: 'BAL',
  side: 'offense',
  source: 'seed',
  formations: [
    {
      id: 'bal-i-form-close',
      name: 'I Form Close',
      set: 'I Form',
      distribution: 'Tight',
      slots: [
        QB(0.5, 0.84),
        FB(),
        HB(0.5, 0.66),
        TE(0.62, 0.97, 'TE_L', 1),
        TE(0.4, 0.97, 'TE_R', 2),
        WR('WR_R', 'WR1', 0.9, 1),
        ...OL(),
      ],
      plays: ['Power O', 'Counter Trey', 'HB Dive', 'Trap', 'Duo', 'PA Boot Over'],
    },
    {
      id: 'bal-i-form-pro',
      name: 'I Form Pro',
      set: 'I Form',
      distribution: 'Doubles',
      slots: [
        QB(0.5, 0.84),
        FB(),
        HB(0.5, 0.66),
        TE(0.66, 0.97, 'TE_L', 1),
        WR('WR_L', 'WR1', 0.09, 1),
        WR('WR_R', 'WR2', 0.91, 2),
        ...OL(),
      ],
      plays: ['Power O', 'Inside Zone Split', 'Play Action Deep Shot', 'HB Dive', 'Trap'],
    },
    {
      id: 'bal-singleback-big',
      name: 'Singleback Big',
      set: 'Singleback',
      distribution: 'Tight',
      slots: [
        QB(0.5, 0.82),
        HB(0.44, 0.7),
        FB(0.56, 0.7),
        TE(0.62, 0.97, 'TE_L', 1),
        TE(0.4, 0.97, 'TE_R', 2),
        WR('WR_R', 'WR1', 0.9, 1),
        ...OL(0.93),
      ],
      plays: ['Power O', 'Duo', 'Counter Trey', 'PA Boot Over', 'HB Dive'],
    },
    {
      id: 'bal-strong-i-twins',
      name: 'Strong I Twins',
      set: 'Strong',
      distribution: 'Doubles',
      slots: [
        QB(0.5, 0.84),
        FB(),
        HB(0.5, 0.66),
        TE(0.64, 0.97, 'TE_L', 1),
        WR('WR_L', 'WR1', 0.08, 1),
        SLOT(0.24),
        ...OL(),
      ],
      plays: ['Power O', 'Counter Trey', 'PA Deep Post', 'Inside Zone Split', 'HB Stretch'],
    },
    {
      id: 'bal-goal-line-heavy',
      name: 'Goal Line Heavy',
      set: 'Goal Line',
      distribution: 'Tight',
      slots: [
        QB(0.5, 0.85),
        FB(0.44, 0.62),
        HB(0.56, 0.62),
        TE(0.6, 0.97, 'TE_L', 1),
        TE(0.4, 0.97, 'TE_R', 2),
        WR('WR_R', 'WR1', 0.88, 1),
        ...OL(0.92),
      ],
      plays: ['Power O', 'HB Dive', 'QB Sneak', 'Play Action Deep Shot', 'Toss'],
    },
    {
      id: 'bal-gun-trips-te',
      name: 'Gun Trips TE',
      set: 'Gun',
      distribution: 'Trips',
      slots: [
        QB(),
        HB(0.42, 0.72),
        TE(0.7, 0.96),
        WR('WR_L', 'WR1', 0.09, 1),
        SLOT(0.24),
        WR('WR_R', 'WR2', 0.9, 2),
        ...OL(),
      ],
      plays: ['Inside Zone Split', 'RPO Peek', 'PA Deep Post', 'Quick Slant', 'Counter Trey'],
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Defense                                                                    */
/* -------------------------------------------------------------------------- */

const NICKEL_43: SeedPlaybook = {
  id: 'pb-nickel-43',
  name: 'Nickel 4-3 Defense',
  team: 'DAL',
  side: 'defense',
  source: 'seed',
  formations: [
    {
      id: 'def-nickel-335',
      name: 'Nickel 3-3-5',
      set: 'Nickel',
      distribution: 'Doubles',
      slots: [
        def('LE', 'LE', 0.36, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'NT', 0.5, 0.9, ['NT', 'DT']),
        def('RE', 'RE', 0.64, 0.9, ['RE', 'LE', 'DT']),
        def('LOLB', 'LOLB', 0.22, 0.82, ['LOLB', 'ROLB', 'MLB']),
        def('MLB', 'MLB', 0.5, 0.8, ['MLB', 'LOLB', 'ROLB']),
        def('ROLB', 'ROLB', 0.78, 0.82, ['ROLB', 'LOLB', 'MLB']),
        ...DEF_SECONDARY(),
      ],
      plays: ['Cover 3 Buzz', 'Cover 1 Press', 'Zone Blitz'],
    },
    {
      id: 'def-nickel-245',
      name: 'Nickel 2-4-5 Double Mug',
      set: 'Nickel',
      distribution: 'Doubles',
      // Two down linemen, four linebackers, five defensive backs.
      slots: [
        def('DT1', 'RDT', 0.42, 0.9, ['DT', 'NT', 'LE', 'RE']),
        def('DT2', 'RDT', 0.58, 0.9, ['DT', 'NT', 'LE', 'RE']),
        def('LOLB', 'SUBLB', 0.3, 0.86, ['MLB', 'LOLB', 'ROLB', 'SS']),
        def('MLB1', 'MLB', 0.44, 0.8, ['MLB', 'LOLB', 'ROLB']),
        def('MLB2', 'MLB', 0.56, 0.8, ['MLB', 'LOLB', 'ROLB']),
        def('ROLB', 'SUBLB', 0.7, 0.86, ['MLB', 'ROLB', 'LOLB', 'SS']),
        ...DEF_SECONDARY(),
      ],
      plays: ['Double Mug Blitz', 'Cover 2 Sink', 'Cover 3 Match'],
    },
    {
      id: 'def-dime-326',
      name: 'Dime 3-2-6',
      set: 'Dime',
      distribution: 'Doubles',
      slots: [
        def('LE', 'RLE', 0.36, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'RDT', 0.5, 0.9, ['DT', 'NT']),
        def('RE', 'RRE', 0.64, 0.9, ['RE', 'LE', 'DT']),
        def('LOLB', 'SUBLB', 0.34, 0.84, ['MLB', 'LOLB', 'ROLB', 'SS']),
        def('ROLB', 'SUBLB', 0.66, 0.84, ['MLB', 'ROLB', 'LOLB', 'SS']),
        ...DEF_DIME_SECONDARY(),
      ],
      plays: ['Cover 4 Palms', 'Cover 1 Robber', 'Fire Zone'],
    },
    {
      id: 'def-43-over',
      name: '4-3 Over',
      set: '4-3',
      distribution: 'Doubles',
      slots: [...DEF_FRONT_43(), ...DEF_LB_43(), ...DEF_SECONDARY(false)],
      plays: ['Cover 2 Zone', 'Cover 3 Sky', 'Cover 1 Man'],
    },
    {
      id: 'def-43-under',
      name: '4-3 Under',
      set: '4-3',
      distribution: 'Tight',
      slots: [
        def('LE', 'LE', 0.3, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'NT', 0.46, 0.9, ['NT', 'DT']),
        def('DT2', 'DT', 0.58, 0.9, ['DT', 'NT', 'LE', 'RE']),
        def('RE', 'RE', 0.68, 0.9, ['RE', 'LE', 'DT']),
        ...DEF_LB_43(),
        ...DEF_SECONDARY(false),
      ],
      plays: ['Cover 3 Match', 'Cover 6', 'Sam Blitz'],
    },
  ],
};

const THREE_FOUR: SeedPlaybook = {
  id: 'pb-34',
  name: '3-4 Pressure Defense',
  team: 'PIT',
  side: 'defense',
  source: 'seed',
  formations: [
    {
      id: 'def-34-base',
      name: '3-4 Base',
      set: '3-4',
      distribution: 'Doubles',
      slots: [
        def('LE', 'LE', 0.34, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'NT', 0.5, 0.9, ['NT', 'DT']),
        def('RE', 'RE', 0.66, 0.9, ['RE', 'LE', 'DT']),
        ...DEF_LB_34(),
        ...DEF_SECONDARY(false),
      ],
      plays: ['Cover 3 Zone', 'Tampa 2', 'Fire Zone Blitz'],
    },
    {
      id: 'def-34-odd',
      name: '3-4 Odd',
      set: '3-4',
      distribution: 'Tight',
      slots: [
        def('LE', 'LE', 0.34, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'NT', 0.44, 0.9, ['NT', 'DT']),
        def('RE', 'RE', 0.62, 0.9, ['RE', 'LE', 'DT']),
        ...DEF_LB_34(),
        ...DEF_SECONDARY(false),
      ],
      plays: ['Cover 2 Man', 'Cover 3 Buzz', 'Cross Fire'],
    },
    {
      id: 'def-34-bear',
      name: '3-4 Bear',
      set: '3-4',
      distribution: 'Tight',
      slots: [
        def('LE', 'LE', 0.3, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'NT', 0.5, 0.9, ['NT', 'DT']),
        def('RE', 'RE', 0.7, 0.9, ['RE', 'LE', 'DT']),
        def('LOLB', 'LOLB', 0.2, 0.8, ['LOLB', 'ROLB', 'MLB']),
        def('MLB1', 'MLB', 0.42, 0.78, ['MLB', 'LOLB', 'ROLB']),
        def('MLB2', 'SUBLB', 0.58, 0.78, ['MLB', 'LOLB', 'ROLB', 'SS']),
        def('ROLB', 'ROLB', 0.8, 0.8, ['ROLB', 'LOLB', 'MLB']),
        ...DEF_SECONDARY(false),
      ],
      plays: ['Bear Blitz', 'Cover 1 Hole', 'Goal Line Stuff'],
    },
    {
      id: 'def-quarter-3-deep',
      name: 'Quarter 3 Deep',
      set: 'Quarter',
      distribution: 'Empty',
      slots: [
        def('LE', 'RLE', 0.34, 0.9, ['LE', 'RE', 'DT']),
        def('NT', 'RDT', 0.5, 0.9, ['DT', 'NT']),
        def('RE', 'RRE', 0.66, 0.9, ['RE', 'LE', 'DT']),
        def('LOLB', 'SUBLB', 0.38, 0.84, ['MLB', 'LOLB', 'ROLB', 'SS']),
        def('ROLB', 'SUBLB', 0.62, 0.84, ['MLB', 'ROLB', 'LOLB', 'SS']),
        ...DEF_DIME_SECONDARY(),
      ],
      plays: ['Quarters Cover 4', 'Cover 2 Trap', 'Prevent Deep'],
    },
  ],
};

export const PLAYBOOK_SEEDS: SeedPlaybook[] = [
  SHANAHAN,
  SPREAD,
  POWER,
  NICKEL_43,
  THREE_FOUR,
];

export const DEFAULT_OFFENSE_PLAYBOOK_IDS = ['pb-shanahan', 'pb-spread', 'pb-power'];
export const DEFAULT_DEFENSE_PLAYBOOK_IDS = ['pb-nickel-43', 'pb-34'];
