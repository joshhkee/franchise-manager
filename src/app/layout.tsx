import type { Metadata, Viewport } from 'next';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { Source_Serif_4 } from 'next/font/google';
import { NavBar } from '@/components/NavBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { isAuthenticated, usingDefaultPassphrase } from '@/lib/auth';
import { loadTeamIdentity } from '@/lib/loaders';
import { readThemeMode } from '@/lib/themeCookie';
import { resolveTheme } from '@/lib/theme';
import './globals.css';

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
});

export const metadata: Metadata = {
  title: 'Franchise Manager',
  description:
    'Madden 27 franchise manager: depth chart, formation subs, call sheet and roster upkeep in one place.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Franchise Manager', statusBarStyle: 'black-translucent' },
};

/**
 * The browser/PWA chrome colour follows the team accent, so the address bar keeps
 * the same identity as the page.
 */
export async function generateViewport(): Promise<Viewport> {
  const [mode, { userTeam }] = await Promise.all([readThemeMode(), loadTeamIdentity()]);
  return {
    themeColor: resolveTheme(mode, userTeam).themeColor,
    width: 'device-width',
    initialScale: 1,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [authed, mode, { userTeam }] = await Promise.all([
    isAuthenticated(),
    readThemeMode(),
    loadTeamIdentity(),
  ]);
  const theme = resolveTheme(mode, userTeam);

  return (
    <html
      lang="en"
      data-theme={theme.mode}
      className={sourceSerif.variable}
      style={theme.cssVars as CSSProperties}
    >
      <body className="min-h-dvh font-sans antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-16 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link href="/" className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                aria-hidden
              >
                {userTeam?.abbr ?? theme.palette.abbr}
              </span>
              <span className="truncate font-serif text-base font-semibold tracking-tight">
                {userTeam?.name ?? 'Franchise Manager'}
              </span>
            </Link>

            <div className="flex shrink-0 items-center gap-3">
              <ThemeToggle mode={theme.mode} />
              {authed ? (
                <form action="/api/logout" method="post">
                  <button className="text-xs whitespace-nowrap text-muted underline" type="submit">
                    Sign out
                  </button>
                </form>
              ) : null}
            </div>
          </div>

          {authed ? <NavBar /> : null}

          {usingDefaultPassphrase() && authed ? (
            <p className="note note-warn mt-3 text-xs">
              Using the default passphrase. Set <code>APP_PASSPHRASE</code> and{' '}
              <code>SESSION_SECRET</code> before deploying anywhere public.
            </p>
          ) : null}

          <main className="mt-4 flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
