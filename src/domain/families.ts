import type { Formation } from './types';

/**
 * Formation classification and similarity.
 *
 * The point of this module is the football idea behind the call sheet: you keep a
 * defense guessing by repeating *looks* while changing the *concept*. A "look" is
 * a set + personnel + distribution, so two different formations that present the
 * same picture to the defense are recognised as similar here.
 */

export interface FormationClass {
  /** Family key, e.g. `gun` or `dime`. */
  set: string;
  /** Personnel grouping, e.g. `11`, `12`, `21`, or `nickel`. */
  personnel: string;
  /** Receiver distribution, e.g. `trips`, `doubles`, `bunch`. */
  distribution: string;
  motion: boolean;
}

const SET_PATTERNS: { test: RegExp; set: string }[] = [
  { test: /^gun|shotgun/i, set: 'gun' },
  { test: /^pistol/i, set: 'pistol' },
  { test: /^singleback|^single\b/i, set: 'singleback' },
  { test: /^i[- ]?form|^iform/i, set: 'i-form' },
  { test: /^strong/i, set: 'strong' },
  { test: /^weak/i, set: 'weak' },
  { test: /^empty|^quads/i, set: 'empty' },
  { test: /goal\s*line/i, set: 'goal-line' },
  { test: /^nickel/i, set: 'nickel' },
  { test: /^dime/i, set: 'dime' },
  { test: /^quarter/i, set: 'quarter' },
  { test: /3-4|34\b/i, set: '3-4' },
  { test: /4-3|43\b/i, set: '4-3' },
  { test: /\b46\b|forty[- ]?six/i, set: '46' },
  { test: /field goal|^fg\b/i, set: 'fg' },
  { test: /^punt/i, set: 'punt' },
  { test: /kick ?off|kickoff/i, set: 'kickoff' },
];

const DISTRIBUTION_PATTERNS: { test: RegExp; distribution: string }[] = [
  { test: /bunch|cluster/i, distribution: 'bunch' },
  { test: /stack/i, distribution: 'stack' },
  { test: /trips|trio/i, distribution: 'trips' },
  { test: /doubles|twins|deuce/i, distribution: 'doubles' },
  { test: /empty|quads/i, distribution: 'empty' },
  { test: /tight|close/i, distribution: 'tight' },
  { test: /offset|shift/i, distribution: 'offset' },
];

function deriveSet(formation: Formation): string {
  const haystack = `${formation.set} ${formation.name}`;
  for (const pattern of SET_PATTERNS) {
    if (pattern.test.test(haystack)) return pattern.set;
  }
  if (formation.side === 'offense') return 'gun';
  return formation.set.toLowerCase() || 'other';
}

function deriveDistribution(formation: Formation): string {
  const haystack = `${formation.distribution} ${formation.name}`;
  for (const pattern of DISTRIBUTION_PATTERNS) {
    if (pattern.test.test(haystack)) return pattern.distribution;
  }
  return 'doubles';
}

/** Count ball carriers, tight ends and receivers to derive a personnel grouping. */
export function derivePersonnel(formation: Formation): string {
  const roles = formation.slots
    .map((slot) => slot.roleCode ?? slot.positionFallback ?? '')
    .map((code) => code.toUpperCase());

  const backs = roles.filter((r) => ['HB', 'FB', '3DRB', 'PWHB'].includes(r)).length;
  const tightEnds = roles.filter((r) => r === 'TE').length;
  const receivers = roles.filter((r) => ['WR', 'SLWR'].includes(r)).length;

  if (formation.side !== 'offense') return formation.personnel || 'sub';
  if (receivers === 0 && backs === 0 && tightEnds === 0) return formation.personnel || 'other';
  return `${Math.min(backs, 2)}${Math.min(tightEnds, 3)}`;
}

export function classifyFormation(formation: Formation): FormationClass {
  return {
    set: deriveSet(formation),
    personnel: derivePersonnel(formation),
    distribution: deriveDistribution(formation),
    motion: /motion|jet|shift|orbit/i.test(formation.name),
  };
}

export function familyKey(formationClass: FormationClass): string {
  return `${formationClass.set}-${formationClass.distribution}`;
}

/**
 * How alike do two looks appear to a defense? 0 = nothing alike, 1 = identical.
 *
 * Set and personnel carry the most weight: a defense reads the backfield and the
 * personnel on the field before it reads the receiver splits.
 */
export function formationSimilarity(a: FormationClass, b: FormationClass): number {
  let score = 0;
  if (a.set === b.set) score += 0.4;
  if (a.personnel === b.personnel) score += 0.3;
  if (a.distribution === b.distribution) score += 0.2;
  if (a.motion === b.motion) score += 0.1;
  return Math.round(score * 100) / 100;
}

export function areSimilar(a: Formation, b: Formation, threshold = 0.6): boolean {
  if (a.id === b.id) return true;
  return formationSimilarity(classifyFormation(a), classifyFormation(b)) >= threshold;
}

/**
 * Group formations into look clusters using a greedy pass.
 *
 * Used by the call sheet to offer "repeat this look with a different concept", and
 * by the planner to bulk-assign personnel across every formation that presents
 * the same picture.
 */
export function clusterByLook(
  formations: Formation[],
  threshold = 0.7,
): { key: string; representatives: FormationClass; formations: Formation[] }[] {
  const clusters: { key: string; representatives: FormationClass; formations: Formation[] }[] = [];

  for (const formation of formations) {
    const klass = classifyFormation(formation);
    const match = clusters.find(
      (cluster) => formationSimilarity(cluster.representatives, klass) >= threshold,
    );
    if (match) match.formations.push(formation);
    else
      clusters.push({
        key: familyKey(klass),
        representatives: klass,
        formations: [formation],
      });
  }

  return clusters.sort((a, b) => b.formations.length - a.formations.length);
}

/** Human label for a look, e.g. "Gun Trips / 11 personnel". */
export function describeLook(formationClass: FormationClass): string {
  const set = formationClass.set.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const dist = formationClass.distribution.replace(/\b\w/g, (c) => c.toUpperCase());
  return `${set} ${dist} / ${formationClass.personnel} personnel`;
}
