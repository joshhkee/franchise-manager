import { render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname.current,
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { BottomNav } from "../components/bottom-nav";
import { EmptyState } from "../components/empty-state";
import { FranchiseStatusBadge } from "../components/franchise-status";
import { SaveStatus } from "../components/save-status";
import { SidebarNav } from "../components/sidebar-nav";
import { isActivePath } from "../lib/nav";
import { coachTabs, gamedayTabs, gmTabs, lineupsTabs } from "../lib/tabs";

beforeEach(() => {
  mockPathname.current = "/";
});

describe("shell navigation", () => {
  it("renders the approved desktop primary navigation and settings", () => {
    render(<SidebarNav />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of [
      "Overview",
      "Lineups",
      "GM War Room",
      "Coach View",
      "Gameday",
      "Checklist",
    ]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("renders the approved phone bottom navigation", () => {
    render(<BottomNav />);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    for (const label of ["Overview", "Lineups", "Gameday", "Checklist", "More"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks active paths without matching unrelated routes", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/lineups", "/")).toBe(false);
    expect(isActivePath("/lineups", "/lineups")).toBe(true);
    expect(isActivePath("/lineups/formations", "/lineups")).toBe(true);
  });

  it("marks More active on its child routes", () => {
    for (const child of ["/gm", "/coach", "/settings"]) {
      expect(isActivePath(child, "/more", ["/gm", "/coach", "/settings"])).toBe(true);
      expect(isActivePath(`${child}/detail`, "/more", ["/gm", "/coach", "/settings"])).toBe(true);
    }
    expect(isActivePath("/gameday", "/more", ["/gm", "/coach", "/settings"])).toBe(false);

    mockPathname.current = "/gm";
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: "More" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the section-view query values the docs reference", () => {
    expect(lineupsTabs.map((tab) => tab.value)).toEqual(["depth", "formations"]);
    expect(gmTabs.map((tab) => tab.value)).toEqual([
      "roster",
      "trade-block",
      "trade-targets",
      "assets",
    ]);
    expect(gmTabs.map((tab) => tab.label)).toEqual([
      "Roster",
      "Trade Block",
      "Trade Targets",
      "Assets & Moves",
    ]);
    expect(coachTabs.map((tab) => tab.value)).toEqual(["scheme", "gaps", "identity"]);
    expect(gamedayTabs.map((tab) => tab.value)).toEqual(["offense", "defense"]);
  });
});

describe("honest prototype states", () => {
  it("does not claim app saves are connected", () => {
    render(<SaveStatus />);
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });

  it("reports the real storage and franchise state instead of a prototype badge", () => {
    render(
      <>
        <SaveStatus />
        <FranchiseStatusBadge label="Franchise: not connected" />
      </>,
    );
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.getByText("Franchise: not connected")).toBeInTheDocument();
    expect(screen.queryByText("Prototype")).not.toBeInTheDocument();
  });

  it("renders empty states with actionable detail", () => {
    render(
      <EmptyState
        title="No franchise connected"
        detail="Pending changes appear once lineup planning exists."
        hint="Prototype shell."
      />,
    );
    expect(screen.getByText("No franchise connected")).toBeInTheDocument();
    expect(screen.getByText(/Pending changes appear/)).toBeInTheDocument();
    expect(screen.getByText("Prototype shell.")).toBeInTheDocument();
  });
});
