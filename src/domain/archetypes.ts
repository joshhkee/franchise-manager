/**
 * Player archetypes, as Madden 27 defines them.
 *
 * **One-time committed scrape, never fetched at runtime** — the same rule as the team
 * colour palettes. Source: `madden.tools/archetypes/players`, read on 2026-09-30, which
 * publishes a page per (side, position, archetype) with the archetype's most relevant
 * attributes. The site's own descriptions and attribute lists are reproduced here so
 * grading is grounded in the game's model rather than our guesswork.
 *
 * Two deliberate departures from the source, both recorded in [`SCHEME_FIT.md`](SCHEME_FIT.md):
 *
 * 1. **Archetypes are keyed by unit, not by position.** LEDGE and REDGE have identical
 *    archetypes, as do SAM/WILL, the five line positions, and FS/SS. Storing one entry
 *    per unit (with the positions that use it) keeps a rename a one-line edit — the same
 *    reason the slot vocabulary lives in one file.
 * 2. **`Play Action` is dropped from the CB `Man` attribute list.** The source lists it,
 *    almost certainly copied from the QB `Field General` entry; grading a corner on play
 *    action would be nonsense. Every other list is verbatim.
 *
 * Attribute names are EA's display names. `ratingKey()` turns one into the key we store
 * on a player (`throwAccuracyMid` -> `throwAccuracyMid_rating`), which is the shape the
 * EA ratings import already writes.
 */

/** Every attribute the EA ratings feed publishes, minus the identity fields. */
export type EaAttributeKey =
  | 'acceleration'
  | 'agility'
  | 'awareness'
  | 'bCVision'
  | 'blockShedding'
  | 'breakSack'
  | 'breakTackle'
  | 'carrying'
  | 'catchInTraffic'
  | 'catching'
  | 'changeOfDirection'
  | 'deepRouteRunning'
  | 'finesseMoves'
  | 'hitPower'
  | 'impactBlocking'
  | 'injury'
  | 'jukeMove'
  | 'jumping'
  | 'kickAccuracy'
  | 'kickPower'
  | 'kickReturn'
  | 'leadBlock'
  | 'manCoverage'
  | 'mediumRouteRunning'
  | 'passBlock'
  | 'passBlockFinesse'
  | 'passBlockPower'
  | 'playAction'
  | 'playRecognition'
  | 'powerMoves'
  | 'press'
  | 'pursuit'
  | 'release'
  | 'runBlock'
  | 'runBlockFinesse'
  | 'runBlockPower'
  | 'shortRouteRunning'
  | 'spectacularCatch'
  | 'speed'
  | 'spinMove'
  | 'stamina'
  | 'stiffArm'
  | 'strength'
  | 'tackle'
  | 'throwAccuracyDeep'
  | 'throwAccuracyMid'
  | 'throwAccuracyShort'
  | 'throwOnTheRun'
  | 'throwPower'
  | 'throwUnderPressure'
  | 'toughness'
  | 'trucking'
  | 'zoneCoverage';

/** Human labels, for the screens. */
export const ATTRIBUTE_LABELS: Record<EaAttributeKey, string> = {
  acceleration: 'Acceleration',
  agility: 'Agility',
  awareness: 'Awareness',
  bCVision: 'Ball Carrier Vision',
  blockShedding: 'Block Shedding',
  breakSack: 'Break Sack',
  breakTackle: 'Break Tackle',
  carrying: 'Carrying',
  catchInTraffic: 'Catch in Traffic',
  catching: 'Catching',
  changeOfDirection: 'Change of Direction',
  deepRouteRunning: 'Deep Route Running',
  finesseMoves: 'Finesse Moves',
  hitPower: 'Hit Power',
  impactBlocking: 'Impact Blocking',
  injury: 'Injury',
  jukeMove: 'Juke Move',
  jumping: 'Jumping',
  kickAccuracy: 'Kick Accuracy',
  kickPower: 'Kick Power',
  kickReturn: 'Kick Return',
  leadBlock: 'Lead Blocking',
  manCoverage: 'Man Coverage',
  mediumRouteRunning: 'Medium Route Running',
  passBlock: 'Pass Blocking',
  passBlockFinesse: 'Pass Block Finesse',
  passBlockPower: 'Pass Block Power',
  playAction: 'Play Action',
  playRecognition: 'Play Recognition',
  powerMoves: 'Power Moves',
  press: 'Press',
  pursuit: 'Pursuit',
  release: 'Release',
  runBlock: 'Run Blocking',
  runBlockFinesse: 'Run Block Finesse',
  runBlockPower: 'Run Block Power',
  shortRouteRunning: 'Short Route Running',
  spectacularCatch: 'Spectacular Catch',
  speed: 'Speed',
  spinMove: 'Spin Move',
  stamina: 'Stamina',
  stiffArm: 'Stiff Arm',
  strength: 'Strength',
  tackle: 'Tackle',
  throwAccuracyDeep: 'Throw Accuracy Deep',
  throwAccuracyMid: 'Throw Accuracy Medium',
  throwAccuracyShort: 'Throw Accuracy Short',
  throwOnTheRun: 'Throw on the Run',
  throwPower: 'Throw Power',
  throwUnderPressure: 'Throw Under Pressure',
  toughness: 'Toughness',
  trucking: 'Trucking',
  zoneCoverage: 'Zone Coverage',
};

