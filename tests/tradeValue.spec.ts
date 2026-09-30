import { describe, expect, it } from 'vitest';
import { evaluateTrade, formatValue, pickValue, playerValue } from '@/domain/tradeValue';

describe('pickValue', () => {
  it('starts the first overall pick at the top of the chart', () => {
    expect(pickValue(1, 1)).toBe(3000);
  });

  it('decreases with every pick and round', () => {
    expect(pickValue(1, 16)).toBeLessThan(pickValue(1, 1));
    expect(pickValue(1, 32)).toBeLessThan(pickValue(1, 16));
    expect(pickValue(2, 1)).toBeLessThan(pickValue(1, 32));
    expect(pickValue(7, 32)).toBeGreaterThan(0);
  });

  it('handles rounds beyond the chart without exploding', () => {
    expect(pickValue(9, 10)).toBeGreaterThanOrEqual(0);
  });
});

describe('playerValue', () => {
  it('values a better player more highly', () => {
    expect(playerValue({ overall: 92, age: 26 })).toBeGreaterThan(
      playerValue({ overall: 78, age: 26 }),
    );
  });

  it('values youth on top of ability', () => {
    expect(playerValue({ overall: 85, age: 23 })).toBeGreaterThan(
      playerValue({ overall: 85, age: 32 }),
    );
  });

  it('pays a premium for high development traits', () => {
    expect(playerValue({ overall: 80, age: 24, devTrait: 'xfactor' })).toBeGreaterThan(
      playerValue({ overall: 80, age: 24, devTrait: 'normal' }),
    );
  });

  it('discounts a large cap hit', () => {
    expect(playerValue({ overall: 85, age: 28, capHit: 40_000_000 })).toBeLessThan(
      playerValue({ overall: 85, age: 28, capHit: 2_000_000 }),
    );
  });
});

describe('evaluateTrade', () => {
  it('calls a near-equal swap fair', () => {
    const result = evaluateTrade(1000, 1050);
    expect(result.verdict).toBe('fair');
    expect(result.favour).toBe('even');
  });

  it('names who wins a lopsided deal', () => {
    const win = evaluateTrade(500, 1500);
    expect(win.favour).toBe('you');
    expect(win.verdict).toBe('lopsided');
    expect(win.message).toContain('You come out ahead');

    const lose = evaluateTrade(1500, 500);
    expect(lose.favour).toBe('them');
  });

  it('formats values for display', () => {
    expect(formatValue(1200)).toBe('1.20k');
    expect(formatValue(42)).toBe('42');
  });
});
