import { describe, expect, it } from 'vitest';
import {
  DEPTH_SLOTS,
  DEPTH_SLOT_BY_CODE,
  depthSlot,
  primaryPositions,
  depthSlotsBySide,
} from '@/domain/depthSlots';

/**
 * The vocabulary is the app's contract with the game. These assertions pin the
 * Madden 26/27 position list so a rename cannot quietly creep back in — see
 * `POSITIONS.md` for the sources behind each one.
 */
describe('depth-chart vocabulary', () => {
  it('names the defensive primary positions the way Madden 26 does', () => {
    expect(depthSlotsBySide('defense').map((slot) => slot.code)).toEqual([
      'LEDG',
      'REDG',
      'DT',
      'NT',
      'RLE',
      'RRE',
      'RDT',
      'SAM',
      'MIKE',
      'WILL',
      'SUBLB',
      'CB',
      'SLCB',
      'FS',
      'SS',
    ]);
  });

  it('retires the roles Madden 26 replaced', () => {
    for (const gone of ['LE', 'RE', 'LOLB', 'MLB', 'ROLB', 'NB', 'H']) {
      expect(depthSlot(gone), `${gone} should no longer exist`).toBeNull();
    }
  });

  it('treats LS as a roster position, not a package one', () => {
    expect(depthSlot('LS')?.situational).toBe(false);
    expect(primaryPositions()).toContain('LS');
  });

  it('treats the return and kickoff jobs as package positions', () => {
    for (const code of ['KOS', 'KR', 'PR', 'GAD']) {
      expect(depthSlot(code)?.situational, code).toBe(true);
    }
    for (const code of ['K', 'P', 'LS']) {
      expect(depthSlot(code)?.situational, code).toBe(false);
    }
  });

  it('carries the gadget position as an offensive package role', () => {
    const gadget = depthSlot('GAD');
    expect(gadget?.side).toBe('offense');
    expect(gadget?.eligiblePositions).toEqual(['QB', 'HB', 'FB', 'WR', 'TE']);
  });

  it('lets an edge cover the 3-4 outside linebacker job it absorbed', () => {
    expect(depthSlot('LEDG')?.eligiblePositions).toContain('REDG');
    expect(depthSlot('REDG')?.eligiblePositions).toContain('LEDG');
    expect(depthSlot('MIKE')?.eligiblePositions).toContain('WILL');
    expect(depthSlot('SLCB')?.eligiblePositions).toContain('CB');
  });

  it('keeps every slot code unique and every side non-empty', () => {
    const codes = DEPTH_SLOTS.map((slot) => slot.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const side of ['offense', 'defense', 'special'] as const) {
      expect(depthSlotsBySide(side).length, side).toBeGreaterThan(0);
    }
  });

  it('starts every entry unverified until it is checked against the game', () => {
    expect(DEPTH_SLOTS.every((slot) => slot.verified === false)).toBe(true);
  });

  it('lists only positions it also defines as slots', () => {
    for (const slot of DEPTH_SLOTS) {
      for (const position of slot.eligiblePositions) {
        // `RB`, `DE`, `LB` and friends are loose aliases; real codes must resolve.
        if (['RB', 'DE', 'LB'].includes(position)) continue;
        expect(DEPTH_SLOT_BY_CODE[position], `${slot.code} lists ${position}`).toBeDefined();
      }
    }
  });
});
