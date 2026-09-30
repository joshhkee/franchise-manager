/**
 * Plan diffing across playbooks.
 *
 * Phase 5's ask is not "what is in playbook B" — that is Phase 4's comparer — but **"what
 * would switching to B do to my plan"**. So this works off the depth-chart roles a
 * playbook actually consults rather than its play list:
 *
 * - roles B uses that A does not — the jobs you would suddenly have to fill;
 * - roles A uses that B does not — the jobs that disappear, and the starters who held
 *   them and would lose their spot;
 * - roles both use, so they survive the switch;
 * - who is left with nobody at all, which is the actionable part.
 *
 * Like everything else in `src/domain`, it is pure: formations and a depth chart in, a
 * diff out, no database and no clock.
 */

import type { DepthChartState, Formation } from './types';

/**
 * Just enough of a playbook to diff: an id and a name.
 *
 * Deliberately narrower than the `Playbook` type so a row straight from the database,
 * whose `side` arrives as a plain string, is structurally acceptable.
 */
export interface PlaybookRef {
  id: string;
  name: string;
}

export interface RoleUsage {
  code: string;
  /** How many formation slots consult this role. */
  slots: number;
  /** Formations that consult it, by name, sorted. */
  formations: string[];
}

export interface RoleDiff extends RoleUsage {
  fromSlots: number;
  toSlots: number;
  status: 'added' | 'dropped' | 'kept';
  /** The plan has a rank-1 player for this role. */
  staffed: boolean;
  /** The rank-1 player's id, when there is one. */
  starterId: string | null;
}

export interface PersonnelGroupDiff {
  group: string;
  from: number;
  to: number;
}

export interface PlaybookPlanDiff {
  from: PlaybookRef;
  to: PlaybookRef;
  formationCount: { from: number; to: number; shared: number };
  /** Formations only the `from` playbook has. */
  formationsOnlyInFrom: string[];
  /** Formations only the `to` playbook has. */
  formationsOnlyInTo: string[];
  /** Every role either side consults, with its status. */
  roles: RoleDiff[];
  addedRoles: RoleDiff[];
  droppedRoles: RoleDiff[];
  /** Roles the new playbook adds that the plan has nobody for. */
  newHoles: RoleDiff[];
  /**
   * Starters whose only job was in a dropped role, so the switch leaves them unassigned.
   */
  displacedStarters: { playerId: string; roleCode: string }[];
  personnel: PersonnelGroupDiff[];
}

/** Which depth-chart roles a set of formations consults, and how often. */
export function rolesUsedBy(formations: Formation[]): Map<string, RoleUsage> {
  const usage = new Map<string, RoleUsage>();
  for (const formation of formations) {
    const seen = new Set<string>();
    for (const slot of formation.slots) {
      const code = slot.roleCode;
      if (!code) continue;
      const entry = usage.get(code) ?? { code, slots: 0, formations: [] };
      entry.slots += 1;
      if (!seen.has(code)) {
        entry.formations.push(formation.name);
        seen.add(code);
      }
      usage.set(code, entry);
    }
  }
  for (const entry of usage.values()) entry.formations.sort();
  return usage;
}

function personnelTally(formations: Formation[]): Map<string, number> {
  const tally = new Map<string, number>();
  for (const formation of formations) {
    tally.set(formation.personnel, (tally.get(formation.personnel) ?? 0) + 1);
  }
  return tally;
}

export function diffPlaybooks(input: {
  from: PlaybookRef;
  to: PlaybookRef;
  fromFormations: Formation[];
  toFormations: Formation[];
  depthChart: DepthChartState;
}): PlaybookPlanDiff {
  const { from, to, fromFormations, toFormations, depthChart } = input;

  const fromRoles = rolesUsedBy(fromFormations);
  const toRoles = rolesUsedBy(toFormations);

  const codes = [...new Set([...fromRoles.keys(), ...toRoles.keys()])].sort();
  const roles: RoleDiff[] = codes.map((code) => {
    const fromUsage = fromRoles.get(code);
    const toUsage = toRoles.get(code);
    const fromSlots = fromUsage?.slots ?? 0;
    const toSlots = toUsage?.slots ?? 0;
    const status: RoleDiff['status'] =
      fromSlots === 0 ? 'added' : toSlots === 0 ? 'dropped' : 'kept';
    const starterId = depthChart.entries[code]?.[0] ?? null;
    return {
      code,
      slots: toSlots || fromSlots,
      formations: (toSlots > 0 ? toUsage : fromUsage)?.formations ?? [],
      fromSlots,
      toSlots,
      status,
      staffed: Boolean(starterId),
      starterId,
    };
  });

  const fromNames = new Set(fromFormations.map((formation) => formation.name));
  const toNames = new Set(toFormations.map((formation) => formation.name));

  const addedRoles = roles.filter((role) => role.status === 'added');
  const droppedRoles = roles.filter((role) => role.status === 'dropped');
  const newHoles = addedRoles.filter((role) => !role.staffed);

  // A starter loses his spot only when *every* role he starts at disappears.
  const survivingRoles = new Set(
    roles.filter((role) => role.status !== 'dropped').map((role) => role.code),
  );
  const displaced: { playerId: string; roleCode: string }[] = [];
  const seen = new Set<string>();
  for (const role of droppedRoles) {
    if (!role.starterId) continue;
    if (survivingRoles.has(role.code) || seen.has(role.starterId)) continue;
    const startsElsewhere = Object.entries(depthChart.entries).some(
      ([code, row]) => code !== role.code && row?.[0] === role.starterId,
    );
    if (startsElsewhere) continue;
    seen.add(role.starterId);
    displaced.push({ playerId: role.starterId, roleCode: role.code });
  }

  const fromPersonnel = personnelTally(fromFormations);
  const toPersonnel = personnelTally(toFormations);
  const groups = [...new Set([...fromPersonnel.keys(), ...toPersonnel.keys()])].sort();
  const personnel: PersonnelGroupDiff[] = groups.map((group) => ({
    group,
    from: fromPersonnel.get(group) ?? 0,
    to: toPersonnel.get(group) ?? 0,
  }));

  return {
    from,
    to,
    formationCount: {
      from: fromFormations.length,
      to: toFormations.length,
      shared: [...fromNames].filter((name) => toNames.has(name)).length,
    },
    formationsOnlyInFrom: [...fromNames]
      .filter((name) => !toNames.has(name))
      .sort(),
    formationsOnlyInTo: [...toNames]
      .filter((name) => !fromNames.has(name))
      .sort(),
    roles,
    addedRoles,
    droppedRoles,
    newHoles,
    displacedStarters: displaced.sort((a, b) => a.roleCode.localeCompare(b.roleCode)),
    personnel,
  };
}

/** One-line summary of what a switch costs, for the UI and for tests. */
export function diffSummary(diff: PlaybookPlanDiff): string {
  const parts: string[] = [];
  if (diff.newHoles.length) {
    parts.push(
      `You would need someone at ${diff.newHoles.map((role) => role.code).join(', ')}.`,
    );
  }
  if (diff.displacedStarters.length) {
    parts.push(
      `${
        diff.displacedStarters.length === 1 ? 'One starter loses his spot' : `${diff.displacedStarters.length} starters lose their spots`
      }.`,
    );
  }
  if (parts.length === 0) {
    parts.push('Every role the new playbook uses already has someone in your plan.');
  }
  return parts.join(' ');
}
