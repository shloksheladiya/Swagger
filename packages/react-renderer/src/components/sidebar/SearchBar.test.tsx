// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchBar } from "./SearchBar.js";
import { useUiStore } from "../../store/ui-store.js";

beforeEach(() => {
  useUiStore.setState({
    selectedOperationId: null,
    expandedTagNames: new Set(),
    searchQuery: "",
  });
});

describe("SearchBar", () => {
  it("renders with an accessible search role and label", () => {
    render(<SearchBar />);
    expect(screen.getByRole("searchbox", { name: "Search endpoints" })).toBeInTheDocument();
  });

  it("reflects the current uiStore.searchQuery value on render", () => {
    useUiStore.setState({ searchQuery: "users" });
    render(<SearchBar />);

    expect(screen.getByRole("searchbox")).toHaveValue("users");
  });

  it("updates uiStore.searchQuery as the user types", () => {
    render(<SearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "pets" } });

    expect(useUiStore.getState().searchQuery).toBe("pets");
  });

  it("stays in sync when the store changes externally (controlled component correctness)", () => {
    render(<SearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "users" } });
    expect(screen.getByRole("searchbox")).toHaveValue("users");

    // simulate something else clearing the query (e.g. a future "clear search" button)
    useUiStore.setState({ searchQuery: "" });
    expect(useUiStore.getState().searchQuery).toBe("");
  });

  it("clearing the input clears the store value", () => {
    useUiStore.setState({ searchQuery: "users" });
    render(<SearchBar />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "" } });

    expect(useUiStore.getState().searchQuery).toBe("");
  });
});
