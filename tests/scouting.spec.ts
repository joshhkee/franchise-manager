import { describe, expect, it } from 'vitest';
import { ratingKey, type EaAttributeKey } from '@/domain/archetypes';
import { SCHEME_BY_ID } from '@/domain/schemes';
import {
  fitCounts,
  fitForPlayer,
  fitRank,
  schemeForPosition,
  sideForPosition,
  type ScoutingPlayer,
} from '@/domain/scouting';

/**
 * The league scouting screen turns every player on every other team into the same
 * role-fit grade `/scheme` puts on your starters. These tests pin the two decisions
 * that make that honest: which scheme a player is graded against, and that the
 * stored EA archetype is what grades him (not a derived guess).
 */

function ratings(values: Partial<Record<EaAttributeKey, number>>): Record<string, number | string> {
  const out: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) out[ratingKey(key as EaAttributeKey)] = value;
  }
  return out;
}

const westCoast = SCHEME_BY_ID.get('west-coast-zone-run')!;
const spread = SCHEME_BY_ID.get('spread')!;
const tampa2 = SCHEME_BY_ID.get('tampa-2')!;

const schemes = { offense: westCoast, defense: tampa2 };

const fieldGeneral: ScoutingPlayer = {
  position: 'QB',
  ratings: {
    ...ratings({
      throwAccuracyMid: 88,
      throwAccuracyShort: 86,
      throwAccuracyDeep: 84,
      throwUnderPressure: 82,
      playAction: 80,
      awareness: 90,
    }),
    archetype: 'QB_FieldGeneral',
  },
};

describe('side of the ball', () => {
  it('reads the primary position vocabulary', () => {
    expect(sideForPosition('QB')).toBe('offense');
    expect(sideForPosition('RT')).toBe('offense');
    expect(sideForPosition('LEDG')).toBe('defense');
    expect(sideForPosition('MIKE')).toBe('defense');
    expect(sideForPosition('K')).toBe('special');
    expect(sideForPosition('XX')).toBeNull();
  });

  it('grades an offensive player against the offense scheme and a defender against the defense', () => {
    expect(schemeForPosition('WR', schemes)?.id).toBe(westCoast.id);
    expect(schemeForPosition('CB', schemes)?.id).toBe(tampa2.id);
    // Specialists have no scheme and no archetype model, on purpose.
    expect(schemeForPosition('K', schemes)).toBeNull();
    expect(schemeForPosition('P', schemes)).toBeNull();
  });
});

describe('grading a player you do not own', () => {
  it('uses the stored EA archetype, so a scheme fit is graded not guessed', () => {
    const fit = fitForPlayer(fieldGeneral, schemes);
    expect(fit.archetypeSource).toBe('stored');
    expect(fit.archetypeId).toBe('qb-field-general');
    expect(fit.archetypeName).toBe('Field General');
    expect(fit.grade).toBe('ideal');
  });

  it('changes the grade when the owner changes scheme, without touching the player', () => {
    const underSpread = fitForPlayer(fieldGeneral, { offense: spread, defense: tampa2 });
    expect(underSpread.archetypeMatch).toBe(false);
    expect(underSpread.grade).toBe('workable');
    expect(underSpread.reasons.join(' ')).toContain('wants Scrambler');
  });

  it('accepts the archetype outside the ratings map too', () => {
    const player: ScoutingPlayer = {
      position: 'QB',
      ratings: ratings({ awareness: 90, throwAccuracyMid: 85 }),
      storedArchetype: 'QB_FieldGeneral',
    };
    expect(fitForPlayer(player, schemes).archetypeSource).toBe('stored');
  });

  it('refuses to grade a specialist instead of inventing a number', () => {
    const fit = fitForPlayer({ position: 'K', ratings: ratings({ kickAccuracy: 90 }) }, schemes);
    expect(fit.grade).toBe('unrated');
    expect(fit.unit).toBeNull();
    expect(fit.reasons.join(' ')).toContain('Specialists');
  });

  it('falls back to grading against any archetype when no scheme is chosen', () => {
    const fit = fitForPlayer(fieldGeneral, { offense: null, defense: null });
    expect(fit.schemeIsSilent).toBe(true);
    expect(fit.archetypeMatch).toBe(true);
    expect(fit.grade).toBe('ideal');
  });
});

describe('sorting and counting a scouted roster', () => {
  it('orders fits best first', () => {
    expect(fitRank('ideal')).toBeLessThan(fitRank('strong'));
    expect(fitRank('strong')).toBeLessThan(fitRank('workable'));
    expect(fitRank('workable')).toBeLessThan(fitRank('mismatch'));
    expect(fitRank('mismatch')).toBeLessThan(fitRank('unrated'));
  });

  it('counts a whole roster by grade', () => {
    const counts = fitCounts(
      [
        fieldGeneral,
        { position: 'K', ratings: ratings({ kickAccuracy: 90 }) },
        { position: 'CB', ratings: ratings({ manCoverage: 90, zoneCoverage: 88, speed: 92 }) },
      ],
      schemes,
    );
    expect(counts.ideal).toBe(1);
    expect(counts.unrated).toBe(1);
    expect(counts.ideal + counts.strong + counts.workable + counts.mismatch + counts.unrated).toBe(3);
  });
});
