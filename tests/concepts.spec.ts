import { describe, expect, it } from 'vitest';
import { CONCEPT_FAMILY, needsCuration, tagPlay, type Concept } from '@/domain/concepts';

const CASES: [string, Concept][] = [
  ['Inside Zone Split', 'inside-zone'],
  ['HB Dive', 'dive'],
  ['Power O', 'gap-power'],
  ['Counter Trey', 'counter'],
  ['HB Draw', 'draw'],
  ['HB Stretch', 'outside-zone'],
  ['QB Sneak', 'qb-run'],
  ['Read Option', 'qb-run'],
  ['WR Screen', 'screen'],
  ['RPO Peek', 'rpo'],
  ['PA Deep Post', 'play-action-deep'],
  ['PA Boot Over', 'play-action-short'],
  ['Play Action Deep Shot', 'play-action-deep'],
  ['Mesh', 'dropback-mid'],
  ['Levels', 'dropback-mid'],
  ['Four Verts', 'dropback-deep'],
  ['Quick Slant', 'quick-game'],
  ['Stick', 'quick-game'],
  ['Cover 3 Buzz', 'dropback-mid'],
];

describe('tagPlay', () => {
  it.each(CASES)('tags %s as %s', (playName, expected) => {
    expect(tagPlay(playName).concept).toBe(expected);
  });

  it('assigns a family and depth consistent with the concept', () => {
    const run = tagPlay('Power O');
    expect(run.family).toBe('run');
    expect(run.depth).toBe('behind');
    expect(CONCEPT_FAMILY['gap-power']).toBe('run');

    const deep = tagPlay('Four Verts');
    expect(deep.family).toBe('pass');
    expect(deep.depth).toBe('deep');
  });

  it('prefers a manual override over the heuristic', () => {
    const tag = tagPlay('Inside Zone Split', { conceptOverride: 'dropback-deep' });
    expect(tag.concept).toBe('dropback-deep');
    expect(tag.source).toBe('manual');
    expect(tag.confidence).toBe(1);
  });

  it('marks unreadable play names as low confidence for curation', () => {
    const tag = tagPlay('X Right 42');
    expect(needsCuration(tag)).toBe(true);
    expect(tag.confidence).toBeLessThan(0.5);
  });

  it('does not claim confidence about its rule-based guesses', () => {
    expect(tagPlay('Mesh').confidence).toBeLessThan(0.8);
    expect(tagPlay('HB Dive').confidence).toBeLessThan(1);
  });
});
