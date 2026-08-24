// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TagGroupHeader } from "./TagGroupHeader.js";
import { useUiStore } from "../../store/ui-store.js";

beforeEach(() => {
  useUiStore.setState({
    selectedOperationId: null,
    expandedTagNames: new Set(),
    searchQuery: "",
  });
});

describe("TagGroupHeader", () => {
  it("renders as a clickable, toggleable button by default (interactive=true)", () => {
    render(<TagGroupHeader tagName="Users" />);

    const header = screen.getByRole("button", { name: /Users/ });
    expect(header).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(header);
    expect(useUiStore.getState().expandedTagNames.has("Users")).toBe(true);
  });

  it("renders as plain, non-interactive text when interactive=false", () => {
    render(<TagGroupHeader tagName="Users" interactive={false} />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("clicking has no effect on expandedTagNames when non-interactive — no accidental hidden state change during search", () => {
    render(<TagGroupHeader tagName="Users" interactive={false} />);

    fireEvent.click(screen.getByText("Users"));

    expect(useUiStore.getState().expandedTagNames.has("Users")).toBe(false);
  });

  // Milestone 18: the +/− indicator is the SAME two characters as before —
  // this just proves the crossfade wrapper still renders the correct one for
  // each state, not just that clicking toggles the store (already covered
  // above). `waitFor` because AnimatePresence's `mode="wait"` means the new
  // glyph mounts only after the outgoing one's exit transition settles.
  it("shows the collapsed (+) indicator by default and the expanded (−) indicator after toggling", async () => {
    render(<TagGroupHeader tagName="Users" />);

    const header = screen.getByRole("button", { name: /Users/ });
    expect(header).toHaveTextContent("+");
    expect(header).not.toHaveTextContent("−");

    fireEvent.click(header);

    await waitFor(() => {
      expect(header).toHaveTextContent("−");
    });
    expect(header).not.toHaveTextContent("+");
  });
});
