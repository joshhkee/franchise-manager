import type { Concept } from './concepts';

/**
 * The call sheet: down-and-distance buckets with an ordered list of concepts you
 * are willing to call in each. Defaults are a conventional, balanced starting
 * point; every bucket is editable, because your sheet should sound like you.
 */

export interface Situation {
  down: number;
  distance: number;
  /** Yards from your own goal line: 1..99, so 80+ is the red zone. */
  yardLine: number;
  quarter: number;
  clockSeconds: number;
  /** Positive = you are leading. */
  scoreDiff: number;
}

export type BucketId =
  | 'goal-line'
  | 'backed-up'
  | 'two-minute'
  | 'four-minute'
  | 'red-zone'
  | '1st-10'
  | '1st-short'
  | '2nd-short'
  | '2nd-mid'
  | '2nd-long'
  | '3rd-short'
  | '3rd-mid'
  | '3rd-long'
  | '4th-short'
  | '4th-mid'
  | '4th-long';

export const BUCKET_LABELS: Record<BucketId, string> = {
  'goal-line': 'Goal line (inside the 5)',
  'backed-up': 'Backed up (own 5 or worse)',
  'two-minute': 'Two-minute',
  'four-minute': 'Four-minute (protecting a lead)',
  'red-zone': 'Red zone (inside the 20)',
  '1st-10': '1st & 10',
  '1st-short': '1st & short',
  '2nd-short': '2nd & short (1-3)',
  '2nd-mid': '2nd & medium (4-6)',
  '2nd-long': '2nd & long (7+)',
  '3rd-short': '3rd & short (1-3)',
  '3rd-mid': '3rd & medium (4-6)',
  '3rd-long': '3rd & long (7+)',
  '4th-short': '4th & short (1-3)',
  '4th-mid': '4th & medium (4-6)',
  '4th-long': '4th & long (7+)',
};

export type DistanceBand = 'short' | 'mid' | 'long';

export function distanceBand(distance: number): DistanceBand {
  if (distance <= 3) return 'short';
  if (distance <= 6) return 'mid';
  return 'long';
}

/**
 * Buckets are resolved in priority order, because situation beats down and
 * distance: on the goal line, "1st & 10" is not the useful label.
 */
export function resolveBucket(s: Situation): BucketId {
  const twoMinuteSituation =
    (s.quarter === 2 || s.quarter === 4) && s.clockSeconds <= 120 && s.yardLine < 95;
  const fourMinuteSituation = s.quarter === 4 && s.clockSeconds <= 300 && s.scoreDiff > 0;

  if (s.yardLine >= 95) return 'goal-line';
  if (s.yardLine <= 5) return 'backed-up';
  if (twoMinuteSituation) return 'two-minute';
  if (fourMinuteSituation) return 'four-minute';
  if (s.yardLine >= 80) return 'red-zone';

  const band = distanceBand(s.distance);
  const down = Math.min(Math.max(s.down, 1), 4);
  if (down === 1) return band === 'short' ? '1st-short' : '1st-10';
  return `${down}${down === 2 ? 'nd' : down === 3 ? 'rd' : 'th'}-${band}` as BucketId;
}

export function situationLabel(s: Situation): string {
  const ordinals = ['', '1st', '2nd', '3rd', '4th'];
  const ordinal = ordinals[Math.min(Math.max(s.down, 1), 4)];
  const goal = s.yardLine >= 99 ? 'goal' : `${Math.max(1, 100 - s.yardLine)}`;
  return `${ordinal} & ${goal} at the ${s.yardLine >= 50 ? 'opponent' : 'own'} ${s.yardLine >= 50 ? 100 - s.yardLine : s.yardLine}`;
}

const RUN_SHEET: Concept[] = ['inside-zone', 'outside-zone', 'gap-power', 'counter', 'dive'];

