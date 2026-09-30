import { describe, expect, it } from 'vitest';
import { distinctValues, filterFormations, mergeSubs, planBulkAssignment } from '@/domain/bulk';
import type { FormationSub } from '@/domain/types';
import { GUN_BUNCH, OFFENSE_FORMATIONS, makeContext } from './fixtures';

describe('filterFormations', () => {
  it('filters by set, personnel, distribution and name', () => {
    expect(filterFormations(OFFENSE_FORMATIONS, { set: 'Gun' })).toHaveLength(3);
    expect(filterFormations(OFFENSE_FORMATIONS, { personnel: '11' })).toHaveLength(2);
    expect(filterFormations(OFFENSE_FORMATIONS, { distribution: 'Trips' })).toHaveLength(1);
    expect(filterFormations(OFFENSE_FORMATIONS, { search: 'bunch' })).toHaveLength(1);
    expect(filterFormations(OFFENSE_FORMATIONS, { side: 'defense' })).toHaveLength(0);
  });

  it('lists the distinct values the filter UI needs', () => {
    expect(distinctValues(OFFENSE_FORMATIONS, 'set')).toEqual(['Gun', 'I Form', 'Singleback']);
  });
});

describe('planBulkAssignment', () => {
  it('assigns one player to the slot role across a filtered group', () => {
    const ctx = makeContext();
    const plan = planBulkAssignment(OFFENSE_FORMATIONS, ctx, { set: 'Gun' }, {
      role: 'SLWR',
      playerId: 'wr4',
      note: 'big slot in gun',
    });

    expect(plan.overrides).toHaveLength(3);
    expect(plan.overrides.every((o) => o.mode === 'override' && o.playerId === 'wr4')).toBe(true);
    expect(plan.targets.map((t) => t.formationId).sort()).toEqual([
      'gun-bunch',
      'gun-empty',
      'gun-trips-te',
    ]);
    expect(plan.targets[0].currentlyOverridden).toBe(false);
  });

  it('narrows to the formations inside the filter only', () => {
    const plan = planBulkAssignment(OFFENSE_FORMATIONS, makeContext(), { distribution: 'Trips' }, {
      role: 'SLWR',
      playerId: 'wr4',
    });
    expect(plan.overrides).toHaveLength(1);
    expect(plan.overrides[0].formationId).toBe('gun-trips-te');
  });

  it('skips formations that do not use the role at all', () => {
    // I Formation has no slot receiver spot bound to SLWR.
    const plan = planBulkAssignment(OFFENSE_FORMATIONS, makeContext(), {}, {
      role: 'SLWR',
      playerId: 'wr4',
    });
    expect(plan.skipped.map((s) => s.formationId).sort()).toEqual([
      'iform-pro',
      'singleback-ace',
    ]);
  });

  it('clears an override instead of writing one when given no player', () => {
    const existing: FormationSub = {
      formationId: GUN_BUNCH.id,
      slotKey: 'SLOT',
      mode: 'override',
      playerId: 'wr5',
      inheritSlotCode: null,
      inheritRank: null,
      note: null,
    };
    const ctx = makeContext({ subs: [existing] });
    const plan = planBulkAssignment([GUN_BUNCH], ctx, {}, { role: 'SLWR', playerId: null });
    expect(plan.overrides).toHaveLength(0);
    expect(plan.cleared).toEqual([
      { formationId: GUN_BUNCH.id, slotKey: 'SLOT', label: 'SLWR' },
    ]);
  });
});

describe('mergeSubs', () => {
  it('replaces an existing override and removes cleared ones', () => {
    const existing: FormationSub = {
      formationId: 'a',
      slotKey: 'SLOT',
      mode: 'override',
      playerId: 'x',
      inheritSlotCode: null,
      inheritRank: null,
      note: null,
    };
    const replacement: FormationSub = { ...existing, playerId: 'y' };
    const merged = mergeSubs([existing], {
      subs: [replacement],
      clears: [],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0].playerId).toBe('y');

    const cleared = mergeSubs(merged, { clears: [{ formationId: 'a', slotKey: 'SLOT' }] });
    expect(cleared).toHaveLength(0);
  });
});
