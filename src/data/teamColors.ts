/**
 * NFL team palettes.
 *
 * Reference data only — nothing scrapes at runtime. These are the teams' real
 * primary and secondary colours, taken from public brand references and committed
 * here so the app behaves identically offline and in production.
 *
 * The hexes below are the *true* team colours. They are not adjusted: the accent
 * tokens the UI actually paints are derived at request time by `deriveAccentTokens`,
 * which nudges each colour until it clears WCAG AA in the active mode. That split
 * keeps the team's identity intact in the data while guaranteeing legibility in
 * the UI.
 *
 * A team we have no palette for falls back to `NEUTRAL_PALETTE`.
 */

export interface TeamPalette {
  abbr: string;
  name: string;
  primary: string;
  secondary: string;
  source: string;
}

const SOURCE = 'public NFL brand colour references';

/** Used for any team we have no palette for. */
export const NEUTRAL_PALETTE: TeamPalette = {
  abbr: 'NFL',
  name: 'Neutral',
  primary: '#5b6470',
  secondary: '#94a3b8',
  source: 'neutral fallback',
};

export const TEAM_COLORS: TeamPalette[] = [
  { abbr: 'ARI', name: 'Arizona Cardinals', primary: '#97233F', secondary: '#000000', source: SOURCE },
  { abbr: 'ATL', name: 'Atlanta Falcons', primary: '#A71930', secondary: '#000000', source: SOURCE },
  { abbr: 'BAL', name: 'Baltimore Ravens', primary: '#241773', secondary: '#9E7C0C', source: SOURCE },
  { abbr: 'BUF', name: 'Buffalo Bills', primary: '#00338D', secondary: '#C60C30', source: SOURCE },
  { abbr: 'CAR', name: 'Carolina Panthers', primary: '#0085CA', secondary: '#101820', source: SOURCE },
  { abbr: 'CHI', name: 'Chicago Bears', primary: '#0B162A', secondary: '#C83803', source: SOURCE },
  { abbr: 'CIN', name: 'Cincinnati Bengals', primary: '#FB4F14', secondary: '#101820', source: SOURCE },
  { abbr: 'CLE', name: 'Cleveland Browns', primary: '#311D00', secondary: '#FF3C00', source: SOURCE },
  { abbr: 'DAL', name: 'Dallas Cowboys', primary: '#003594', secondary: '#869397', source: SOURCE },
  { abbr: 'DEN', name: 'Denver Broncos', primary: '#FB4F14', secondary: '#002244', source: SOURCE },
  { abbr: 'DET', name: 'Detroit Lions', primary: '#0076B6', secondary: '#B0B7BC', source: SOURCE },
  { abbr: 'GB', name: 'Green Bay Packers', primary: '#203731', secondary: '#FFB612', source: SOURCE },
  { abbr: 'HOU', name: 'Houston Texans', primary: '#03202F', secondary: '#A71930', source: SOURCE },
  { abbr: 'IND', name: 'Indianapolis Colts', primary: '#002C5F', secondary: '#A2AAAD', source: SOURCE },
  { abbr: 'JAX', name: 'Jacksonville Jaguars', primary: '#006778', secondary: '#D7A22A', source: SOURCE },
  { abbr: 'KC', name: 'Kansas City Chiefs', primary: '#E31837', secondary: '#FFB81C', source: SOURCE },
  { abbr: 'LAC', name: 'Los Angeles Chargers', primary: '#0080C6', secondary: '#FFC20E', source: SOURCE },
  { abbr: 'LAR', name: 'Los Angeles Rams', primary: '#003594', secondary: '#FFA300', source: SOURCE },
  { abbr: 'LV', name: 'Las Vegas Raiders', primary: '#000000', secondary: '#A5ACAF', source: SOURCE },
  { abbr: 'MIA', name: 'Miami Dolphins', primary: '#008E97', secondary: '#FC4C02', source: SOURCE },
  { abbr: 'MIN', name: 'Minnesota Vikings', primary: '#4F2683', secondary: '#FFC62F', source: SOURCE },
  { abbr: 'NE', name: 'New England Patriots', primary: '#002244', secondary: '#C60C30', source: SOURCE },
  { abbr: 'NO', name: 'New Orleans Saints', primary: '#101820', secondary: '#D3BC8D', source: SOURCE },
  { abbr: 'NYG', name: 'New York Giants', primary: '#0B2265', secondary: '#A71930', source: SOURCE },
  { abbr: 'NYJ', name: 'New York Jets', primary: '#125740', secondary: '#000000', source: SOURCE },
  { abbr: 'PHI', name: 'Philadelphia Eagles', primary: '#004C54', secondary: '#A5ACAF', source: SOURCE },
  { abbr: 'PIT', name: 'Pittsburgh Steelers', primary: '#FFB612', secondary: '#101820', source: SOURCE },
  { abbr: 'SEA', name: 'Seattle Seahawks', primary: '#002244', secondary: '#69BE28', source: SOURCE },
  { abbr: 'SF', name: 'San Francisco 49ers', primary: '#AA0000', secondary: '#B3995D', source: SOURCE },
  { abbr: 'TB', name: 'Tampa Bay Buccaneers', primary: '#D50A0A', secondary: '#34302B', source: SOURCE },
  { abbr: 'TEN', name: 'Tennessee Titans', primary: '#0C2340', secondary: '#4B92DB', source: SOURCE },
  { abbr: 'WAS', name: 'Washington Commanders', primary: '#5A1414', secondary: '#FFB612', source: SOURCE },
];

