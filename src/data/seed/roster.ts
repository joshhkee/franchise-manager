/**
 * Demo roster.
 *
 * The app has to be usable the moment it starts, before you own the game or have
 * run a ratings import, so the seed ships a complete fictional franchise. Every
 * row is marked `source: 'seed'` and the UI labels it as demo data — running
 * `npm run import:ratings` brings in real Madden 27 players on top.
 *
 * The active roster is 53 men, the real NFL limit, with enough depth per position
 * group that the seeded depth chart can start a different player at every role.
 * The practice-squad rows are deliberate: they are legal roster members that the
 * depth chart must ignore, which is exactly how the game treats them.
 */

export interface SeedPlayer {
  id: string;
  first: string;
  last: string;
  position: string;
  overall: number;
  age: number;
  jersey: number;
  dev?: 'normal' | 'star' | 'superstar' | 'xfactor';
  capHit?: number;
  contractYears?: number;
  injury?: 'healthy' | 'questionable' | 'out' | 'ir';
  rosterStatus?: 'active' | 'practice-squad' | 'ir' | 'free-agent';
  speed?: number;
}

export interface SeedTeam {
  id: string;
  name: string;
  abbr: string;
  conference: string;
  division: string;
  isUserTeam?: boolean;
}

export const DEMO_TEAM: SeedTeam = {
  id: 'DEM',
  name: 'Demo Franchise',
  abbr: 'DEM',
  conference: 'NFC',
  division: 'North',
  isUserTeam: true,
};

export const CPU_TEAMS: SeedTeam[] = [
  { id: 'MET', name: 'Metro Kings', abbr: 'MET', conference: 'NFC', division: 'East' },
  { id: 'HAR', name: 'Harbor Sharks', abbr: 'HAR', conference: 'AFC', division: 'East' },
  { id: 'PRA', name: 'Prairie Wolves', abbr: 'PRA', conference: 'AFC', division: 'West' },
];

const r = (
  id: string,
  first: string,
  last: string,
  position: string,
  overall: number,
  age: number,
  jersey: number,
  extra: Partial<SeedPlayer> = {},
): SeedPlayer => ({ id, first, last, position, overall, age, jersey, ...extra });

/**
 * 53 active players, plus two on the practice squad.
 *
 * Position counts are chosen so every depth chart group can be filled honestly:
 * nine linemen (four tackles, so the swing tackle covers both edges), eight
 * defensive linemen, six linebackers and five safeties. That is what lets the
 * depth chart start a different man at every role while still carrying backups
 * at two spots each, the way a real roster does.
 */
