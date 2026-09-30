/**
 * Team schemes, as Madden 27 defines them.
 *
 * Same rule as the archetypes and the team palettes: **a one-time committed scrape,
 * never fetched at runtime**. Source: `madden.tools/schemes`, read 2026-09-30, which
 * lists every offensive and defensive scheme with the archetypes it favours and the
 * real-world teams that run it.
 *
 * `keyArchetypes` are the game's **display names** rather than unit-qualified ids,
 * because a scheme spans a whole side of the ball: `Power Rusher` means the EDGE
 * version at LEDGE and the interior version at DT, and the unit is what tells them
 * apart. `preferredArchetypeIds()` in `src/domain/schemeFit.ts` does that resolution.
 *
 * Schemes are per side. A team's offense is graded against its offensive scheme and its
 * defense against its defensive scheme; there is no cross-grading, which is why every
 * entry carries a `side`.
 */

import type { Side } from './types';

export interface Scheme {
  /** Stable id, e.g. `west-coast-zone-run`. */
  id: string;
  name: string;
  /** Which side of the ball the scheme governs. */
  side: Exclude<Side, 'special'>;
  /** One-line identity, as the source labels it (e.g. `Zone running with play-action`). */
  tagline: string;
  /** Longer description of how the scheme plays. */
  blurb: string;
  /** Archetype display names the scheme favours. */
  keyArchetypes: string[];
  /** Real clubs the source lists as running it. */
  exampleTeams: string[];
}

