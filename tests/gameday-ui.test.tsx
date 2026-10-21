import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GamedayPanel } from "../components/gameday-panel";
import { CATALOG_PLAYS } from "../lib/gameday/catalog";
import type { GamedayData } from "../lib/data/gameday";

vi.mock("../lib/actions/gameday", () => ({ saveGamedayPlan: vi.fn() }));
vi.mock("../components/formation-diagram", () => ({
  FormationDiagram: ({ mode, onSelectSlot }: { mode: string; onSelectSlot: (slotId: string) => void }) => (
    <button onClick={() => onSelectSlot("QB")}>Formation diagram ({mode})</button>
  ),
}));

const state = {
  players: [
    { id: "p-qb", fullName: "Kirk Cousins", rosterStatus: "active" as const, primaryPosition: "QB", overall: 84 },
    { id: "p-hb", fullName: "Incoming Back", rosterStatus: "pending_incoming" as const, primaryPosition: "HB", overall: 79 },
    { id: "p-te", fullName: "Practice TE", rosterStatus: "practice_squad" as const, primaryPosition: "TE", overall: 68 },
  ],
  chartLists: {
    QB: { baseline: ["p-qb"], plan: ["p-qb"] },
    HB: { baseline: ["p-hb"], plan: ["p-hb"] },
    TE: { baseline: ["p-te"], plan: ["p-te"] },
  },
  overrides: new Map(),
  favorites: [],
  overridesAvailable: true,
  jerseyNumbers: new Map([["p-qb", "18"]]),
};
const data: GamedayData = {
  bookIdBySide: { offense: "nfl-off-falcons", defense: "nfl-def-falcons" },
  plans: [], formationState: state,
};

describe("Gameday call sheet", () => {
  it("shows 3 suggestions and changes the menu on play type and situation clicks", () => {
    render(<GamedayPanel franchiseId="franchise-1" revision={0} side="offense" data={data} />);
    expect(screen.getByText("Three-call spotlight")).toBeInTheDocument();
    const spotlight = screen.getByLabelText("Three-call spotlight");
    expect(within(spotlight).getAllByText(/^CALL/)).toHaveLength(3);
    const filters = screen.getByLabelText("Call sheet filters");
    fireEvent.click(within(filters).getByRole("button", { name: /play action/i }));
    expect(within(spotlight).getAllByText(/^CALL/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "2nd & 1–3" }));
    expect(screen.getByText("Three-call spotlight")).toBeInTheDocument();
  });

  it("selects a play, shows Civil.GG diagram, flags pending lineup warnings, and toggles compact mode", () => {
    render(<GamedayPanel franchiseId="franchise-1" revision={0} side="offense" data={data} />);
    const play = CATALOG_PLAYS.find((item) => item.bookId === "nfl-off-falcons" && item.themes.includes("off-under-center-pa") && item.situations.includes("first_10"))!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(play.playName) }));
    expect(screen.getByText("Planned lineup (unconfirmed changes flagged)")).toBeInTheDocument();
    expect(screen.getByAltText(`${play.playName} play art from Civil.GG`)).toHaveAttribute("src", play.playArtUrl);
    expect(screen.getByText("Formation diagram (name)")).toBeInTheDocument();
    expect(screen.getByText("Lineup needs review")).toBeInTheDocument();
    expect(screen.getByText(/Incoming Back is pending an incoming transaction/)).toBeInTheDocument();
    expect(screen.getByText(/Practice TE needs promotion before game use/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Compact # circles" }));
    expect(screen.getByText("Formation diagram (compact)")).toBeInTheDocument();
  });

  it("supports refreshing calls and resetting session displayed memory", () => {
    render(<GamedayPanel franchiseId="franchise-1" revision={0} side="offense" data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh calls" }));
    const resetBtn = screen.getByRole("button", { name: /Reset displayed memory/ });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(screen.queryByRole("button", { name: /Reset displayed memory/ })).not.toBeInTheDocument();
  });

  it("opens the reference drawer, optional defense context, and plan editor", () => {
    render(<GamedayPanel franchiseId="franchise-1" revision={0} side="defense" data={data} />);
    expect(screen.getByLabelText("Offensive personnel grouping")).toBeInTheDocument();
    expect(screen.getByLabelText("Formation alignment look")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Coach’s reference/ }));
    expect(screen.getByText("Shell Weak Spots & Counters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    expect(screen.getByLabelText("Plan name")).toBeInTheDocument();
    expect(screen.getByText(/Favorites in this book/)).toBeInTheDocument();
  });
});
