import { describe, expect, it } from 'vitest';
import {
  changesBySide,
  checklistToCsv,
  checklistToMarkdown,
  type Checklist,
} from '@/lib/checklist';

const BASE: Checklist = {
  generatedAt: '2026-09-30T12:00:00.000Z',
  vocabulary: [
    { code: 'QB', verified: true },
    { code: 'SLWR', verified: false },
  ],
  changes: [
    {
      side: 'offense',
      slotCode: 'QB',
      label: 'Quarterback',
      rank: 1,
      from: 'D. Mercer',
      to: 'R. Hall',
      fromFull: 'Dane Mercer',
      toFull: 'Rookie Hall',
    },
    {
      side: 'special',
      slotCode: 'K',
      label: 'Kicker',
      rank: 1,
      from: 'nobody',
      to: 'S. Lorentzen',
      fromFull: 'nobody',
      toFull: 'Sven Lorentzen',
    },
  ],
  subs: [
    {
      formationId: 'off-gun-trips',
      formationName: 'Gun Trips',
      set: 'Gun',
      slotLabel: 'SLOT',
      name: 'N. Barros',
      fullName: 'Nico Barros',
      insteadOf: 'SLWR rank 1',
    },
  ],
  units: [
    {
      id: 'st-fg',
      name: 'Field Goal',
      set: 'FG',
      personnel: 'field-goal',
      players: [
        { label: 'K', name: 'S. Lorentzen', fullName: 'Sven Lorentzen' },
        { label: 'LS', name: 'G. Vandal', fullName: 'Gil Vandal' },
      ],
    },
  ],
};

describe('checklist grouping', () => {
  it('groups changes by side and drops empty groups', () => {
    const groups = changesBySide(BASE);
    expect(groups.map((group) => group.side)).toEqual(['offense', 'special']);
    expect(groups.find((group) => group.side === 'defense')).toBeUndefined();
  });
});

describe('checklist markdown', () => {
  const markdown = checklistToMarkdown(BASE);

  it('lists every depth chart change as a checkbox with full names', () => {
    expect(markdown).toContain('- [ ] QB rank 1: Dane Mercer → Rookie Hall');
    expect(markdown).toContain('- [ ] K rank 1: nobody → Sven Lorentzen');
  });

  it('uses the in-game screen grouping as headings', () => {
    expect(markdown).toContain('### Offense');
    expect(markdown).toContain('### Special teams');
  });

  it('renders the special teams units and the formation subs', () => {
    expect(markdown).toContain('### Field Goal (FG)');
    expect(markdown).toContain('- K — Sven Lorentzen');
    expect(markdown).toContain(
      '- [ ] Gun Trips — SLOT: Nico Barros (instead of SLWR rank 1)',
    );
  });

  it('says so when there is nothing to change', () => {
    const empty = checklistToMarkdown({
      ...BASE,
      changes: [],
      subs: [],
      units: [],
    });
    expect(empty).toContain('already matches your plan');
    expect(empty).toContain('No formation subs yet.');
  });
});

describe('checklist csv', () => {
  const lines = checklistToCsv(BASE).split('\n');

  it('starts with a header row', () => {
    expect(lines[0]).toBe('step,group,formation,slot,rank,from,to');
  });

  it('emits one row per change, unit spot and sub', () => {
    expect(lines).toHaveLength(1 + 2 + 2 + 1);
    expect(lines.some((line) => line.startsWith('depth-chart,Offense,,QB,1,'))).toBe(true);
    expect(lines.some((line) => line.startsWith('special-teams,Field Goal,Field Goal,K,'))).toBe(true);
    expect(lines.some((line) => line.startsWith('formation-sub,Gun,Gun Trips,SLOT,'))).toBe(true);
  });

  it('quotes cells containing a comma', () => {
    const csv = checklistToCsv({
      ...BASE,
      changes: [{ ...BASE.changes[0]!, toFull: 'Hall, Rookie' }],
      units: [],
      subs: [],
    });
    expect(csv).toContain('"Hall, Rookie"');
  });
});
