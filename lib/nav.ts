export type NavItem = {
  href: string;
  label: string;
  /** Extra routes that should render this item as active (e.g. More covers GM/Coach/Settings). */
  subpaths?: string[];
};

export const primaryNav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/lineups", label: "Lineups" },
  { href: "/gm", label: "GM War Room" },
  { href: "/coach", label: "Coach View" },
  { href: "/gameday", label: "Gameday" },
  { href: "/checklist", label: "Checklist" },
];

export const phoneNav: NavItem[] = [
  { href: "/", label: "Overview" },
  { href: "/lineups", label: "Lineups" },
  { href: "/gameday", label: "Gameday" },
  { href: "/checklist", label: "Checklist" },
  { href: "/more", label: "More", subpaths: ["/gm", "/coach", "/settings"] },
];

export const settingsNav: NavItem = { href: "/settings", label: "Settings" };

export function isActivePath(pathname: string, href: string, subpaths: string[] = []): boolean {
  const matches = (target: string) => pathname === target || pathname.startsWith(`${target}/`);
  if (href === "/") {
    return pathname === "/";
  }
  return matches(href) || subpaths.some(matches);
}
