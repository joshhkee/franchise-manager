import { describe, expect, it } from 'vitest';
import { formationsUsingRole, resolveFormation } from '@/domain/resolution';
import { setDepthPlayer, type FormationSub } from '@/domain/types';
import { GUN_BUNCH, GUN_TRIPS_TE, OFFENSE_FORMATIONS, makeContext, makeRoster } from './fixtures';

function sub(overrides: Partial<FormationSub>): FormationSub {
  return {
    formationId: GUN_TRIPS_TE.id,
    slotKey: 'SLOT',
    mode: 'inherit',
    playerId: null,
    inheritSlotCode: null,
    inheritRank: null,
    note: null,
    ...overrides,
  };
}

describe('resolveFormation', () => {
  it('inherits the slot receiver from the SLWR depth chart role', () => {
    const ctx = makeContext();
    const res = resolveFormation(GUN_TRIPS_TE, ctx);
    const slot = res.slots.find((s) => s.slotKey === 'SLOT')!;
    expect(slot.playerId).toBe('wr3');
    expect(slot.source).toBe('inherit');
    expect(slot.roleUsed).toEqual({ code: 'SLWR', rank: 1 });
  });

  it('maps each formation spot to its own depth chart role', () => {
    const res = resolveFormation(GUN_TRIPS_TE, makeContext());
    const byKey = Object.fromEntries(res.slots.map((s) => [s.slotKey, s.playerId]));
    expect(byKey.QB).toBe('qb1');
    expect(byKey.HB).toBe('hb1');
    expect(byKey.WR_L).toBe('wr1');
    expect(byKey.WR_R).toBe('wr2');
    expect(byKey.TE).toBe('te1');
    expect(byKey).toMatchObject({ LT: 'lt1', C: 'c1', RT: 'rt1' });
  });

  it('lets a formation sub (override) win over the depth chart', () => {
    const ctx = makeContext({ subs: [sub({ mode: 'override', playerId: 'wr4' })] });
    const res = resolveFormation(GUN_TRIPS_TE, ctx);
    const slot = res.slots.find((s) => s.slotKey === 'SLOT')!;
    expect(slot.playerId).toBe('wr4');
    expect(slot.source).toBe('override');
  });

  it('only changes the formation the override belongs to', () => {
    const ctx = makeContext({ subs: [sub({ mode: 'override', playerId: 'wr4' })] });
    const trips = resolveFormation(GUN_TRIPS_TE, ctx);
    const bunch = resolveFormation(GUN_BUNCH, ctx);
    expect(trips.slots.find((s) => s.slotKey === 'SLOT')!.playerId).toBe('wr4');
    expect(bunch.slots.find((s) => s.slotKey === 'SLOT')!.playerId).toBe('wr3');
  });

  it('can rebind a spot to a different role instead of the slot default', () => {
    const ctx = makeContext({
      subs: [sub({ mode: 'inherit', inheritSlotCode: 'SLWR', inheritRank: 2 })],
    });
    const res = resolveFormation(GUN_TRIPS_TE, ctx);
    const slot = res.slots.find((s) => s.slotKey === 'SLOT')!;
    expect(slot.playerId).toBe('wr4');
    expect(slot.roleUsed).toEqual({ code: 'SLWR', rank: 2 });
  });

  it('reports a problem instead of guessing when the depth chart is empty', () => {
    const depthChart = setDepthPlayer(makeContext().depthChart, 'SLWR', 1, null);
    const res = resolveFormation(GUN_TRIPS_TE, makeContext({ depthChart }));
    const slot = res.slots.find((s) => s.slotKey === 'SLOT')!;
    expect(slot.playerId).toBeNull();
    expect(slot.source).toBe('unresolved');
    expect(slot.problem).toContain('SLWR');
    expect(res.unresolved.map((u) => u.slotKey)).toContain('SLOT');
  });

  it('flags a player who would be on the field twice', () => {
    const depthChart = setDepthPlayer(makeContext().depthChart, 'SLWR', 1, 'wr1');
    const res = resolveFormation(GUN_TRIPS_TE, makeContext({ depthChart }));
    expect(res.duplicates).toHaveLength(1);
    expect(res.duplicates[0].playerId).toBe('wr1');
    expect(res.duplicates[0].labels.sort()).toEqual(['SLWR', 'WR1']);
  });

  it('flags unavailable players without removing them from the plan', () => {
    const ctx = makeContext({
      subs: [sub({ mode: 'override', playerId: 'wr3' })],
    });
    ctx.playersById.wr3 = {
      id: 'wr3',
      position: 'WR',
      franchise: { injuryStatus: 'out', rosterStatus: 'active' },
    };
    const res = resolveFormation(GUN_TRIPS_TE, ctx);
    expect(res.slots.find((s) => s.slotKey === 'SLOT')!.playerId).toBe('wr3');
    expect(res.unavailable[0].playerId).toBe('wr3');
    expect(res.unavailable[0].problem).toContain('out');
  });

  it('lists every formation that consults a role', () => {
    const using = formationsUsingRole(OFFENSE_FORMATIONS, makeContext(), 'SLWR');
    expect(using.map((u) => u.formation.id).sort()).toEqual([
      'gun-bunch',
      'gun-empty',
      'gun-trips-te',
    ]);
  });
});
