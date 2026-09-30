import { cookies } from 'next/headers';
import { resolveThemeMode, THEME_COOKIE, type ThemeMode } from './theme';

/**
 * The mode preference lives in a cookie so the server can render the right theme
 * on the first paint. There is no client-side flip and therefore no flash.
 */

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function readThemeMode(): Promise<ThemeMode> {
  const store = await cookies();
  return resolveThemeMode(store.get(THEME_COOKIE)?.value);
}

export async function writeThemeMode(mode: ThemeMode): Promise<void> {
  const store = await cookies();
  store.set(THEME_COOKIE, mode, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.SECURE_COOKIES === '1',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  });
}
