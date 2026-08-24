// @vitest-environment jsdom
//
// This is the test that actually proves Milestone 17's roadmap Testing
// criterion: "Two different config files produce two visibly different,
// correctly-behaving UIs from the same codebase." Every OTHER Milestone 17
// test (AppShell.test.tsx, Sidebar.test.tsx, OperationView.test.tsx)
// hand-builds an already-resolved config object and injects it via
// setConfigResult directly — useful for testing each component's own
// reactivity in isolation, but it never exercises resolveConfig itself.
//
// This file instead starts from two raw, hand-written config objects (the
// same shape a person would put in an actual config file — mirroring
// docs-app/app/example-docs-configs.ts, which drives the same two configs
// through the same real path in the running app) and runs them through the
// REAL resolveConfig() (core, Milestone 4) before rendering the REAL
// composed app tree — AppShell + Sidebar + OperationView, the same
// composition docs-app/app/page.tsx uses.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { resolveConfig, type Operation, type Tag } from "@docs-platform/core";
import { AppShell } from "./layout/AppShell.js";
import { Sidebar } from "./sidebar/Sidebar.js";
import { OperationView } from "./operation/OperationView.js";
import { useConfigStore } from "../store/config-store.js";
import { useUiStore } from "../store/ui-store.js";

// The same two example configs as docs-app/app/example-docs-configs.ts,
// duplicated (not imported) deliberately: react-renderer must never depend
// on docs-app (dependency-cruiser's react-renderer-must-not-depend-on-server-or-app
// rule), so this file needs its own self-contained fixtures. Chosen so
// every Milestone 17 concern visibly differs between them: branding title,
// branding logo, sidebar position, and both feature toggles. `layout.mode`
// is deliberately omitted from both — intentionally out of scope for
// Milestone 17.
const sunnyLabsRawConfig = {
  branding: { title: "Sunny Labs API" },
  specSource: { type: "inline", value: "{}" },
  layout: { sidebarPosition: "left" },
  features: { search: true, tryItOut: true },
};

const acmeRawConfig = {
  branding: { title: "Acme Widgets API", logoUrl: "https://acme.example/logo.png" },
  specSource: { type: "inline", value: "{}" },
  layout: { sidebarPosition: "right" },
  features: { search: false, tryItOut: false },
};

const tags: Tag[] = [{ name: "Widgets" }];
const listWidgets: Operation = {
  operationId: "listWidgets",
  path: "/widgets",
  method: "get",
  summary: "List widgets",
  tagNames: ["Widgets"],
  parameters: [],
  responses: [],
  security: [],
};
const operationsByTag: Record<string, Operation[]> = { Widgets: [listWidgets] };

// Sidebar renders via @tanstack/react-virtual, which needs real layout
// measurements jsdom never provides — same mocking Sidebar.test.tsx already
// needs, reused here for the same reason (see that file's own comment for
// why offsetHeight/offsetWidth specifically, not getBoundingClientRect).
let offsetHeightDescriptor: PropertyDescriptor | undefined;
let offsetWidthDescriptor: PropertyDescriptor | undefined;

class ResizeObserverStub {
  #callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }
  observe(target: Element) {
    this.#callback(
      [{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  unobserve() {}
  disconnect() {}
}

function renderApp() {
  return render(
    <AppShell sidebar={<Sidebar tags={tags} operationsByTag={operationsByTag} />}>
      <OperationView operations={[listWidgets]} />
    </AppShell>,
  );
}

beforeEach(() => {
  useConfigStore.setState({ config: null, error: null });
  useUiStore.setState({
    selectedOperationId: "listWidgets",
    expandedTagNames: new Set(),
    searchQuery: "",
  });

  offsetHeightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  offsetWidthDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => 600,
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

describe("Milestone 17: real DocsConfig -> resolveConfig -> configStore -> UI", () => {
  it("resolves the Sunny Labs config for real (not a hand-built fixture) and renders its branding/layout/features", () => {
    const result = resolveConfig(sunnyLabsRawConfig);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    useConfigStore.getState().setConfigResult(result);

    renderApp();

    expect(screen.getByRole("heading", { name: "Sunny Labs API" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument(); // features.search: true
    expect(screen.getByRole("region", { name: "Try It Out" })).toBeInTheDocument(); // features.tryItOut: true

    // sidebarPosition: "left" -> the sidebar's <nav> precedes the operation content in the DOM
    const nav = screen.getByRole("navigation");
    const heading = screen.getByRole("heading", { name: "List widgets" });
    expect(
      nav.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("resolves the Acme config for real and renders a VISIBLY DIFFERENT UI from Sunny Labs — the exact roadmap testing criterion", () => {
    const result = resolveConfig(acmeRawConfig);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    useConfigStore.getState().setConfigResult(result);

    renderApp();

    expect(screen.getByRole("heading", { name: "Acme Widgets API" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Acme Widgets API logo" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument(); // features.search: false
    expect(screen.queryByRole("region", { name: "Try It Out" })).not.toBeInTheDocument(); // features.tryItOut: false

    // sidebarPosition: "right" -> the sidebar's <nav> now follows the operation content
    const nav = screen.getByRole("navigation");
    const heading = screen.getByRole("heading", { name: "List widgets" });
    expect(
      nav.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it("falls back to schema defaults end-to-end when no config has been resolved at all", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "API Docs" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Try It Out" })).toBeInTheDocument();
  });
});
