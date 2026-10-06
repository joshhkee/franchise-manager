import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  setOverride: vi.fn(),
  resetSlot: vi.fn(),
  resetFormation: vi.fn(),
  toggleFavorite: vi.fn(),
}));

vi.mock("../lib/actions/formations", () => ({
  setFormationOverride: harness.setOverride,
  resetFormationSlot: harness.resetSlot,
  resetFormation: harness.resetFormation,
  toggleFormationFavorite: harness.toggleFavorite,
}));

import { FormationPanel } from "../components/formation-panel";
import type { FormationState } from "../lib/data/formations";
import { overrideKey } from "../lib/formations/resolver";

const FORMATION = "nfl-off-falcons:singleback:tight-y-off";

const state: FormationState = {
  players: [
    { id: "p-qb", fullName: "Quinn Backs", rosterStatus: "active", primaryPosition: "QB", overall: 88 },
    { id: "p-lt", fullName: "Lane Turner", rosterStatus: "active", primaryPosition: "LT", overall: 82 },
    { id: "p-lg", fullName: "Lou Guard", rosterStatus: "active", primaryPosition: "LG", overall: 79 },
    { id: "p-c", fullName: "Cal Snap", rosterStatus: "active", primaryPosition: "C", overall: 84 },
    { id: "p-rg", fullName: "Roy Guard", rosterStatus: "active", primaryPosition: "RG", overall: 80 },
    { id: "p-rt", fullName: "Rex Tackle", rosterStatus: "active", primaryPosition: "RT", overall: 81 },
    { id: "p-wr1", fullName: "Xavier Deep", rosterStatus: "active", primaryPosition: "WR", overall: 90 },
    { id: "p-wr2", fullName: "Zane Wide", rosterStatus: "active", primaryPosition: "WR", overall: 85 },
    { id: "p-wr3", fullName: "Sly Morse", rosterStatus: "active", primaryPosition: "WR", overall: 77 },
    { id: "p-te", fullName: "Trey End", rosterStatus: "active", primaryPosition: "TE", overall: 83 },
    { id: "p-hb", fullName: "Hank Back", rosterStatus: "active", primaryPosition: "HB", overall: 86 },
  ],
  chartLists: {
    QB: { baseline: ["p-qb"], plan: [] },
    LT: { baseline: ["p-lt"], plan: [] },
    LG: { baseline: ["p-lg"], plan: [] },
    C: { baseline: ["p-c"], plan: [] },
    RG: { baseline: ["p-rg"], plan: [] },
    RT: { baseline: ["p-rt"], plan: [] },
    WR: { baseline: ["p-wr1", "p-wr2", "p-wr3"], plan: [] },
    TE: { baseline: ["p-te"], plan: [] },
    HB: { baseline: ["p-hb"], plan: [] },
  },
  overrides: new Map(),
  favorites: [],
  overridesAvailable: true,
  jerseyNumbers: new Map([["p-qb", "88"]]),
};

function renderPanel(panelState: FormationState = state) {
  render(
    <FormationPanel
      franchise={{ id: "f1", name: "Test franchise", revision: 7 }}
      state={panelState}
    />,
  );
}

const overridePicker = () => screen.getByLabelText("Set override player");

beforeEach(() => {
  harness.setOverride.mockReset();
  harness.resetSlot.mockReset();
  harness.resetFormation.mockReset();
  harness.toggleFavorite.mockReset();
  const saved = { outcome: "saved" as const, message: "Saved.", revision: 8 };
  harness.setOverride.mockResolvedValue(saved);
  harness.resetSlot.mockResolvedValue(saved);
  harness.resetFormation.mockResolvedValue({ ...saved, slotIds: ["QB"] });
  harness.toggleFavorite.mockResolvedValue(saved);
});

