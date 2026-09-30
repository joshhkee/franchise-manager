import { describe, expect, it } from 'vitest';
import { diffPlaybooks, diffSummary, rolesUsedBy } from '@/domain/planDiff';
import type { DepthChartState, Formation, FormationSlot } from '@/domain/types';

const slot = (key: string, roleCode: string | null): FormationSlot => ({
  key,
  label: key,
  roleCode,
  roleRank: 1,
  x: 0.5,
  y: 0.9,
  eligiblePositions: [],
  positionFallback: null,
});

function formation(
  id: string,
  playbookId: string,
  name: string,
  personnel: string,
  slotRoles: (string | null)[],
): Formation {
  return {
    id,
    playbookId,
    name,
    set: 'Gun',
    personnel,
    distribution: 'Doubles',
    side: 'offense',
    family: 'gun-doubles',
    notes: null,
    slots: slotRoles.map((code, index) => slot(`S${index}`, code)),
    plays: [],
  };
}

const chart = (entries: Record<string, (string | null)[]>): DepthChartState => ({ entries });

describe('rolesUsedBy', () => {
  it('counts slots and names each formation once per role', () => {
    const usage = rolesUsedBy([
      formation('a', 'pb-a', 'Gun Trips', '11', ['WR', 'WR', 'SLWR', null]),
      formation('b', 'pb-a', 'Gun Bunch', '11', ['WR', 'TE']),
    ]);
    expect(usage.get('WR')).toEqual({
      code: 'WR',
      slots: 3,
      formations: ['Gun Bunch', 'Gun Trips'],
    });
    expect(usage.get('SLWR')?.slots).toBe(1);
    expect(usage.get('TE')?.slots).toBe(1);
    expect(usage.has('X')).toBe(false);
  });

  it('ignores spots with no role bound', () => {
    const usage = rolesUsedBy([formation('a', 'pb-a', 'Goal Line', '22', [null, null])]);
    expect(usage.size).toBe(0);
  });
});

describe('diffPlaybooks', () => {
  const from = { id: 'pb-a', name: 'Shanahan' };
  const to = { id: 'pb-b', name: 'Spread' };

  const fromFormations = [
    formation('a1', 'pb-a', 'Gun Trips', '11', ['QB', 'HB', 'WR', 'SLWR', 'TE', 'LT']),
    formation('a2', 'pb-a', 'I Form Pro', '21', ['QB', 'HB', 'FB', 'WR', 'TE', 'RT']),
  ];
  const toFormations = [
    formation('b1', 'pb-b', 'Gun Empty', '01', ['QB', 'SLWR', 'WR', 'WR', 'GAD', 'LT']),
    formation('b2', 'pb-b', 'Gun Doubles', '11', ['QB', 'HB', 'WR', 'WR', 'TE', 'RT']),
  ];

  const result = diffPlaybooks({
    from,
    to,
    fromFormations,
    toFormations,
    depthChart: chart({
      QB: ['qb1'],
      HB: ['hb1'],
      FB: ['fb1'],
      WR: ['wr1'],
      SLWR: ['wr3'],
      TE: ['te1'],
      LT: ['lt1'],
      RT: ['rt1'],
      GAD: [null],
    }),
  });

  it('marks roles the new playbook adds, drops and keeps', () => {
    const byCode = new Map(result.roles.map((role) => [role.code, role]));
    expect(byCode.get('GAD')?.status).toBe('added');
    expect(byCode.get('FB')?.status).toBe('dropped');
    expect(byCode.get('QB')?.status).toBe('kept');
    expect(result.addedRoles.map((role) => role.code)).toEqual(['GAD']);
    expect(result.droppedRoles.map((role) => role.code)).toEqual(['FB']);
  });

  it('treats a role the new playbook uses but nobody holds as a hole', () => {
    expect(result.newHoles.map((role) => role.code)).toEqual(['GAD']);
    expect(result.newHoles[0].staffed).toBe(false);
  });

  it('does not call a staffed added role a hole', () => {
    const staffed = diffPlaybooks({
      from,
      to,
      fromFormations,
      toFormations,
      depthChart: chart({ QB: ['qb1'], GAD: ['rb9'] }),
    });
    expect(staffed.newHoles).toEqual([]);
    expect(staffed.addedRoles.map((role) => role.code)).toEqual(['GAD']);
  });

  it('reports a starter whose only role disappears', () => {
    expect(result.displacedStarters).toEqual([{ playerId: 'fb1', roleCode: 'FB' }]);
  });

  it('spares a starter who still has a job somewhere else', () => {
    const spare = diffPlaybooks({
      from,
      to,
      fromFormations,
      toFormations,
      depthChart: chart({ FB: ['hb1'], HB: ['hb1'], QB: ['qb1'] }),
    });
    expect(spare.displacedStarters).toEqual([]);
  });

  it('counts formation overlap by name', () => {
    const overlapping = diffPlaybooks({
      from,
      to,
      fromFormations,
      toFormations: [
        formation('b1', 'pb-b', 'Gun Trips', '11', ['QB']),
        formation('b2', 'pb-b', 'Gun Empty', '01', ['QB']),
      ],
      depthChart: chart({}),
    });
    expect(overlapping.formationCount).toEqual({ from: 2, to: 2, shared: 1 });
    expect(overlapping.formationsOnlyInTo).toEqual(['Gun Empty']);
    expect(overlapping.formationsOnlyInFrom).toEqual(['I Form Pro']);
  });

  it('tallies personnel groups on both sides', () => {
    const personnel = new Map(result.personnel.map((group) => [group.group, group]));
    expect(personnel.get('11')).toEqual({ group: '11', from: 1, to: 1 });
    expect(personnel.get('21')).toEqual({ group: '21', from: 1, to: 0 });
    expect(personnel.get('01')).toEqual({ group: '01', from: 0, to: 1 });
  });

  it('is deterministic', () => {
    const again = diffPlaybooks({ from, to, fromFormations, toFormations, depthChart: chart({}) });
    expect(again.roles.map((role) => role.code)).toEqual(result.roles.map((role) => role.code));
    expect(again.personnel).toEqual(result.personnel);
  });

  it('handles an empty playbook without throwing', () => {
    const empty = diffPlaybooks({
      from,
      to,
      fromFormations: [],
      toFormations: [],
      depthChart: chart({}),
    });
    expect(empty.roles).toEqual([]);
    expect(empty.newHoles).toEqual([]);
    expect(empty.formationCount).toEqual({ from: 0, to: 0, shared: 0 });
  });

  it('summarises what the switch costs', () => {
    expect(diffSummary(result)).toContain('GAD');
    expect(diffSummary(result)).toContain('One starter loses his spot');
    expect(
      diffSummary(
        diffPlaybooks({ from, to, fromFormations, toFormations, depthChart: chart({ GAD: ['x'] }) }),
      ),
    ).toContain('already has someone');
  });

  it('summarises more than one displaced starter in the plural', () => {
    const many = diffPlaybooks({
      from,
      to,
      fromFormations,
      toFormations: [formation('b1', 'pb-b', 'Gun Empty', '01', ['QB'])],
      depthChart: chart({ FB: ['fb1'], HB: ['hb1'] }),
    });
    expect(many.displacedStarters).toHaveLength(2);
    expect(diffSummary(many)).toContain('2 starters lose their spots');
  });
});
