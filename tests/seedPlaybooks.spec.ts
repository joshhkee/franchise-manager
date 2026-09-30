import { describe, expect, it } from 'vitest';
import { PLAYBOOK_SEEDS } from '@/data/seed/playbooks';
import { DEPTH_SLOT_BY_CODE } from '@/domain/depthSlots';
import { derivePersonnel, classifyFormation } from '@/domain/families';
import type { Formation } from '@/domain/types';

const asFormation = (playbookId: string, side: Formation['side'], seed: (typeof PLAYBOOK_SEEDS)[number]['formations'][number]): Formation => ({
  id: seed.id,
  playbookId,
  name: seed.name,
  set: seed.set,
  personnel: seed.personnel ?? '',
  distribution: seed.distribution,
  side,
  family: '',
  slots: seed.slots.map((slot) => ({
    key: slot.key,
    label: slot.label,
    roleCode: slot.role,
    roleRank: slot.rank ?? 1,
    x: slot.x,
    y: slot.y,
    eligiblePositions: slot.eligible,
    positionFallback: slot.fallback ?? null,
  })),
  plays: seed.plays.map((name) => ({ id: `${seed.id}:${name}`, name })),
  notes: seed.notes ?? null,
});

describe('seed playbooks', () => {
  it('gives every formation exactly eleven spots', () => {
    for (const playbook of PLAYBOOK_SEEDS) {
      for (const formation of playbook.formations) {
        expect(formation.slots, `${playbook.id}/${formation.id}`).toHaveLength(11);
      }
    }
  });

  it('uses unique slot keys inside a formation', () => {
    for (const playbook of PLAYBOOK_SEEDS) {
      for (const formation of playbook.formations) {
        const keys = formation.slots.map((slot) => slot.key);
        expect(new Set(keys).size, `${playbook.id}/${formation.id}`).toBe(keys.length);
      }
    }
  });

  it('points every spot at a real depth-chart role', () => {
    for (const playbook of PLAYBOOK_SEEDS) {
      for (const formation of playbook.formations) {
        for (const slot of formation.slots) {
          expect(slot.role, `${formation.id}/${slot.key} has no role`).not.toBeNull();
          expect(DEPTH_SLOT_BY_CODE[slot.role!], `${formation.id}/${slot.key}`).toBeDefined();
          expect(slot.rank ?? 1).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it('ships all five special-teams units, and keeps them off offense and defense', () => {
    const special = PLAYBOOK_SEEDS.filter((playbook) => playbook.side === 'special');
    expect(special).toHaveLength(1);

    const units = special[0]!.formations.map((formation) => formation.id);
    expect(units).toEqual([
      'st-fg',
      'st-punt',
      'st-punt-return',
      'st-kickoff',
      'st-kick-return',
    ]);
  });

  it('never asks one unit to field the placekicker and the kickoff specialist together', () => {
    // K and KOS are the same man on most rosters, and H is usually the punter, so a
    // unit that binds both would put one player at two spots on the field.
    for (const playbook of PLAYBOOK_SEEDS) {
      for (const formation of playbook.formations) {
        const roles = formation.slots.map((slot) => slot.role);
        expect(roles.includes('K') && roles.includes('KOS'), formation.id).toBe(false);
        expect(roles.includes('P') && roles.includes('H'), formation.id).toBe(false);
      }
    }
  });

  it('labelling the return units does not collapse them into the kicking units', () => {
    const special = PLAYBOOK_SEEDS.find((playbook) => playbook.side === 'special')!;
    const sets = special.formations.map((formation) => {
      const seed = formation;
      return classifyFormation(asFormation('pb-special-teams', 'special', seed)).set;
    });
    expect(sets).toEqual(['fg', 'punt', 'punt-return', 'kickoff', 'kick-return']);
  });

  it('keeps special-teams personnel labels rather than deriving an 11/12 grouping', () => {
    const special = PLAYBOOK_SEEDS.find((playbook) => playbook.side === 'special')!;
    for (const formation of special.formations) {
      const klass = classifyFormation(asFormation('pb-special-teams', 'special', formation));
      expect(klass.personnel).toBe(formation.personnel);
    }
  });
});

describe('derivePersonnel', () => {
  it('counts backs and tight ends for an offensive grouping', () => {
    const formation = asFormation('pb-shanahan', 'offense', {
      id: 'x',
      name: 'Gun Trips',
      set: 'Gun',
      distribution: 'Doubles',
      slots: [
        ...Array.from({ length: 5 }, (_, index) => ({
          key: `OL${index}`,
          label: 'OL',
          role: 'LT',
          x: 0.5,
          y: 0.9,
          eligible: ['LT'],
        })),
        { key: 'QB', label: 'QB', role: 'QB', x: 0.5, y: 0.8, eligible: ['QB'] },
        { key: 'HB', label: 'HB', role: 'HB', x: 0.4, y: 0.7, eligible: ['HB'] },
        { key: 'TE', label: 'TE', role: 'TE', x: 0.6, y: 0.9, eligible: ['TE'] },
        { key: 'W1', label: 'WR', role: 'WR', x: 0.2, y: 0.95, eligible: ['WR'] },
        { key: 'W2', label: 'WR', role: 'WR', x: 0.3, y: 0.95, eligible: ['WR'] },
        { key: 'W3', label: 'WR', role: 'WR', x: 0.4, y: 0.95, eligible: ['WR'] },
      ],
      plays: [],
    });
    expect(derivePersonnel(formation)).toBe('11');
  });
});
