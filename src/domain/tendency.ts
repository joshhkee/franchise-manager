import { CONCEPT_LABELS, type Concept, type PlayFamily } from './concepts';
import { BUCKET_LABELS, type BucketId } from './callSheet';

/**
 * Self-scout: what your own call history gives away.
 *
 * The tell meter is the teaching half of the call sheet. Passing 100% of the time
 * from one look is not a bad play call in isolation — it is a pattern a defense
 * will eventually sit on, and seeing it is how you learn to call by formation
 * instead of by habit.
 */

export interface CallRecord {
  id: string;
  formationId: string;
  formationName: string;
  set: string;
  personnel: string;
  distribution: string;
  concept: Concept;
  family: PlayFamily;
  playName: string;
  down: number;
  distance: number;
  yardLine: number;
  bucket: BucketId;
  outcome?: string | null;
  sequence?: number;
}

export interface TendencyGroup {
  key: string;
  label: string;
  calls: number;
  runs: number;
  passes: number;
  passRate: number;
  concepts: { concept: Concept; label: string; count: number; share: number }[];
}

export interface Tell {
  id: string;
  label: string;
  /** 0..1: how loud the signal is. */
  strength: number;
  headline: string;
  detail: string;
  fix: string;
}

export interface TendencyReport {
  totalCalls: number;
  runs: number;
  passes: number;
  passRate: number;
  byFormation: TendencyGroup[];
  byLook: TendencyGroup[];
  byBucket: TendencyGroup[];
  byDown: TendencyGroup[];
  conceptCounts: { concept: Concept; label: string; count: number; share: number }[];
  tells: Tell[];
  suggestions: string[];
}

function isRun(family: PlayFamily): boolean {
  return family === 'run';
}

function isPass(family: PlayFamily): boolean {
  return family === 'pass' || family === 'play-action' || family === 'screen' || family === 'rpo';
}

