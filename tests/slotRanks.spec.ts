import { describe, expect, it } from 'vitest';
import { normalizeSlotRanks, resolveFormation } from '@/domain/resolution';
import type { FormationSlot } from '@/domain/types';

const slot = (key: string, roleCode: string | null, roleRank = 1): FormationSlot => ({
  key,
  label: key,
  roleCode,
  roleRank,
  x: 0.5,
  y: 0.9,
  eligiblePositions: [],
  positionFallback: null,
});

describe('normalizeSlotRanks', () => {
  it('moves the second spot bound to a role onto the second man', () => {
    const normalized = normalizeSlotRanks([
      slot('WR1', 'WR'),
      slot('WR2', 'WR'),
      slot('WR3', 'WR'),
    ]);
    expect(normalized.map((s) => s.roleRank)).toEqual([1, 2, 3]);
  });

  it('keeps a deliberate rank when it does not clash', () => {
    const normalized = normalizeSlotRanks([slot('SLOT1', 'SLWR', 2)]);
    expect(normalized[0].roleRank).toBe(2);
  });

  it('respects an explicit order and only renumbers the clash', () => {
    const normalized = normalizeSlotRanks([
      slot('CB_L', 'CB', 1),
      slot('NB', 'NB', 1),
      slot('CB_R', 'CB', 1),
    ]);
    expect(normalized.map((s) => s.roleRank)).toEqual([1, 1, 2]);
  });

  it('leaves unbound spots alone', () => {
    const normalized = normalizeSlotRanks([slot('X', null), slot('Y', null)]);
    expect(normalized.map((s) => s.roleRank)).toEqual([1, 1]);
  });

  it('stops two spots in one formation resolving to the same player', () => {
    const slots = [slot('DT1', 'DT'), slot('DT2', 'DT')];
    const formation = {
      id: 'test',
      playbookId: 'pb',
      name: 'Test Front',
      set: '4-3',
      personnel: '4-3',
      distribution: 'Doubles',
      side: 'defense' as const,
      family: '',
      notes: null,
      slots: normalizeSlotRanks(slots),
      plays: [],
    };

    const ctx = {
      depthChart: { entries: { DT: ['dl1', 'dl2'] } },
      subs: [],
      playersById: {
        dl1: { id: 'dl1', position: 'DT' },
        dl2: { id: 'dl2', position: 'DT' },
      },
    };

    const resolution = resolveFormation(formation, ctx);
    expect(resolution.slots.map((s) => s.playerId)).toEqual(['dl1', 'dl2']);
    expect(resolution.duplicates).toEqual([]);
  });
});
