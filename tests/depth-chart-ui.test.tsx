import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  savePlan: vi.fn(),
  recordBaseline: vi.fn(),
  discardPlan: vi.fn(),
  rosterStatus: vi.fn(),
  generate: vi.fn(),
  push: vi.fn(),
}));

vi.mock("../lib/actions/depth-chart", () => ({
  saveDepthChartPlan: harness.savePlan,
  recordDepthChartBaseline: harness.recordBaseline,
  discardDepthChartPlan: harness.discardPlan,
  recordRosterStatus: harness.rosterStatus,
  generateDepthChart: harness.generate,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: harness.push }),
}));

import { AutosaveProvider } from "../components/autosave/autosave-provider";
import { DepthChartPanel } from "../components/depth-chart-panel";
import type { DepthChartData } from "../lib/data/depth-chart";

const data: DepthChartData = {
  players: [
    { id: "p1", fullName: "Alpha Back", rosterStatus: "active", primaryPosition: "QB", overall: 80 },
    { id: "p2", fullName: "Bravo Back", rosterStatus: "active", primaryPosition: "QB", overall: 70 },
    { id: "p3", fullName: "Wrong Position", rosterStatus: "active", primaryPosition: "WR", overall: 90 },
    { id: "p4", fullName: "Squad Guy", rosterStatus: "practice_squad", primaryPosition: "QB", overall: 75 },
    { id: "p5", fullName: "Hotel Back", rosterStatus: "active", primaryPosition: "HB", overall: 85 },
    { id: "p6", fullName: "Kicker Guy", rosterStatus: "active", primaryPosition: "K", overall: 79 },
  ],
  entries: [
    { position: "QB", layer: "baseline", rank: 1, playerId: "p1", verification: "provisional_published" },
  ],
};

function renderPanel(panelData: DepthChartData = data) {
  render(
    <AutosaveProvider franchiseId="f1" initialRevision={3}>
      <DepthChartPanel franchise={{ id: "f1", name: "Test franchise", revision: 3 }} data={panelData} />
    </AutosaveProvider>,
  );
}

function addBravo() {
  fireEvent.click(screen.getByRole("button", { name: "Add player" }));
  const row = screen.getByText("Bravo Back").closest("li") as HTMLElement;
  fireEvent.click(within(row).getByRole("button", { name: "Add" }));
}

beforeEach(() => {
  harness.savePlan.mockReset();
  harness.recordBaseline.mockReset();
  harness.discardPlan.mockReset();
  harness.rosterStatus.mockReset();
  harness.generate.mockReset();
  harness.push.mockReset();
  harness.savePlan.mockImplementation(
    async (input: { playerIds: string[] }) => ({
      outcome: "saved" as const,
      message: "Planned.",
      revision: 4,
      playerIds: input.playerIds,
    }),
  );
});

