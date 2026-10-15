import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  addPick: vi.fn(),
  cancel: vi.fn(),
  finish: vi.fn(),
  saveSettings: vi.fn(),
  saveProposal: vi.fn(),
  search: vi.fn(),
}));

vi.mock("../lib/actions/gm", () => ({
  addDraftPick: harness.addPick,
  cancelProposal: harness.cancel,
  confirmProposalComplete: harness.finish,
  saveContractSettings: harness.saveSettings,
  saveProposal: harness.saveProposal,
}));

vi.mock("../lib/actions/catalog", () => ({
  searchCatalogPlayers: harness.search,
}));

import { GmLedgerPanel } from "../components/gm-ledger-panel";
import type { FranchisePlayer } from "../lib/data/franchises";

const players: FranchisePlayer[] = [
  {
    id: "p-out",
    franchiseId: "f1",
    origin: "custom",
    customKey: "custom-out",
    fullName: "Outgoing Player",
    team: "Atlanta",
    listedPosition: "WR",
    archetype: null,
    birthdate: null,
    rosterStatus: "active",
  },
  {
    id: "p-inactive",
    franchiseId: "f1",
    origin: "custom",
    customKey: "custom-inactive",
    fullName: "Traded Player",
    team: "Atlanta",
    listedPosition: "HB",
    archetype: null,
    birthdate: null,
    rosterStatus: "traded",
  },
];

function renderPanel() {
  return render(
    <GmLedgerPanel
      franchiseId="f1"
      revision={7}
      teamName="Atlanta"
      players={players}
      fields={[]}
      picks={[]}
      proposals={[]}
      settings={null}
      sourcePlayers={{ revisionId: "rev-1", records: [] }}
      storageAvailable
    />,
  );
}

beforeEach(() => {
  for (const mock of Object.values(harness)) mock.mockReset();
});

describe("C4A GM ledger UI", () => {
  it("previews roster impact and excludes inactive players from new proposals", () => {
    renderPanel();

    const outgoing = screen.getByLabelText("Outgoing roster player") as HTMLSelectElement;
    expect(Array.from(outgoing.options).map((option) => option.textContent)).toContain("Outgoing Player");
    expect(Array.from(outgoing.options).map((option) => option.textContent)).not.toContain("Traded Player");
    outgoing.options[0].selected = true;
    fireEvent.change(outgoing);
    fireEvent.change(screen.getByLabelText("Other team / counterparty"), { target: { value: "Chicago" } });
    fireEvent.click(screen.getByRole("button", { name: "Preview roster and asset impact" }));

    expect(screen.getByRole("region", { name: "Proposal impact preview" })).toHaveTextContent(
      "Outgoing Player would become traded out",
    );
    expect(screen.getByRole("button", { name: "Save proposal" })).toBeEnabled();
  });

  it("does not enable proposal saving until the owner previews the selections", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: "Save proposal" })).toBeDisabled();
  });
});
