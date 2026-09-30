import { describe, expect, it } from 'vitest';
import { auditPlan, conflictCounts, groupConflicts } from '@/domain/conflicts';
import { setDepthPlayer, type Formation, type FormationSub } from '@/domain/types';
import { GUN_TRIPS_TE, OFFENSE_FORMATIONS, makeContext } from './fixtures';

describe('auditPlan', () => {
  it('finds nothing wrong with a clean plan', () => {
    const conflicts = auditPlan(OFFENSE_FORMATIONS, makeContext());
    const errors = conflicts.filter((c) => c.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('reports an empty spot as an error', () => {
    const depthChart = setDepthPlayer(makeContext().depthChart, 'SLWR', 1, null);
    const conflicts = auditPlan(OFFENSE_FORMATIONS, makeContext({ depthChart }));
    const empties = conflicts.filter((c) => c.kind === 'empty');
    expect(empties).toHaveLength(3);
    expect(empties[0].severity).toBe('error');
  });

  it('reports the same player twice in one formation', () => {
    const depthChart = setDepthPlayer(makeContext().depthChart, 'SLWR', 1, 'wr1');
    const conflicts = auditPlan(OFFENSE_FORMATIONS, makeContext({ depthChart }));
    const duplicates = conflicts.filter((c) => c.kind === 'duplicate');
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].message).toContain('cannot field him twice');
  });

  it('distinguishes a stale pinned sub from a plain unavailable player', () => {
    const sub: FormationSub = {
      formationId: GUN_TRIPS_TE.id,
      slotKey: 'SLOT',
      mode: 'override',
      playerId: 'wr4',
      inheritSlotCode: null,
      inheritRank: null,
      note: 'pinned',
    };
    const ctx = makeContext({ subs: [sub] });
    ctx.playersById.wr4 = {
      id: 'wr4',
      position: 'WR',
      franchise: { injuryStatus: 'out', rosterStatus: 'active' },
    };
    const conflicts = auditPlan(OFFENSE_FORMATIONS, ctx);
    const stale = conflicts.filter((c) => c.kind === 'stale-override');
    expect(stale).toHaveLength(1);
    expect(stale[0].message).toContain('pinned formation sub');
  });

  it('flags a spot pointing at a role the vocabulary does not know', () => {
    const broken: Formation = {
      ...GUN_TRIPS_TE,
      slots: GUN_TRIPS_TE.slots.map((s) =>
        s.key === 'SLOT' ? { ...s, roleCode: 'MADEUP' } : s,
      ),
    };
    const conflicts = auditPlan([broken], makeContext());
    expect(conflicts.some((c) => c.kind === 'unknown-role')).toBe(true);
  });

  it('flags two spots in one formation inheriting from the same role', () => {
    const doubled: Formation = {
      ...GUN_TRIPS_TE,
      slots: GUN_TRIPS_TE.slots.map((s) =>
        s.key === 'WR_R' ? { ...s, roleCode: 'SLWR', roleRank: 1 } : s,
      ),
    };
    const conflicts = auditPlan([doubled], makeContext());
    expect(conflicts.some((c) => c.kind === 'duplicate-role')).toBe(true);
  });

  it('summarises by severity and groups repeats', () => {
    const depthChart = setDepthPlayer(makeContext().depthChart, 'SLWR', 1, null);
    const conflicts = auditPlan(OFFENSE_FORMATIONS, makeContext({ depthChart }));
    const counts = conflictCounts(conflicts);
    expect(counts.error).toBeGreaterThanOrEqual(3);
    const grouped = groupConflicts(conflicts);
    expect(grouped[0].count).toBeGreaterThanOrEqual(3);
  });
});
