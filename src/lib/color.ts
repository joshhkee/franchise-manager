/**
 * Colour maths for the site theme.
 *
 * Everything here is pure: hex in, numbers or hex out, no DOM and no I/O, so the
 * whole contrast contract can be proved in unit tests. The one job this module has
 * is turning a team's real colours into a small set of tokens that are *guaranteed*
 * to satisfy WCAG 2.1 AA — no matter how light, dark or muddy the team's colours are.
 */

export type ThemeMode = 'light' | 'dark';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** The neutral surfaces every accent is measured against, per mode. */
export interface ModeSurfaces {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
}

/**
 * Canonical surface values. `globals.css` mirrors these hexes and a test asserts
 * the two never drift apart, so the colours the contrast maths reasons about are
 * the colours the browser actually paints.
 */
export const MODE_SURFACES: Record<ThemeMode, ModeSurfaces> = {
  light: {
    bg: '#f6f6f4',
    surface: '#ffffff',
    surface2: '#eeece7',
    border: '#d9d6cf',
    text: '#17181c',
    muted: '#5c626b',
  },
  dark: {
    bg: '#0e1013',
    surface: '#16191e',
    surface2: '#1e2229',
    border: '#2a2f38',
    text: '#e8eaee',
    muted: '#98a0ac',
  },
};

/** WCAG 2.1 AA thresholds. */
export const AA_TEXT = 4.5;
export const AA_LARGE = 3;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const round255 = (value: number) => Math.round(Math.min(255, Math.max(0, value)));