export const DEFAULT_PRIORITIES: Record<BucketId, Concept[]> = {
  '1st-10': ['inside-zone', 'outside-zone', 'dropback-short', 'play-action-deep', 'gap-power', 'rpo'],
  '1st-short': ['gap-power', 'play-action-deep', 'inside-zone', 'dropback-short'],
  '2nd-short': ['inside-zone', 'gap-power', 'play-action-deep', 'dropback-short'],
  '2nd-mid': ['outside-zone', 'dropback-short', 'dropback-mid', 'rpo', 'play-action-deep'],
  '2nd-long': ['dropback-mid', 'dropback-deep', 'screen', 'play-action-deep', 'draw'],
  '3rd-short': ['gap-power', 'inside-zone', 'dropback-short', 'play-action-short'],
  '3rd-mid': ['dropback-mid', 'screen', 'quick-game', 'rpo', 'outside-zone'],
  '3rd-long': ['dropback-deep', 'dropback-mid', 'screen', 'play-action-deep', 'quick-game'],
  '4th-short': ['gap-power', 'inside-zone', 'qb-run', 'dropback-short'],
  '4th-mid': ['dropback-mid', 'dropback-short', 'screen'],
  '4th-long': ['dropback-deep', 'dropback-mid', 'screen'],
  'red-zone': ['inside-zone', 'gap-power', 'play-action-short', 'dropback-short', 'quick-game'],
  'goal-line': ['gap-power', 'dive', 'play-action-short', 'qb-run', 'dropback-short'],
  'backed-up': ['inside-zone', 'gap-power', 'dropback-short', 'quick-game'],
  'two-minute': ['quick-game', 'dropback-short', 'dropback-mid', 'screen', 'dropback-deep'],
  'four-minute': ['inside-zone', 'gap-power', 'dive', 'play-action-short'],
};

export interface OpponentLean {
  id: string;
  label: string;
  boosts: Concept[];
  fades: Concept[];
  note: string;
}

/**
 * What you are seeing from the defense, and the concepts that answer it.
 * Deliberately coarse: you are reading a defense live, not running a model.
 */
export const OPPONENT_LEANS: OpponentLean[] = [
  {
    id: 'stacked-box',
    label: 'Stacking the box',
    boosts: ['outside-zone', 'play-action-deep', 'screen', 'dropback-deep', 'rpo'],
    fades: ['inside-zone', 'gap-power', 'dive'],
    note: 'Extra defender in the box: get the ball outside or behind them.',
  },
  {
    id: 'safeties-high',
    label: 'Two high safeties',
    boosts: ['inside-zone', 'gap-power', 'quick-game', 'screen'],
    fades: ['dropback-deep', 'play-action-deep'],
    note: 'Deep help both ways: run it and take the underneath throws.',
  },
  {
    id: 'single-high',
    label: 'Single high safety',
    boosts: ['dropback-deep', 'play-action-deep', 'outside-zone'],
    fades: ['quick-game', 'screen'],
    note: 'One safety: there is space to attack vertically and on the edges.',
  },
  {
    id: 'heavy-blitz',
    label: 'Blitzing heavily',
    boosts: ['quick-game', 'screen', 'rpo', 'dropback-short'],
    fades: ['dropback-deep', 'play-action-deep', 'draw'],
    note: 'Get the ball out fast and make them pay for the extra rusher.',
  },
  {
    id: 'man-press',
    label: 'Man / press coverage',
    boosts: ['quick-game', 'screen', 'rpo', 'counter', 'inside-zone'],
    fades: ['dropback-mid'],
    note: 'Man coverage: rubs, picks, fast throws and runs against a light box.',
  },
  {
    id: 'soft-zone',
    label: 'Soft zone',
    boosts: ['dropback-mid', 'inside-zone', 'draw', 'dropback-short'],
    fades: ['dropback-deep'],
    note: 'Sitting back: take the intermediate windows and be patient.',
  },
  {
    id: 'run-blitz',
    label: 'Crashing ends on the run',
    boosts: ['counter', 'play-action-deep', 'outside-zone'],
    fades: ['inside-zone', 'gap-power', 'dive'],
    note: 'Aggressive run defenders: misdirection and bootlegs punish them.',
  },
];

export function leanById(id: string): OpponentLean | null {
  return OPPONENT_LEANS.find((lean) => lean.id === id) ?? null;
}

export function prioritiesFor(bucket: BucketId): Concept[] {
  return DEFAULT_PRIORITIES[bucket] ?? RUN_SHEET;
}
