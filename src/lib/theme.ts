/**
 * Theme resolution.
 *
 * Kept free of `next/*` imports so the resolution rules are unit-testable and can
 * be reused by the manifest, the audit script and the pages. The actual cookie
 * read/write lives in `themeCookie.ts`.
 */

import {
  accentTokenVars,
  deriveAccentTokens,
  surfaceTokenVars,
  type AccentTokens,
  type ThemeMode,
} from './color';
import { resolveTeamPalette, type TeamLike, type TeamPalette } from '@/data/teamColors';

export type { ThemeMode };

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark'];
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';
export const THEME_COOKIE = 'fm_theme';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

/** Unknown or missing cookie values fall back to the default mode. */
export function resolveThemeMode(value: unknown): ThemeMode {
  return isThemeMode(value) ? value : DEFAULT_THEME_MODE;
}

export function alternateMode(mode: ThemeMode): ThemeMode {
  return mode === 'dark' ? 'light' : 'dark';
}

export interface ResolvedTheme {
  mode: ThemeMode;
  palette: TeamPalette;
  tokens: AccentTokens;
  /** Custom properties to inline on <html>; already contrast-safe. */
  cssVars: Record<string, string>;
  /** Suggested `theme-color` for the browser/PWA chrome. */
  themeColor: string;
}

/**
 * Combine a mode and a team into the full token set the UI paints with. The team
 * may be `null` (signed-out, or a fictional franchise) — that yields the neutral
 * palette rather than an error.
 */
export function resolveTheme(mode: ThemeMode, team: TeamLike | null | undefined): ResolvedTheme {
  const palette = resolveTeamPalette(team);
  const tokens = deriveAccentTokens(palette.primary, palette.secondary, mode);
  return {
    mode,
    palette,
    tokens,
    cssVars: { ...surfaceTokenVars(mode), ...accentTokenVars(tokens) },
    themeColor: tokens.accent,
  };
}