export const DEMO_ROSTER: SeedPlayer[] = [
  // Quarterbacks
  r('qb1', 'Dane', 'Mercer', 'QB', 87, 27, 17, { dev: 'star', capHit: 20_000_000, contractYears: 4, speed: 78 }),
  r('qb2', 'Rookie', 'Hall', 'QB', 74, 22, 4, { capHit: 1_800_000, contractYears: 4, speed: 82 }),
  r('qb3', 'Ames', 'Devlin', 'QB', 67, 24, 8, { capHit: 1_100_000, contractYears: 2, speed: 79 }),

  // Running backs
  r('hb1', 'Trey', 'Vance', 'HB', 90, 25, 22, { dev: 'superstar', capHit: 11_000_000, contractYears: 2, speed: 93 }),
  r('hb2', 'Marco', 'Reyes', 'HB', 79, 24, 28, { capHit: 2_400_000, contractYears: 2, speed: 89 }),
  r('hb3', 'Deuce', 'Okafor', 'HB', 77, 23, 30, { capHit: 1_100_000, contractYears: 3, speed: 91 }),
  r('hb4', 'Nat', 'Bracken', 'HB', 71, 26, 32, { capHit: 1_000_000, contractYears: 2, speed: 88 }),
  r('fb1', 'Bud', 'Kramer', 'FB', 72, 29, 44, { capHit: 2_000_000, contractYears: 1, speed: 74 }),

  // Receivers
  r('wr1', 'Ash', 'Bellamy', 'WR', 93, 26, 11, { dev: 'xfactor', capHit: 21_000_000, contractYears: 3, speed: 96 }),
  r('wr2', 'Kai', 'Sanders', 'WR', 85, 28, 15, { capHit: 9_500_000, contractYears: 2, speed: 91 }),
  r('wr3', 'Nico', 'Barros', 'WR', 82, 24, 5, { dev: 'star', capHit: 3_200_000, contractYears: 3, speed: 94 }),
  r('wr4', 'Bishop', 'Dawson', 'WR', 78, 30, 88, { capHit: 4_000_000, contractYears: 1, speed: 84 }),
  r('wr5', 'Zay', 'Petit', 'WR', 71, 23, 19, { capHit: 900_000, contractYears: 3, speed: 92 }),
  r('wr7', 'Cade', 'Lund', 'WR', 74, 25, 14, { injury: 'out', contractYears: 2, capHit: 2_000_000 }),

  // Tight ends
  r('te1', 'Cole', 'Whitmore', 'TE', 86, 27, 87, { dev: 'star', capHit: 9_500_000, contractYears: 3, speed: 82 }),
  r('te2', 'Sam', 'Duval', 'TE', 76, 25, 82, { capHit: 2_200_000, contractYears: 2, speed: 79 }),
  r('te4', 'Ari', 'Vasquez', 'TE', 70, 24, 84, { capHit: 1_100_000, contractYears: 3, speed: 78 }),

  // Offensive line — four tackles cover both edges, so LT/RT depth overlaps.
  r('lt1', 'Pace', 'Odom', 'LT', 89, 26, 72, { dev: 'star', capHit: 13_000_000, contractYears: 4 }),
  r('rt1', 'Bo', 'Jennings', 'RT', 82, 25, 70, { capHit: 9_000_000, contractYears: 3 }),
  r('ot2', 'Dev', 'Kwan', 'LT', 74, 23, 74, { capHit: 1_200_000, contractYears: 3 }),
  r('ot3', 'Sid', 'Marlowe', 'RT', 69, 24, 76, { capHit: 1_000_000, contractYears: 3 }),
  r('lg1', 'Miles', 'Ferraro', 'LG', 80, 28, 64, { capHit: 8_000_000, contractYears: 2 }),
  r('c1', 'Hal', 'Boone', 'C', 84, 30, 60, { capHit: 10_500_000, contractYears: 2 }),
  r('rg1', 'Reg', 'Talley', 'RG', 77, 24, 66, { capHit: 2_000_000, contractYears: 3 }),
  r('og2', 'Cy', 'Pardo', 'RG', 68, 27, 68, { capHit: 2_100_000, contractYears: 1 }),
  r('c2', 'Ned', 'Fisk', 'C', 66, 26, 62, { capHit: 1_800_000, contractYears: 1 }),

  // Defensive line — de3/le4 are the designated rushers who start the sub packages.
  r('le1', 'Ras', 'Ellery', 'LE', 86, 27, 95, { dev: 'star', capHit: 14_000_000, contractYears: 3 }),
  r('re1', 'Cy', 'Barton', 'RE', 82, 25, 91, { capHit: 7_500_000, contractYears: 2 }),
  r('dt1', 'Otis', 'Frame', 'DT', 85, 29, 99, { capHit: 12_000_000, contractYears: 2 }),
  r('dt2', 'Hank', 'Roose', 'DT', 77, 24, 98, { capHit: 2_800_000, contractYears: 3 }),
  r('dt3', 'Ivo', 'Sandoval', 'NT', 74, 26, 96, { capHit: 3_400_000, contractYears: 2 }),
  r('dt4', 'Perry', 'Lund', 'DT', 71, 23, 92, { capHit: 1_000_000, contractYears: 3 }),
  r('de3', 'Quinn', 'Abara', 'RE', 70, 23, 93, { capHit: 1_000_000, contractYears: 3 }),
  r('le4', 'Mo', 'Halvorsen', 'LE', 68, 24, 97, { capHit: 900_000, contractYears: 3 }),

  // Linebackers — lb5 is the coverage linebacker who starts the sub packages.
  r('mlb1', 'Ade', 'Cortez', 'MLB', 88, 28, 54, { dev: 'star', capHit: 13_000_000, contractYears: 3 }),
  r('lolb1', 'Jon', 'Pike', 'LOLB', 80, 26, 52, { capHit: 6_400_000, contractYears: 2 }),
  r('rolb1', 'Kip', 'Vaughn', 'ROLB', 83, 25, 58, { capHit: 8_200_000, contractYears: 3 }),
  r('lb4', 'Tob', 'Renner', 'MLB', 73, 24, 50, { capHit: 1_300_000, contractYears: 3 }),
  r('lb5', 'Silas', 'Bright', 'ROLB', 71, 23, 56, { capHit: 1_000_000, contractYears: 3 }),
  r('lb6', 'Emil', 'Sorensen', 'MLB', 68, 25, 48, { capHit: 950_000, contractYears: 2 }),

  // Secondary — cb3 is the nickel back who starts the sub packages.
  r('cb1', 'Rell', 'Mackey', 'CB', 89, 26, 24, { dev: 'star', capHit: 14_000_000, contractYears: 3, speed: 94 }),
  r('cb2', 'Tune', 'Ferris', 'CB', 82, 27, 21, { capHit: 9_000_000, contractYears: 2, speed: 92 }),
  r('cb3', 'Ike', 'Nwosu', 'CB', 79, 23, 29, { capHit: 2_600_000, contractYears: 3, speed: 94 }),
  r('cb4', 'Bret', 'Salo', 'CB', 71, 24, 27, { capHit: 1_100_000, contractYears: 2, speed: 91 }),
  r('cb5', 'Dane', 'Oduya', 'CB', 68, 22, 23, { capHit: 900_000, contractYears: 3, speed: 93 }),
  r('fs1', 'Kade', 'Rowan', 'FS', 84, 26, 31, { capHit: 10_000_000, contractYears: 3, speed: 90 }),
  r('ss1', 'Bram', 'Ochoa', 'SS', 85, 25, 26, { dev: 'star', capHit: 10_000_000, contractYears: 2, speed: 89 }),
  r('fs2', 'Luca', 'Fenn', 'FS', 72, 23, 33, { capHit: 1_000_000, contractYears: 3, speed: 88 }),
  r('ss2', 'Otto', 'Reyes', 'SS', 69, 24, 36, { capHit: 950_000, contractYears: 2, speed: 87 }),
  r('s5', 'Wes', 'Kaminski', 'FS', 67, 23, 38, { capHit: 900_000, contractYears: 3, speed: 88 }),

  // Special teams
  r('k1', 'Sven', 'Lorentzen', 'K', 82, 30, 3, { capHit: 3_800_000, contractYears: 2 }),
  r('p1', 'Ruiz', 'Cardo', 'P', 79, 29, 9, { capHit: 2_900_000, contractYears: 2 }),
  r('ls1', 'Gil', 'Vandal', 'LS', 62, 31, 46, { capHit: 1_300_000, contractYears: 2 }),

  // Practice squad — legal roster members the depth chart must not use.
  r('wr6', 'Ollie', 'Rios', 'WR', 66, 25, 80, { rosterStatus: 'practice-squad', speed: 90 }),
  r('te3', 'Reg', 'Okafor', 'TE', 68, 23, 85, { rosterStatus: 'practice-squad', speed: 76 }),
];

