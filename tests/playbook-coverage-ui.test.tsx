import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaybookCoverage } from "../components/playbook-coverage";
import { buildCoverageReport } from "../lib/formations/coverage";
import { SPECIAL_TEAMS_SETS } from "../lib/formations/special-teams";

describe("playbook coverage surface", () => {
  it("states the honest totals and never labels a book verified", () => {
    render(<PlaybookCoverage />);

    expect(screen.getByText("86 playbooks: 0 verified, 4 partial, 82 unsupported.")).toBeInTheDocument();
    // D113 is open, so no row may claim verification while every slot is provisional.
    expect(screen.queryAllByText("Verified")).toHaveLength(0);
    expect(screen.getAllByText("Partial")).toHaveLength(4);
    expect(screen.getAllByText("Unsupported")).toHaveLength(82);
  });

  it("lists every inventoried book with its own plain-language explanation", () => {
    const { container } = render(<PlaybookCoverage />);
    const report = buildCoverageReport();

    for (const entry of report.entries) {
      expect(container.textContent).toContain(`${entry.playbook.teamLabel} ${entry.playbook.label}`);
      expect(container.textContent).toContain(entry.detail);
    }
    expect(container.textContent).toContain("All 42 formations mapped, but 462 slots are still provisional.");
    expect(container.textContent).toContain("No formation data yet");
  });

  it("shows the special-teams sets, roles and disclosed gaps without claiming diagrams", () => {
    const { container } = render(<PlaybookCoverage />);

    expect(screen.getByRole("heading", { name: "Special teams" })).toBeInTheDocument();
    for (const set of SPECIAL_TEAMS_SETS) {
      const link = screen.getByRole("link", { name: set.label });
      expect(link).toHaveAttribute("href", set.sourceUrl);
      expect(link).toHaveAttribute("rel", "noreferrer");
      expect(container.textContent).toContain(`${set.plays} plays`);
    }

    expect(container.textContent).toContain("No special-teams diagrams are drawn");
    expect(container.textContent).toMatch(/\(D131\)/);
    expect(container.textContent).toContain("Long snapper");
    expect(screen.getAllByText("set role only")).toHaveLength(2);
    expect(screen.getAllByText("depth chart")).toHaveLength(6);

    for (const label of ["Kickoff", "Kick return", "Punt return", "Onside kick", "Field goal block"]) {
      expect(container.textContent).toContain(label);
    }
  });

  it("renders the report it is given, so a verified book would actually appear", () => {
    const report = buildCoverageReport();
    const [first, ...rest] = report.entries;

    render(
      <PlaybookCoverage
        report={{
          ...report,
          entries: [{ ...first, status: "verified", detail: "All 42 formations mapped from named sources." }, ...rest],
          totals: { verified: 1, partial: 0, unsupported: 0 },
        }}
      />,
    );

    expect(screen.getByText("86 playbooks: 1 verified, 0 partial, 0 unsupported.")).toBeInTheDocument();
    expect(screen.getAllByText("Verified")).toHaveLength(1);
  });
});
