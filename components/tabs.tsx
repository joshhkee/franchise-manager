import Link from "next/link";
import type { TabItem } from "../lib/tabs";

export type { TabItem };

export function Tabs({
  items,
  current,
  basePath,
  param = "view",
}: {
  items: TabItem[];
  current: string;
  basePath: string;
  param?: string;
}) {
  const first = items[0]?.value;

  return (
    <nav aria-label="Section views" className="border-b border-line">
      <ul className="flex flex-wrap gap-x-1">
        {items.map((item) => {
          const active = item.value === current;
          const href =
            item.value === first ? basePath : `${basePath}?${param}=${encodeURIComponent(item.value)}`;
          return (
            <li key={item.value}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm ${
                  active
                    ? "border-accent font-medium text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
