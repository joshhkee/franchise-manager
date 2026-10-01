import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AA_LARGE,
  AA_TEXT,
  contentSurfaces,
  contrastRatio,
  MODE_SURFACES,
  type ThemeMode,
} from '@/lib/color';
import {
  hasTeamPalette,
  NEUTRAL_PALETTE,
  resolveTeamPalette,
  TEAM_COLORS,
} from '@/data/teamColors';
import { alternateMode, resolveTheme, resolveThemeMode } from '@/lib/theme';

/**
 * The accessibility gate for the whole theme.
 *
 * Every team's real colours are pushed through the derivation and then checked
 * against every surface they can be drawn on, in both light and dark mode. If
 * anyone adds a team — or changes a threshold — and the result would be
 * unreadable, this file fails.
 */

const MODES: ThemeMode[] = ['light', 'dark'];

describe('team palette data', () => {
  it('covers all 32 clubs with unique abbreviations', () => {
    expect(TEAM_COLORS).toHaveLength(32);
    const abbrs = TEAM_COLORS.map((team) => team.abbr);
    expect(new Set(abbrs).size).toBe(32);
  });

  it('stores valid six-digit hex for every primary and secondary', () => {
    for (const team of TEAM_COLORS) {
      expect(team.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(team.secondary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(team.source.length).toBeGreaterThan(0);
    }
  });

  it('resolves by abbreviation, id, alias and name', () => {
    expect(resolveTeamPalette({ abbr: 'KC' }).name).toBe('Kansas City Chiefs');
    expect(resolveTeamPalette({ id: 'kc' }).name).toBe('Kansas City Chiefs');
    // Aliases used by other feeds resolve to the same club.
    expect(resolveTeamPalette({ abbr: 'OAK' }).abbr).toBe('LV');
    expect(resolveTeamPalette({ abbr: 'LA' }).abbr).toBe('LAR');
    expect(resolveTeamPalette({ abbr: 'JAC' }).abbr).toBe('JAX');
    expect(resolveTeamPalette({ name: 'Seattle Seahawks' }).abbr).toBe('SEA');
  });

  it('falls back to neutral for fictional or unknown teams', () => {
    expect(resolveTeamPalette({ abbr: 'ZZZ', name: 'Nowhere Nine' })).toBe(NEUTRAL_PALETTE);
    expect(resolveTeamPalette(null)).toBe(NEUTRAL_PALETTE);
    expect(hasTeamPalette({ abbr: 'ZZZ' })).toBe(false);
    expect(hasTeamPalette({ abbr: 'KC' })).toBe(true);
  });
});

describe('theme mode resolution', () => {
  it('defaults to dark and accepts the two known values', () => {
    expect(resolveThemeMode(undefined)).toBe('dark');
    expect(resolveThemeMode('dark')).toBe('dark');
    expect(resolveThemeMode('light')).toBe('light');
  });

  it('rejects anything else rather than trusting the cookie', () => {
    expect(resolveThemeMode('sepia')).toBe('dark');
    expect(resolveThemeMode('')).toBe('dark');
    expect(resolveThemeMode(42)).toBe('dark');
  });

  it('toggles between the two modes', () => {
    expect(alternateMode('dark')).toBe('light');
    expect(alternateMode('light')).toBe('dark');
  });
});

describe('accent tokens satisfy WCAG AA for every team, in every mode', () => {
  for (const mode of MODES) {
    describe(`${mode} mode`, () => {
      for (const team of [...TEAM_COLORS, NEUTRAL_PALETTE]) {
        it(`${team.abbr} ${team.name}`, () => {
          const { tokens } = resolveTheme(mode, { abbr: team.abbr });
          const surfaces = contentSurfaces(mode);

          // Text placed on a solid accent fill must be readable...
          expect(contrastRatio(tokens.accentFg, tokens.accent)).toBeGreaterThanOrEqual(AA_TEXT);
          // ...including on hover.
          expect(contrastRatio(tokens.accentFg, tokens.accentStrong)).toBeGreaterThanOrEqual(AA_TEXT);
          // ...and secondary fills too.
          expect(contrastRatio(tokens.secondaryFg, tokens.secondary)).toBeGreaterThanOrEqual(AA_TEXT);

          for (const surface of surfaces) {
            // Accent used as *text* on any surface clears AA text contrast.
            expect(contrastRatio(tokens.accentText, surface)).toBeGreaterThanOrEqual(AA_TEXT);
            // Accent as a UI fill/border and focus ring clears AA large/UI contrast.
            expect(contrastRatio(tokens.accent, surface)).toBeGreaterThanOrEqual(AA_LARGE);
            expect(contrastRatio(tokens.ring, surface)).toBeGreaterThanOrEqual(AA_LARGE);
            expect(contrastRatio(tokens.secondary, surface)).toBeGreaterThanOrEqual(AA_LARGE);
          }
        });
      }
    });
  }
});

describe('resolved theme', () => {
  it('inlines every token the CSS expects', () => {
    const theme = resolveTheme('dark', { abbr: 'KC' });
    for (const key of [
      '--bg',
      '--surface',
      '--surface-2',
      '--border',
      '--text',
      '--muted',
      '--accent',
      '--accent-strong',
      '--accent-fg',
      '--accent-text',
      '--accent-soft',
      '--accent-border',
      '--ring',
      '--secondary',
      '--secondary-fg',
    ]) {
      expect(theme.cssVars[key], `missing ${key}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('changes the accent when the team changes', () => {
    const chiefs = resolveTheme('dark', { abbr: 'KC' });
    const raiders = resolveTheme('dark', { abbr: 'LV' });
    expect(chiefs.tokens.accent).not.toBe(raiders.tokens.accent);
  });

  it('uses the neutral palette for a team it does not know', () => {
    const theme = resolveTheme('light', { abbr: 'ZZZ' });
    expect(theme.palette).toBe(NEUTRAL_PALETTE);
  });
});

/*
 * The token tables live in two places — TypeScript (so they can be reasoned
 * about) and CSS (so the browser can paint them). This test keeps them honest by
 * reading the stylesheet and comparing the surface hexes.
 */
describe('globals.css mirrors the TypeScript surfaces', () => {
  // Comments mention the selectors, so strip them before locating rule blocks.
  const css = readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  function block(selector: string): string {
    const start = css.indexOf(selector);
    expect(start, `selector ${selector} not found`).toBeGreaterThanOrEqual(0);
    const open = css.indexOf('{', start);
    const close = css.indexOf('}', open);
    return css.slice(open, close);
  }

  function valueIn(text: string, name: string): string | undefined {
    return text.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim();
  }

  it('declares the light surfaces on :root', () => {
    const root = block(':root');
    expect(valueIn(root, 'bg')).toBe(MODE_SURFACES.light.bg);
    expect(valueIn(root, 'surface')).toBe(MODE_SURFACES.light.surface);
    expect(valueIn(root, 'surface-2')).toBe(MODE_SURFACES.light.surface2);
    expect(valueIn(root, 'border')).toBe(MODE_SURFACES.light.border);
    expect(valueIn(root, 'text')).toBe(MODE_SURFACES.light.text);
    expect(valueIn(root, 'muted')).toBe(MODE_SURFACES.light.muted);
  });

  it('declares the dark surfaces on [data-theme="dark"]', () => {
    const dark = block("[data-theme='dark']");
    expect(valueIn(dark, 'bg')).toBe(MODE_SURFACES.dark.bg);
    expect(valueIn(dark, 'surface')).toBe(MODE_SURFACES.dark.surface);
    expect(valueIn(dark, 'surface-2')).toBe(MODE_SURFACES.dark.surface2);
    expect(valueIn(dark, 'border')).toBe(MODE_SURFACES.dark.border);
    expect(valueIn(dark, 'text')).toBe(MODE_SURFACES.dark.text);
    expect(valueIn(dark, 'muted')).toBe(MODE_SURFACES.dark.muted);
  });

  it('defines every accent custom property the layout injects', () => {
    for (const name of [
      'accent',
      'accent-strong',
      'accent-fg',
      'accent-text',
      'accent-soft',
      'accent-border',
      'ring',
      'secondary',
      'secondary-fg',
    ]) {
      expect(valueIn(block(':root'), name), `missing --${name}`).toBeTruthy();
    }
  });

  it('switches the dark variant on the theme attribute', () => {
    expect(css).toContain("[data-theme='dark']");
  });
});
