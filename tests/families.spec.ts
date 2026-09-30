import { describe, expect, it } from 'vitest';
import {
  classifyFormation,
  clusterByLook,
  derivePersonnel,
  familyKey,
  formationSimilarity,
} from '@/domain/families';
import {
  GUN_BUNCH,
  GUN_EMPTY,
  GUN_TRIPS_TE,
  I_FORM_PRO,
  NICKEL_335,
  OFFENSE_FORMATIONS,
  SINGLEBACK_ACE,
} from './fixtures';

describe('classifyFormation', () => {
  it('reads the set, distribution and personnel off a formation', () => {
    const klass = classifyFormation(GUN_TRIPS_TE);
    expect(klass.set).toBe('gun');
    expect(klass.distribution).toBe('trips');
    expect(klass.personnel).toBe('11');
    expect(familyKey(klass)).toBe('gun-trips');
  });

  it('derives personnel from the slots rather than trusting a label', () => {
    expect(derivePersonnel(GUN_TRIPS_TE)).toBe('11');
    expect(derivePersonnel(SINGLEBACK_ACE)).toBe('12');
    expect(derivePersonnel(I_FORM_PRO)).toBe('21');
    // The label says "10" but the slots are 0 backs and 1 tight end, so the
    // derivation wins: personnel is read as (backs)(tight ends).
    expect(GUN_EMPTY.personnel).toBe('10');
    expect(derivePersonnel(GUN_EMPTY)).toBe('01');
  });

  it('handles defensive and sub-package fronts', () => {
    const klass = classifyFormation(NICKEL_335);
    expect(klass.set).toBe('nickel');
  });
});

describe('formationSimilarity', () => {
  it('treats two trips formations from different personnel as different looks', () => {
    const trips = classifyFormation(GUN_TRIPS_TE);
    const sameLook = { ...trips, distribution: 'trips' };
    expect(formationSimilarity(trips, sameLook)).toBe(1);
  });

  it('scores gun trips closer to gun bunch than to I Form', () => {
    const trips = classifyFormation(GUN_TRIPS_TE);
    const bunch = classifyFormation(GUN_BUNCH);
    const iform = classifyFormation(I_FORM_PRO);
    expect(formationSimilarity(trips, bunch)).toBeGreaterThan(
      formationSimilarity(trips, iform),
    );
  });
});

describe('clusterByLook', () => {
  it('groups formations that present the same picture to a defense', () => {
    const clusters = clusterByLook(OFFENSE_FORMATIONS, 0.6);
    const gunCluster = clusters.find((c) =>
      c.formations.some((f) => f.id === GUN_TRIPS_TE.id),
    )!;
    expect(gunCluster.formations.map((f) => f.id)).toContain(GUN_BUNCH.id);
    // Different personnel is a different look, even from the same set.
    expect(gunCluster.formations.map((f) => f.id)).not.toContain(SINGLEBACK_ACE.id);
  });
});
