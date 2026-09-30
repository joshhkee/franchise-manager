import { recommendCalls, type CallRequest, type LookShown } from './engine';
import type { Concept } from './concepts';
import type { BucketId, Situation } from './callSheet';
import type { Formation } from './types';

/**
 * Drive mode.
 *
 * Deliberately not play-by-play bookkeeping: you tap one coarse outcome per play
 * and the drive advances, so the sheet can adapt to the new down and distance
 * without turning your game into data entry.
 */

export type CoarseOutcome =
  | 'no-gain'
  | 'short'
  | 'medium'
  | 'explosive'
  | 'incomplete'
  | 'sack'
  | 'penalty'
  | 'turnover'
  | 'td'
  | 'punt'
  | 'fg'
  | 'missed-fg'
  | 'safety'
  | 'end-half';

export const OUTCOME_LABELS: Record<CoarseOutcome, string> = {
  'no-gain': 'No gain',
  short: 'Short (1-3)',
  medium: 'Medium (4-9)',
  explosive: 'Explosive (10+)',
  incomplete: 'Incomplete',
  sack: 'Sack',
  penalty: 'Penalty (auto 1st)',
  turnover: 'Turnover',
  td: 'Touchdown',
  punt: 'Punt',
  fg: 'Field goal',
  'missed-fg': 'Missed FG',
  safety: 'Safety',
  'end-half': 'End of half',
};

/** Nominal yards used to advance the drive. */
export const OUTCOME_YARDS: Record<CoarseOutcome, number> = {
  'no-gain': 0,
  short: 2,
  medium: 6,
  explosive: 18,
  incomplete: 0,
  sack: -6,
  penalty: 5,
  turnover: 0,
  td: 100,
  punt: 0,
  fg: 0,
  'missed-fg': 0,
  safety: 0,
  'end-half': 0,
};

const TERMINAL: CoarseOutcome[] = [
  'turnover',
  'td',
  'punt',
  'fg',
  'missed-fg',
  'safety',
  'end-half',
];

export interface DriveCallRecord {
  sequence: number;
  formationId: string;
  formationName: string;
  playId: string;
  playName: string;
  concept: Concept;
  bucket: BucketId;
  outcome: CoarseOutcome;
  /** Situation before the snap. */
  down: number;
  distance: number;
  yardLine: number;
}

export type DriveStatus = 'active' | 'touchdown' | 'turnover' | 'punt' | 'field-goal' | 'ended';

export interface DriveState {
  id: string;
  opponent: string;
  side: 'offense' | 'defense';
  down: number;
  distance: number;
  yardLine: number;
  quarter: number;
  clockSeconds: number;
  scoreDiff: number;
  status: DriveStatus;
  calls: DriveCallRecord[];
}

export function createDrive(init: Partial<DriveState> = {}): DriveState {
  return {
    id: init.id ?? `drive-${Date.now()}`,
    opponent: init.opponent ?? 'CPU',
    side: init.side ?? 'offense',
    down: init.down ?? 1,
    distance: init.distance ?? 10,
    yardLine: init.yardLine ?? 25,
    quarter: init.quarter ?? 1,
    clockSeconds: init.clockSeconds ?? 900,
    scoreDiff: init.scoreDiff ?? 0,
    status: init.status ?? 'active',
    calls: init.calls ?? [],
  };
}

export function driveSituation(state: DriveState): Situation {
  return {
    down: state.down,
    distance: state.distance,
    yardLine: state.yardLine,
    quarter: state.quarter,
    clockSeconds: state.clockSeconds,
    scoreDiff: state.scoreDiff,
  };
}

export function looksFromDrive(state: DriveState): LookShown[] {
  return state.calls.map((call) => ({
    formationId: call.formationId,
    playId: call.playId,
    concept: call.concept,
    bucket: call.bucket,
  }));
}

const PLAY_CLOCK: Partial<Record<CoarseOutcome, number>> = {
  incomplete: 12,
  'end-half': 0,
};

function applyOutcome(
  state: DriveState,
  outcome: CoarseOutcome,
): { down: number; distance: number; yardLine: number; status: DriveStatus; notes: string[] } {
  const notes: string[] = [];

  if (TERMINAL.includes(outcome)) {
    const status: DriveStatus =
      outcome === 'td'
        ? 'touchdown'
        : outcome === 'punt'
          ? 'punt'
          : outcome === 'fg' || outcome === 'missed-fg'
            ? 'field-goal'
            : outcome === 'turnover'
              ? 'turnover'
              : 'ended';
    if (outcome === 'td') notes.push('Touchdown.');
    return { down: state.down, distance: state.distance, yardLine: state.yardLine, status, notes };
  }

  const yards = OUTCOME_YARDS[outcome];
  const newYardLine = Math.max(1, Math.min(99, state.yardLine + yards));

  if (outcome === 'penalty') {
    notes.push('Penalty gives you a fresh set.');
    return {
      down: 1,
      distance: Math.min(10, 100 - newYardLine),
      yardLine: newYardLine,
      status: 'active',
      notes,
    };
  }

  if (outcome === 'incomplete') {
    const nextDown = state.down + 1;
    if (nextDown > 4) {
      notes.push('Turnover on downs.');
      return { down: 4, distance: state.distance, yardLine: state.yardLine, status: 'turnover', notes };
    }
    return { down: nextDown, distance: state.distance, yardLine: state.yardLine, status: 'active', notes };
  }

  const gained = newYardLine - state.yardLine;
  const reachedGoal = newYardLine >= 99;

  if (reachedGoal) {
    notes.push('First and goal.');
    return { down: 1, distance: 100 - newYardLine, yardLine: newYardLine, status: 'active', notes };
  }

  if (gained >= state.distance) {
    const firstDownLine = newYardLine;
    notes.push('First down.');
    if (firstDownLine >= 80) notes.push('In the red zone.');
    return {
      down: 1,
      distance: Math.min(10, 100 - firstDownLine),
      yardLine: firstDownLine,
      status: 'active',
      notes,
    };
  }

  const nextDown = state.down + 1;
  if (nextDown > 4) {
    notes.push('Turnover on downs.');
    return { down: 4, distance: state.distance, yardLine: newYardLine, status: 'turnover', notes };
  }

  const remaining = Math.max(1, state.distance - gained);
  notes.push(`Next: ${nextDown}${nextDown === 2 ? 'nd' : nextDown === 3 ? 'rd' : 'th'} & ${remaining}`);
  return { down: nextDown, distance: remaining, yardLine: newYardLine, status: 'active', notes };
}

