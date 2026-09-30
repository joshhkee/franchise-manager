import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES,
  ATTRIBUTE_LABELS,
  EA_ARCHETYPE_TO_ID,
  archetypesForPosition,
  archetypesForUnit,
  ratingKey,
  readAttribute,
  resolveArchetypeId,
  type EaAttributeKey,
} from '@/domain/archetypes';
import { PLAYBOOK_SCHEME, SCHEMES, SCHEME_BY_ID, schemesForSide } from '@/domain/schemes';
import {
  FIT_FLOOR,
  deriveArchetype,
  gradeRoleFit,
  preferredArchetypes,
  schemeDiscriminates,
  schemeIdForPlaybook,
  unitForRole,
} from '@/domain/schemeFit';
import { primaryPositions } from '@/domain/depthSlots';

/** A ratings map shaped the way the EA import writes them. */
function ratings(values: Partial<Record<EaAttributeKey, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) out[ratingKey(key as EaAttributeKey)] = value;
  }
  return out;
}

describe('the archetype table', () => {
  it('covers every scrimmage position the game names an archetype for', () => {
    for (const position of primaryPositions()) {
      if (['K', 'P', 'LS'].includes(position)) continue;
      expect(archetypesForPosition(position).length, position).toBeGreaterThan(0);
    }
  });

  it('gives kickers, punters and long snappers none, rather than inventing some', () => {
    for (const position of ['K', 'P', 'LS']) {
      expect(archetypesForPosition(position)).toEqual([]);
    }
  });

  it('keys every archetype uniquely, on a real unit', () => {
    const ids = ARCHETYPES.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of ARCHETYPES) {
      expect(entry.attributes.length, entry.id).toBeGreaterThan(0);
      expect(entry.positions.length, entry.id).toBeGreaterThan(0);
    }
  });

  it('backs every attribute it grades on with a label we can print', () => {
    for (const entry of ARCHETYPES) {
      for (const attribute of entry.attributes) {
        expect(ATTRIBUTE_LABELS[attribute], `${entry.id} -> ${attribute}`).toBeTruthy();
      }
    }
  });

  it('shares one archetype set across the units the game shares it with', () => {
    // LEDGE and REDGE are the same job on opposite sides; so are the five line spots.
    expect(archetypesForUnit('EDGE').length).toBe(3);
    expect(archetypesForUnit('OL').length).toBe(3);
    expect(archetypesForPosition('LT')).toEqual(archetypesForPosition('RT'));
    for (const position of ['LT', 'LG', 'C', 'RG', 'RT']) {
      expect(archetypesForUnit('OL')).toEqual(archetypesForPosition(position));
    }
  });

  it('resolves the EA feed codes, our own ids and plain names', () => {
    expect(resolveArchetypeId('QB_FieldGeneral')).toBe('qb-field-general');
    expect(resolveArchetypeId('DE_PowerRusher')).toBe('edge-power-rusher');
    expect(resolveArchetypeId('OLB_SpeedRusher')).toBe('edge-speed-rusher');
    expect(resolveArchetypeId('MLB_FieldGeneral')).toBe('mike-field-general');
    expect(resolveArchetypeId('cb-mantoMan')).toBeNull();
    expect(resolveArchetypeId('CB_MantoMan')).toBe('cb-man');
    expect(resolveArchetypeId('qb-field-general')).toBe('qb-field-general');
    expect(resolveArchetypeId('edge-speed-rusher')).toBe('edge-speed-rusher');
    expect(resolveArchetypeId('Strong Arm')).toBe('qb-strong-arm');
    expect(resolveArchetypeId('')).toBeNull();
    expect(resolveArchetypeId(undefined)).toBeNull();
    expect(resolveArchetypeId('KP_Power')).toBeNull();
  });

  it('maps every EA code onto an archetype we actually define', () => {
    const ids = new Set(ARCHETYPES.map((entry) => entry.id));
    for (const [code, id] of Object.entries(EA_ARCHETYPE_TO_ID)) {
      expect(ids.has(id), `${code} -> ${id}`).toBe(true);
    }
  });

  it('reads a rating off either the stored key or the bare attribute name', () => {
    expect(readAttribute({ speed_rating: 93 }, 'speed')).toBe(93);
    expect(readAttribute({ speed: '93' }, 'speed')).toBe(93);
    expect(readAttribute({}, 'speed')).toBeNull();
    expect(readAttribute(null, 'speed')).toBeNull();
    expect(readAttribute({ speed_rating: 'n/a' }, 'speed')).toBeNull();
  });
});

