import { describe, expect, it } from 'vitest';
import { recommendCalls, type LookShown } from '@/domain/engine';
import { resolveBucket, type Situation } from '@/domain/callSheet';
import type { Concept } from '@/domain/concepts';
import { GUN_BUNCH, GUN_TRIPS_TE, OFFENSE_FORMATIONS } from './fixtures';

const SITUATION: Situation = {
  down: 1,
  distance: 10,
  yardLine: 25,
  quarter: 1,
  clockSeconds: 900,
  scoreDiff: 0,
};

function look(
  formationId: string,
  concept: Concept,
  playId = `${formationId}:${concept}`,
): LookShown {
  return { formationId, playId, concept, bucket: '1st-10' };
}

describe('recommendCalls', () => {
  it('returns a primary call with reasons and alternatives', () => {
    const rec = recommendCalls(OFFENSE_FORMATIONS, { situation: SITUATION })!;
    expect(rec.primary).toBeDefined();
    expect(rec.primary.reasons.length).toBeGreaterThan(0);
    expect(rec.primary.score).toBeGreaterThan(0);
    expect(rec.alternatives.length).toBe(2);
    expect(rec.primary.playId).not.toBe(rec.alternatives[0].playId);
  });

  it('is deterministic — the same question gives the same answer', () => {
    const a = recommendCalls(OFFENSE_FORMATIONS, { situation: SITUATION })!;
    const b = recommendCalls(OFFENSE_FORMATIONS, { situation: SITUATION })!;
    expect(a.primary.playId).toBe(b.primary.playId);
    expect(a.primary.score).toBe(b.primary.score);
  });

  it('rewards repeating a look you have already shown with a new concept', () => {
    const rec = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      looks: [look(GUN_TRIPS_TE.id, 'inside-zone'), look(GUN_BUNCH.id, 'dropback-mid')],
    })!;
    const fromTrips = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      looks: [look(GUN_TRIPS_TE.id, 'inside-zone')],
    })!;
    const sameLookCandidates = [fromTrips.primary, ...fromTrips.alternatives].filter(
      (c) => c.formationId === GUN_TRIPS_TE.id,
    );
    expect(sameLookCandidates.length).toBeGreaterThan(0);
    expect(
      sameLookCandidates.some((c) =>
        c.reasons.some((r) => r.includes('different concept')),
      ),
    ).toBe(true);
    expect(rec.explanation.length).toBeGreaterThan(0);
  });

  it('penalises the exact play you just called', () => {
    const first = recommendCalls(OFFENSE_FORMATIONS, { situation: SITUATION })!;
    const second = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      looks: [
        {
          formationId: first.primary.formationId,
          playId: first.primary.playId,
          concept: first.primary.tag.concept,
          bucket: '1st-10',
        },
      ],
    })!;
    expect(second.primary.playId).not.toBe(first.primary.playId);
  });

  it('stops you from confirming your own tell', () => {
    const rec = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      looks: [
        look(GUN_TRIPS_TE.id, 'inside-zone'),
        look(GUN_TRIPS_TE.id, 'gap-power'),
        look(GUN_TRIPS_TE.id, 'counter'),
      ],
    })!;
    const candidates = [rec.primary, ...rec.alternatives];
    const breaking = candidates.find((c) =>
      c.reasons.some((r) => r.includes('Breaks your own tendency')),
    );
    expect(breaking).toBeDefined();
    expect(breaking!.formationId).toBe(GUN_TRIPS_TE.id);
  });

  it('answers what the defense is giving you', () => {
    const rec = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      leans: ['stacked-box'],
    })!;
    const candidates = [rec.primary, ...rec.alternatives];
    expect(
      candidates.some((c) => c.reasons.some((r) => r.includes('is an answer'))),
    ).toBe(true);
    expect(
      candidates.some((c) => c.reasons.some((r) => r.includes('avoid'))),
    ).toBe(true);
  });

  it('draws from the sheet that matches the situation', () => {
    const thirdLong: Situation = { ...SITUATION, down: 3, distance: 12 };
    const rec = recommendCalls(OFFENSE_FORMATIONS, { situation: thirdLong })!;
    expect(rec.bucket).toBe('3rd-long');
    expect(['dropback-deep', 'dropback-mid', 'screen', 'play-action-deep', 'quick-game']).toContain(
      rec.primary.tag.concept,
    );
  });

  it('reports which looks you could reuse with an unseen concept', () => {
    const rec = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      looks: [look(GUN_TRIPS_TE.id, 'inside-zone')],
    })!;
    const reusable = rec.reuseableLooks.find((r) => r.formationId === GUN_TRIPS_TE.id)!;
    expect(reusable.used).toContain('inside-zone');
    expect(reusable.unseen).not.toContain('inside-zone');
    expect(reusable.unseen.length).toBeGreaterThan(0);
  });

  it('returns null when there is nothing to call from', () => {
    expect(recommendCalls([], { situation: SITUATION })).toBeNull();
  });

  it('honours a curated sheet override', () => {
    const rec = recommendCalls(OFFENSE_FORMATIONS, {
      situation: SITUATION,
      prioritiesOverride: ['screen'],
    })!;
    expect(rec.primary.tag.concept).toBe('screen');
  });
});

describe('resolveBucket', () => {
  it('lets situation beat down and distance', () => {
    expect(resolveBucket({ ...SITUATION, yardLine: 96 })).toBe('goal-line');
    expect(resolveBucket({ ...SITUATION, yardLine: 4 })).toBe('backed-up');
    expect(resolveBucket({ ...SITUATION, yardLine: 85, down: 2, distance: 5 })).toBe('red-zone');
    expect(resolveBucket({ ...SITUATION, quarter: 4, clockSeconds: 60 })).toBe('two-minute');
    expect(
      resolveBucket({ ...SITUATION, quarter: 4, clockSeconds: 240, scoreDiff: 7 }),
    ).toBe('four-minute');
  });

  it('falls back to down and distance', () => {
    expect(resolveBucket({ ...SITUATION, down: 2, distance: 5 })).toBe('2nd-mid');
    expect(resolveBucket({ ...SITUATION, down: 4, distance: 2 })).toBe('4th-short');
    expect(resolveBucket({ ...SITUATION, down: 1, distance: 2 })).toBe('1st-short');
  });
});
