import { describe, expect, it } from 'vitest';
import { buildTeamDepthChart, type ChartCandidate } from '@/domain/depthChartSeed';
import { depthSlot } from '@/domain/depthSlots';

/**
 * The scouting/import path hands this builder a flat roster with no chart at all, so
 * these tests pin the rules the depth-chart screen explains: primaries first, package
 * roles as the next man up, returners by speed, and nobody starting twice.
 */

function player(
  id: string,
  position: string,
  overall: number,
  speed?: number,
): ChartCandidate {
  return { id, position, overall, speed };
}

/** A realistic 53-ish roster: deep everywhere except the thin spots we test below. */
function fullRoster(): ChartCandidate[] {
  return [
    player('qb1', 'QB', 92),
    player('qb2', 'QB', 78),
    player('qb3', 'QB', 68),
    player('hb1', 'HB', 90),
    player('hb2', 'HB', 80),
    player('hb3', 'HB', 76),
    player('hb4', 'HB', 70, 94),
    player('fb1', 'FB', 74),
    player('wr1', 'WR', 94),
    player('wr2', 'WR', 87),
    player('wr3', 'WR', 83),
    player('wr4', 'WR', 79),
    player('wr5', 'WR', 74),
    player('wr6', 'WR', 70, 96),
    player('te1', 'TE', 88),
    player('te2', 'TE', 76),
    player('te3', 'TE', 70),
    player('lt1', 'LT', 90),
    player('lt2', 'LT', 74),
    player('lg1', 'LG', 84),
    player('lg2', 'LG', 72),
    player('c1', 'C', 86),
    player('c2', 'C', 73),
    player('rg1', 'RG', 83),
    player('rg2', 'RG', 71),
    player('rt1', 'RT', 87),
    player('rt2', 'RT', 75),
    player('le1', 'LEDG', 89),
    player('le2', 'LEDG', 79),
    player('le3', 'LEDG', 72),
    player('re1', 'REDG', 86),
    player('re2', 'REDG', 78),
    player('re3', 'REDG', 71),
    player('dt1', 'DT', 85),
    player('dt2', 'DT', 81),
    player('dt3', 'DT', 74),
    player('nt1', 'NT', 82),
    player('sam1', 'SAM', 80),
    player('sam2', 'SAM', 72),
    player('mi1', 'MIKE', 88),
    player('mi2', 'MIKE', 74),
    player('wi1', 'WILL', 84),
    player('wi2', 'WILL', 73),
    player('cb1', 'CB', 91),
    player('cb2', 'CB', 86),
    player('cb3', 'CB', 80),
    player('cb4', 'CB', 74, 95),
    player('fs1', 'FS', 87),
    player('fs2', 'FS', 75),
    player('ss1', 'SS', 83),
    player('ss2', 'SS', 73),
    player('k1', 'K', 82),
    player('p1', 'P', 79),
    player('ls1', 'LS', 60),
  ];
}

const starter = (chart: ReturnType<typeof buildTeamDepthChart>, code: string) =>
  chart.entries[code]?.[0] ?? null;