describe('the scheme table', () => {
  it("lists Madden 27's eleven offenses and ten defenses", () => {
    expect(schemesForSide('offense')).toHaveLength(11);
    expect(schemesForSide('defense')).toHaveLength(10);
    expect(SCHEMES).toHaveLength(21);
  });

  it('names at least one archetype for every unit it governs', () => {
    // A scheme that says nothing about a unit would make the grade meaningless there.
    const unitsBySide = {
      offense: ['QB', 'HB', 'FB', 'WR', 'TE', 'OL'] as const,
      defense: ['EDGE', 'DT', 'LB', 'MIKE', 'CB', 'S'] as const,
    };
    for (const scheme of SCHEMES) {
      for (const unit of unitsBySide[scheme.side]) {
        expect(
          schemeDiscriminates(unit, scheme),
          `${scheme.name} says nothing about ${unit}`,
        ).toBe(true);
      }
    }
  });

  it('maps every seeded playbook to a scheme on the matching side, or to nothing', () => {
    for (const [playbookId, schemeId] of Object.entries(PLAYBOOK_SCHEME)) {
      if (schemeId === null) continue;
      const scheme = SCHEME_BY_ID.get(schemeId);
      expect(scheme, `${playbookId} -> ${schemeId}`).toBeDefined();
    }
    expect(schemeIdForPlaybook('pb-shanahan')).toBe('west-coast-zone-run');
    expect(schemeIdForPlaybook('pb-34')).toBe('base-3-4');
    expect(schemeIdForPlaybook('pb-special-teams')).toBeNull();
    expect(schemeIdForPlaybook(null)).toBeNull();
  });
});

describe('role to unit', () => {
  it('sends the package roles to the unit they really field', () => {
    expect(unitForRole('NT')).toBe('DT');
    expect(unitForRole('RDT')).toBe('DT');
    expect(unitForRole('SUBLB')).toBe('LB');
    expect(unitForRole('SLCB')).toBe('CB');
    expect(unitForRole('RLE')).toBe('EDGE');
    expect(unitForRole('RRE')).toBe('EDGE');
    expect(unitForRole('3DRB')).toBe('HB');
    expect(unitForRole('PWHB')).toBe('HB');
    expect(unitForRole('SLWR')).toBe('WR');
  });

  it('gives the undecided gadget role and the specialists nothing to grade against', () => {
    expect(unitForRole('GAD')).toBeNull();
    for (const code of ['K', 'P', 'LS', 'KOS', 'KR', 'PR']) {
      expect(unitForRole(code), code).toBeNull();
    }
  });
});

describe('preferred archetypes', () => {
  it('narrows a unit to what the scheme names', () => {
    const base34 = SCHEME_BY_ID.get('base-3-4')!;
    expect(preferredArchetypes('EDGE', base34).map((a) => a.name).sort()).toEqual([
      'Power Rusher',
      'Run Stopper',
    ]);
    // A 3-4 asks its edge to hold up, not to fly off the ball — no Speed Rusher.
    expect(preferredArchetypes('EDGE', base34).map((a) => a.name)).not.toContain('Speed Rusher');
  });

  it('accepts anything when there is no scheme to judge against', () => {
    expect(preferredArchetypes('QB', null)).toHaveLength(4);
    expect(schemeDiscriminates('QB', null)).toBe(false);
  });

  it('discriminates at the positions that separate the schemes', () => {
    const spread = SCHEME_BY_ID.get('spread')!;
    expect(preferredArchetypes('QB', spread).map((a) => a.name)).toEqual(['Scrambler']);
    const westCoast = SCHEME_BY_ID.get('west-coast-zone-run')!;
    expect(preferredArchetypes('QB', westCoast).map((a) => a.name)).toEqual(['Field General']);
  });
});

