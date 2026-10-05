import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  attachTeam: vi.fn(),
  attachRecords: vi.fn(),
  search: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("../lib/actions/catalog", () => ({
  attachCatalogTeam: harness.attachTeam,
  attachCatalogRecords: harness.attachRecords,
  searchCatalogPlayers: harness.search,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: harness.refresh }),
}));

import { CatalogAttachPanel } from "../components/catalog-attach-panel";
import type { CatalogAttachContext } from "../lib/data/catalog";

const context: CatalogAttachContext = {
  revisionId: "rev-1",
  source: "ea-madden-27",
  revisionKey: "1-base",
  capturedAt: null,
  coverageStatus: "complete_as_imported",
  recordCount: 3111,
  teams: [
    { team: "Atlanta Falcons", playerCount: 27, missingPositionCount: 2 },
    { team: "Buffalo Bills", playerCount: 25, missingPositionCount: 0 },
  ],
  unsignedCount: 1240,
  unsignedMissingPositionCount: 3,
  attachedRecordIds: ["r1"],
};

function renderPanel(
  catalog: Parameters<typeof CatalogAttachPanel>[0]["catalog"] = { ok: true, data: context },
  franchiseName = "Atlanta Falcons",
) {
  render(
    <CatalogAttachPanel
      franchiseId="f1"
      franchiseName={franchiseName}
      revision={3}
      catalog={catalog}
    />,
  );
}

function contextWith(overrides: Partial<CatalogAttachContext> = {}): CatalogAttachContext {
  return { ...context, attachedRecordIds: [], ...overrides };
}

function formOf(button: HTMLElement): HTMLFormElement {
  return button.closest("form") as HTMLFormElement;
}

beforeEach(() => {
  harness.attachTeam.mockReset();
  harness.attachRecords.mockReset();
  harness.search.mockReset();
  harness.refresh.mockReset();
  harness.attachTeam.mockResolvedValue({
    status: "ok",
    message: "Attached 27 published players to this franchise as the provisional source baseline.",
    summary: { requested: 27, attached: 27, alreadyAttached: 0, alreadyPresent: 0, revision: 4 },
  });
  harness.attachRecords.mockResolvedValue({
    status: "ok",
    message: "Attached 1 published player to this franchise as the provisional source baseline.",
    summary: { requested: 1, attached: 1, alreadyAttached: 0, alreadyPresent: 0, revision: 4 },
    attachedIds: ["r2"],
  });
  harness.search.mockResolvedValue({
    status: "ok",
    results: [
      {
        id: "r1",
        fullName: "Bijan Robinson",
        team: "Atlanta Falcons",
        listedPosition: "HB",
        overall: 90,
        attached: true,
      },
      {
        id: "r2",
        fullName: "Free Agent Guy",
        team: null,
        listedPosition: "WR",
        overall: 78,
        attached: false,
      },
    ],
  });
});

