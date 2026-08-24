// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppShell } from "./AppShell.js";
import { useConfigStore } from "../../store/config-store.js";

beforeEach(() => {
  useConfigStore.setState({ config: null, error: null });
});

describe("AppShell", () => {
  it("falls back to a default title when no config has been loaded", () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByRole("heading", { name: "API Docs" })).toBeInTheDocument();
  });

  it("renders the real branding title once config is loaded", () => {
    useConfigStore.getState().setConfigResult({
      ok: true,
      data: {
        branding: { title: "Acme API Docs" },
        specSource: { type: "url", value: "https://example.com/openapi.json" },
        layout: { sidebarPosition: "left", mode: "two-pane" },
        features: { search: true, tryItOut: true },
      },
    });

    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByRole("heading", { name: "Acme API Docs" })).toBeInTheDocument();
  });

  it("renders its children", () => {
    render(
      <AppShell>
        <p>the actual page content</p>
      </AppShell>,
    );
    expect(screen.getByText("the actual page content")).toBeInTheDocument();
  });

  it("merges a custom className via cn() rather than replacing the base classes", () => {
    const { container } = render(
      <AppShell className="custom-class">
        <p>content</p>
      </AppShell>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("custom-class");
    expect(root.className).toContain("flex"); // base class preserved, not overwritten
  });

  it("renders no logo image when branding.logoUrl is unset (Milestone 17)", () => {
    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("renders the branding logo once config provides a logoUrl (Milestone 17)", () => {
    useConfigStore.getState().setConfigResult({
      ok: true,
      data: {
        branding: { title: "Acme API Docs", logoUrl: "https://example.com/logo.png" },
        specSource: { type: "url", value: "https://example.com/openapi.json" },
        layout: { sidebarPosition: "left", mode: "two-pane" },
        features: { search: true, tryItOut: true },
      },
    });

    render(
      <AppShell>
        <p>content</p>
      </AppShell>,
    );
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/logo.png");
  });

  it("renders children directly (no sidebar wrapping) when no sidebar prop is given", () => {
    render(
      <AppShell>
        <p>main content</p>
      </AppShell>,
    );
    expect(screen.getByText("main content")).toBeInTheDocument();
    expect(screen.queryByTestId("sidebar-slot")).not.toBeInTheDocument();
  });

  it("places the sidebar before the content by default (sidebarPosition: left)", () => {
    const { container } = render(
      <AppShell sidebar={<div data-testid="sidebar-slot">sidebar</div>}>
        <p data-testid="main-slot">main content</p>
      </AppShell>,
    );
    const order = Array.from(container.querySelectorAll("[data-testid]")).map((el) =>
      el.getAttribute("data-testid"),
    );
    expect(order).toEqual(["sidebar-slot", "main-slot"]);
  });

  it("constrains the content column to a max width when a sidebar is present (production UX audit)", () => {
    render(
      <AppShell sidebar={<div data-testid="sidebar-slot">sidebar</div>}>
        <p data-testid="main-slot">main content</p>
      </AppShell>,
    );
    const mainSlot = screen.getByTestId("main-slot");
    const maxWidthWrapper = mainSlot.parentElement;
    expect(maxWidthWrapper?.className).toContain("max-w-6xl");
  });

  it("does not wrap children in a max-width container when no sidebar is given", () => {
    render(
      <AppShell>
        <p data-testid="main-slot">main content</p>
      </AppShell>,
    );
    const mainSlot = screen.getByTestId("main-slot");
    expect(mainSlot.parentElement?.className ?? "").not.toContain("max-w-6xl");
  });

  it("places the sidebar after the content when config.layout.sidebarPosition is 'right' (Milestone 17)", () => {
    useConfigStore.getState().setConfigResult({
      ok: true,
      data: {
        branding: { title: "Acme API Docs" },
        specSource: { type: "url", value: "https://example.com/openapi.json" },
        layout: { sidebarPosition: "right", mode: "two-pane" },
        features: { search: true, tryItOut: true },
      },
    });

    const { container } = render(
      <AppShell sidebar={<div data-testid="sidebar-slot">sidebar</div>}>
        <p data-testid="main-slot">main content</p>
      </AppShell>,
    );
    const order = Array.from(container.querySelectorAll("[data-testid]")).map((el) =>
      el.getAttribute("data-testid"),
    );
    expect(order).toEqual(["main-slot", "sidebar-slot"]);
  });
});