describe('seeding a chart from a real roster', () => {
  const chart = buildTeamDepthChart(fullRoster());

  it('starts the best player at every primary position', () => {
    const expected: Record<string, string> = {
      QB: 'qb1',
      HB: 'hb1',
      FB: 'fb1',
      WR: 'wr1',
      TE: 'te1',
      LT: 'lt1',
      LG: 'lg1',
      C: 'c1',
      RG: 'rg1',
      RT: 'rt1',
      LEDG: 'le1',
      REDG: 're1',
      DT: 'dt1',
      SAM: 'sam1',
      MIKE: 'mi1',
      WILL: 'wi1',
      CB: 'cb1',
      FS: 'fs1',
      SS: 'ss1',
      K: 'k1',
      P: 'p1',
      LS: 'ls1',
    };
    for (const [code, id] of Object.entries(expected)) {
      expect(starter(chart, code), code).toBe(id);
    }
  });

  it('fills package roles with the next man up at their position', () => {
    expect(starter(chart, '3DRB')).toBe('hb2');
    expect(starter(chart, 'PWHB')).toBe('hb3');
    expect(starter(chart, 'SLWR')).toBe('wr2');
    expect(starter(chart, 'NT')).toBe('nt1');
    expect(starter(chart, 'RLE')).toBe('le2');
    expect(starter(chart, 'RRE')).toBe('re2');
    expect(starter(chart, 'RDT')).toBe('dt2');
    expect(starter(chart, 'SUBLB')).toBe('mi2');
    expect(starter(chart, 'SLCB')).toBe('cb2');
  });

  it('hands the return jobs to the fastest men left', () => {
    expect(starter(chart, 'KR')).toBe('wr6');
    expect(starter(chart, 'PR')).toBe('cb4');
  });

  it('mirrors the kickoff specialist onto the kicker, and only there', () => {
    expect(starter(chart, 'KOS')).toBe('k1');

    const starts = new Map<string, string[]>();
    for (const [code, ranked] of Object.entries(chart.entries)) {
      const id = ranked?.[0];
      if (!id) continue;
      starts.set(id, [...(starts.get(id) ?? []), code]);
    }
    const doubled = [...starts.entries()].filter(([, codes]) => codes.length > 1);
    expect(doubled).toEqual([['k1', ['K', 'KOS']]]);
  });

  it('never puts a player on a line he is not eligible for', () => {
    for (const [code, ranked] of Object.entries(chart.entries)) {
      const slot = depthSlot(code)!;
      for (const id of ranked.filter(Boolean) as string[]) {
        const man = fullRoster().find((candidate) => candidate.id === id)!;
        expect(slot.eligiblePositions.includes(man.position), `${code} -> ${id}`).toBe(true);
      }
    }
  });

  it('does not repeat a player on one line', () => {
    for (const [code, ranked] of Object.entries(chart.entries)) {
      const ids = ranked.filter(Boolean) as string[];
      expect(new Set(ids).size, code).toBe(ids.length);
    }
  });

  it('leaves nothing empty on a roster that carries every position', () => {
    expect(chart.empty).toEqual([]);
    expect(chart.starters).toBeGreaterThanOrEqual(30);
  });

  it('is deterministic', () => {
    expect(buildTeamDepthChart(fullRoster()).entries).toEqual(chart.entries);
  });
});

describe('when the roster is thin', () => {
  it('prefers an exact position match over a better player elsewhere', () => {
    const chart = buildTeamDepthChart([
      player('fs-stud', 'FS', 99),
      player('cb-ok', 'CB', 80),
      player('fs-ok', 'FS', 78),
    ]);
    expect(starter(chart, 'CB')).toBe('cb-ok');
    expect(starter(chart, 'FS')).toBe('fs-stud');
  });

  it('gives a role the best man left rather than leaving a hole', () => {
    const chart = buildTeamDepthChart([
      player('qb1', 'QB', 90),
      player('qb2', 'QB', 70),
      player('hb1', 'HB', 85),
      player('hb2', 'HB', 72),
      player('hb3', 'HB', 68),
    ]);
    // No fullback on the roster: the fullback role takes a back, as the game would.
    expect(starter(chart, 'FB')).toBe('hb2');
    expect(chart.empty).not.toContain('FB');
  });

  it('reports the roles nobody can fill instead of inventing a player', () => {
    const chart = buildTeamDepthChart([
      player('qb1', 'QB', 90),
      player('qb2', 'QB', 70),
      player('hb1', 'HB', 85),
    ]);
    expect(chart.empty).toContain('K');
    expect(chart.empty).toContain('P');
    expect(chart.empty).toContain('LS');
    expect(chart.empty).toContain('KR');
    expect(starter(chart, 'K')).toBeNull();
    expect(chart.notes.join(' ')).toContain('No eligible player for:');
  });
});
