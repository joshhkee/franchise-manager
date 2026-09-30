/**
 * Scheme fit.
 *
 * Madden's own scheme fit is an archetype match: your team picks an offensive and a
 * defensive scheme, and every player is graded on how well his archetype suits it. We
 * grade that, and add the attribute floor the plan asked for, so "fits the scheme" is
 * more than a label.
 *
 * Three inputs, all explicit:
 *
 * - **the role** — a depth-chart slot (`LEDG`, `SLWR`, `NT`), which resolves to a unit;
 * - **the scheme** — one per side of the ball (`src/domain/schemes.ts`);
 * - **the player** — his archetype, or, when we have no archetype for him, the one his
 *   ratings fit best.
 *
 * What comes out is a grade plus the reasons for it. It is deliberately conservative:
 * when we do not have the attributes to judge, the grade is `unrated` rather than a
 * guess dressed up as a number, which is the same rule the `verified` flags follow.
 */

import {
  ARCHETYPES,
  ATTRIBUTE_LABELS,
  resolveArchetypeId,
  readAttribute,
  type Archetype,
  type ArchetypeUnit,
  type EaAttributeKey,
} from './archetypes';
import {
  PLAYBOOK_SCHEME,
  PLAYBOOK_SIDE,
  SCHEME_BY_ID,
  type Scheme,
} from './schemes';
import type { DepthChartState, Side } from './types';

/**
 * The rating a player needs before we count an attribute as cleared.
 *
 * 70 is our line, not the game's — Madden does not publish numeric thresholds. It sits
 * at "solid starter" so the grade answers "can he do this job", not "is he good".
 */
export const FIT_FLOOR = 70;

export type FitGrade = 'ideal' | 'strong' | 'workable' | 'mismatch' | 'unrated';

export const FIT_GRADE_LABELS: Record<FitGrade, string> = {
  ideal: 'Ideal',
  strong: 'Strong',
  workable: 'Workable',
  mismatch: 'Mismatch',
  unrated: 'Not graded',
};

export const FIT_GRADE_TONES: Record<FitGrade, 'good' | 'info' | 'muted' | 'warn' | 'bad'> = {
  ideal: 'good',
  strong: 'info',
  workable: 'muted',
  mismatch: 'bad',
  unrated: 'muted',
};

/**
 * Which unit each depth-chart role draws from.
 *
 * Package roles are mapped to the unit they really field, which is the whole point of
 * [`POSITIONS.md`](POSITIONS.md): `NT` is an interior lineman, `SUBLB` is an off-ball
 * linebacker, `SLCB` is a corner. `GAD` is deliberately `null` — its planner role is
 * still undecided (§7), and inventing a unit for it would make the grade meaningless.
 */
const ROLE_UNIT: Record<string, ArchetypeUnit | null> = {
  QB: 'QB',
  HB: 'HB',
  '3DRB': 'HB',
  PWHB: 'HB',
  FB: 'FB',
  WR: 'WR',
  SLWR: 'WR',
  TE: 'TE',
  LT: 'OL',
  LG: 'OL',
  C: 'OL',
  RG: 'OL',
  RT: 'OL',
  GAD: null,
  LEDG: 'EDGE',
  REDG: 'EDGE',
  RLE: 'EDGE',
  RRE: 'EDGE',
  DT: 'DT',
  NT: 'DT',
  RDT: 'DT',
  SAM: 'LB',
  WILL: 'LB',
  SUBLB: 'LB',
  MIKE: 'MIKE',
  CB: 'CB',
  SLCB: 'CB',
  FS: 'S',
  SS: 'S',
  K: null,
  P: null,
  LS: null,
  KOS: null,
  KR: null,
  PR: null,
};

export function unitForRole(roleCode: string): ArchetypeUnit | null {
  return ROLE_UNIT[roleCode] ?? null;
}

/** Why a role is not graded, when it is not. */
function ungradedReason(roleCode: string): string {
  if (roleCode === 'GAD') return 'GAD has no agreed unit yet, so there is nothing to grade against.';
  return 'Specialists have no archetypes in our reference.';
}

/**
 * The archetypes a scheme favours at a unit.
 *
 * A scheme lists archetype *names* and spans a whole side of the ball, so `Power Rusher`
 * has to be matched against the archetypes that unit actually has. When a scheme names
 * none of a unit's archetypes we treat the whole unit as acceptable and say so, rather
 * than pretending the scheme is silent about it.
 */
export function preferredArchetypes(unit: ArchetypeUnit, scheme: Scheme | null): Archetype[] {
  const candidates = ARCHETYPES.filter((entry) => entry.unit === unit);
  if (!scheme) return candidates;
  const preferred = candidates.filter((entry) => scheme.keyArchetypes.includes(entry.name));
  return preferred.length > 0 ? preferred : candidates;
}

