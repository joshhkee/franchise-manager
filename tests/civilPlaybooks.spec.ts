import { describe, expect, it } from 'vitest';
import {
  buildDefenseSlots,
  buildOffenseSlots,
  classifySide,
  parseFormationKey,
  parseFront,
  toSeedPlaybooks,
  type CivilPlay,
} from '@/lib/importers/civilPlaybooks';

const OFFENSE_NAMES: [string, string][] = [
  ['Gun', 'Trips TE'],
  ['Gun', 'Doubles Clamp Stack'],
  ['Gun', 'Bunch TE'],
  ['Gun', 'Empty Sketch Stack'],
  ['Pistol', 'Bunch TE'],
  ['Pistol', 'Deuce Close'],
  ['Singleback', 'Ace'],
  ['I Form', 'Pro'],
  ['Singleback', 'Tight Flex Offset'],
  ['Gun', 'Trio Yflex'],
  ['Gun', 'Heavy Saint'],
  ['Strong', 'I Twins'],
];

const DEFENSE_NAMES = ['Nickel 33 Odd', 'Nickel 24 Dbl Mug', 'Dime 3-2-6', '4-3 Even 61', 'Quarter 3 Deep'];

describe('buildOffenseSlots', () => {
  it.each(OFFENSE_NAMES)('gives %s %s exactly 11 spots', (set, name) => {
    const slots = buildOffenseSlots(set, name);
    expect(slots).toHaveLength(11);
  });

  it('always fields a quarterback, five linemen and one running back when not empty', () => {
    const slots = buildOffenseSlots('Gun', 'Trips TE');
    const roles = slots.map((slot) => slot.role);
    expect(roles).toContain('QB');
    expect(roles.filter((role) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(role!))).toHaveLength(5);
    expect(roles).toContain('HB');
  });

  it('uses the slot receiver role when there are three or more receivers', () => {
    const slots = buildOffenseSlots('Gun', 'Trips TE');
    expect(slots.some((slot) => slot.role === 'SLWR')).toBe(true);
  });

  it('does not invent a slot receiver in two-receiver sets', () => {
    const slots = buildOffenseSlots('Singleback', 'Ace');
    const receiverSlots = slots.filter((slot) => slot.role === 'WR' || slot.role === 'SLWR');
    expect(receiverSlots.some((slot) => slot.role === 'SLWR')).toBe(false);
  });

  it('never repeats a slot key', () => {
    for (const [set, name] of OFFENSE_NAMES) {
      const keys = buildOffenseSlots(set, name).map((slot) => slot.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('buildDefenseSlots', () => {
  it.each(DEFENSE_NAMES)('gives %s exactly 11 spots', (name) => {
    expect(buildDefenseSlots(name)).toHaveLength(11);
  });

  it('counts an edge as a lineman, the way the game tallies a front', () => {
    const linemen = ['LEDG', 'REDG', 'DT', 'NT', 'RLE', 'RRE', 'RDT'];
    const backers = ['MIKE', 'SAM', 'WILL', 'SUBLB'];

    // Madden prints `5 DL / 1 LB / 5 DB` for a 3-3-5 and `5 DL / 2 LB / 4 DB` for a 3-4.
    const nickel33 = buildDefenseSlots('Nickel 33 Odd');
    expect(nickel33.filter((slot) => linemen.includes(slot.role!))).toHaveLength(5);
    expect(nickel33.filter((slot) => backers.includes(slot.role!))).toHaveLength(1);

    const bear = buildDefenseSlots('3-4 Bear');
    expect(bear.filter((slot) => linemen.includes(slot.role!))).toHaveLength(5);
    expect(bear.filter((slot) => backers.includes(slot.role!))).toHaveLength(2);

    // A four-man line is the front the name already describes.
    const over = buildDefenseSlots('4-3 Even 61');
    expect(over.filter((slot) => linemen.includes(slot.role!))).toHaveLength(4);
    expect(over.filter((slot) => backers.includes(slot.role!))).toHaveLength(3);
  });
});

describe('parseFront', () => {
  it('reclassifies the edge out of the linebackers below a four-man line', () => {
    expect(parseFront('Nickel 33 Odd')).toMatchObject({ line: 5, linebackers: 1, backs: 5 });
    expect(parseFront('Nickel 24 Dbl Mug')).toMatchObject({ line: 4, linebackers: 2, backs: 5 });
    expect(parseFront('3-4 Bear')).toMatchObject({ line: 5, linebackers: 2, backs: 4 });
    expect(parseFront('4-3 Even 61')).toMatchObject({ line: 4, linebackers: 3, backs: 4 });
  });
});

describe('parseFormationKey', () => {
  it('splits the set off the formation name and keeps acronyms readable', () => {
    expect(parseFormationKey('gun trips te')).toEqual({ set: 'Gun', name: 'Trips TE' });
    expect(parseFormationKey('nickel 33 odd')).toEqual({ set: 'Nickel', name: '33 Odd' });
    expect(parseFormationKey('i form pro')).toEqual({ set: 'I Form', name: 'Pro' });
  });
});

describe('classifySide', () => {
  it('recognises defensive formations by name', () => {
    expect(classifySide('nickel 33 odd')).toBe('defense');
    expect(classifySide('dime 3-2-6')).toBe('defense');
    expect(classifySide('gun trips te')).toBe('offense');
  });

  it('trusts the source when it tells us the side', () => {
    expect(classifySide('cover 3 sky', 'offense')).toBe('offense');
  });
});

describe('toSeedPlaybooks', () => {
  const plays: CivilPlay[] = [
    {
      playName: 'INSIDE ZONE',
      displayName: 'Inside Zone',
      formationName: 'Trips TE',
      setName: 'Gun',
      playType: 'run',
      offenseDefense: 'offense',
    },
    {
      playName: 'MESH',
      displayName: 'Mesh',
      formationName: 'Bunch TE',
      setName: 'Gun',
      playType: 'pass',
      offenseDefense: 'offense',
    },
    {
      playName: 'COVER 2 MAN',
      displayName: 'Cover 2 Man',
      formationName: '33 Odd',
      setName: 'Nickel',
      playType: 'pass',
      offenseDefense: 'defense',
    },
  ];

  it('splits formations into offense and defense playbooks with their plays attached', () => {
    const playbooks = toSeedPlaybooks({
      formations: ['gun trips te', 'gun bunch te', 'nickel 33 odd'],
      plays,
    });

    const offense = playbooks.find((pb) => pb.side === 'offense')!;
    const defense = playbooks.find((pb) => pb.side === 'defense')!;

    expect(offense.formations).toHaveLength(2);
    expect(defense.formations).toHaveLength(1);

    const trips = offense.formations.find((f) => f.id.includes('gun-trips-te'))!;
    expect(trips.plays).toEqual(['Inside Zone']);
    expect(trips.name).toBe('Gun Trips TE');
    expect(trips.slots).toHaveLength(11);

    expect(defense.formations[0].plays).toEqual(['Cover 2 Man']);
  });

  it('keeps formations that have no plays yet, with a note', () => {
    const playbooks = toSeedPlaybooks({ formations: ['gun empty sketch stack'], plays: [] });
    const formation = playbooks[0].formations[0];
    expect(formation.id).toBe('civil-gun-empty-sketch-stack');
    expect(formation.notes).toBeTruthy();
  });

  it('deduplicates repeated formation entries', () => {
    const playbooks = toSeedPlaybooks({
      formations: ['gun trips te', 'gun trips te', 'Gun Trips TE'],
      plays: [],
    });
    expect(playbooks[0].formations).toHaveLength(1);
  });
});