/**
 * The unit an archetype belongs to.
 *
 * Deliberately coarser than a position: the game reuses one archetype set across a
 * whole unit, so LEDGE and REDGE are both `EDGE`, and LT/LG/C/RG/RT are all `OL`.
 */
export type ArchetypeUnit =
  | 'QB'
  | 'HB'
  | 'FB'
  | 'WR'
  | 'TE'
  | 'OL'
  | 'EDGE'
  | 'DT'
  | 'LB'
  | 'MIKE'
  | 'CB'
  | 'S';

export interface Archetype {
  /** Stable id: unit + slug, e.g. `edge-power-rusher`. */
  id: string;
  unit: ArchetypeUnit;
  /** The game's name for it, e.g. `Power Rusher`. */
  name: string;
  /** Primary positions whose players can hold this archetype. */
  positions: string[];
  description: string;
  /** The attributes Madden counts for this archetype, in the source's priority order. */
  attributes: EaAttributeKey[];
}

const OL_POSITIONS = ['LT', 'LG', 'C', 'RG', 'RT'];

/**
 * The 36 archetypes, keyed by unit. Counted from the source's 56 (position, archetype)
 * pages, which collapse because units share a set.
 */
export const ARCHETYPES: Archetype[] = [
  // --- Quarterback ---------------------------------------------------------
  {
    id: 'qb-strong-arm',
    unit: 'QB',
    name: 'Strong Arm',
    positions: ['QB'],
    description:
      'Makes big plays downfield using exceptional arm talent, forcing defenses to play safe or pay the price.',
    attributes: [
      'throwPower',
      'throwAccuracyDeep',
      'throwAccuracyMid',
      'throwUnderPressure',
      'playAction',
      'throwOnTheRun',
    ],
  },
  {
    id: 'qb-improviser',
    unit: 'QB',
    name: 'Improviser',
    positions: ['QB'],
    description: 'Maximizes big play opportunities when the designed play breaks down.',
    attributes: [
      'throwOnTheRun',
      'throwUnderPressure',
      'throwAccuracyDeep',
      'throwAccuracyShort',
      'throwAccuracyMid',
      'breakSack',
    ],
  },
  {
    id: 'qb-scrambler',
    unit: 'QB',
    name: 'Scrambler',
    positions: ['QB'],
    description:
      'Evades pressure in the pocket and makes throws on the run, bringing an extra dimension to the offense.',
    attributes: [
      'breakSack',
      'throwOnTheRun',
      'throwAccuracyShort',
      'throwAccuracyMid',
      'throwUnderPressure',
      'awareness',
    ],
  },
  {
    id: 'qb-field-general',
    unit: 'QB',
    name: 'Field General',
    positions: ['QB'],
    description:
      'Manages the offense and reads defenses to put the ball in the hands of playmakers.',
    attributes: [
      'throwAccuracyMid',
      'throwAccuracyShort',
      'throwAccuracyDeep',
      'throwUnderPressure',
      'playAction',
      'awareness',
    ],
  },

  // --- Running back --------------------------------------------------------
  {
    id: 'hb-power-back',
    unit: 'HB',
    name: 'Power Back',
    positions: ['HB'],
    description:
      'Runs through people using strength to pick up extra yards and wear down defenses.',
    attributes: ['stiffArm', 'trucking', 'breakTackle', 'carrying', 'awareness', 'bCVision'],
  },
  {
    id: 'hb-elusive-back',
    unit: 'HB',
    name: 'Elusive Back',
    positions: ['HB'],
    description: 'Jukes and spins around defenders before taking off in the blink of an eye.',
    attributes: [
      'spinMove',
      'jukeMove',
      'bCVision',
      'awareness',
      'changeOfDirection',
      'carrying',
    ],
  },
  {
    id: 'hb-receiving-back',
    unit: 'HB',
    name: 'Receiving Back',
    positions: ['HB'],
    description:
      'Creates another threat in the passing game and causes mismatches against defenders who are not ready to play coverage.',
    attributes: ['catching', 'release', 'shortRouteRunning', 'jukeMove', 'spinMove', 'awareness'],
  },

  // --- Fullback ------------------------------------------------------------
  {
    id: 'fb-blocking',
    unit: 'FB',
    name: 'Blocking',
    positions: ['FB'],
    description:
      'Leads the charge as the unsung hero of the rushing attack, taking on blocks to clear a path for the halfback.',
    attributes: [
      'impactBlocking',
      'leadBlock',
      'runBlock',
      'shortRouteRunning',
      'breakTackle',
      'awareness',
    ],
  },
  {
    id: 'fb-utility',
    unit: 'FB',
    name: 'Utility',
    positions: ['FB'],
    description:
      'Found open in the flats after a block and release, or diving up the middle of the line whenever a defense least expects it.',
    attributes: [
      'catching',
      'carrying',
      'shortRouteRunning',
      'impactBlocking',
      'awareness',
      'mediumRouteRunning',
    ],
  },

  // --- Wide receiver -------------------------------------------------------
  {
    id: 'wr-playmaker',
    unit: 'WR',
    name: 'Playmaker',
    positions: ['WR'],
    description: 'Can turn any reception into a big play. Excels after the catch.',
    attributes: [
      'bCVision',
      'jukeMove',
      'breakTackle',
      'release',
      'spectacularCatch',
      'catching',
    ],
  },
  {
    id: 'wr-deep-threat',
    unit: 'WR',
    name: 'Deep Threat',
    positions: ['WR'],
    description:
      'Creates big play opportunities and stretches defenses, opening up the field for the rest of the team.',
    attributes: [
      'deepRouteRunning',
      'release',
      'spectacularCatch',
      'catching',
      'mediumRouteRunning',
      'awareness',
    ],
  },
  {
    id: 'wr-slot',
    unit: 'WR',
    name: 'Slot',
    positions: ['WR'],
    description: 'Runs precise routes and finds weak spots in the middle of the field.',
    attributes: [
      'shortRouteRunning',
      'catchInTraffic',
      'catching',
      'mediumRouteRunning',
      'awareness',
      'release',
    ],
  },
  {
    id: 'wr-physical',
    unit: 'WR',
    name: 'Physical',
    positions: ['WR'],
    description: 'Thrives in traffic and consistently beats defenders at the catch point.',
    attributes: [
      'catchInTraffic',
      'spectacularCatch',
      'release',
      'shortRouteRunning',
      'catching',
      'breakTackle',
    ],
  },

  // --- Tight end -----------------------------------------------------------
  {
    id: 'te-blocking',
    unit: 'TE',
    name: 'Blocking',
    positions: ['TE'],
    description:
      'Overpowers undersized linebackers to open up the edge, freeing up halfbacks for big yards.',
    attributes: [
      'runBlock',
      'impactBlocking',
      'leadBlock',
      'runBlockFinesse',
      'runBlockPower',
      'catching',
    ],
  },
  {
    id: 'te-possession',
    unit: 'TE',
    name: 'Possession',
    positions: ['TE'],
    description:
      'Always looks to find extra yards after catching the ball, even if the path means going through a defender.',
    attributes: [
      'catchInTraffic',
      'shortRouteRunning',
      'release',
      'mediumRouteRunning',
      'spectacularCatch',
      'breakTackle',
    ],
  },
  {
    id: 'te-vertical-threat',
    unit: 'TE',
    name: 'Vertical Threat',
    positions: ['TE'],
    description:
      'Makes matchups a nightmare for defenses by being too big for defensive backs and too fast for linebackers to cover.',
    attributes: [
      'deepRouteRunning',
      'mediumRouteRunning',
      'release',
      'catching',
      'catchInTraffic',
      'shortRouteRunning',
    ],
  },

  // --- Offensive line (all five share one archetype set) -------------------
  {
    id: 'ol-pass-protector',
    unit: 'OL',
    name: 'Pass Protector',
    positions: OL_POSITIONS,
    description:
      'Specializes in keeping the quarterback upright. Can handle any move a pass rusher throws at them but has trouble run blocking.',
    attributes: [
      'passBlock',
      'passBlockFinesse',
      'passBlockPower',
      'awareness',
      'impactBlocking',
      'strength',
    ],
  },
  {
    id: 'ol-power',
    unit: 'OL',
    name: 'Power',
    positions: OL_POSITIONS,
    description:
      'Overpowering in gap-blocked plays like Power O in the run game, and takes on power rush moves with ease.',
    attributes: [
      'runBlockPower',
      'passBlockPower',
      'runBlock',
      'passBlock',
      'leadBlock',
      'impactBlocking',
    ],
  },
  {
    id: 'ol-agile',
    unit: 'OL',
    name: 'Agile',
    positions: OL_POSITIONS,
    description:
      'Uses good footwork to excel in zone blocking run plays and to handle quick finesse moves.',
    attributes: [
      'runBlockFinesse',
      'passBlockFinesse',
      'impactBlocking',
      'passBlock',
      'awareness',
      'leadBlock',
    ],
  },

  // --- Edge (LEDGE and REDGE) ---------------------------------------------
  {
    id: 'edge-power-rusher',
    unit: 'EDGE',
    name: 'Power Rusher',
    positions: ['LEDG', 'REDG'],
    description:
      'Knocks linemen off balance with strength to blast through blockers on their way to the quarterback.',
    attributes: ['powerMoves', 'tackle', 'pursuit', 'playRecognition', 'awareness', 'hitPower'],
  },
  {
    id: 'edge-speed-rusher',
    unit: 'EDGE',
    name: 'Speed Rusher',
    positions: ['LEDG', 'REDG'],
    description: 'Uses quickness and fancy moves to dart around slow offensive linemen.',
    attributes: ['finesseMoves', 'tackle', 'pursuit', 'awareness', 'playRecognition', 'hitPower'],
  },
  {
    id: 'edge-run-stopper',
    unit: 'EDGE',
    name: 'Run Stopper',
    positions: ['LEDG', 'REDG'],
    description: 'Plays to penetrate their gap assignment to stuff runs before they get started.',
    attributes: [
      'blockShedding',
      'tackle',
      'playRecognition',
      'pursuit',
      'hitPower',
      'powerMoves',
    ],
  },

  // --- Defensive tackle (incl. the NT package role) -----------------------
  {
    id: 'dt-power-rusher',
    unit: 'DT',
    name: 'Power Rusher',
    positions: ['DT'],
    description:
      'Knocks linemen off balance with strength to blast through blockers on their way to the quarterback.',
    attributes: ['powerMoves', 'tackle', 'pursuit', 'playRecognition', 'awareness', 'hitPower'],
  },
  {
    id: 'dt-speed-rusher',
    unit: 'DT',
    name: 'Speed Rusher',
    positions: ['DT'],
    description: 'Uses quickness and fancy moves to dart around slow offensive linemen.',
    attributes: ['finesseMoves', 'tackle', 'pursuit', 'awareness', 'playRecognition', 'hitPower'],
  },
  {
    id: 'dt-nose-tackle',
    unit: 'DT',
    name: 'Nose Tackle',
    positions: ['DT'],
    description: 'Plays to penetrate their gap assignment to stuff runs before they get started.',
    attributes: [
      'blockShedding',
      'tackle',
      'playRecognition',
      'pursuit',
      'hitPower',
      'powerMoves',
    ],
  },

  // --- Off-ball linebacker (SAM and WILL) ----------------------------------
  {
    id: 'lb-pass-coverage',
    unit: 'LB',
    name: 'Pass Coverage',
    positions: ['SAM', 'WILL'],
    description:
      'Lurks around the field, disrupting passing lanes and forcing quarterbacks to make difficult throws.',
    attributes: [
      'zoneCoverage',
      'manCoverage',
      'tackle',
      'playRecognition',
      'pursuit',
      'awareness',
    ],
  },
  {
    id: 'lb-run-stopper',
    unit: 'LB',
    name: 'Run Stopper',
    positions: ['SAM', 'WILL'],
    description:
      'Finds their gap and meets running backs at the point of attack for easy stops.',
    attributes: ['hitPower', 'pursuit', 'tackle', 'blockShedding', 'playRecognition', 'awareness'],
  },

  // --- MIKE has one archetype the other linebackers do not -----------------
  {
    id: 'mike-pass-coverage',
    unit: 'MIKE',
    name: 'Pass Coverage',
    positions: ['MIKE'],
    description:
      'Lurks around the field, disrupting passing lanes and forcing quarterbacks to make difficult throws.',
    attributes: [
      'zoneCoverage',
      'manCoverage',
      'tackle',
      'playRecognition',
      'pursuit',
      'awareness',
    ],
  },
  {
    id: 'mike-run-stopper',
    unit: 'MIKE',
    name: 'Run Stopper',
    positions: ['MIKE'],
    description:
      'Finds their gap and meets running backs at the point of attack for easy stops.',
    attributes: ['hitPower', 'pursuit', 'tackle', 'blockShedding', 'playRecognition', 'awareness'],
  },
  {
    id: 'mike-field-general',
    unit: 'MIKE',
    name: 'Field General',
    positions: ['MIKE'],
    description: 'Excels at reading plays and is always in the best position to secure a tackle.',
    attributes: ['playRecognition', 'pursuit', 'tackle', 'hitPower', 'powerMoves'],
  },

  // --- Cornerback ----------------------------------------------------------
  {
    id: 'cb-man',
    unit: 'CB',
    name: 'Man',
    positions: ['CB'],
    description:
      'Operates alone to take away an offense’s best weapons. Best in man coverage assignments.',
    // `Play Action` is dropped here — the source lists it, but it is a QB attribute and
    // would misgrade every corner. See the file header.
    attributes: ['manCoverage', 'press', 'jumping', 'awareness', 'tackle'],
  },
  {
    id: 'cb-zone',
    unit: 'CB',
    name: 'Zone',
    positions: ['CB'],
    description:
      'Masters of disciplined assignment football, reading the quarterback’s eyes to get into position to make a play.',
    attributes: [
      'zoneCoverage',
      'press',
      'playRecognition',
      'tackle',
      'awareness',
      'manCoverage',
    ],
  },
  {
    id: 'cb-slot',
    unit: 'CB',
    name: 'Slot',
    positions: ['CB'],
    description:
      'Jack-of-all-trades, responsible for shedding blocks to help in run defense as well as covering some of the offense’s best route runners.',
    attributes: [
      'manCoverage',
      'playRecognition',
      'tackle',
      'zoneCoverage',
      'pursuit',
      'awareness',
    ],
  },

  // --- Safety (FS and SS) --------------------------------------------------
  {
    id: 's-zone',
    unit: 'S',
    name: 'Zone',
    positions: ['FS', 'SS'],
    description:
      'The backstop of the defense. Takes away big plays downfield and keeps the offense in front of them.',
    attributes: [
      'zoneCoverage',
      'playRecognition',
      'pursuit',
      'awareness',
      'tackle',
      'catching',
    ],
  },
  {
    id: 's-run-support',
    unit: 'S',
    name: 'Run Support',
    positions: ['FS', 'SS'],
    description: 'Plays down in the box to punish even the strongest rushing attacks.',
    attributes: ['playRecognition', 'hitPower', 'tackle', 'pursuit', 'blockShedding'],
  },
  {
    id: 's-hybrid',
    unit: 'S',
    name: 'Hybrid',
    positions: ['FS', 'SS'],
    description:
      'Effective in coverage and in blitzing situations. Takes advantage of mistakes when the quarterback makes bad throws under pressure.',
    attributes: ['manCoverage', 'press', 'playRecognition', 'zoneCoverage', 'tackle', 'pursuit'],
  },
];