/** Does this scheme actually discriminate at this unit, or does it accept anything? */
export function schemeDiscriminates(unit: ArchetypeUnit, scheme: Scheme | null): boolean {
  if (!scheme) return false;
  return ARCHETYPES.some(
    (entry) => entry.unit === unit && scheme.keyArchetypes.includes(entry.name),
  );
}

/** The archetype a player's ratings fit best, for when nothing stored one. */
export function deriveArchetype(
  ratings: Record<string, number | string> | null | undefined,
  unit: ArchetypeUnit,
): string | null {
  let best: { id: string; score: number } | null = null;
  for (const archetype of ARCHETYPES.filter((entry) => entry.unit === unit)) {
    const values = archetype.attributes
      .map((attribute) => readAttribute(ratings, attribute))
      .filter((value): value is number => value !== null);
    if (values.length === 0) continue;
    const score = values.reduce((sum, value) => sum + value, 0) / values.length;
    if (!best || score > best.score) best = { id: archetype.id, score };
  }
  return best?.id ?? null;
}

export interface AttributeCheck {
  key: EaAttributeKey;
  label: string;
  /** The player's rating, or null when the attribute is missing. */
  value: number | null;
  clears: boolean;
}

export interface RoleFit {
  roleCode: string;
  unit: ArchetypeUnit | null;
  /** The archetype we graded him as: stored when we have one, otherwise derived. */
  archetypeId: string | null;
  archetypeName: string | null;
  /** Where the archetype came from. */
  archetypeSource: 'stored' | 'derived' | 'none';
  /** Archetypes the scheme favours here. */
  preferredIds: string[];
  preferredNames: string[];
  /** True/false when we know his archetype; null when we do not. */
  archetypeMatch: boolean | null;
  schemeIsSilent: boolean;
  checks: AttributeCheck[];
  /** Attributes at or above the floor. */
  clears: number;
  /** Attributes we actually had a value for. */
  known: number;
  grade: FitGrade;
  reasons: string[];
}

export interface FitInput {
  roleCode: string;
  ratings: Record<string, number | string> | null | undefined;
  /** The stored archetype, e.g. `QB_FieldGeneral`. */
  storedArchetype?: unknown;
  scheme: Scheme | null;
}

/**
 * Grade one role.
 *
 * The grade is `ideal` only with both halves: his archetype is one the scheme favours
 * **and** at least 80% of that archetype's attributes clear the floor. A right-archetype
 * player with bad attributes slides down the scale like anyone else — and bottoms out at
 * `mismatch` below 40%, because a scheme-correct player who cannot do the job is still a
 * problem. A wrong-archetype player tops out at `workable` however good he looks. That
 * asymmetry is the point: the game pays for archetype match, so a mismatch is worth
 * knowing about even when the numbers flatter him.
 */
