import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GamedayPanel } from "../components/gameday-panel";
import { CATALOG_PLAYS } from "../lib/gameday/catalog";
import type { GamedayData } from "../lib/data/gameday";

vi.mock("../lib/actions/gameday", () => ({ saveGamedayPlan: vi.fn() }));
vi.mock("../components/formation-diagram", () => ({ FormationDiagram: ({ onSelectSlot }: { onSelectSlot: (slotId: string) => void }) => <button onClick={() => onSelectSlot("QB")}>Formation diagram</button> }));

const state = {
  players: [], chartLists: {}, overrides: new Map(), favorites: [], overridesAvailable: true, jerseyNumbers: new Map(),
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
    fireEvent.click(screen.getByRole("button", { name: "play action" }));
    expect(within(spotlight).getAllByText(/^CALL/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "2nd & 1–3" }));
    expect(screen.getByText("Three-call spotlight")).toBeInTheDocument();
  });

  it("selects a play and shows Civil.GG diagram plus planned lineup fallback", () => {
    render(<GamedayPanel franchiseId="franchise-1" revision={0} side="offense" data={data} />);
    const play = CATALOG_PLAYS.find((item) => item.bookId === "nfl-off-falcons" && item.themes.includes("off-under-center-pa") && item.situations.includes("first_10"))!;
    fireEvent.click(screen.getByRole("button", { name: new RegExp(play.playName) }));
    expect(screen.getByText("Planned lineup (unconfirmed changes flagged)")).toBeInTheDocument();
    expect(screen.getByAltText(`${play.playName} play art from Civil.GG`)).toHaveAttribute("src", play.playArtUrl);
    expect(screen.getByText("Formation diagram")).toBeInTheDocument();
  });

  it("opens the reference drawer and plan editor with theme-specific editable controls", () => {
    render(<GamedayPanel franchiseId="franchise-1" revision={0} side="defense" data={data} />);
    fireEvent.click(screen.getByRole("button", { name: /Coach’s reference/ }));
    expect(screen.getByText("Shell Weak Spots & Counters")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit plan" }));
    expect(screen.getByLabelText("Plan name")).toBeInTheDocument();
    expect(screen.getByText(/Favorites in this book/)).toBeInTheDocument();
  });
});