describe('grading one role', () => {
  const westCoast = SCHEME_BY_ID.get('west-coast-zone-run')!;

  it('grades a scheme-correct player with the attributes to match as ideal', () => {
    const fit = gradeRoleFit({
      roleCode: 'QB',
      storedArchetype: 'QB_FieldGeneral',
      ratings: ratings({
        throwAccuracyMid: 88,
        throwAccuracyShort: 86,
        throwAccuracyDeep: 84,
        throwUnderPressure: 82,
        playAction: 80,
        awareness: 90,
      }),
      scheme: westCoast,
    });
    expect(fit.grade).toBe('ideal');
    expect(fit.archetypeMatch).toBe(true);
    expect(fit.clears).toBe(6);
  });

  it('tops a wrong-archetype player out at workable however good he looks', () => {
    const fit = gradeRoleFit({
      roleCode: 'QB',
      storedArchetype: 'QB_StrongArm',
      ratings: ratings({
        throwPower: 95,
        throwAccuracyDeep: 95,
        throwAccuracyMid: 94,
        throwUnderPressure: 93,
        playAction: 92,
        throwOnTheRun: 91,
      }),
      scheme: westCoast,
    });
    expect(fit.archetypeMatch).toBe(false);
    expect(fit.grade).toBe('workable');
    expect(fit.reasons.join(' ')).toContain('wants Field General');
  });

  it('calls a scheme-correct player who cannot do the job a mismatch', () => {
    const fit = gradeRoleFit({
      roleCode: 'QB',
      storedArchetype: 'QB_FieldGeneral',
      ratings: ratings({
        throwAccuracyMid: 61,
        throwAccuracyShort: 58,
        throwAccuracyDeep: 55,
        throwUnderPressure: 52,
        playAction: 50,
        awareness: 64,
      }),
      scheme: westCoast,
    });
    expect(fit.archetypeMatch).toBe(true);
    expect(fit.grade).toBe('mismatch');
    expect(fit.clears).toBe(0);
  });

  it('refuses to grade when there are no attributes to grade on', () => {
    const fit = gradeRoleFit({
      roleCode: 'QB',
      storedArchetype: 'QB_FieldGeneral',
      ratings: {},
      scheme: westCoast,
    });
    expect(fit.grade).toBe('unrated');
    expect(fit.known).toBe(0);
    expect(fit.reasons.join(' ')).toContain('No rating data');
  });

  it('refuses to grade the roles with no archetype model', () => {
    for (const roleCode of ['GAD', 'K', 'P', 'LS']) {
      const fit = gradeRoleFit({ roleCode, ratings: ratings({ awareness: 90 }), scheme: null });
      expect(fit.grade, roleCode).toBe('unrated');
      expect(fit.unit, roleCode).toBeNull();
    }
  });

  it('guesses an archetype from the ratings when nothing stored one', () => {
    const fit = gradeRoleFit({
      roleCode: 'LEDG',
      storedArchetype: null,
      ratings: ratings({
        finesseMoves: 92,
        tackle: 88,
        pursuit: 90,
        awareness: 86,
        playRecognition: 85,
        hitPower: 84,
        powerMoves: 40,
        blockShedding: 45,
      }),
      scheme: SCHEME_BY_ID.get('base-4-3')!,
    });
    expect(fit.archetypeSource).toBe('derived');
    expect(fit.archetypeName).toBe('Speed Rusher');
  });

  it('reports how many attributes it graded on when some are missing', () => {
    const fit = gradeRoleFit({
      roleCode: 'MIKE',
      storedArchetype: 'MLB_FieldGeneral',
      ratings: ratings({ playRecognition: 90, pursuit: 85, tackle: 82 }),
      scheme: SCHEME_BY_ID.get('base-4-3')!,
    });
    // The MIKE Field General archetype grades on five attributes; we had three.
    expect(fit.checks).toHaveLength(5);
    expect(fit.known).toBe(3);
    expect(fit.clears).toBe(3);
  });

  it('derives nothing when there are no ratings at all', () => {
    expect(deriveArchetype({}, 'QB')).toBeNull();
    expect(deriveArchetype(null, 'QB')).toBeNull();
  });

  it('flags a unit the scheme is silent about rather than failing him for it', () => {
    const tampa2 = SCHEME_BY_ID.get('tampa-2')!;
    const fit = gradeRoleFit({
      roleCode: 'QB',
      storedArchetype: 'QB_Scrambler',
      ratings: ratings({ breakSack: 90, throwOnTheRun: 88, throwAccuracyShort: 85 }),
      scheme: tampa2,
    });
    // Tampa 2 is a defensive scheme; asked about a QB it says nothing, so any
    // archetype is accepted and the grade says so rather than failing him for it.
    expect(fit.archetypeMatch).toBe(true);
    expect(fit.schemeIsSilent).toBe(true);
    expect(fit.reasons.join(' ')).toContain('names no archetype for this unit');
  });

  it('uses the floor it advertises', () => {
    const fit = gradeRoleFit({
      roleCode: 'TE',
      storedArchetype: 'TE_Possession',
      ratings: ratings({
        catchInTraffic: FIT_FLOOR,
        shortRouteRunning: FIT_FLOOR - 1,
      }),
      scheme: null,
    });
    const [first, second] = fit.checks;
    expect(first.clears).toBe(true);
    expect(second.clears).toBe(false);
  });
});
