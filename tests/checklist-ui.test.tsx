import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  confirm: vi.fn(),
  cancel: vi.fn(),
  undo: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("../lib/actions/checklist", () => ({
  confirmChecklistUnits: harness.confirm,
  cancelChecklistUnits: harness.cancel,
  undoActionBatch: harness.undo,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: harness.refresh, push: vi.fn() }),
}));

import { ChecklistPanel } from "../components/checklist-panel";
import { buildChecklist, type ChecklistList } from "../lib/checklist";
import type { ChartPlayer } from "../lib/depth-chart";
import type { ChecklistData } from "../lib/data/checklist";

const players: ChartPlayer[] = [
  { id: "p1", fullName: "Alpha Receiver", rosterStatus: "active", primaryPosition: "WR", overall: 80 },
  { id: "p2", fullName: "Bravo Receiver", rosterStatus: "active", primaryPosition: "WR", overall: 70 },
  { id: "s1", fullName: "Squad Caller", rosterStatus: "practice_squad", primaryPosition: "WR", overall: 75 },
];

function makeData(
  lists: Record<string, ChecklistList>,
  overrides: Partial<ChecklistData> = {},
): ChecklistData {
  return {
    franchiseId: "f1",
    revision: 3,
    players,
    checklist: buildChecklist({ franchiseId: "f1", revision: 3, players, lists }),
    history: [],
    historyAvailable: true,
    historyMessage: null,
    ...overrides,
  };
}

function renderPanel(data: ChecklistData) {
  render(<ChecklistPanel franchise={{ id: "f1", name: "Test franchise", revision: 3 }} data={data} />);
}

beforeEach(() => {
  harness.confirm.mockReset();
  harness.cancel.mockReset();
  harness.undo.mockReset();
  harness.refresh.mockReset();
  harness.confirm.mockResolvedValue({
    outcome: "saved",
    message: "Confirmed 1 unit as already done and recorded them as the confirmed baseline.",
    revision: 4,
    applied: ["depth_chart_list:WR"],
  });
  harness.cancel.mockResolvedValue({ outcome: "saved", message: "Cancelled 1 pending change.", revision: 4 });
  harness.undo.mockResolvedValue({ outcome: "saved", message: "Undone.", revision: 4 });
});

describe("checklist review and confirmation", () => {
  it("preselects ready units and sends the exact reviewed scope with the revision", async () => {
    renderPanel(makeData({ WR: { baseline: ["p2"], plan: ["p1", "p2"] } }));
    const button = screen.getByRole("button", { name: /Confirm 1 selected unit/ });
    fireEvent.click(button);

    await waitFor(() => expect(harness.confirm).toHaveBeenCalledTimes(1));
    expect(harness.confirm.mock.calls[0][0]).toMatchObject({
      franchiseId: "f1",
      expectedRevision: 3,
      units: [
        { type: "depth_chart_list", unitId: "depth_chart_list:WR", position: "WR", playerIds: ["p1", "p2"] },
      ],
    });
    expect(harness.refresh).toHaveBeenCalled();
  });

  it("keeps a blocked unit out until its promotion prerequisite is included first", async () => {
    renderPanel(makeData({ WR: { baseline: [], plan: ["s1"] } }));

    // Nothing is actionable while the blocked unit is unselected.
    expect(screen.getByRole("button", { name: /Confirm 0 selected units/ })).toBeDisabled();
    expect(screen.getByText(/practice squad/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Include WR depth chart in this confirmation/ }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm 1 selected unit/ }));

    await waitFor(() => expect(harness.confirm).toHaveBeenCalledTimes(1));
    const units = harness.confirm.mock.calls[0][0].units;
    expect(units.map((unit: { type: string }) => unit.type)).toEqual(["roster_status", "depth_chart_list"]);
    expect(units[0]).toMatchObject({ playerId: "s1", status: "active" });
    expect(units[1]).toMatchObject({ position: "WR", playerIds: ["s1"] });
  });

  it("reports a failed confirmation truthfully without refreshing", async () => {
    harness.confirm.mockResolvedValue({
      outcome: "failed",
      message: "A prerequisite is not satisfied, so nothing was applied.",
    });
    renderPanel(makeData({ WR: { baseline: [], plan: ["p1"] } }));
    fireEvent.click(screen.getByRole("button", { name: /Confirm 1 selected unit/ }));

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("A prerequisite is not satisfied, so nothing was applied."),
    );
    expect(harness.refresh).not.toHaveBeenCalled();
  });

  it("cancels a pending position through the cancel command", async () => {
    renderPanel(makeData({ WR: { baseline: ["p1"], plan: ["p2"] } }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel pending change" }));

    await waitFor(() => expect(harness.cancel).toHaveBeenCalledTimes(1));
    expect(harness.cancel.mock.calls[0][0]).toMatchObject({ franchiseId: "f1", positions: ["WR"], expectedRevision: 3 });
  });
});

describe("bounded undo history", () => {
  it("offers undo for a retained confirmation and shows undone batches without a button", async () => {
    renderPanel(
      makeData(
        {},
        {
          history: [
            {
              id: "batch-1",
              command: "confirm_checklist_units",
              label: "Confirmed checklist units",
              positions: ["depth_chart_list:WR"],
              createdAt: "2026-10-06T12:00:00.000Z",
              undoneAt: null,
              undoable: true,
            },
            {
              id: "batch-2",
              command: "confirm_checklist_units",
              label: "Confirmed checklist units",
              positions: ["depth_chart_list:QB"],
              createdAt: "2026-10-06T11:00:00.000Z",
              undoneAt: "2026-10-06T11:30:00.000Z",
              undoable: false,
            },
          ],
        },
      ),
    );

    expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);
    expect(screen.getByText("Undone")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(harness.undo).toHaveBeenCalledTimes(1));
    expect(harness.undo.mock.calls[0][0]).toMatchObject({ franchiseId: "f1", batchId: "batch-1", expectedRevision: 3 });
  });

  it("states honestly when migration 0011 is not applied instead of faking history", () => {
    renderPanel(
      makeData(
        {},
        {
          historyAvailable: false,
          historyMessage: "Confirmation history is not ready for this project yet.",
        },
      ),
    );
    expect(screen.getByText(/Confirmation history is not ready for this project yet\./)).toBeInTheDocument();
  });
});
