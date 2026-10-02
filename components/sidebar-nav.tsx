"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath, primaryNav, settingsNav } from "../lib/nav";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-surface md:flex">
      <div className="px-4 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Franchise Manager
        </p>
        <p className="mt-1 text-sm font-semibold">Madden 27 planning</p>
      </div>
      <nav aria-label="Primary" className="flex-1 px-2">
        <ul className="space-y-1">
          {primaryNav.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center rounded-md border-l-2 px-3 text-sm ${
                    active
                      ? "border-accent bg-surface-muted font-medium text-ink"
                      : "border-transparent text-ink-muted hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-line px-2 py-3">
        <Link
          href={settingsNav.href}
          aria-current={isActivePath(pathname, settingsNav.href) ? "page" : undefined}
          className="flex min-h-11 items-center rounded-md px-3 text-sm text-ink-muted hover:bg-surface-muted hover:text-ink"
        >
          {settingsNav.label}
        </Link>
      </div>
    </aside>
  );
}
