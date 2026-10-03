import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  autosave: vi.fn(),
  push: vi.fn(),
}));

vi.mock("../lib/actions/franchises", () => ({
  autosavePlayerField: harness.autosave,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: harness.push }),
}));

import { AutosaveField } from "../components/autosave/autosave-field";
import { AutosaveProvider } from "../components/autosave/autosave-provider";

const SAVED = {
  outcome: "saved" as const,
  message: "Planned.",
  revision: 4,
  baselineValue: null,
  planValue: "HB",
};

function renderField() {
  render(
    <AutosaveProvider franchiseId="f1" initialRevision={3}>
      <AutosaveField
        playerId="p1"
        fieldKey="listed_position"
        label="Listed position"
        numeric={false}
        baselineValue={null}
        planValue={null}
      />
    </AutosaveProvider>,
  );
  return screen.getByLabelText("Listed position value");
}

beforeEach(() => {
  harness.autosave.mockReset();
  harness.push.mockReset();
  harness.autosave.mockResolvedValue(SAVED);
});

describe("autosave field", () => {
  it("saves an ordinary edit after a pause and reports it truthfully", async () => {
    const input = renderField();
    fireEvent.change(input, { target: { value: "HB" } });

    await waitFor(() => expect(harness.autosave).toHaveBeenCalledTimes(1));
    const call = harness.autosave.mock.calls[0][0];
    expect(call).toMatchObject({
      playerId: "p1",
      fieldKey: "listed_position",
      value: "HB",
      intent: "plan",
      expectedRevision: 3,
    });
    expect(typeof call.requestId).toBe("string");
    await waitFor(() => expect(screen.getByText("Saved to app")).toBeInTheDocument());
  });

  it("surfaces a stale write as a conflict and retries with the same request id", async () => {
    harness.autosave.mockResolvedValueOnce({
      outcome: "conflict",
      message: "This franchise changed since this page loaded.",
    });
    const input = renderField();
    fireEvent.change(input, { target: { value: "HB" } });

    await waitFor(() => expect(screen.getByText("Conflict — nothing written")).toBeInTheDocument());
    // The unsaved value is preserved, never silently overwritten.
    expect(input).toHaveValue("HB");

    const firstId = harness.autosave.mock.calls[0][0].requestId;
    harness.autosave.mockResolvedValueOnce(SAVED);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(harness.autosave).toHaveBeenCalledTimes(2));
    expect(harness.autosave.mock.calls[1][0].requestId).toBe(firstId);
    await waitFor(() => expect(screen.getByText("Saved to app")).toBeInTheDocument());
  });

  it("keeps failed input until it is discarded, then restores the last saved value", async () => {
    harness.autosave.mockResolvedValueOnce({
      outcome: "failed",
      message: "Not saved. Your input is kept here so you can retry.",
    });
    const input = renderField();
    fireEvent.change(input, { target: { value: "WR" } });

    await waitFor(() => expect(screen.getByText("Not saved")).toBeInTheDocument());
    expect(input).toHaveValue("WR");

    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(input).toHaveValue("");
    await waitFor(() => expect(screen.getByText("No unsaved changes")).toBeInTheDocument());
  });

  it("adopts a newer server revision after another command so the next edit is not falsely stale", async () => {
    const field = (
      <AutosaveField
        playerId="p1"
        fieldKey="listed_position"
        label="Listed position"
        numeric={false}
        baselineValue={null}
        planValue={null}
      />
    );
    const { rerender } = render(
      <AutosaveProvider franchiseId="f1" initialRevision={3}>
        {field}
      </AutosaveProvider>,
    );

    // The server refreshed after another command (for example adding a player),
    // advancing the franchise revision while this page held the older copy.
    rerender(<AutosaveProvider franchiseId="f1" initialRevision={4}>{field}</AutosaveProvider>);

    fireEvent.change(screen.getByLabelText("Listed position value"), { target: { value: "HB" } });
    await waitFor(() => expect(harness.autosave).toHaveBeenCalledTimes(1));
    expect(harness.autosave.mock.calls[0][0].expectedRevision).toBe(4);
  });

  it("never retargets a pending failed edit at a newer revision", async () => {
    harness.autosave.mockResolvedValueOnce({
      outcome: "failed",
      message: "Not saved. Your input is kept here so you can retry.",
    });
    const field = (
      <AutosaveField
        playerId="p1"
        fieldKey="listed_position"
        label="Listed position"
        numeric={false}
        baselineValue={null}
        planValue={null}
      />
    );
    const { rerender } = render(
      <AutosaveProvider franchiseId="f1" initialRevision={3}>
        {field}
      </AutosaveProvider>,
    );

    fireEvent.change(screen.getByLabelText("Listed position value"), { target: { value: "WR" } });
    await waitFor(() => expect(screen.getByText("Not saved")).toBeInTheDocument());

    rerender(<AutosaveProvider franchiseId="f1" initialRevision={4}>{field}</AutosaveProvider>);
    harness.autosave.mockResolvedValueOnce(SAVED);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(harness.autosave).toHaveBeenCalledTimes(2));
    expect(harness.autosave.mock.calls[1][0].expectedRevision).toBe(3);
  });

  it("treats a session expiry as a failed save that keeps the input", async () => {
    harness.autosave.mockResolvedValueOnce({
      outcome: "unauthorized",
      message: "Your session expired, so nothing was saved. Sign in again — your input is kept here.",
    });
    const input = renderField();
    fireEvent.change(input, { target: { value: "ATL" } });

    await waitFor(() => expect(screen.getByText("Not saved")).toBeInTheDocument());
    expect(input).toHaveValue("ATL");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("unsaved-input guard", () => {
  it("blocks in-app navigation while input is pending and offers stay/discard", async () => {
    harness.autosave.mockImplementation(() => new Promise(() => {}));
    render(
      <AutosaveProvider franchiseId="f1" initialRevision={3}>
        <AutosaveField
          playerId="p1"
          fieldKey="listed_position"
          label="Listed position"
          numeric={false}
          baselineValue={null}
          planValue={null}
        />
        <a href="/other">Go elsewhere</a>
      </AutosaveProvider>,
    );

    fireEvent.change(screen.getByLabelText("Listed position value"), { target: { value: "HB" } });
    fireEvent.click(screen.getByText("Go elsewhere"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("You have unsaved input")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Stay and keep editing" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(harness.push).not.toHaveBeenCalled();
  });

  it("discards pending input and continues the blocked navigation when chosen", async () => {
    harness.autosave.mockImplementation(() => new Promise(() => {}));
    render(
      <AutosaveProvider franchiseId="f1" initialRevision={3}>
        <AutosaveField
          playerId="p1"
          fieldKey="listed_position"
          label="Listed position"
          numeric={false}
          baselineValue={null}
          planValue={null}
        />
        <a href="/other">Go elsewhere</a>
      </AutosaveProvider>,
    );

    fireEvent.change(screen.getByLabelText("Listed position value"), { target: { value: "HB" } });
    fireEvent.click(screen.getByText("Go elsewhere"));
    fireEvent.click(screen.getByRole("button", { name: "Discard and continue" }));

    await waitFor(() => expect(harness.push).toHaveBeenCalledWith("/other"));
  });
});
