import type { SeedFormation, SeedPlaybook, SeedSlot } from '@/data/seed/playbooks';

/**
 * civil.gg -> our formation model.
 *
 * civil.gg's public playbook database exposes, for Madden 27: the list of
 * formations, and plays tagged with set / formation / play type. The per-spot
 * diagram labels are **not** exposed as text — the alignment is a flat WebP image
 * (`.../assets/formation_macros/cfb27_def/<front>.webp`), so the roles printed on
 * it cannot be read from the DOM. The alignment spots here are therefore *derived*
 * from the formation name (Trips, Bunch, Tight, Empty, I Form, personnel digits)
 * using templates.
 *
 * The derivation follows the one rule that reproduces every labelled diagram in
 * `POSITIONS.md` §4: below a four-man line, both edge jobs count as **linemen**, so
 * a 3-4 is `5 DL / 2 LB / 4 DB` and a nickel 2-4 is `4 DL / 2 LB / 5 DB`. Getting
 * that wrong is how this file used to invent a 3-4 with four linebackers.
 *
 * The rest is deliberately transparent and cheap to correct: the app marks these
 * layouts as unverified, renders them as our own diagram, and lets any slot be
 * rebound by hand in the formation editor.
 */

export interface CivilPlay {
  playName: string;
  displayName: string;
  formationName: string;
  setName: string;
  playType: string;
  offenseDefense: string;
}

const DEFENSE_HINTS =
  /nickel|dime|quarter|\b3-4\b|\b34\b|\b4-3\b|\b43\b|\b46\b|\b52\b|\b61\b|\bover\b|\bunder\b|\bbear\b|\bodd\b|\beven\b|\bmug\b|\bcub\b|blitz|cover/i;

export function classifySide(formationKey: string, offenseDefense?: string): 'offense' | 'defense' {
  if (offenseDefense === 'defense') return 'defense';
  if (offenseDefense === 'offense') return 'offense';
  return DEFENSE_HINTS.test(formationKey) ? 'defense' : 'offense';
}

/** `"gun trips te"` -> `{ set: 'Gun', name: 'Trips TE' }` */
export function parseFormationKey(key: string): { set: string; name: string } {
  const cleaned = key.trim().replace(/\s+/g, ' ');
  // Two-word sets have to be consumed before the generic split.
  const iForm = /^i[- ]form\s*(.*)$/i.exec(cleaned);
  if (iForm) return { set: 'I Form', name: iForm[1].split(' ').map(prettyWord).join(' ') || 'I Form' };
  const [first = '', ...rest] = cleaned.split(' ');
  const setMap: Record<string, string> = {
    gun: 'Gun',
    pistol: 'Pistol',
    singleback: 'Singleback',
    i: 'I Form',
    strong: 'Strong',
    weak: 'Weak',
    empty: 'Empty',
    nickel: 'Nickel',
    dime: 'Dime',
    quarter: 'Quarter',
    43: '4-3',
    34: '3-4',
    46: '46',
    goalline: 'Goal Line',
    goal: 'Goal Line',
    punt: 'Punt',
    fg: 'Field Goal',
    kickoff: 'Kickoff',
  };
  const set = setMap[first.toLowerCase()] ?? first.charAt(0).toUpperCase() + first.slice(1);
  const name = rest.map(prettyWord).join(' ');
  return { set, name: name || set.toUpperCase() };
}

const ACRONYMS = new Set(['TE', 'HB', 'FB', 'WR', 'QB', 'SLWR', 'Y', 'H', 'I', 'F']);

