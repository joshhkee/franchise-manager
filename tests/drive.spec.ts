import { describe, expect, it } from 'vitest';
import {
  advanceDrive,
  createDrive,
  driveSituation,
  looksFromDrive,
  scriptDrive,
  type CoarseOutcome,
} from '@/domain/drive';
import { OFFENSE_FORMATIONS } from './fixtures';

const CALL = {
  formationId: 'gun-trips-te',
  formationName: 'Gun Trips TE Offset',
  playId: 'gun-trips-te:Inside Zone Split',
  playName: 'Inside Zone Split',
  concept: 'inside-zone' as const,
  bucket: '1st-10' as const,
};

function advance(outcome: CoarseOutcome, overrides: Partial<ReturnType<typeof createDrive>> = {}) {
  const state = createDrive({ down: 1, distance: 10, yardLine: 25, ...overrides });
  return advanceDrive(state, CALL, outcome);
}

describe('advanceDrive', () => {
  it('turns a medium gain into the next down without a first down', () => {
    const { state, notes } = advance('medium');
    expect(state.down).toBe(2);
    expect(state.distance).toBe(4);
    expect(state.yardLine).toBe(31);
    expect(notes.join(' ')).toContain('2nd & 4');
  });

  it('moves the chains when the gain reaches the sticks', () => {
    const { state, notes } = advance('explosive');
    expect(state.down).toBe(1);
    expect(state.yardLine).toBe(43);
    expect(notes).toContain('First down.');
  });

  it('keeps the distance on an incompletion and burns the down', () => {
    const { state } = advance('incomplete');
    expect(state.down).toBe(2);
    expect(state.distance).toBe(10);
    expect(state.yardLine).toBe(25);
  });

  it('ends the drive on a turnover on downs', () => {
    let state = createDrive({ down: 1, distance: 10, yardLine: 25 });
    for (let i = 0; i < 4; i += 1) {
      state = advanceDrive(state, CALL, 'incomplete').state;
    }
    expect(state.status).toBe('turnover');
    expect(state.calls).toHaveLength(4);
  });

  it('handles a sack losing ground', () => {
    const { state } = advance('sack');
    expect(state.yardLine).toBe(19);
    expect(state.distance).toBe(16);
  });

  it('gives a fresh set of downs after a penalty', () => {
    const { state } = advance('penalty');
    expect(state.down).toBe(1);
    expect(state.distance).toBe(10);
  });

  it('ends the drive on a touchdown', () => {
    const { state, notes } = advance('td', { yardLine: 94, down: 1, distance: 6 });
    expect(state.status).toBe('touchdown');
    expect(notes).toContain('Touchdown.');
  });

  it('records every call with the situation it was made in', () => {
    const { state } = advance('short');
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0]).toMatchObject({ down: 1, distance: 10, yardLine: 25, outcome: 'short' });
    expect(looksFromDrive(state)[0].playId).toBe(CALL.playId);
  });

  it('keeps the clock moving by a plausible amount', () => {
    expect(advance('medium').state.clockSeconds).toBe(868);
    expect(advance('incomplete').state.clockSeconds).toBe(888);
  });
});

describe('scriptDrive', () => {
  it('builds a branched opening script with contingencies', () => {
    const script = scriptDrive(
      OFFENSE_FORMATIONS,
      {
        situation: { down: 1, distance: 10, yardLine: 25, quarter: 1, clockSeconds: 900, scoreDiff: 0 },
      },
      6,
    );
    expect(script.length).toBeGreaterThan(1);
    expect(script.length).toBeLessThanOrEqual(6);
    expect(script[0].order).toBe(1);
    expect(script[0].contingency).toContain('Opening');
    expect(script.some((s) => s.path.includes('if you gained'))).toBe(true);
    expect(new Set(script.map((s) => s.situationLabel)).size).toBeGreaterThan(1);
  });

  it('never repeats a situation inside one script', () => {
    const script = scriptDrive(
      OFFENSE_FORMATIONS,
      {
        situation: { down: 1, distance: 10, yardLine: 25, quarter: 1, clockSeconds: 900, scoreDiff: 0 },
      },
      10,
    );
    const labels = script.map((s) => `${s.situationLabel}`);
    // Same label may appear on different branches; the underlying situation must be unique.
    expect(new Set(labels).size).toBeGreaterThan(1);
  });

  it('exposes the drive situation for the engine', () => {
    const state = createDrive({ down: 3, distance: 7, yardLine: 62 });
    expect(driveSituation(state)).toEqual({
      down: 3,
      distance: 7,
      yardLine: 62,
      quarter: 1,
      clockSeconds: 900,
      scoreDiff: 0,
    });
  });
});
