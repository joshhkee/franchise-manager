import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  aside,
}: {
  title: string;
  subtitle?: string;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {aside}
    </header>
  );
}

export function Card({
  title,
  subtitle,
  children,
  aside,
  className = '',
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-sans text-sm font-semibold tracking-wide text-muted uppercase">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
          </div>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2">
      <div className="text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint ? <div className="text-[11px] text-muted">{hint}</div> : null}
    </div>
  );
}

/* Semantic tones are mode-aware tokens: "verified" is green in both themes. */
const TONE = {
  good: 'border-tone-good/35 bg-tone-good/10 text-tone-good',
  warn: 'border-tone-warn/35 bg-tone-warn/10 text-tone-warn',
  bad: 'border-tone-bad/35 bg-tone-bad/10 text-tone-bad',
  info: 'border-tone-info/35 bg-tone-info/10 text-tone-info',
  muted: 'border-line bg-surface-2 text-muted',
} as const;

export function Badge({
  children,
  tone = 'muted',
}: {
  children: ReactNode;
  tone?: keyof typeof TONE;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
      {children}
    </p>
  );
}

export function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
        active ? 'bg-accent font-semibold text-accent-fg' : 'text-muted hover:text-ink'
      }`}
    >
      {label}
    </Link>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export function money(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

export function ovrTone(overall: number): keyof typeof TONE {
  if (overall >= 85) return 'good';
  if (overall >= 78) return 'info';
  if (overall >= 72) return 'muted';
  return 'warn';
}