describe("depth chart planning", () => {
  it("saves the whole position list when a player is added and moved", async () => {
    renderPanel();
    expect(screen.getByText("Alpha Back")).toBeInTheDocument();

    addBravo();

    await waitFor(() => expect(harness.savePlan).toHaveBeenCalledTimes(1));
    expect(harness.savePlan.mock.calls[0][0]).toMatchObject({
      franchiseId: "f1",
      position: "QB",
      playerIds: ["p1", "p2"],
      expectedRevision: 3,
    });
    expect(typeof harness.savePlan.mock.calls[0][0].requestId).toBe("string");

    fireEvent.click(screen.getByRole("button", { name: "Move Bravo Back up" }));
    await waitFor(() => expect(harness.savePlan).toHaveBeenCalledTimes(2));
    expect(harness.savePlan.mock.calls[1][0].playerIds).toEqual(["p2", "p1"]);
    expect(harness.savePlan.mock.calls[1][0].expectedRevision).toBe(4);
  });

  it("keeps the local list on a conflict and retries with the same request id", async () => {
    harness.savePlan.mockResolvedValueOnce({
      outcome: "conflict",
      message:
        "This franchise changed since this page loaded, so nothing was written. Your input is kept here — reload to see the latest revision, then retry.",
    });
    renderPanel();
    addBravo();

    await waitFor(() =>
      expect(screen.getByText(/This franchise changed since this page loaded/)).toBeInTheDocument(),
    );
    // The unsaved list is preserved: Bravo is still in the planned list.
    expect(screen.getAllByText("Bravo Back").length).toBeGreaterThan(0);

    const firstId = harness.savePlan.mock.calls[0][0].requestId;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(harness.savePlan).toHaveBeenCalledTimes(2));
    expect(harness.savePlan.mock.calls[1][0].requestId).toBe(firstId);
  });

  it("blocks a practice-squad player and offers the recorded roster correction", async () => {
    harness.rosterStatus.mockResolvedValue({
      outcome: "saved",
      message: "Recorded as active roster.",
      revision: 5,
      status: "active",
    });
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "Add player" }));

    const pickerRow = screen.getAllByText("Squad Guy")[0].closest("li") as HTMLElement;
    const addButton = within(pickerRow).getByRole("button", { name: "Add" });
    expect(addButton).toBeDisabled();
    expect(within(pickerRow).getByText(/promotion is required/)).toBeInTheDocument();

    fireEvent.click(within(pickerRow).getByRole("button", { name: "Record as active roster" }));
    await waitFor(() =>
      expect(harness.rosterStatus).toHaveBeenCalledWith(
        expect.objectContaining({ franchiseId: "f1", playerId: "p4", status: "active" }),
      ),
    );
    await waitFor(() =>
      expect(within(pickerRow).getByRole("button", { name: "Add" })).toBeEnabled(),
    );
  });

  it("inspects the recorded baseline as its own labeled, read-only layer", async () => {
    renderPanel();
    expect(screen.getByText(/baseline is provisional\/unverified/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Recorded baseline" }));
    expect(screen.getByText("Alpha Back")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move .* up/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add player" })).not.toBeInTheDocument();
  });

  it("records reality only through the explicit action and clears the redundant plan", async () => {
    harness.recordBaseline.mockImplementation(
      async (input: { playerIds: string[] }) => ({
        outcome: "saved" as const,
        message: "Recorded as already happened.",
        revision: 4,
        playerIds: input.playerIds,
        verification: "owner_confirmed",
        planKept: false,
      }),
    );
    renderPanel();
    addBravo();
    await waitFor(() => expect(harness.savePlan).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Record as already happened" }));
    await waitFor(() =>
      expect(harness.recordBaseline).toHaveBeenCalledWith(
        expect.objectContaining({ intent: "recorded", playerIds: ["p1", "p2"] }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByText(/recorded baseline confirmed by you as already happened/)).toBeInTheDocument(),
    );
    expect(screen.queryByText(/Pending vs recorded baseline/)).not.toBeInTheDocument();
  });

  it("discards pending changes back to the recorded baseline", async () => {
    harness.discardPlan.mockResolvedValue({
      outcome: "saved",
      message: "Pending changes for this position were discarded; the list matches its baseline again.",
      revision: 4,
      playerIds: [],
    });
    renderPanel();
    addBravo();
    await waitFor(() => expect(harness.savePlan).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Discard pending changes" }));
    await waitFor(() => expect(harness.discardPlan).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByText("Bravo Back")).not.toBeInTheDocument());
    expect(screen.queryByText(/Pending vs recorded baseline/)).not.toBeInTheDocument();
  });

  it("offers no suggestion for manual specialist slots and labels the provisional rules", () => {
    renderPanel();
    expect(screen.getByText(/Provisional rules — owner planning reference/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Specialists" }));
    fireEvent.click(screen.getByRole("button", { name: /^PR/ }));
    expect(screen.queryByRole("button", { name: "Suggest order (provisional)" })).not.toBeInTheDocument();
  });
});

describe("generate all positions", () => {
  function mockSeededGeneration() {
    harness.generate.mockImplementation(
      async (input: { plans: { position: string; playerIds: string[] }[] }) => ({
        outcome: "saved" as const,
        message: "Generated provisional lists for 3 positions; 3 seeded as an unverified baseline.",
        revision: 4,
        plans: input.plans.map((plan) => ({ ...plan, baselineSeeded: true, noop: false })),
        wrote: true,
      }),
    );
  }

  const generateButton = () => screen.getByRole("button", { name: "Generate all positions (provisional)" });

  it("fills every open position in one request and shows the seeded lists", async () => {
    mockSeededGeneration();
    renderPanel();

    fireEvent.click(generateButton());

    await waitFor(() => expect(harness.generate).toHaveBeenCalledTimes(1));
    expect(harness.generate.mock.calls[0][0]).toMatchObject({
      franchiseId: "f1",
      expectedRevision: 3,
      plans: [
        { position: "HB", playerIds: ["p5"] },
        { position: "WR", playerIds: ["p3"] },
        { position: "K", playerIds: ["p6"] },
      ],
    });
    expect(typeof harness.generate.mock.calls[0][0].requestId).toBe("string");
    await waitFor(() =>
      expect(screen.getByText(/Generated provisional lists for 3 positions/)).toBeInTheDocument(),
    );

    // The generated list lands in the panel immediately, with no extra save call.
    fireEvent.click(screen.getByRole("button", { name: /^WR/ }));
    expect(screen.getByText("Wrong Position")).toBeInTheDocument();
    expect(harness.savePlan).not.toHaveBeenCalled();
  });

  it("leaves already planned positions alone on a second run", async () => {
    mockSeededGeneration();
    renderPanel();

    fireEvent.click(generateButton());
    await waitFor(() =>
      expect(screen.getByText(/Generated provisional lists for 3 positions/)).toBeInTheDocument(),
    );

    fireEvent.click(generateButton());
    expect(harness.generate).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(
        screen.getByText(/Nothing to generate: every primary position with eligible players already has a planned list/),
      ).toBeInTheDocument(),
    );
  });

  it("reports a failed multi-position generation without pretending anything was saved", async () => {
    harness.generate.mockResolvedValue({
      outcome: "conflict",
      message:
        "This franchise changed since this page loaded, so nothing was written. Your input is kept here — reload to see the latest revision, then retry.",
    });
    renderPanel();

    fireEvent.click(generateButton());
    await waitFor(() =>
      expect(screen.getByText(/This franchise changed since this page loaded/)).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: /^WR/ }));
    expect(screen.getByText(/This plan list is empty/)).toBeInTheDocument();
  });

  it("says so honestly when no primary position has an eligible player", async () => {
    renderPanel({
      players: [
        {
          id: "p4",
          fullName: "Squad Guy",
          rosterStatus: "practice_squad",
          primaryPosition: "QB",
          overall: 75,
        },
      ],
      entries: [],
    });

    fireEvent.click(generateButton());
    expect(harness.generate).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText(/Nothing to generate: no eligible players/)).toBeInTheDocument(),
    );
  });
});