export function isHex(value: unknown): value is string {
  return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Accepts `#rgb` and `#rrggbb`. Throws on anything else, loudly. */
export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(value)) throw new Error(`Not a hex colour: ${hex}`);
  if (value.length === 3) {
    return {
      r: parseInt(value[0]! + value[0]!, 16),
      g: parseInt(value[1]! + value[1]!, 16),
      b: parseInt(value[2]! + value[2]!, 16),
    };
  }
  if (value.length === 6) {
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }
  throw new Error(`Not a hex colour: ${hex}`);
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => round255(channel).toString(16).padStart(2, '0')).join('')}`;
}

/** Normalise any accepted hex form to lowercase `#rrggbb`. */
export function normalizeHex(hex: string): string {
  return rgbToHex(parseHex(hex));
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance(hex: string): number {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG 2.1 contrast ratio, always >= 1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** True when `foreground` on `background` clears the given ratio. */
export function meetsContrast(foreground: string, background: string, target: number): boolean {
  return contrastRatio(foreground, background) >= target;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = l - c / 2;
  return { r: (rgb[0] + m) * 255, g: (rgb[1] + m) * 255, b: (rgb[2] + m) * 255 };
}

/** Shift a colour's HSL lightness by `delta` (in 0..1 units), keeping hue/sat. */
export function shiftLightness(hex: string, delta: number): string {
  const hsl = rgbToHsl(parseHex(hex));
  return rgbToHex(hslToRgb({ ...hsl, l: clamp01(hsl.l + delta) }));
}

/** Flatten `top` over `base` at the given alpha (0..1) — a simple sRGB blend. */
export function blend(top: string, base: string, alpha: number): string {
  const a = clamp01(alpha);
  const t = parseHex(top);
  const b = parseHex(base);
  return rgbToHex({
    r: t.r * a + b.r * (1 - a),
    g: t.g * a + b.g * (1 - a),
    b: t.b * a + b.b * (1 - a),
  });
}

/** Black or white, whichever reads better on `background`. */
export function bestTextOn(background: string): '#000000' | '#ffffff' {
  return contrastRatio('#000000', background) >= contrastRatio('#ffffff', background)
    ? '#000000'
    : '#ffffff';
}

export interface EnsureContrastOptions {
  /** Force the direction of the search. Defaults to moving away from `against`. */
  direction?: 'lighten' | 'darken';
}

/** Walk `hex` one way along its lightness axis, recording the best contrast seen. */
function walkLightness(
  start: string,
  against: string,
  target: number,
  direction: 'lighten' | 'darken',
): { color: string; ratio: number } {
  const baseLightness = rgbToHsl(parseHex(start)).l;
  const step = direction === 'lighten' ? 0.01 : -0.01;
  let best = start;
  let bestRatio = contrastRatio(start, against);

  for (let i = 0; i < 100; i += 1) {
    const lightness = clamp01(baseLightness + step * (i + 1));
    const candidate = shiftLightness(start, lightness - baseLightness);
    const ratio = contrastRatio(candidate, against);
    if (ratio > bestRatio) {
      best = candidate;
      bestRatio = ratio;
    }
    if (ratio >= target) return { color: candidate, ratio };
    if (lightness <= 0 || lightness >= 1) break;
  }

  return { color: best, ratio: bestRatio };
}

/**
 * Nudge `hex` along its lightness axis until it clears `target` against `against`.
 *
 * Hue and saturation are preserved, so a team's colour still *looks* like the
 * team's colour — it just gets pushed far enough from the surface to be legible.
 * Returns the closest achievable colour when the target cannot be reached.
 */
export function ensureContrast(
  hex: string,
  against: string,
  target: number,
  options: EnsureContrastOptions = {},
): string {
  const start = normalizeHex(hex);
  if (meetsContrast(start, against, target)) return start;

  // Default to moving away from the surface: darker surfaces push colours lighter.
  const preferred =
    options.direction ?? (relativeLuminance(against) > 0.5 ? 'darken' : 'lighten');
  const primary = walkLightness(start, against, target, preferred);
  if (primary.ratio >= target) return primary.color;

  // The preferred direction ran out of axis — try the other way before giving up.
  const flipped = walkLightness(
    start,
    against,
    target,
    preferred === 'lighten' ? 'darken' : 'lighten',
  );
  return flipped.ratio > primary.ratio ? flipped.color : primary.color;
}

/**
 * Push `hex` until *some* foreground (black or white) clears `target` on it.
 *
 * This is what makes a solid button safe: whichever way we move the colour, the
 * text sitting on top of it is guaranteed to be readable.
 */
export function ensureTextContrast(hex: string, target = AA_TEXT): string {
  const start = normalizeHex(hex);
  if (Math.max(contrastRatio('#000000', start), contrastRatio('#ffffff', start)) >= target) {
    return start;
  }
  // Neither extreme works yet, so move the colour toward one of them.
  const toBlack = contrastRatio('#000000', start);
  const toWhite = contrastRatio('#ffffff', start);
  return ensureContrast(start, toBlack >= toWhite ? '#000000' : '#ffffff', target);
}

/** The accent token set applied to `:root` for the active team + mode. */
export interface AccentTokens {
  accent: string;
  accentStrong: string;
  accentFg: string;
  accentText: string;
  accentSoft: string;
  accentBorder: string;
  ring: string;
  secondary: string;
  secondaryFg: string;
}

/**
 * The surfaces accent-coloured elements are actually drawn on. A token has to
 * clear its target against all of them, because the light/dark surfaces are not
 * the same lightness and the closest one is the binding constraint.
 */
export function contentSurfaces(mode: ThemeMode): string[] {
  const s = MODE_SURFACES[mode];
  return [s.bg, s.surface, s.surface2];
}

/** Apply `ensureContrast` against several surfaces in turn. */
function ensureAcross(hex: string, targets: string[], target: number): string {
  return targets.reduce((acc, surface) => ensureContrast(acc, surface, target), hex);
}

function makeStrong(accent: string, accentFg: string, target = AA_TEXT): string {
  // Move *away* from the foreground so the hover shade keeps its text readable.
  const direction = relativeLuminance(accentFg) >= 0.5 ? -1 : 1;
  const candidate = shiftLightness(accent, direction * 0.06);
  return meetsContrast(accentFg, candidate, target) ? candidate : accent;
}

/**
 * Derive every accent token for one team in one mode.
 *
 * Guarantees, all asserted in `tests/theme.spec.ts`:
 *   - `accentFg` on `accent` (and on `accentStrong`) clears AA text contrast.
 *   - `accentText` on the mode's `bg` clears AA text contrast.
 *   - `accent`, `ring` and `secondary` clear AA large/UI contrast on `bg`.
 */
export function deriveAccentTokens(
  primary: string,
  secondary: string | null | undefined,
  mode: ThemeMode,
): AccentTokens {
  const surfaces = MODE_SURFACES[mode];
  const targets = contentSurfaces(mode);

  // 1. A solid fill that stands out against every surface it sits on.
  const base = ensureAcross(primary, targets, AA_LARGE);
  // ...whose own on-colour is guaranteed readable (black or white always clears
  // AA text contrast on a solid colour, but assert it rather than assume).
  const accent = ensureTextContrast(base, AA_TEXT);
  const accentFg = bestTextOn(accent);

  // 2. A variant safe to use as *text* directly on any surface.
  const accentText = ensureAcross(accent, targets, AA_TEXT);

  // 3. The secondary colour, used sparingly for highlights.
  const secondarySafe = ensureAcross(secondary ?? primary, targets, AA_LARGE);

  return {
    accent,
    accentStrong: makeStrong(accent, accentFg),
    accentFg,
    accentText,
    accentSoft: blend(accent, surfaces.surface, 0.12),
    accentBorder: blend(accent, surfaces.surface, 0.45),
    ring: ensureAcross(accent, targets, AA_LARGE),
    secondary: secondarySafe,
    secondaryFg: bestTextOn(secondarySafe),
  };
}

/** Convenience: the full CSS custom-property map for a team + mode. */
export function accentTokenVars(tokens: AccentTokens): Record<string, string> {
  return {
    '--accent': tokens.accent,
    '--accent-strong': tokens.accentStrong,
    '--accent-fg': tokens.accentFg,
    '--accent-text': tokens.accentText,
    '--accent-soft': tokens.accentSoft,
    '--accent-border': tokens.accentBorder,
    '--ring': tokens.ring,
    '--secondary': tokens.secondary,
    '--secondary-fg': tokens.secondaryFg,
  };
}

/** Convenience: the surface CSS custom-property map for a mode. */
export function surfaceTokenVars(mode: ThemeMode): Record<string, string> {
  const s = MODE_SURFACES[mode];
  return {
    '--bg': s.bg,
    '--surface': s.surface,
    '--surface-2': s.surface2,
    '--border': s.border,
    '--text': s.text,
    '--muted': s.muted,
  };
}