function prettyWord(word: string): string {
  const upper = word.toUpperCase();
  if (ACRONYMS.has(upper)) return upper;
  return upper.charAt(0) + upper.slice(1).toLowerCase();
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* -------------------------------------------------------------------------- */
/* Slot derivation                                                            */
/* -------------------------------------------------------------------------- */

const OL = (y = 0.94): SeedSlot[] => [
  { key: 'LT', label: 'LT', role: 'LT', x: 0.36, y, eligible: ['LT', 'LG', 'RT', 'RG', 'C'] },
  { key: 'LG', label: 'LG', role: 'LG', x: 0.43, y, eligible: ['LG', 'LT', 'C', 'RG'] },
  { key: 'C', label: 'C', role: 'C', x: 0.5, y, eligible: ['C', 'LG', 'RG'] },
  { key: 'RG', label: 'RG', role: 'RG', x: 0.57, y, eligible: ['RG', 'C', 'LG', 'RT'] },
  { key: 'RT', label: 'RT', role: 'RT', x: 0.64, y, eligible: ['RT', 'RG', 'LT', 'LG'] },
];

function teCount(name: string): number {
  if (/jumbo|heavy|goal ?line/i.test(name)) return 2;
  if (/deuce|tight|ace|double tight/i.test(name)) return 2;
  if (/\bte\b|-te\b|\bte /i.test(` ${name.toLowerCase()} `)) return 1;
  if (/bunch te|flex te|offset te/i.test(name)) return 1;
  return 0;
}

function backCount(set: string, name: string): number {
  if (/empty/i.test(name) || /empty/i.test(set)) return 0;
  if (/i form|strong|weak/i.test(set) || /\bi\b/i.test(set)) return 1;
  if (/goal ?line|jumbo/i.test(name)) return 2;
  return 1;
}

function usesFullback(set: string, name: string): boolean {
  return /i form|strong|weak/i.test(set) || /\b(i|iso|lead|pro|close|ace)\b/i.test(name);
}

function receiverLayout(name: string): { receivers: number; slotLabel: string; bunch: boolean } {
  if (/empty|quads|spread/i.test(name)) return { receivers: 5, slotLabel: 'SLWR', bunch: false };
  if (/bunch/i.test(name)) return { receivers: 3, slotLabel: 'SLWR', bunch: true };
  if (/trips|trio/i.test(name)) return { receivers: 3, slotLabel: 'SLWR', bunch: false };
  if (/tight|deuce|jumbo/i.test(name)) return { receivers: 1, slotLabel: 'SLWR', bunch: false };
  return { receivers: 2, slotLabel: 'SLWR', bunch: false };
}

/**
 * Build 11 alignment spots from a formation name.
 *
 * Skill positions always total six (five linemen plus a quarterback make eleven),
 * so the counts are clamped as a group rather than independently.
 */
export function buildOffenseSlots(set: string, name: string): SeedSlot[] {
  const slots: SeedSlot[] = [];
  slots.push({ key: 'QB', label: 'QB', role: 'QB', x: 0.5, y: /singleback|i form/i.test(set) ? 0.82 : 0.8, eligible: ['QB'] });

  const layout = receiverLayout(name);
  let backs = backCount(set, name);
  const fullback = backs > 0 && usesFullback(set, name);
  let tightEnds = teCount(name);
  let receivers = layout.receivers;

  // 11 = 5 linemen + the quarterback + 5 skill players (RB + FB + TE + WR), so the
  // skill group is clamped as a whole. Getting this off by one is a silent bug:
  // it produces a 12-man formation.
  const total = () => backs + (fullback ? 1 : 0) + tightEnds + receivers;
  while (total() > 5) {
    if (receivers > 1) receivers -= 1;
    else if (tightEnds > 1) tightEnds -= 1;
    else if (fullback && backs > 1) backs -= 1;
    else break;
  }
  while (total() < 5) receivers += 1;

  // Backfield
  if (fullback) {
    slots.push({ key: 'FB', label: 'FB', role: 'FB', x: 0.5, y: 0.66, eligible: ['FB', 'HB'] });
    if (backs > 0) slots.push({ key: 'HB', label: 'HB', role: 'HB', x: 0.5, y: 0.58, eligible: ['HB', 'FB'] });
  } else if (backs > 0) {
    slots.push({ key: 'HB', label: 'HB', role: 'HB', x: 0.44, y: 0.72, eligible: ['HB', 'FB'] });
  }

  // Tight ends
  if (tightEnds >= 1) {
    slots.push({ key: 'TE_L', label: 'TE', role: 'TE', rank: 1, x: 0.68, y: 0.96, eligible: ['TE', 'FB'] });
  }
  if (tightEnds >= 2) {
    slots.push({ key: 'TE_R', label: 'TE2', role: 'TE', rank: 2, x: 0.34, y: 0.97, eligible: ['TE', 'FB'] });
  }

  // Receivers: the innermost one is the slot receiver when there are three or more.
  const receiverSlots = buildReceiverSlots(receivers, layout.bunch);
  return [...slots, ...receiverSlots, ...OL()];
}

/**
 * Exactly N receiver spots, never more: a formation is 11 players including the
 * five linemen, so getting this off by one silently produces illegal formations.
 */
function buildReceiverSlots(count: number, bunch: boolean): SeedSlot[] {
  const clamped = Math.min(5, Math.max(1, count));
  const templates: Record<number, SeedSlot[]> = {
    1: [{ key: 'WR_L', label: 'WR1', role: 'WR', rank: 1, x: 0.09, y: 0.98, eligible: ['WR'] }],
    2: [
      { key: 'WR_L', label: 'WR1', role: 'WR', rank: 1, x: 0.08, y: 0.98, eligible: ['WR'] },
      { key: 'WR_R', label: 'WR2', role: 'WR', rank: 2, x: 0.92, y: 0.98, eligible: ['WR'] },
    ],
    3: [
      { key: 'WR_L', label: 'WR1', role: 'WR', rank: 1, x: bunch ? 0.1 : 0.08, y: 0.98, eligible: ['WR'] },
      {
        key: 'SLOT',
        label: 'SLWR',
        role: 'SLWR',
        rank: 1,
        x: bunch ? 0.79 : 0.24,
        y: 0.95,
        eligible: ['WR', 'TE', 'HB'],
      },
      {
        key: 'WR_R',
        label: 'WR2',
        role: 'WR',
        rank: 2,
        x: bunch ? 0.87 : 0.9,
        y: bunch ? 0.96 : 0.98,
        eligible: ['WR'],
      },
    ],
    4: [
      { key: 'WR_L', label: 'WR1', role: 'WR', rank: 1, x: 0.07, y: 0.98, eligible: ['WR'] },
      { key: 'SLOT', label: 'SLWR', role: 'SLWR', rank: 1, x: 0.7, y: 0.95, eligible: ['WR', 'TE', 'HB'] },
      { key: 'WR_R', label: 'WR2', role: 'WR', rank: 2, x: 0.93, y: 0.98, eligible: ['WR'] },
      { key: 'WR_M', label: 'WR3', role: 'WR', rank: 3, x: 0.32, y: 0.96, eligible: ['WR'] },
    ],
    5: [
      { key: 'WR_L', label: 'WR1', role: 'WR', rank: 1, x: 0.06, y: 0.98, eligible: ['WR'] },
      { key: 'SLOT', label: 'SLWR', role: 'SLWR', rank: 1, x: 0.7, y: 0.95, eligible: ['WR', 'TE', 'HB'] },
      { key: 'WR_R', label: 'WR2', role: 'WR', rank: 2, x: 0.94, y: 0.98, eligible: ['WR'] },
      { key: 'WR_M', label: 'WR3', role: 'WR', rank: 3, x: 0.3, y: 0.96, eligible: ['WR'] },
      { key: 'WR_X', label: 'WR4', role: 'WR', rank: 4, x: 0.5, y: 0.99, eligible: ['WR'] },
    ],
  };
  return templates[clamped] ?? templates[5];
}

/**
 * Front shape in the game's own terms.
 *
 * The digits in a name count the *named* front — `nickel 33` is three linemen and
 * three linebackers — but Madden 26 moved the edge, so the personnel line the game
 * prints disagrees with the nickname. See the file header.
 */
export interface FrontShape {
  /** Linemen as the formation name describes them. */
  namedLine: number;
  /** Linebackers as the formation name describes them. */
  namedBackers: number;
  /** Linemen in the game's `N DL` tally. */
  line: number;
  /** Linebackers in the game's `N LB` tally. */
  linebackers: number;
  /** Defensive backs, which the edge reclassification does not touch. */
  backs: number;
}

/** Front digits in a defensive name: `nickel 33 odd` -> 3 linemen, 3 linebackers. */
export function parseFront(name: string): FrontShape {
  let namedLine = 3;
  let namedBackers = 3;

  const digits = /(\d)\s?(\d)/.exec(name.replace(/[^0-9a-z ]/gi, ' '));
  if (digits) {
    const line = Number(digits[1]);
    const backers = Number(digits[2]);
    if (line >= 2 && line <= 6 && backers >= 1 && backers <= 5 && line + backers <= 8) {
      namedLine = line;
      namedBackers = backers;
    }
  } else if (/dime/i.test(name)) {
    namedLine = 2;
    namedBackers = 3;
  } else if (/quarter/i.test(name)) {
    namedLine = 3;
    namedBackers = 1;
  } else if (/\b3-4\b|\b34\b|\bbear\b/i.test(name)) {
    namedLine = 3;
    namedBackers = 4;
  } else if (/\b4-3\b|\b43\b|\bover\b|\bunder\b|\beven\b/i.test(name)) {
    namedLine = 4;
    namedBackers = 3;
  }

  const edgesAreLinemen = namedLine < 4;
  const line = edgesAreLinemen ? namedLine + 2 : namedLine;
  const linebackers = edgesAreLinemen ? Math.max(0, namedBackers - 2) : namedBackers;
  return {
    namedLine,
    namedBackers,
    line,
    linebackers,
    backs: Math.max(3, 11 - line - linebackers),
  };
}

const LINEMAN_ELIGIBLE = ['LEDG', 'REDG', 'DT', 'NT', 'DE'];
const BACKER_ELIGIBLE = ['MIKE', 'SAM', 'WILL', 'SS'];

/**
 * Secondary shapes, front to back. A sub front's fifth back is a third corner;
 * a base front's is a second strong safety — that is what the diagrams show.
 */
const DB_LAYOUT: Record<'sub' | 'base', string[]> = {
  sub: ['CB', 'CB', 'CB', 'FS', 'SS', 'SS', 'CB', 'SS'],
  base: ['CB', 'CB', 'FS', 'SS', 'CB', 'SS', 'FS', 'SS'],
};

/**
 * Eleven alignment spots derived from the formation name.
 *
 * The line is drawn right-edge-first, the way the game's own diagrams are: the
 * right edge appears on the left of the screen.
 */
export function buildDefenseSlots(name: string): SeedSlot[] {
  const front = parseFront(name);
  const subFront = front.namedLine <= 2;
  const slots: SeedSlot[] = [];

  /** Rank is per role across the whole formation, so no two spots share a role+rank. */
  const counts = new Map<string, number>();
  const place = (role: string, x: number, y: number, eligible: string[]): SeedSlot => {
    const rank = (counts.get(role) ?? 0) + 1;
    counts.set(role, rank);
    return { key: `${role}${rank}`, label: `${role}${rank}`, role, rank, x, y, eligible };
  };

  const interior =
    front.namedLine >= 4 ? ['DT', 'DT'] : front.namedLine === 3 ? ['DT', 'NT', 'DT'] : ['NT', 'DT'];
  const lineRoles = [subFront ? 'RRE' : 'REDG', ...interior, subFront ? 'RLE' : 'LEDG'];
  const lastLineIndex = Math.max(1, lineRoles.length - 1);
  lineRoles.forEach((role, index) => {
    slots.push(place(role, 0.5 + (index - lastLineIndex / 2) * (0.34 / lastLineIndex), 0.9, LINEMAN_ELIGIBLE));
  });

  const backerRoles = subFront
    ? (['SUBLB', 'SUBLB'] as string[])
    : front.linebackers >= 3
      ? ['SAM', 'MIKE', 'WILL']
      : front.linebackers === 2
        ? ['MIKE', 'WILL']
        : ['MIKE'];
  backerRoles.slice(0, front.linebackers).forEach((role, index) => {
    slots.push(place(role, 0.5 + (index - (front.linebackers - 1) / 2) * 0.24, 0.8 + index * 0.01, BACKER_ELIGIBLE));
  });

  const dbRoles = DB_LAYOUT[subFront ? 'sub' : 'base'].slice(0, front.backs);
  dbRoles.forEach((role, index) => {
    const deep = role === 'FS' || role === 'SS';
    slots.push(
      place(
        role,
        deep ? 0.2 + index * 0.12 : 0.08 + index * 0.06,
        deep ? 0.4 : 0.9,
        ['CB', 'FS', 'SS'],
      ),
    );
  });

  return slots;
}

/* -------------------------------------------------------------------------- */
/* Building playbooks                                                         */
/* -------------------------------------------------------------------------- */

export interface CivilPayloads {
  formations: string[];
  plays: CivilPlay[];
}

export function toSeedPlaybooks(
  payloads: CivilPayloads,
  options: { idPrefix?: string; season?: string } = {},
): SeedPlaybook[] {
  const prefix = options.idPrefix ?? 'civil';
  const byFormation = new Map<string, CivilPlay[]>();
  for (const play of payloads.plays) {
    const key = `${play.setName} ${play.formationName}`.trim().toLowerCase();
    const list = byFormation.get(key) ?? [];
    list.push(play);
    byFormation.set(key, list);
  }

  const offenses: SeedFormation[] = [];
  const defenses: SeedFormation[] = [];
  const seen = new Set<string>();

  for (const rawKey of payloads.formations) {
    const key = rawKey.trim().replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key) || key.length === 0) continue;
    seen.add(key);

    const { set, name } = parseFormationKey(key);
    const plays = byFormation.get(key) ?? [];
    const side = classifySide(key, plays[0]?.offenseDefense);

    const formation: SeedFormation = {
      id: `${prefix}-${slugify(key)}`,
      name: `${set} ${name}`.trim(),
      set,
      distribution: /bunch/i.test(name) ? 'Bunch' : /trips|trio/i.test(name) ? 'Trips' : /empty|spread/i.test(name) ? 'Empty' : /tight|deuce|jumbo/i.test(name) ? 'Tight' : 'Doubles',
      slots: side === 'defense' ? buildDefenseSlots(key) : buildOffenseSlots(set, name),
      plays: [...new Set(plays.map((play) => titleCase(play.displayName || play.playName)))],
      notes: plays.length ? undefined : 'Imported formation with no plays in the public dataset yet.',
    };

    if (side === 'defense') defenses.push(formation);
    else offenses.push(formation);
  }

  const playbooks: SeedPlaybook[] = [
    {
      id: `${prefix}-madden-offense-27`,
      name: 'Madden 27 Offense Formations',
      team: 'civil.gg',
      side: 'offense',
      source: 'civil',
      url: 'https://civil.gg/playbooks/madden',
      formations: offenses,
    },
    {
      id: `${prefix}-madden-defense-27`,
      name: 'Madden 27 Defense Formations',
      team: 'civil.gg',
      side: 'defense',
      source: 'civil',
      url: 'https://civil.gg/playbooks/madden',
      formations: defenses,
    },
  ];

  return playbooks.filter((playbook) => playbook.formations.length > 0);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