export function gradeRoleFit(input: FitInput): RoleFit {
  const { roleCode, ratings, scheme } = input;
  const unit = unitForRole(roleCode);
  const reasons: string[] = [];

  if (!unit) {
    return {
      roleCode,
      unit: null,
      archetypeId: null,
      archetypeName: null,
      archetypeSource: 'none',
      preferredIds: [],
      preferredNames: [],
      archetypeMatch: null,
      schemeIsSilent: false,
      checks: [],
      clears: 0,
      known: 0,
      grade: 'unrated',
      reasons: [ungradedReason(roleCode)],
    };
  }

  const preferred = preferredArchetypes(unit, scheme);
  const sensitive = schemeDiscriminates(unit, scheme);

  const stored = resolveArchetypeId(input.storedArchetype);
  let archetypeId: string | null = null;
  let archetypeSource: RoleFit['archetypeSource'] = 'none';
  if (stored) {
    archetypeId = stored;
    archetypeSource = 'stored';
  } else {
    archetypeId = deriveArchetype(ratings, unit);
    archetypeSource = archetypeId ? 'derived' : 'none';
  }

  const gradedArchetype =
    preferred.find((entry) => entry.id === archetypeId) ??
    ARCHETYPES.find((entry) => entry.id === archetypeId) ??
    preferred[0] ??
    null;

  if (!gradedArchetype) {
    return {
      roleCode,
      unit,
      archetypeId,
      archetypeName: null,
      archetypeSource,
      preferredIds: [],
      preferredNames: [],
      archetypeMatch: null,
      schemeIsSilent: !sensitive,
      checks: [],
      clears: 0,
      known: 0,
      grade: 'unrated',
      reasons: ['No archetype is defined for this unit.'],
    };
  }

  const checks: AttributeCheck[] = gradedArchetype.attributes.map((attribute) => {
    const value = readAttribute(ratings, attribute);
    return {
      key: attribute,
      label: ATTRIBUTE_LABELS[attribute],
      value,
      clears: value !== null && value >= FIT_FLOOR,
    };
  });

  const known = checks.filter((check) => check.value !== null).length;
  const clears = checks.filter((check) => check.clears).length;

  const playerArchetype = ARCHETYPES.find((entry) => entry.id === archetypeId) ?? null;
  const archetypeMatch = playerArchetype
    ? preferred.some((entry) => entry.id === playerArchetype.id)
    : null;

  if (!sensitive) {
    reasons.push(
      `${scheme ? scheme.name : 'This scheme'} names no archetype for this unit, so any archetype is accepted.`,
    );
  } else if (archetypeMatch === true) {
    reasons.push(`${playerArchetype?.name} is one of the archetypes ${scheme?.name} favours here.`);
  } else if (archetypeMatch === false) {
    reasons.push(
      `${playerArchetype?.name} is not what ${scheme?.name} looks for here (wants ${preferred
        .map((entry) => entry.name)
        .join(' / ')}).`,
    );
  } else {
    reasons.push('No archetype: we could not match him to one and found no ratings to derive it.');
  }

  let grade: FitGrade;
  if (known === 0) {
    grade = 'unrated';
    reasons.push('No rating data for the attributes that matter, so this is not graded.');
  } else {
    const share = clears / known;
    if (archetypeMatch === true) {
      grade =
        share >= 0.8 ? 'ideal' : share >= 0.6 ? 'strong' : share >= 0.4 ? 'workable' : 'mismatch';
    } else {
      grade = share >= 0.8 ? 'workable' : 'mismatch';
    }
    reasons.push(
      `${clears} of ${known} graded attributes clear ${FIT_FLOOR}${
        known < gradedArchetype.attributes.length
          ? ` (${gradedArchetype.attributes.length - known} not on file)`
          : ''
      }.`,
    );
  }

  return {
    roleCode,
    unit,
    archetypeId,
    archetypeName: playerArchetype?.name ?? null,
    archetypeSource,
    preferredIds: preferred.map((entry) => entry.id),
    preferredNames: preferred.map((entry) => entry.name),
    archetypeMatch,
    schemeIsSilent: !sensitive,
    checks,
    clears,
    known,
    grade,
    reasons,
  };
}

export interface FitReport {
  side: 'offense' | 'defense' | 'special';
  scheme: Scheme | null;
  fits: RoleFit[];
  counts: Record<FitGrade, number>;
  /** Roles whose holder cannot do the job in this scheme. */
  mismatches: RoleFit[];
}

/** Grade a whole depth chart (rank 1 only — the men who are actually on the field). */
export function gradeDepthChart(
  chart: DepthChartState,
  scheme: Scheme | null,
  players: Map<string, { ratings?: Record<string, number | string> | null; position?: string }>,
): RoleFit[] {
  const fits: RoleFit[] = [];
  for (const [roleCode, row] of Object.entries(chart.entries)) {
    const playerId = row?.[0] ?? null;
    if (!playerId) continue;
    const player = players.get(playerId);
    if (!player) continue;
    const ratings = player.ratings ?? null;
    fits.push(
      gradeRoleFit({
        roleCode,
        ratings,
        storedArchetype: ratings?.archetype,
        scheme,
      }),
    );
  }
  return fits;
}

export function countGrades(fits: RoleFit[]): Record<FitGrade, number> {
  const counts: Record<FitGrade, number> = {
    ideal: 0,
    strong: 0,
    workable: 0,
    mismatch: 0,
    unrated: 0,
  };
  for (const fit of fits) counts[fit.grade] += 1;
  return counts;
}

export function fitReport(
  side: 'offense' | 'defense' | 'special',
  schemeId: string | null,
  fits: RoleFit[],
): FitReport {
  const scheme = schemeId ? SCHEME_BY_ID.get(schemeId) ?? null : null;
  return {
    side,
    scheme,
    fits,
    counts: countGrades(fits),
    mismatches: fits.filter((fit) => fit.grade === 'mismatch'),
  };
}

/**
 * The scheme a playbook is, when we have an opinion about it.
 * See `PLAYBOOK_SCHEME` in `./schemes` — it is our reading, not the game's, which is why
 * the UI always shows which playbook a grade came from.
 */
export function schemeIdForPlaybook(playbookId: string | null | undefined): string | null {
  if (!playbookId) return null;
  return PLAYBOOK_SCHEME[playbookId] ?? null;
}

export function sideForPlaybook(
  playbookId: string | null | undefined,
): Exclude<Side, 'special'> | null {
  if (!playbookId) return null;
  return PLAYBOOK_SIDE[playbookId] ?? null;
}
