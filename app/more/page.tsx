import Link from "next/link";
import { PageHeader } from "../../components/page-header";

const items = [
  { href: "/gm", label: "GM War Room", description: "Roster, manual assets, and transactions (C4A/C4B)." },
  {
    href: "/coach",
    label: "Coach View",
    description: "Scheme, personnel gaps, and formation identity (C4B).",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Theme, data provenance, backup, and account.",
  },
];

export default function MorePage() {
  return (
    <div>
      <PageHeader
        title="More"
        description="Workspaces that do not fit the primary phone navigation."
      />
      <ul className="grid gap-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-lg border border-line bg-surface p-4 hover:bg-surface-muted"
            >
              <span className="text-sm font-semibold">{item.label}</span>
              <span className="mt-1 block text-xs text-ink-muted">{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