export const SCHEMES: Scheme[] = [
  /* ------------------------------------------------------------------ offense */
  {
    id: 'air-raid',
    name: 'Air Raid',
    side: 'offense',
    tagline: 'Pass-heavy spread offense',
    blurb:
      'A variant of spread, Air Raid gives the quarterback control of the play at the line of scrimmage. The offense spreads the field and throws to set up the run.',
    keyArchetypes: [
      'Improviser',
      'Receiving Back',
      'Blocking',
      'Slot',
      'Possession',
      'Pass Protector',
      'Power',
    ],
    exampleTeams: [],
  },
  {
    id: 'multiple-power-run',
    name: 'Multiple Power Run',
    side: 'offense',
    tagline: 'Power running game',
    blurb:
      'Uses traditional pulling linemen and lead blockers in the run game to grind through defenses, with the quarterback asked to manage third and short.',
    keyArchetypes: [
      'Field General',
      'Power Back',
      'Blocking',
      'Physical',
      'Possession',
      'Pass Protector',
      'Power',
    ],
    exampleTeams: ['Ravens', 'Eagles', 'Bears', 'Falcons', 'Giants', 'Jets', 'Lions', 'Patriots'],
  },
  {
    id: 'multiple-zone-run',
    name: 'Multiple Zone Run',
    side: 'offense',
    tagline: 'Zone running with play-action',
    blurb:
      'A balanced offense that is very difficult for the defense to predict: it can run out of multiple receiver sets and throw out of power formations.',
    keyArchetypes: [
      'Field General',
      'Elusive Back',
      'Blocking',
      'Physical',
      'Possession',
      'Agile',
    ],
    exampleTeams: ['Seahawks', 'Chargers', 'Commanders', '49ers', 'Raiders'],
  },
  {
    id: 'pistol',
    name: 'Pistol',
    side: 'offense',
    tagline: 'Pistol formations with run threat',
    blurb:
      'Lets the quarterback read over center with shotgun depth. It punishes unbalanced fronts and keeps the run threat alive on every snap.',
    keyArchetypes: ['Scrambler', 'Power Back', 'Blocking', 'Physical', 'Agile'],
    exampleTeams: [],
  },
  {
    id: 'run-and-shoot',
    name: 'Run And Shoot',
    side: 'offense',
    tagline: 'Air raid with route adjustments',
    blurb:
      'Depends on high-awareness receivers who adjust their routes to the coverage. It uses pre-snap motion and multiple receiver formations to identify coverages.',
    keyArchetypes: [
      'Field General',
      'Receiving Back',
      'Utility',
      'Slot',
      'Vertical Threat',
      'Pass Protector',
    ],
    exampleTeams: [],
  },
  {
    id: 'spread',
    name: 'Spread',
    side: 'offense',
    tagline: 'Spread formations and tempo',
    blurb:
      'Uses shotgun formations with extra receivers to spread defenses horizontally, and a running quarterback who punishes a light box.',
    keyArchetypes: [
      'Scrambler',
      'Elusive Back',
      'Utility',
      'Playmaker',
      'Vertical Threat',
      'Pass Protector',
      'Agile',
    ],
    exampleTeams: [],
  },
  {
    id: 'vertical-power-run',
    name: 'Vertical Power Run',
    side: 'offense',
    tagline: 'Vertical passing with run support',
    blurb:
      'Tempts the defense to load the box by committing to the run, then attacks the single-high safety it leaves behind.',
    keyArchetypes: [
      'Strong Arm',
      'Power Back',
      'Blocking',
      'Deep Threat',
      'Vertical Threat',
      'Pass Protector',
      'Power',
    ],
    exampleTeams: ['Browns'],
  },
  {
    id: 'vertical-zone-run',
    name: 'Vertical Zone Run',
    side: 'offense',
    tagline: 'Vertical passing with run support',
    blurb:
      'Uses agile linemen to create multiple holes for the halfback to choose from, and forces the defense to defend the whole width of the field.',
    keyArchetypes: [
      'Strong Arm',
      'Elusive Back',
      'Blocking',
      'Deep Threat',
      'Vertical Threat',
      'Pass Protector',
      'Agile',
    ],
    exampleTeams: [],
  },
  {
    id: 'west-coast-power-run',
    name: 'West Coast Power Run',
    side: 'offense',
    tagline: 'Power running game',
    blurb:
      'Creates weakness in the defense by stretching it out horizontally with short passing, then runs behind pulling linemen off those looks.',
    keyArchetypes: ['Improviser', 'Power Back', 'Utility', 'Playmaker', 'Possession', 'Power'],
    exampleTeams: ['Steelers', 'Titans', 'Bengals', 'Broncos', 'Colts', 'Cowboys', 'Dolphins'],
  },
  {
    id: 'west-coast-spread',
    name: 'West Coast Spread',
    side: 'offense',
    tagline: 'Spread formations and tempo',
    blurb:
      'Keeps the defense guessing with short passing horizontally across the field. With the defense spread thin, the quarterback looks to scramble while reading his routes.',
    keyArchetypes: [
      'Field General',
      'Elusive Back',
      'Utility',
      'Playmaker',
      'Vertical Threat',
      'Agile',
      'Pass Protector',
    ],
    exampleTeams: [],
  },
  {
    id: 'west-coast-zone-run',
    name: 'West Coast Zone Run',
    side: 'offense',
    tagline: 'Zone running with play-action',
    blurb:
      'Designed to utilize short passing to keep possession of the ball, with the zone run game and play-action off it as the base.',
    keyArchetypes: ['Field General', 'Elusive Back', 'Utility', 'Playmaker', 'Possession', 'Agile'],
    exampleTeams: [
      'Saints',
      'Texans',
      'Vikings',
      'Bills',
      'Buccaneers',
      'Cardinals',
      'Chiefs',
      'Jaguars',
      'Packers',
      'Panthers',
      'Rams',
    ],
  },

  /* ------------------------------------------------------------------ defense */
  {
    id: 'base-4-3',
    name: 'Base 4-3',
    side: 'defense',
    tagline: 'Four linemen, three linebackers with balanced pressure',
    blurb:
      'Four defensive linemen and three linebackers, ideal for generating a consistent pass rush without committing extra defenders.',
    keyArchetypes: [
      'Power Rusher',
      'Speed Rusher',
      'Run Stopper',
      'Field General',
      'Pass Coverage',
      'Man',
      'Zone',
      'Run Support',
    ],
    exampleTeams: [
      'Texans',
      'Titans',
      'Bears',
      'Bengals',
      'Browns',
      'Chiefs',
      'Commanders',
      'Cowboys',
      'Falcons',
      '49ers',
      'Giants',
      'Jaguars',
      'Jets',
      'Lions',
      'Raiders',
    ],
  },
  {
    id: 'base-3-4',
    name: 'Base 3-4',
    side: 'defense',
    tagline: 'Three linemen, four linebackers with versatile blitzing',
    blurb:
      'Uses bigger defensive linemen to eat up blockers so four linebackers can attack from multiple angles.',
    keyArchetypes: [
      'Power Rusher',
      'Run Stopper',
      'Field General',
      'Pass Coverage',
      'Man',
      'Zone',
      'Run Support',
    ],
    exampleTeams: [
      'Ravens',
      'Saints',
      'Seahawks',
      'Steelers',
      'Vikings',
      'Broncos',
      'Buccaneers',
      'Chargers',
      'Eagles',
      'Patriots',
      'Rams',
    ],
  },
  {
    id: '3-4-storm',
    name: '3-4 Storm',
    side: 'defense',
    tagline: '3-4 · Speed rush with coverage support',
    blurb:
      'Speed up front and coverage in the middle, geared towards applying pressure to the quarterback without blitzing.',
    keyArchetypes: ['Speed Rusher', 'Run Stopper', 'Pass Coverage', 'Zone', 'Run Support'],
    exampleTeams: [],
  },
  {
    id: '3-4-under',
    name: '3-4 Under',
    side: 'defense',
    tagline: '3-4 · Flexible 3-4 with linebacker versatility',
    blurb:
      'Adds flexibility with linebackers who can line up on the defensive line. Using bigger bodies up front lets the second level run free.',
    keyArchetypes: [
      'Run Stopper',
      'Power Rusher',
      'Field General',
      'Pass Coverage',
      'Man',
      'Hybrid',
      'Run Support',
    ],
    exampleTeams: [],
  },
  {
    id: 'disguise-3-4',
    name: 'Disguise 3-4',
    side: 'defense',
    tagline: '3-4 · Unpredictable fronts with disguise concepts',
    blurb:
      'As offensive production is at an all-time high, defenses need to be unpredictable to succeed. This defense draws pressure from everywhere and shows nothing before the snap.',
    keyArchetypes: ['Power Rusher', 'Run Stopper', 'Pass Coverage', 'Man', 'Hybrid'],
    exampleTeams: [],
  },
  {
    id: '4-3-cover-3',
    name: '4-3 Cover 3',
    side: 'defense',
    tagline: '4-3 · Cover 3 zone with aggressive safeties',
    blurb:
      'Focuses on forcing methodical offensive drives: pass rushing up front, coverage in the middle, and aggressive safeties on the back end.',
    keyArchetypes: ['Speed Rusher', 'Power Rusher', 'Pass Coverage', 'Run Stopper', 'Zone', 'Hybrid'],
    exampleTeams: [],
  },
  {
    id: '4-3-quarters',
    name: '4-3 Quarters',
    side: 'defense',
    tagline: '4-3 · Cover 4 with split-field capabilities',
    blurb:
      'Quarters, also known as Cover 4, puts four defenders deep but allows opportunities to split the field and rotate late.',
    keyArchetypes: ['Run Stopper', 'Speed Rusher', 'Power Rusher', 'Pass Coverage', 'Zone', 'Hybrid'],
    exampleTeams: [],
  },
  {
    id: '4-3-under',
    name: '4-3 Under',
    side: 'defense',
    tagline: '4-3 · Flexible 4-3 front with hybrid capabilities',
    blurb:
      'Allows for more flexibility than the base 4-3, as it can change to a 3-4 or 5-2 look without substituting.',
    keyArchetypes: ['Speed Rusher', 'Power Rusher', 'Run Stopper', 'Field General', 'Man', 'Zone'],
    exampleTeams: [],
  },
  {
    id: '46-defense',
    name: '46 Defense',
    side: 'defense',
    tagline: '46 · Loaded box with aggressive blitzing',
    blurb:
      'Features eight players in the box and a weak-side defensive line shift, designed to confuse blocking assignments and stop the run on the way to the quarterback.',
    keyArchetypes: ['Run Stopper', 'Power Rusher', 'Man', 'Run Support', 'Hybrid'],
    exampleTeams: [],
  },
  {
    id: 'tampa-2',
    name: 'Tampa 2',
    side: 'defense',
    tagline: '2 · Zone coverage with deep-dropping MLB',
    blurb:
      'Similar to the base 4-3: the line is expected to pressure the quarterback without help, and the middle linebacker drops to the deep middle.',
    keyArchetypes: ['Power Rusher', 'Speed Rusher', 'Pass Coverage', 'Zone'],
    exampleTeams: [],
  },
];

