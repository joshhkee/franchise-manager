import { describe, expect, it } from 'vitest';
import { previewDepthChange } from '@/domain/impact';
import type { FormationSub } from '@/domain/types';
import { GUN_BUNCH, GUN_TRIPS_TE, OFFENSE_FORMATIONS, makeContext } from './fixtures';

describe('previewDepthChange', () => {
  it('shows every formation affected by swapping the slot receiver', () => {
    const ctx = makeContext();
    const report = previewDepthChange(OFFENSE_FORMATIONS, ctx, {
      slotCode: 'SLWR',
      rank: 1,
      toPlayerId: 'wr4',
    });

    expect(report.change.fromPlayerId).toBe('wr3');
    expect(report.formationsUsingRole).toBe(3);
    expect(report.changed.map((c) => c.formationId).sort()).toEqual([
      'gun-bunch',
      'gun-empty',
      'gun-trips-te',
    ]);

    const trips = report.changed.find((c) => c.formationId === GUN_TRIPS_TE.id)!;
    expect(trips.changes).toHaveLength(1);
    expect(trips.changes[0]).toMatchObject({
      slotKey: 'SLOT',
      label: 'SLWR',
      fromPlayerId: 'wr3',
      toPlayerId: 'wr4',
    });
  });

  it('reports net personnel movement across the playbook', () => {
    const report = previewDepthChange(OFFENSE_FORMATIONS, makeContext(), {
      slotCode: 'SLWR',
      rank: 1,
      toPlayerId: 'wr4',
    });
    const gained = report.playersAffected.find((p) => p.playerId === 'wr4')!;
    const lost = report.playersAffected.find((p) => p.playerId === 'wr3')!;
    expect(gained.gained).toBe(3);
    expect(lost.lost).toBe(3);
  });

  it('excludes formations pinned by your own formation sub, and says so', () => {
    const sub: FormationSub = {
      formationId: GUN_BUNCH.id,
      slotKey: 'SLOT',
      mode: 'override',
      playerId: 'wr5',
      inheritSlotCode: null,
      inheritRank: null,
      note: 'big body in bunch',
    };
    const report = previewDepthChange(OFFENSE_FORMATIONS, makeContext({ subs: [sub] }), {
      slotCode: 'SLWR',
      rank: 1,
      toPlayerId: 'wr4',
    });

    expect(report.changed.map((c) => c.formationId)).not.toContain(GUN_BUNCH.id);
    expect(report.pinned.map((p) => p.formationId)).toContain(GUN_BUNCH.id);
    expect(report.notes.join(' ')).toContain('pinned player');
  });

  it('warns when the change would put the same player on the field twice', () => {
    const report = previewDepthChange(OFFENSE_FORMATIONS, makeContext(), {
      slotCode: 'SLWR',
      rank: 1,
      toPlayerId: 'wr1',
    });
    expect(report.duplicateWarnings.length).toBeGreaterThan(0);
    expect(report.duplicateWarnings[0].message).toContain('same player');
  });

  it('warns when the change lands an unavailable player on the field', () => {
    const report = previewDepthChange(OFFENSE_FORMATIONS, makeContext(), {
      slotCode: 'SLWR',
      rank: 1,
      toPlayerId: 'practiceGuy',
    });
    // practice squad players are not available on game day
    expect(report.unavailableWarnings.length).toBe(3);
  });

  it('says plainly when nothing in the playbook consults a role', () => {
    const report = previewDepthChange(OFFENSE_FORMATIONS, makeContext(), {
      slotCode: 'SLCB',
      rank: 1,
      toPlayerId: 'cb2',
    });
    expect(report.formationsUsingRole).toBe(0);
    expect(report.notes.join(' ')).toContain('No formation');
  });

  it('reports empty spots when a change clears a role', () => {
    const report = previewDepthChange(OFFENSE_FORMATIONS, makeContext(), {
      slotCode: 'SLWR',
      rank: 1,
      toPlayerId: null,
    });
    expect(report.emptyWarnings.length).toBe(3);
  });
});