/**
 * Abbreviations other feeds use for the same club. The ratings importer writes
 * whatever EA uses, so the resolver has to understand a few common spellings.
 */
const ALIASES: Record<string, string> = {
  ARZ: 'ARI',
  ARIZ: 'ARI',
  BLT: 'BAL',
  CLV: 'CLE',
  HST: 'HOU',
  HOUS: 'HOU',
  JAC: 'JAX',
  JAG: 'JAX',
  KCC: 'KC',
  SD: 'LAC',
  LACH: 'LAC',
  LA: 'LAR',
  STL: 'LAR',
  LAV: 'LV',
  OAK: 'LV',
  NWE: 'NE',
  NOR: 'NO',
  SFO: 'SF',
  TAM: 'TB',
  TBB: 'TB',
  WSH: 'WAS',
  GNB: 'GB',
};

const BY_ABBR = new Map(TEAM_COLORS.map((team) => [team.abbr, team]));
const BY_NAME = new Map(TEAM_COLORS.map((team) => [team.name.toLowerCase(), team]));

export interface TeamLike {
  abbr?: string | null;
  id?: string | null;
  name?: string | null;
}

function canonicalAbbr(value: string): string {
  const upper = value.trim().toUpperCase();
  return ALIASES[upper] ?? upper;
}

/**
 * Find a team's palette. Looks at the abbreviation, then the team id, then the
 * full name; anything unrecognised gets the neutral fallback rather than an error,
 * so a hand-added team still renders.
 */
export function resolveTeamPalette(team: TeamLike | null | undefined): TeamPalette {
  if (!team) return NEUTRAL_PALETTE;

  for (const candidate of [team.abbr, team.id]) {
    if (!candidate) continue;
    const match = BY_ABBR.get(canonicalAbbr(candidate));
    if (match) return match;
  }

  if (team.name) {
    const byName = BY_NAME.get(team.name.trim().toLowerCase());
    if (byName) return byName;
  }

  return NEUTRAL_PALETTE;
}

/** True when a team has a real, hand-curated palette (not the neutral fallback). */
export function hasTeamPalette(team: TeamLike | null | undefined): boolean {
  return resolveTeamPalette(team).abbr !== NEUTRAL_PALETTE.abbr;
}
