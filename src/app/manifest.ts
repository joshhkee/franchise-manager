import type { MetadataRoute } from 'next';
import { loadTeamIdentity } from '@/lib/loaders';
import { readThemeMode } from '@/lib/themeCookie';
import { resolveTheme } from '@/lib/theme';
import { MODE_SURFACES } from '@/lib/color';

/**
 * The manifest is generated per request so the installed app's chrome matches the
 * team you are running. Anything that fails (no database yet, signed out) falls
 * back to the neutral dark surface rather than erroring.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let background = MODE_SURFACES.dark.bg;
  let theme = MODE_SURFACES.dark.bg;

  try {
    const [mode, { userTeam }] = await Promise.all([readThemeMode(), loadTeamIdentity()]);
    background = MODE_SURFACES[mode].bg;
    theme = resolveTheme(mode, userTeam).themeColor;
  } catch {
    // Keep the neutral defaults.
  }

  return {
    name: 'Madden Franchise Manager',
    short_name: 'Franchise',
    description:
      'Depth chart, formation subs, call sheet and roster upkeep for a Madden 27 franchise.',
    start_url: '/',
    display: 'standalone',
    background_color: background,
    theme_color: theme,
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