export const ARCHETYPE_BY_ID = new Map(ARCHETYPES.map((entry) => [entry.id, entry]));

/** Every archetype a given primary position can hold. */
export function archetypesForPosition(position: string): Archetype[] {
  return ARCHETYPES.filter((entry) => entry.positions.includes(position));
}

export function archetypesForUnit(unit: ArchetypeUnit): Archetype[] {
  return ARCHETYPES.filter((entry) => entry.unit === unit);
}

/** `throwAccuracyMid` -> `throwAccuracyMid_rating`, the key the ratings import writes. */
export function ratingKey(attribute: EaAttributeKey): string {
  return `${attribute}_rating`;
}

/** Read an attribute off a player's stored ratings, tolerating a missing `_rating` suffix. */
export function readAttribute(
  ratings: Record<string, number | string> | null | undefined,
  attribute: EaAttributeKey,
): number | null {
  if (!ratings) return null;
  const raw = ratings[ratingKey(attribute)] ?? ratings[attribute];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return null;
}

/**
 * The archetype codes the EA ratings feed reports, mapped onto our unit-level ids.
 *
 * The feed still speaks the pre-Madden-26 language: `DE_*` and `OLB_*` predate Edge, so
 * a `DE_PowerRusher` has to land on `edge-power-rusher` even though the position is now
 * LEDG or REDG, which we cannot tell apart from the code alone. `OLB_RunStopper` is the
 * genuinely ambiguous one — a 3-4 outside linebacker who set the edge became an EDGE in
 * Madden 26, but SAM/WILL kept a run-stopper archetype too, so it maps to the linebacker
 * version. Both cases are noted in [`SCHEME_FIT.md`](SCHEME_FIT.md).
 */
