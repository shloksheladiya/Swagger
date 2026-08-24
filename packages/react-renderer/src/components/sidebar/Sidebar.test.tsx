// @vitest-environment jsdom
//
// react-virtual determines which rows are "visible" using the scroll
// container's real measured size — and jsdom, having no real layout engine,
// always reports 0 for every element's dimensions. Without a mock, EVERY
// virtualized row is computed as "out of view" and nothing renders, regardless
// of whether the component logic is correct.
//
// IMPORTANT, verified by reading the library's source directly
// (@tanstack/virtual-core's default measureElement implementation): it reads
// element.offsetWidth/offsetHeight, NOT getBoundingClientRect(). Mocking
// getBoundingClientRect (a natural first guess, and what an earlier version
// of this file did) has no effect — offsetHeight/offsetWidth are separate,
// getter-only DOM properties that must be mocked via Object.defineProperty,
// not vi.spyOn (they're not regular methods).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Operation, Tag } from "@docs-platform/core";
import { Sidebar } from "./Sidebar.js";
import { useUiStore } from "../../store/ui-store.js";
import { useConfigStore } from "../../store/config-store.js";

function makeOp(operationId: string, summary: string): Operation {
  return {
    operationId,
    path: `/${operationId}`,
    method: "get",
    summary,
    tagNames: [],
    parameters: [],
    responses: [],
    security: [],
  };
}

const tags: Tag[] = [{ name: "Users" }, { name: "Admin" }];
const operationsByTag: Record<string, Operation[]> = {
  Users: [makeOp("listUsers", "List users"), makeOp("createUser", "Create user")],
  Admin: [makeOp("banUser", "Ban user")],
};

let offsetHeightDescriptor: PropertyDescriptor | undefined;
let offsetWidthDescriptor: PropertyDescriptor | undefined;

class ResizeObserverStub {
  #callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }
  observe(target: Element) {
    // Immediately invoke — jsdom will never fire a real resize, so without
    // this, react-virtual waits forever for a measurement that never comes.
    this.#callback(
      [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  useUiStore.setState({
    selectedOperationId: null,
    expandedTagNames: new Set(),
    searchQuery: "",
  });
  useConfigStore.setState({ config: null, error: null });

  // Save the real descriptors so we can restore them exactly afterward,
  // rather than assuming jsdom's shape.
  offsetHeightDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetHeight",
  );
  offsetWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetWidth",
  );

  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 600, // generous — bigger than our test lists, so nothing is clipped
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => 300,
  });

  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

afterEach(() => {
  if (offsetHeightDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeightDescriptor);
  }
  if (offsetWidthDescriptor) {
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidthDescriptor);
  }
  vi.unstubAllGlobals();
});

describe("Sidebar", () => {
  it("renders a header row for every tag, collapsed by default", () => {
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.queryByText("List users")).not.toBeInTheDocument();
  });

  it("renders a tag's items once expanded, via a real click through the actual component tree", () => {
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    fireEvent.click(screen.getByRole("button", { name: /Users/ }));

    expect(screen.getByText("List users")).toBeInTheDocument();
    expect(screen.getByText("Create user")).toBeInTheDocument();
    // Admin's items must still be absent — only Users was expanded
    expect(screen.queryByText("Ban user")).not.toBeInTheDocument();
  });

  it("selecting an endpoint updates uiStore through the real rendered tree", () => {
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);
    fireEvent.click(screen.getByRole("button", { name: /Users/ }));

    fireEvent.click(screen.getByText("List users"));

    expect(useUiStore.getState().selectedOperationId).toBe("listUsers");
  });

  it("renders nothing but an empty container for a spec with no tags", () => {
    render(<Sidebar tags={[]} operationsByTag={{}} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a SearchBar as part of the sidebar itself", () => {
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("hides the SearchBar when config.features.search is false (Milestone 17)", () => {
    useConfigStore.getState().setConfigResult({
      ok: true,
      data: {
        branding: { title: "Acme API Docs" },
        specSource: { type: "url", value: "https://example.com/openapi.json" },
        layout: { sidebarPosition: "left", mode: "two-pane" },
        features: { search: false, tryItOut: true },
      },
    });

    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("shows matching operations immediately during an active search, with no manual expand needed", () => {
    useUiStore.setState({ searchQuery: "list users" });
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    // expandedTagNames is empty (nothing manually expanded) — this only
    // shows because search filtering ignores manual expand state entirely
    expect(screen.getByText("List users")).toBeInTheDocument();
  });

  it("hides tags with no matches during an active search", () => {
    useUiStore.setState({ searchQuery: "ban" }); // only matches Admin's operation
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    expect(screen.queryByText("Users")).not.toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Ban user")).toBeInTheDocument();
  });

  it("renders tag headers as non-interactive (no button role) during an active search", () => {
    useUiStore.setState({ searchQuery: "list users" });
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Users/ })).not.toBeInTheDocument();
  });

  it("shows a 'no matching endpoints' message when a search matches nothing, instead of an empty sidebar (production UX audit)", () => {
    useUiStore.setState({ searchQuery: "zzz-nothing-matches-zzz" });
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    expect(screen.getByText(/No matching endpoints/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not show the zero-result message when results exist", () => {
    useUiStore.setState({ searchQuery: "list users" });
    render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    expect(screen.queryByText(/No matching endpoints/)).not.toBeInTheDocument();
  });

  it("does not show the zero-result message outside of an active search, even with zero tags", () => {
    render(<Sidebar tags={[]} operationsByTag={{}} />);

    expect(screen.queryByText(/No matching endpoints/)).not.toBeInTheDocument();
  });

  it("reverts to the normal, manually-expanded view once the search is cleared", () => {
    useUiStore.setState({ searchQuery: "list users" });
    const { rerender } = render(<Sidebar tags={tags} operationsByTag={operationsByTag} />);
    expect(screen.getByText("List users")).toBeInTheDocument();

    useUiStore.setState({ searchQuery: "" }); // nothing manually expanded
    rerender(<Sidebar tags={tags} operationsByTag={operationsByTag} />);

    // back to normal mode: nothing expanded -> items genuinely gone, not just filtered
    expect(screen.queryByText("List users")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Users/ })).toBeInTheDocument();
  });
});
