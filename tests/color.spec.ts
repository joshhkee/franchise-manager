import { describe, expect, it } from 'vitest';
import {
  AA_LARGE,
  AA_TEXT,
  bestTextOn,
  blend,
  contentSurfaces,
  contrastRatio,
  ensureContrast,
  ensureTextContrast,
  isHex,
  meetsContrast,
  MODE_SURFACES,
  normalizeHex,
  parseHex,
  relativeLuminance,
  rgbToHex,
  shiftLightness,
} from '@/lib/color';

/**
 * The colour maths the whole theme depends on. If these drift, every team's
 * contrast guarantee drifts with them, so the properties here are asserted
 * directly rather than by snapshot.
 */

describe('hex parsing', () => {
  it('parses six-digit hex', () => {
    expect(parseHex('#ff8800')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('expands three-digit shorthand', () => {
    expect(parseHex('#f80')).toEqual({ r: 255, g: 136, b: 0 });
  });

  it('accepts input without a leading hash', () => {
    expect(parseHex('000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('round-trips through rgbToHex and normalises case', () => {
    expect(normalizeHex('#FF8800')).toBe('#ff8800');
    expect(rgbToHex({ r: 255, g: 136, b: 0 })).toBe('#ff8800');
  });

  it('rejects nonsense loudly', () => {
    expect(() => parseHex('#12')).toThrow();
    expect(() => parseHex('not-a-colour')).toThrow();
    expect(isHex('#12345')).toBe(false);
    expect(isHex('#abcdef')).toBe(true);
  });
});

describe('relative luminance and contrast ratio', () => {
  it('anchors at black and white', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#3366cc', '#ffffff')).toBeCloseTo(
      contrastRatio('#ffffff', '#3366cc'),
      10,
    );
  });

  it('matches the published value for the classic minimum grey', () => {
    // #767676 on white is the canonical ~4.54:1 "just passes AA" grey.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 1);
  });

  it('meetsContrast mirrors contrastRatio', () => {
    expect(meetsContrast('#767676', '#ffffff', AA_TEXT)).toBe(true);
    expect(meetsContrast('#999999', '#ffffff', AA_TEXT)).toBe(false);
  });
});

describe('bestTextOn', () => {
  it('picks dark text on light backgrounds and vice versa', () => {
    expect(bestTextOn('#ffffff')).toBe('#000000');
    expect(bestTextOn('#000000')).toBe('#ffffff');
    expect(bestTextOn('#facc15')).toBe('#000000');
    expect(bestTextOn('#1e3a8a')).toBe('#ffffff');
  });

  it('always clears AA text contrast — black/white is the worst case', () => {
    const samples = [
      '#facc15',
      '#767676',
      '#777777',
      '#7a7a7a',
      '#808080',
      '#8a8a8a',
      '#4f2683',
      '#ffb612',
      '#d3bc8d',
      '#0080c6',
      '#97233f',
    ];
    for (const sample of samples) {
      expect(contrastRatio(bestTextOn(sample), sample)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe('shiftLightness', () => {
  it('moves toward white and black at the extremes', () => {
    expect(shiftLightness('#808080', 0.6)).toBe('#ffffff');
    expect(shiftLightness('#808080', -0.6)).toBe('#000000');
  });

  it('leaves hue recognisable after a small shift', () => {
    const shifted = shiftLightness('#e31837', 0.1);
    const [r, , b] = Object.values(parseHex(shifted));
    expect(r).toBeGreaterThan(b);
  });
});

describe('blend', () => {
  it('returns the base at zero alpha and the top at one', () => {
    expect(blend('#ff0000', '#0000ff', 0)).toBe('#0000ff');
    expect(blend('#ff0000', '#0000ff', 1)).toBe('#ff0000');
  });

  it('interpolates in between', () => {
    expect(blend('#ffffff', '#000000', 0.5)).toBe('#808080');
  });
});

describe('ensureContrast', () => {
  it('returns the colour unchanged when it already passes', () => {
    expect(ensureContrast('#000000', '#ffffff', AA_TEXT)).toBe('#000000');
  });

  it('reaches the target against a light surface by darkening', () => {
    const safe = ensureContrast('#ffb612', '#ffffff', AA_TEXT);
    expect(contrastRatio(safe, '#ffffff')).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('reaches the target against a dark surface by lightening', () => {
    const safe = ensureContrast('#002244', '#0e1013', AA_TEXT);
    expect(contrastRatio(safe, '#0e1013')).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('treats the direction as a hint and still searches the other way if needed', () => {
    // Yellow cannot be lightened enough to clear AA on white, so the search has
    // to fall back to darkening.
    const safe = ensureContrast('#ffff00', '#ffffff', AA_TEXT, { direction: 'lighten' });
    expect(contrastRatio(safe, '#ffffff')).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('is deterministic', () => {
    expect(ensureContrast('#7a5c00', '#f6f6f4', AA_TEXT)).toBe(
      ensureContrast('#7a5c00', '#f6f6f4', AA_TEXT),
    );
  });

  it('reaches AA for every surface in both modes from an awkward colour', () => {
    for (const mode of ['light', 'dark'] as const) {
      for (const surface of contentSurfaces(mode)) {
        expect(contrastRatio(ensureContrast('#777777', surface, AA_TEXT), surface)).toBeGreaterThanOrEqual(
          AA_TEXT,
        );
      }
    }
  });
});

describe('ensureTextContrast', () => {
  it('guarantees one of black or white is readable on the result', () => {
    for (const input of ['#767676', '#7a7a7a', '#808080', '#8a8a8a', '#123456']) {
      const safe = ensureTextContrast(input, AA_TEXT);
      expect(contrastRatio(bestTextOn(safe), safe)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});

describe('mode surfaces', () => {
  it('keeps body text readable in every mode', () => {
    for (const mode of ['light', 'dark'] as const) {
      const s = MODE_SURFACES[mode];
      expect(contrastRatio(s.text, s.bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(s.text, s.surface)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(s.muted, s.bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(s.muted, s.surface)).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });

  it('gives each mode three distinct content surfaces', () => {
    for (const mode of ['light', 'dark'] as const) {
      const surfaces = contentSurfaces(mode);
      expect(new Set(surfaces).size).toBe(3);
      expect(surfaces).toContain(MODE_SURFACES[mode].bg);
    }
  });

  it('exposes a sane AA_LARGE threshold below the text one', () => {
    expect(AA_LARGE).toBeLessThan(AA_TEXT);
  });
});
