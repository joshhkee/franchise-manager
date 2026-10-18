import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/actions/scouting", () => ({ saveScoutingPreferences: vi.fn(), setShortlistStatus: vi.fn() }));
vi.mock("../components/autosave/use-idempotent-action", () => ({ useIdempotentAction: (action: unknown) => action }));

import { ScoutingPanel } from "../components/scouting-panel";
import type { ScoutingData } from "../lib/scouting";

const data: ScoutingData = {
  preferences: { offensiveScheme: null, defensiveScheme: null, offensiveBookId: "nfl-off-falcons", defensiveBookId: "nfl-def-falcons" },
  roster: [{ id: "p1", identity: "franchise", fullName: "A. Receiver", team: "ATL", listedPosition: "WR", archetype: null, age: null, overall: 90, ratings: { speed: 94, acceleration: 91 }, measurements: { weight: 190 }, rosterStatus: "active", sourceRecordId: "source-1" }],
  targets: [{ id: "source-2", identity: "source", fullName: "B. Receiver", team: null, listedPosition: "WR", archetype: null, age: null, overall: null, ratings: { speed: 88 }, measurements: {} }],
  shortlist: [{ kind: "trade_block", identity: "franchise", playerId: "p1", sourceRecordId: null, status: "pinned", note: "Review depth chart" }],
};

describe("C4B scouting panel", () => {
  it("shows independent unverified schemes/books and keeps unknown selection visible", () => {
    render(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="scheme" />);
    expect(screen.getByLabelText(/Offensive scheme/)).toHaveValue("");
    expect(screen.getByLabelText(/Defensive scheme/)).toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[2]).toHaveValue("nfl-off-falcons");
    expect(screen.getByText(/not verified Madden fit data/)).toBeInTheDocument();
  });

  it("exposes team and raw numeric filters", () => {
    render(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="trade-targets" />);
    expect(screen.getByLabelText("Team")).toBeInTheDocument();
    expect(screen.getByLabelText("Raw numeric field")).toBeInTheDocument();
  });

  it("compares raw values with missing labels and exposes note and dismiss controls", () => {
    render(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="trade-block" />);
    fireEvent.click(screen.getByLabelText("Compare A. Receiver"));
    expect(screen.getByRole("region", { name: "Player comparison" })).toBeInTheDocument();
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Note for A. Receiver")).toHaveValue("Review depth chart");
    expect(screen.getByRole("button", { name: /Pinned · dismiss/ })).toHaveAttribute("value", "dismissed");
    expect(screen.getByRole("button", { name: "Save note" })).toHaveAttribute("value", "pinned");
    expect(screen.getByText(/No generated|not a recommendation|not predicted/i)).toBeInTheDocument();
  });

  it("filters by raw numeric fields without treating a missing value as zero", () => {
    render(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="trade-targets" />);
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "ATL" } });
    expect(screen.getByText("0 records in this view.", { exact: false })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "all" } });
    fireEvent.change(screen.getByLabelText("Raw numeric field"), { target: { value: "rating:speed" } });
    fireEvent.change(screen.getByLabelText("Minimum raw value"), { target: { value: "90" } });
    expect(screen.getByText("0 records in this view. Filters compare published numeric values only; missing values stay unknown and do not match a numeric range. Select up to three to compare.")).toBeInTheDocument();
  });

  it("discloses the small sample and cited non-scoring caveat on targets", () => {
    render(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="trade-targets" />);
    expect(screen.getByText(/sample is small/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "NFL combine data by position" })).toHaveAttribute("href", expect.stringContaining("nfl.com"));
    expect(screen.getByText("Browse unattached records from the latest published catalog. No scheme-fit or athletic-anomaly ranking is shown until the underlying rules and evidence are approved.")).toBeInTheDocument();
  });

  it("links Coach gaps and formation identity to their authoritative editors", () => {
    const { rerender } = render(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="gaps" />);
    expect(screen.getByRole("link", { name: "Review depth chart" })).toHaveAttribute("href", "/lineups");
    rerender(<ScoutingPanel franchiseId="f1" revision={3} data={data} view="identity" />);
    expect(screen.getByRole("link", { name: "Open formation subs" })).toHaveAttribute("href", "/lineups?view=formations");
  });
});
