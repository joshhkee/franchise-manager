import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/actions/franchises", () => ({
  selectFranchise: vi.fn(async () => ({ status: "ok", message: "Active franchise changed." })),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import { FranchisePicker } from "../components/franchise-picker";

const SUMMARIES = [
  { id: "a", name: "Atlanta Falcons", archivedAt: null },
  { id: "b", name: "Restored Test", archivedAt: null },
];

describe("franchise picker", () => {
  it("follows the active franchise when the server-provided id changes", () => {
    // Regression: an uncontrolled select would keep showing the previous
    // franchise after a server action changed the active one, until a reload.
    const { rerender } = render(
      <FranchisePicker summaries={SUMMARIES} currentId="a" archived={false} />,
    );

    const select = screen.getByLabelText("Active franchise") as HTMLSelectElement;
    expect(select.value).toBe("a");

    rerender(<FranchisePicker summaries={SUMMARIES} currentId="b" archived={false} />);

    expect((screen.getByLabelText("Active franchise") as HTMLSelectElement).value).toBe("b");
  });

  it("labels an archived active franchise", () => {
    render(<FranchisePicker summaries={SUMMARIES} currentId="b" archived />);
    const select = screen.getByLabelText("Active franchise") as HTMLSelectElement;
    expect(select.value).toBe("b");
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });
});