export function advanceDrive(
  state: DriveState,
  call: {
    formationId: string;
    formationName: string;
    playId: string;
    playName: string;
    concept: Concept;
    bucket: BucketId;
  },
  outcome: CoarseOutcome,
): { state: DriveState; notes: string[] } {
  const result = applyOutcome(state, outcome);
  const clockSpent = PLAY_CLOCK[outcome] ?? 32;
  const nextClock = Math.max(0, state.clockSeconds - clockSpent);

  const record: DriveCallRecord = {
    sequence: state.calls.length + 1,
    formationId: call.formationId,
    formationName: call.formationName,
    playId: call.playId,
    playName: call.playName,
    concept: call.concept,
    bucket: call.bucket,
    outcome,
    down: state.down,
    distance: state.distance,
    yardLine: state.yardLine,
  };

  const notes = [...result.notes];
  if (nextClock <= 120 && (state.quarter === 2 || state.quarter === 4) && result.status === 'active') {
    notes.push('Inside two minutes.');
  }

  return {
    state: {
      ...state,
      down: result.down,
      distance: result.distance,
      yardLine: result.yardLine,
      status: result.status,
      clockSeconds: nextClock,
      calls: [...state.calls, record],
    },
    notes,
  };
}

export function driveStatusLabel(status: DriveStatus): string {
  switch (status) {
    case 'active':
      return 'In progress';
    case 'touchdown':
      return 'Touchdown';
    case 'turnover':
      return 'Turnover';
    case 'punt':
      return 'Punt';
    case 'field-goal':
      return 'Field goal attempt';
    default:
      return 'Ended';
  }
}

/* -------------------------------------------------------------------------- */
/* Scripted drive                                                             */
/* -------------------------------------------------------------------------- */

export interface ScriptedCall {
  order: number;
  /** Path describing the branch that leads here, e.g. `1st & 10 -> 2nd & 4`. */
  path: string;
  formationId: string;
  formationName: string;
  playId: string;
  playName: string;
  concept: Concept;
  bucket: BucketId;
  situationLabel: string;
  contingency: string;
}

/**
 * Build a branched opening script.
 *
 * Each node is generated from the engine for its situation, then split into a
 * "gained enough" branch and a "did not" branch — which is what a paper script
 * gives you before you know how the drive is actually going.
 */
export function scriptDrive(
  formations: Formation[],
  request: CallRequest,
  maxCalls = 10,
): ScriptedCall[] {
  const script: ScriptedCall[] = [];
  const seen = new Set<string>();

  interface Node {
    situation: Situation;
    path: string;
    contingency: string;
  }

  const queue: Node[] = [
    {
      situation: request.situation,
      path: '',
      contingency: 'Opening call of the drive',
    },
  ];

  let order = 0;

  while (queue.length > 0 && script.length < maxCalls) {
    const node = queue.shift()!;
    const signature = `${node.situation.down}-${node.situation.distance}-${node.situation.yardLine}`;
    if (seen.has(signature)) continue;
    seen.add(signature);

    const recommendation = recommendCalls(formations, {
      ...request,
      situation: node.situation,
    });
    if (!recommendation) continue;

    order += 1;
    script.push({
      order,
      path: node.path,
      formationId: recommendation.primary.formationId,
      formationName: recommendation.primary.formationName,
      playId: recommendation.primary.playId,
      playName: recommendation.primary.playName,
      concept: recommendation.primary.tag.concept,
      bucket: recommendation.bucket,
      situationLabel: recommendation.situationLabel,
      contingency: node.contingency,
    });

    const base: DriveState = createDrive({
      down: node.situation.down,
      distance: node.situation.distance,
      yardLine: node.situation.yardLine,
      quarter: node.situation.quarter,
      clockSeconds: node.situation.clockSeconds,
      scoreDiff: node.situation.scoreDiff,
    });

    for (const [outcome, label] of [
      ['medium', 'if you gained 4+'],
      ['short', 'if you gained under 4'],
    ] as const) {
      const advanced = advanceDrive(
        base,
        {
          formationId: recommendation.primary.formationId,
          formationName: recommendation.primary.formationName,
          playId: recommendation.primary.playId,
          playName: recommendation.primary.playName,
          concept: recommendation.primary.tag.concept,
          bucket: recommendation.bucket,
        },
        outcome,
      );
      if (advanced.state.status !== 'active') continue;
      queue.push({
        situation: driveSituation(advanced.state),
        path: node.path ? `${node.path} \u2192 ${label}` : label,
        contingency: label,
      });
    }
  }

  return script;
}
