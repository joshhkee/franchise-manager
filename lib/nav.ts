export type NavItem = {
  href: string;
  label: string;
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
  { href: "/more", label: "More" },
];

export const settingsNav: NavItem = { href: "/settings", label: "Settings" };

export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