/** A handful of CPU players so the trade log has somebody to trade with. */
export const CPU_ROSTERS: Record<string, SeedPlayer[]> = {
  MET: [
    r('met-qb1', 'Rex', 'Calloway', 'QB', 84, 28, 12, { dev: 'star' }),
    r('met-hb1', 'Samir', 'Ojeda', 'HB', 85, 26, 24),
    r('met-wr1', 'Troy', 'Ellison', 'WR', 86, 27, 18, { dev: 'star' }),
    r('met-te1', 'Ken', 'Adeyemi', 'TE', 80, 25, 85),
    r('met-lt1', 'Wes', 'Halloway', 'LT', 83, 27, 76),
    r('met-cb1', 'Nate', 'Beaumont', 'CB', 87, 25, 23, { dev: 'star' }),
    r('met-mlb1', 'Ike', 'Solano', 'MLB', 82, 29, 53),
    r('met-k1', 'Bo', 'Krebs', 'K', 78, 26, 6),
  ],
  HAR: [
    r('har-qb1', 'Miles', 'Duquesne', 'QB', 81, 25, 7),
    r('har-hb1', 'Raf', 'Ibarra', 'HB', 83, 24, 20, { dev: 'star' }),
    r('har-wr1', 'Jae', 'Tolliver', 'WR', 88, 26, 13, { dev: 'superstar' }),
    r('har-re1', 'Cal', 'Renfro', 'RE', 86, 27, 97, { dev: 'star' }),
    r('har-dt1', 'Omar', 'Kessler', 'DT', 84, 30, 92),
    r('har-fs1', 'Gio', 'Ravel', 'FS', 83, 26, 34),
    r('har-p1', 'Tim', 'Okonkwo', 'P', 77, 28, 5),
  ],
  PRA: [
    r('pra-qb1', 'Everett', 'Strand', 'QB', 90, 29, 9, { dev: 'xfactor' }),
    r('pra-hb1', 'Nils', 'Bergman', 'HB', 84, 27, 26),
    r('pra-wr1', 'Lyric', 'Dearmon', 'WR', 85, 24, 16),
    r('pra-lolb1', 'Zeke', 'Tovar', 'LOLB', 87, 26, 55, { dev: 'star' }),
    r('pra-cb1', 'Dex', 'Aminu', 'CB', 86, 24, 25, { dev: 'superstar' }),
    r('pra-ss1', 'Griff', 'Lund', 'SS', 82, 28, 32),
    r('pra-k1', 'Ivan', 'Petrov', 'K', 81, 31, 2),
  ],
};

/**
 * Curated situational-role assignments for the demo team.
 *
 * This is the part of a depth chart that is a coaching decision rather than a
 * pure sort: the slot corner, the third-down back, the sub-package rushers.
 *
 * Every name here is a *backup* at his base position — a starting role is a
 * starting role, so a man cannot open the game at two of them. That is the same
 * rule the conflict audit applies to your own plans.
 */
export const DEMO_SITUATIONAL: Record<string, string[]> = {
  SLWR: ['wr3', 'wr5'],
  '3DRB': ['hb3', 'hb4'],
  PWHB: ['hb4', 'hb2'],
  NT: ['dt3', 'dt2'],
  RLE: ['de3', 'le4'],
  RRE: ['le4', 'de3'],
  RDT: ['dt4', 'dt2'],
  SUBLB: ['lb5', 'lb4'],
  NB: ['cb3', 'cb4'],
  KOS: ['k1'],
  H: ['p1'],
  LS: ['ls1'],
  KR: ['wr5', 'cb4'],
  PR: ['wr5', 'wr3'],
};

export function seedPlayersFor(teamId: string): SeedPlayer[] {
  if (teamId === DEMO_TEAM.id) return DEMO_ROSTER;
  return CPU_ROSTERS[teamId] ?? [];
}