export const SCHEME_BY_ID = new Map(SCHEMES.map((scheme) => [scheme.id, scheme]));

export function schemesForSide(side: Exclude<Side, 'special'>): Scheme[] {
  return SCHEMES.filter((scheme) => scheme.side === side);
}

/**
 * Our seeded playbooks, read as the Madden scheme each one is.
 *
 * **This is our reading, not a fact from the game.** The seed ships playbook-shaped
 * formations (`Shanahan`, `Spread`, `Power`, `Nickel 4-3`, `3-4`), and the closest Madden
 * scheme is what lets the fit engine say anything at all. A user-edited playbook can be
 * re-mapped in the app; `null` means "no scheme, do not grade".
 */
export const PLAYBOOK_SCHEME: Record<string, string | null> = {
  'pb-shanahan': 'west-coast-zone-run',
  'pb-spread': 'spread',
  'pb-power': 'multiple-power-run',
  'pb-nickel-43': 'base-4-3',
  'pb-34': 'base-3-4',
  'pb-special-teams': null,
};

/** Which side of the ball a seeded playbook governs. */
export const PLAYBOOK_SIDE: Record<string, Exclude<Side, 'special'>> = {
  'pb-shanahan': 'offense',
  'pb-spread': 'offense',
  'pb-power': 'offense',
  'pb-nickel-43': 'defense',
  'pb-34': 'defense',
};