function buildGroup(
  key: string,
  label: string,
  records: CallRecord[],
): TendencyGroup {
  const runs = records.filter((r) => isRun(r.family)).length;
  const passes = records.filter((r) => isPass(r.family)).length;
  const conceptMap = new Map<Concept, number>();
  for (const record of records) {
    conceptMap.set(record.concept, (conceptMap.get(record.concept) ?? 0) + 1);
  }
  const total = records.length || 1;
  return {
    key,
    label,
    calls: records.length,
    runs,
    passes,
    passRate: Math.round((passes / total) * 100) / 100,
    concepts: [...conceptMap.entries()]
      .map(([concept, count]) => ({
        concept,
        label: CONCEPT_LABELS[concept],
        count,
        share: Math.round((count / total) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count),
  };
}

function groupBy(
  records: CallRecord[],
  keyOf: (record: CallRecord) => string,
  labelOf: (record: CallRecord) => string,
): TendencyGroup[] {
  const map = new Map<string, { label: string; records: CallRecord[] }>();
  for (const record of records) {
    const key = keyOf(record);
    const entry = map.get(key) ?? { label: labelOf(record), records: [] };
    entry.records.push(record);
    map.set(key, entry);
  }
  return [...map.entries()]
    .map(([key, entry]) => buildGroup(key, entry.label, entry.records))
    .sort((a, b) => b.calls - a.calls);
}

export const EMPTY_TENDENCY_REPORT: TendencyReport = {
  totalCalls: 0,
  runs: 0,
  passes: 0,
  passRate: 0,
  byFormation: [],
  byLook: [],
  byBucket: [],
  byDown: [],
  conceptCounts: [],
  tells: [],
  suggestions: [],
};

export function buildTendencyReport(records: CallRecord[]): TendencyReport {
  if (records.length === 0) return EMPTY_TENDENCY_REPORT;

  const runs = records.filter((r) => isRun(r.family)).length;
  const passes = records.filter((r) => isPass(r.family)).length;

  const byFormation = groupBy(
    records,
    (r) => r.formationId,
    (r) => r.formationName,
  );
  const byLook = groupBy(
    records,
    (r) => `${r.set}-${r.distribution}`,
    (r) => `${r.set} ${r.distribution} / ${r.personnel} personnel`,
  );
  const byBucket = groupBy(
    records,
    (r) => r.bucket,
    (r) => BUCKET_LABELS[r.bucket] ?? r.bucket,
  );
  const byDown = groupBy(
    records,
    (r) => String(r.down),
    (r) => `${r.down}${r.down === 1 ? 'st' : r.down === 2 ? 'nd' : r.down === 3 ? 'rd' : 'th'} down`,
  );

  const conceptMap = new Map<Concept, number>();
  for (const record of records) {
    conceptMap.set(record.concept, (conceptMap.get(record.concept) ?? 0) + 1);
  }
  const conceptCounts = [...conceptMap.entries()]
    .map(([concept, count]) => ({
      concept,
      label: CONCEPT_LABELS[concept],
      count,
      share: Math.round((count / records.length) * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count);

  const tells = detectTells(records, byFormation, byLook, passes, runs);

  return {
    totalCalls: records.length,
    runs,
    passes,
    passRate: Math.round((passes / records.length) * 100) / 100,
    byFormation,
    byLook,
    byBucket,
    byDown,
    conceptCounts,
    tells,
    suggestions: tells.map((tell) => tell.fix),
  };
}

function strengthOf(calls: number, passRate: number): number {
  const sample = Math.min(1, calls / 8);
  const extremity = Math.abs(passRate - 0.5) * 2;
  return Math.round(sample * extremity * 100) / 100;
}

function detectTells(
  records: CallRecord[],
  byFormation: TendencyGroup[],
  byLook: TendencyGroup[],
  totalPasses: number,
  totalRuns: number,
): Tell[] {
  const tells: Tell[] = [];

  for (const group of byFormation) {
    if (group.calls < 3) continue;
    const strength = strengthOf(group.calls, group.passRate);
    if (strength < 0.35) continue;
    const passing = group.passRate >= 0.5;
    tells.push({
      id: `formation:${group.key}`,
      label: group.label,
      strength,
      headline: `${group.label} is a ${passing ? 'pass' : 'run'} tell`,
      detail: `${group.passes} pass / ${group.runs} run from ${group.label}. ${
        passing ? 'Every time you line up here, they can lean on coverage.' : 'They can crash the box here.'
      }`,
      fix: `Try ${
        passing
          ? `a run concept from ${group.label} (inside zone or counter keeps the box honest)`
          : `a play action or quick pass from ${group.label}`
      }.`,
    });
  }

  for (const group of byLook) {
    if (group.calls < 5) continue;
    const strength = strengthOf(group.calls, group.passRate);
    if (strength < 0.4) continue;
    const passing = group.passRate >= 0.5;
    tells.push({
      id: `look:${group.key}`,
      label: group.label,
      strength,
      headline: `Your ${group.label} look is predictable`,
      detail: `${group.passes} pass / ${group.runs} run. Same picture, same answer every time.`,
      fix: `Repeat the ${group.label} look with a ${passing ? 'run concept' : 'shot play'} — same look, new concept is what keeps a defense honest.`,
    });
  }

  if (records.length >= 8) {
    const passRate = totalPasses / records.length;
    if (passRate >= 0.7) {
      tells.push({
        id: 'overall:pass-heavy',
        label: 'Overall',
        strength: strengthOf(records.length, passRate),
        headline: 'You are pass heavy overall',
        detail: `${totalPasses} pass / ${totalRuns} run across ${records.length} tracked calls.`,
        fix: 'Run the ball on early downs with your best zone concept to bring the box back.',
      });
    } else if (passRate <= 0.3) {
      tells.push({
        id: 'overall:run-heavy',
        label: 'Overall',
        strength: strengthOf(records.length, passRate),
        headline: 'You are run heavy overall',
        detail: `${totalPasses} pass / ${totalRuns} run across ${records.length} tracked calls.`,
        fix: 'Play action off your best run look — same picture, new concept.',
      });
    }
  }

  return tells.sort((a, b) => b.strength - a.strength).slice(0, 8);
}
