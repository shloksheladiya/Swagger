import { beforeEach, describe, expect, it } from "vitest";
import { useUiStore } from "./ui-store.js";

beforeEach(() => {
  useUiStore.setState({
    selectedOperationId: null,
    expandedTagNames: new Set(),
    searchQuery: "",
  });
});

describe("useUiStore", () => {
  it("starts with nothing selected, nothing expanded, and an empty search query", () => {
    const state = useUiStore.getState();
    expect(state.selectedOperationId).toBeNull();
    expect(state.expandedTagNames.size).toBe(0);
    expect(state.searchQuery).toBe("");
  });

  it("selects and deselects an operation", () => {
    useUiStore.getState().selectOperation("listUsers");
    expect(useUiStore.getState().selectedOperationId).toBe("listUsers");

    useUiStore.getState().selectOperation(null);
    expect(useUiStore.getState().selectedOperationId).toBeNull();
  });

  it("toggles a tag's expanded state on and off independently of other tags", () => {
    useUiStore.getState().toggleTagExpanded("Users");
    useUiStore.getState().toggleTagExpanded("Admin");
    expect(useUiStore.getState().expandedTagNames.has("Users")).toBe(true);
    expect(useUiStore.getState().expandedTagNames.has("Admin")).toBe(true);

    useUiStore.getState().toggleTagExpanded("Users"); // collapse just this one
    expect(useUiStore.getState().expandedTagNames.has("Users")).toBe(false);
    expect(useUiStore.getState().expandedTagNames.has("Admin")).toBe(true); // untouched
  });

  it("creates a NEW Set on toggle rather than mutating in place — required for zustand/React to detect the change", () => {
    const before = useUiStore.getState().expandedTagNames;
    useUiStore.getState().toggleTagExpanded("Users");
    const after = useUiStore.getState().expandedTagNames;

    expect(after).not.toBe(before); // different reference
  });

  it("updates the search query", () => {
    useUiStore.getState().setSearchQuery("user");
    expect(useUiStore.getState().searchQuery).toBe("user");
  });
});