describe("formation diagram and panel", () => {
  it("renders the mapped formation with the owner-attested orientation and opens the slot editor", () => {
    renderPanel();

    // The Tight Y Off (singleback) is the default book:formation (Falcons offense);
    // the name also exists in the gun set, so scope to the selected heading.
    expect(screen.getByRole("heading", { level: 3, name: /Tight Y Off/ })).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Formation diagram\. Orientation is owner-attested/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/defense-left = viewer's right/)).toBeInTheDocument();

    // Unselected state is honest about what to do next.
    expect(screen.getByText(/Select a slot on the diagram/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^QB: Quinn Backs, OVR 88, #88$/ }));

    expect(screen.getByText("Slot QB (QB)")).toBeInTheDocument();
    expect(screen.getByText(/inherited from the depth chart/)).toBeInTheDocument();
  });

  it("compact mode shows recorded jersey numbers and never invents a missing one", () => {
    renderPanel();

    // Name mode: slot label in the circle, surname beneath it (suffixes filtered, never invented).
    expect(screen.getByText("QB", { selector: "svg text" })).toBeInTheDocument();
    expect(screen.getByText("Backs", { selector: "svg text" })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Compact number circles"));

    // Recorded jersey is shown as the number circle; unknown ones fall back to the slot label.
    expect(screen.getByText("#88", { selector: "svg text" })).toBeInTheDocument();
    expect(screen.queryByText("Backs", { selector: "svg text" })).not.toBeInTheDocument();
    expect(screen.getByText("X", { selector: "svg text" })).toBeInTheDocument();

    // The accessible detail is unchanged by the display mode (A16).
    expect(screen.getByRole("button", { name: /^X: Xavier Deep, OVR 90$/ })).toBeInTheDocument();
  });

  it("sends the full book:set:slug identity plus slot when an override is picked", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /^QB: Quinn Backs/ }));
    fireEvent.change(overridePicker(), { target: { value: "p-wr1" } });

    await waitFor(() => expect(harness.setOverride).toHaveBeenCalledTimes(1));
    expect(harness.setOverride.mock.calls[0][0]).toMatchObject({
      franchiseId: "f1",
      formationId: FORMATION,
      slotId: "QB",
      playerId: "p-wr1",
      expectedRevision: 7,
    });
    expect(typeof harness.setOverride.mock.calls[0][0].requestId).toBe("string");
    await waitFor(() => expect(screen.getByText("Saved.")).toBeInTheDocument());
  });

  it("picking the inherit option clears the override (playerId null)", async () => {
    renderPanel({
      ...state,
      overrides: new Map([[overrideKey(FORMATION, "QB", "plan"), "p-wr1"]]),
    });

    fireEvent.click(screen.getByRole("button", { name: /^QB: Xavier Deep/ }));
    fireEvent.change(overridePicker(), { target: { value: "" } });

    await waitFor(() => expect(harness.setOverride).toHaveBeenCalledTimes(1));
    expect(harness.setOverride.mock.calls[0][0]).toMatchObject({
      formationId: FORMATION,
      slotId: "QB",
      playerId: null,
    });
  });

  it("summarizes pending overrides and resets the whole formation explicitly", async () => {
    renderPanel({
      ...state,
      overrides: new Map([[overrideKey(FORMATION, "QB", "plan"), "p-wr1"]]),
    });

    expect(screen.getByText(/Pending overrides on this formation: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Quinn Backs → Xavier Deep/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset this formation.s overrides/ }));

    await waitFor(() => expect(harness.resetFormation).toHaveBeenCalledTimes(1));
    expect(harness.resetFormation.mock.calls[0][0]).toMatchObject({
      franchiseId: "f1",
      formationId: FORMATION,
      slotIds: ["QB"],
      expectedRevision: 7,
    });
  });

  it("resets a single slot back to inherited", async () => {
    renderPanel({
      ...state,
      overrides: new Map([[overrideKey(FORMATION, "QB", "plan"), "p-wr1"]]),
    });

    fireEvent.click(screen.getByRole("button", { name: /^QB: Xavier Deep/ }));
    fireEvent.click(screen.getByRole("button", { name: "Reset slot to inherited" }));

    await waitFor(() => expect(harness.resetSlot).toHaveBeenCalledTimes(1));
    expect(harness.resetSlot.mock.calls[0][0]).toMatchObject({
      formationId: FORMATION,
      slotId: "QB",
      expectedRevision: 7,
    });
  });

  it("keeps unmapped formations visible and honest without inventing a diagram", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /Tight Y Off Flex/ }));

    expect(screen.getByText(/has no slot mapping yet/)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Formation diagram/ })).not.toBeInTheDocument();
  });

  it("toggles the formation favorite with the book-scoped identity", async () => {
    renderPanel({
      ...state,
      favorites: [{ bookId: "nfl-off-falcons", formationId: FORMATION }],
    });

    const favoriteButton = screen.getByRole("button", { name: "★ Favorited" });
    expect(favoriteButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(favoriteButton);

    await waitFor(() => expect(harness.toggleFavorite).toHaveBeenCalledTimes(1));
    expect(harness.toggleFavorite.mock.calls[0][0]).toMatchObject({
      franchiseId: "f1",
      bookId: "nfl-off-falcons",
      formationId: FORMATION,
      favorite: false,
    });
  });
});