describe("catalog attach panel", () => {
  it("labels the published baseline as provisional and defaults to the matching team", () => {
    renderPanel();
    expect(screen.getByText(/provisional and unverified/)).toBeInTheDocument();
    expect(screen.getByText(/ea-madden-27 · 1-base — 3111 records/)).toBeInTheDocument();
    const teamSelect = screen.getByLabelText("Team") as HTMLSelectElement;
    expect(teamSelect.value).toBe("Atlanta Falcons");
  });

  it("attaches the selected team roster with the current revision and team", async () => {
    renderPanel();
    const button = screen.getByRole("button", { name: "Attach Atlanta Falcons roster" });
    fireEvent.submit(formOf(button));

    await waitFor(() => expect(harness.attachTeam).toHaveBeenCalledTimes(1));
    const formData = harness.attachTeam.mock.calls[0][1] as FormData;
    expect(formData.get("franchiseId")).toBe("f1");
    expect(formData.get("revisionId")).toBe("rev-1");
    expect(formData.get("team")).toBe("Atlanta Falcons");
    expect(formData.get("revision")).toBe("3");
    expect(typeof formData.get("requestId")).toBe("string");
    await waitFor(() =>
      expect(
        screen.getByText(/Attached 27 published players to this franchise as the provisional source baseline/),
      ).toBeInTheDocument(),
    );
  });

  it("auto-attaches the matching team when this franchise holds no published players yet", async () => {
    renderPanel({ ok: true, data: contextWith() });

    await waitFor(() => expect(harness.attachTeam).toHaveBeenCalledTimes(1));
    const formData = harness.attachTeam.mock.calls[0][1] as FormData;
    expect(formData.get("franchiseId")).toBe("f1");
    expect(formData.get("revisionId")).toBe("rev-1");
    expect(formData.get("revision")).toBe("3");
    expect(formData.get("team")).toBe("Atlanta Falcons");
    expect(typeof formData.get("requestId")).toBe("string");
    await waitFor(() => expect(harness.refresh).toHaveBeenCalled());
    expect(
      screen.getByText(/Attached 27 published players to this franchise as the provisional source baseline/),
    ).toBeInTheDocument();
  });

  it("does not auto-attach when players are already attached or the franchise name is ambiguous", async () => {
    renderPanel();
    await waitFor(() => expect(harness.attachTeam).not.toHaveBeenCalled());

    renderPanel(
      {
        ok: true,
        data: contextWith({
          teams: [
            { team: "NY Giants", playerCount: 20, missingPositionCount: 0 },
            { team: "NY Jets", playerCount: 21, missingPositionCount: 0 },
          ],
        }),
      },
      "New York",
    );
    await waitFor(() => expect(harness.attachTeam).not.toHaveBeenCalled());
    expect(screen.getAllByText(/Choose a team…/).length).toBeGreaterThan(0);
  });

  it("searches and attaches one catalog record, then marks it as on the roster", async () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText("Search the catalog"), { target: { value: "free" } });
    fireEvent.submit(formOf(screen.getByRole("button", { name: "Search" })));

    await waitFor(() => expect(harness.search).toHaveBeenCalledTimes(1));
    const searchData = harness.search.mock.calls[0][1] as FormData;
    expect(searchData.get("query")).toBe("free");
    expect(searchData.get("scope")).toBe("all");

    const freeAgentRow = (await screen.findByText("Free Agent Guy")).closest("li") as HTMLElement;
    expect(within(freeAgentRow).getByText(/Free agent \(unsigned\)/)).toBeInTheDocument();
    const bijanRow = screen.getByText("Bijan Robinson").closest("li") as HTMLElement;
    expect(within(bijanRow).getByText("On roster")).toBeInTheDocument();

    fireEvent.submit(formOf(within(freeAgentRow).getByRole("button", { name: "Attach" })));
    await waitFor(() => expect(harness.attachRecords).toHaveBeenCalledTimes(1));
    const attachData = harness.attachRecords.mock.calls[0][1] as FormData;
    expect(attachData.get("recordIds")).toBe(JSON.stringify(["r2"]));
    expect(attachData.get("franchiseId")).toBe("f1");

    await waitFor(() =>
      expect(within(freeAgentRow).getByText("On roster")).toBeInTheDocument(),
    );
    expect(harness.refresh).toHaveBeenCalled();
  });

  it("shows a truthful failure without marking anything attached", async () => {
    harness.attachRecords.mockResolvedValue({
      status: "error",
      message:
        "Catalog attachment is not available in this project yet: apply migration 0009_catalog_attach.sql in the Supabase SQL editor, then retry. Nothing was attached.",
    });
    renderPanel();
    fireEvent.submit(formOf(screen.getByRole("button", { name: "Search" })));
    const row = (await screen.findByText("Free Agent Guy")).closest("li") as HTMLElement;
    fireEvent.submit(formOf(within(row).getByRole("button", { name: "Attach" })));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/apply migration 0009_catalog_attach.sql/),
    );
    expect(within(row).getByRole("button", { name: "Attach" })).toBeInTheDocument();
  });

  it("offers an honest state when no revision has been imported", () => {
    renderPanel({ ok: true, data: null });
    expect(screen.getByText(/No source revision has been imported yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("reports unapplied migration storage instead of pretending", () => {
    renderPanel({ ok: false, message: "Migration 0009_catalog_attach.sql must be applied by the owner." });
    expect(screen.getByText(/Migration 0009_catalog_attach.sql must be applied/)).toBeInTheDocument();
  });
});
