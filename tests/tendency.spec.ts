import { describe, expect, it } from 'vitest';
import { buildTendencyReport, EMPTY_TENDENCY_REPORT, type CallRecord } from '@/domain/tendency';
import type { Concept, PlayFamily } from '@/domain/concepts';
import { GUN_BUNCH, GUN_TRIPS_TE } from './fixtures';

function record(
  index: number,
  concept: Concept,
  family: PlayFamily,
  formationId = GUN_TRIPS_TE.id,
): CallRecord {
  return {
    id: `call-${index}`,
    formationId,
    formationName: formationId === GUN_TRIPS_TE.id ? 'Gun Trips TE Offset' : 'Gun Bunch Open',
    set: 'Gun',
    personnel: '11',
    distribution: 'Trips',
    concept,
    family,
    playName: 'Test Play',
    down: 1,
    distance: 10,
    yardLine: 25,
    bucket: '1st-10',
    sequence: index,
  };
}

describe('buildTendencyReport', () => {
  it('returns an empty report when nothing has been called', () => {
    expect(buildTendencyReport([])).toEqual(EMPTY_TENDENCY_REPORT);
  });

  it('counts run and pass balance', () => {
    const records = [
      record(1, 'inside-zone', 'run'),
      record(2, 'gap-power', 'run'),
      record(3, 'dropback-mid', 'pass'),
      record(4, 'play-action-deep', 'play-action'),
    ];
    const report = buildTendencyReport(records);
    expect(report.totalCalls).toBe(4);
    expect(report.runs).toBe(2);
    expect(report.passes).toBe(2);
    expect(report.passRate).toBe(0.5);
  });

  it('calls out a formation you only ever pass from', () => {
    const records = [
      record(1, 'dropback-mid', 'pass'),
      record(2, 'dropback-deep', 'pass'),
      record(3, 'quick-game', 'pass'),
      record(4, 'screen', 'screen'),
    ];
    const report = buildTendencyReport(records);
    const tell = report.tells.find((t) => t.id === `formation:${GUN_TRIPS_TE.id}`);
    expect(tell).toBeDefined();
    expect(tell!.headline).toContain('pass tell');
    expect(tell!.fix).toBeTruthy();
  });

  it('calls out a predictable look across sister formations', () => {
    const records = [
      record(1, 'dropback-mid', 'pass', GUN_TRIPS_TE.id),
      record(2, 'dropback-deep', 'pass', GUN_TRIPS_TE.id),
      record(3, 'quick-game', 'pass', GUN_BUNCH.id),
      record(4, 'screen', 'screen', GUN_BUNCH.id),
      record(5, 'dropback-short', 'pass', GUN_BUNCH.id),
    ];
    const report = buildTendencyReport(records);
    expect(report.tells.some((t) => t.id === 'look:Gun-Trips')).toBe(true);
  });

  it('ranks tells by how loud the signal is', () => {
    const records: CallRecord[] = [];
    for (let i = 0; i < 8; i += 1) {
      records.push(record(i + 1, i % 2 === 0 ? 'dropback-mid' : 'dropback-deep', 'pass'));
    }
    const report = buildTendencyReport(records);
    expect(report.tells.length).toBeGreaterThan(0);
    for (let i = 1; i < report.tells.length; i += 1) {
      expect(report.tells[i - 1].strength).toBeGreaterThanOrEqual(report.tells[i].strength);
    }
    expect(report.suggestions.length).toBe(report.tells.length);
  });

  it('breaks tendencies down by bucket and down for the self-scout view', () => {
    const report = buildTendencyReport([
      record(1, 'inside-zone', 'run'),
      record(2, 'dropback-mid', 'pass'),
    ]);
    expect(report.byBucket[0].label).toContain('1st & 10');
    expect(report.byDown[0].label).toContain('1st down');
    expect(report.conceptCounts[0].share).toBeGreaterThan(0);
  });
});
