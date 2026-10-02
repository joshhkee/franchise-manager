import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { BottomNav } from "../components/bottom-nav";
import { EmptyState } from "../components/empty-state";
import { FranchiseStatus } from "../components/franchise-status";
import { SaveStatus } from "../components/save-status";
import { SidebarNav } from "../components/sidebar-nav";
import { isActivePath } from "../lib/nav";

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
});

describe("honest prototype states", () => {
  it("does not claim app saves are connected", () => {
    render(<SaveStatus />);
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.queryByText(/saved/i)).not.toBeInTheDocument();
  });

  it("labels the franchise selector as a prototype with nothing connected", () => {
    render(<FranchiseStatus />);
    expect(screen.getByRole("button", { name: /Franchise: none/i })).toBeDisabled();
    expect(screen.getByText("Prototype")).toBeInTheDocument();
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