export const EA_ARCHETYPE_TO_ID: Record<string, string> = {
  // Offense
  QB_StrongArm: 'qb-strong-arm',
  QB_Improviser: 'qb-improviser',
  QB_Scrambler: 'qb-scrambler',
  QB_FieldGeneral: 'qb-field-general',
  HB_PowerBack: 'hb-power-back',
  HB_ElusiveBack: 'hb-elusive-back',
  HB_ReceivingBack: 'hb-receiving-back',
  FB_Blocking: 'fb-blocking',
  FB_Utility: 'fb-utility',
  WR_Playmaker: 'wr-playmaker',
  WR_DeepThreat: 'wr-deep-threat',
  WR_Slot: 'wr-slot',
  WR_Physical: 'wr-physical',
  TE_Blocking: 'te-blocking',
  TE_Possession: 'te-possession',
  TE_VerticalThreat: 'te-vertical-threat',
  OT_PassProtector: 'ol-pass-protector',
  OG_PassProtector: 'ol-pass-protector',
  C_PassProtector: 'ol-pass-protector',
  OT_Power: 'ol-power',
  OG_Power: 'ol-power',
  C_Power: 'ol-power',
  OT_Agile: 'ol-agile',
  OG_Agile: 'ol-agile',
  C_Agile: 'ol-agile',
  // Defense
  DE_PowerRusher: 'edge-power-rusher',
  DE_SmallerSpeedRusher: 'edge-speed-rusher',
  DE_RunStopper: 'edge-run-stopper',
  OLB_PowerRusher: 'edge-power-rusher',
  OLB_SpeedRusher: 'edge-speed-rusher',
  OLB_RunStopper: 'lb-run-stopper',
  OLB_PassCoverage: 'lb-pass-coverage',
  MLB_FieldGeneral: 'mike-field-general',
  MLB_PassCoverage: 'mike-pass-coverage',
  MLB_RunStopper: 'mike-run-stopper',
  DT_PowerRusher: 'dt-power-rusher',
  DT_SpeedRusher: 'dt-speed-rusher',
  DT_RunStopper: 'dt-nose-tackle',
  CB_MantoMan: 'cb-man',
  CB_Zone: 'cb-zone',
  CB_Slot: 'cb-slot',
  S_Zone: 's-zone',
  S_RunSupport: 's-run-support',
  S_Hybrid: 's-hybrid',
};

/**
 * Resolve a stored archetype to one of ours. Accepts the EA code (`QB_FieldGeneral`),
 * our own id (`qb-field-general`) or a bare display name (`Field General`), because
 * which of those a row carries depends on where it came from.
 */
export function resolveArchetypeId(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const value = raw.trim();
  if (ARCHETYPE_BY_ID.has(value)) return value;
  const mapped = EA_ARCHETYPE_TO_ID[value];
  if (mapped) return mapped;
  const byName = ARCHETYPES.find(
    (entry) => entry.name.toLowerCase() === value.toLowerCase(),
  );
  return byName?.id ?? null;
}
