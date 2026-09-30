'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/team', label: 'Team' },
  { href: '/depth-chart', label: 'Depth Chart' },
  { href: '/formations', label: 'Formations' },
  { href: '/packages', label: 'Packages' },
  { href: '/personnel', label: 'Personnel' },
  { href: '/callsheet', label: 'Call Sheet' },
  { href: '/checklist', label: 'Checklist' },
  { href: '/transactions', label: 'Trades & Draft' },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 pb-1">
      {LINKS.map((link) => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-1.5 text-sm whitespace-nowrap transition ${
              active
                ? 'bg-accent font-semibold text-accent-fg'
                : 'border border-line bg-surface text-muted hover:text-ink'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
