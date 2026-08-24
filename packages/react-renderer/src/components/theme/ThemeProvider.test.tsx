// @vitest-environment jsdom

import { useContext } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MotionConfigContext } from "framer-motion";
import { lightTheme, darkTheme } from "@docs-platform/theme";
import { ThemeProvider } from "./ThemeProvider.js";
import { useThemeStore } from "../../store/theme-store.js";

beforeEach(() => {
  useThemeStore.setState({ presetName: "light" });
});

describe("ThemeProvider", () => {
  it("renders its children", () => {
    render(
      <ThemeProvider>
        <p>the actual page content</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("the actual page content")).toBeInTheDocument();
  });

  it("applies the light preset's CSS variables by default", () => {
    const { container } = render(
      <ThemeProvider>
        <p>content</p>
      </ThemeProvider>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-theme")).toBe("light");
    expect(root.style.getPropertyValue("--color-background")).toBe(
      lightTheme.semantic.color.background,
    );
    expect(root.style.getPropertyValue("--color-primary")).toBe(
      lightTheme.semantic.color.primary,
    );
  });

  it("re-renders with the dark preset's CSS variables when the theme store switches", () => {
    const { container, rerender } = render(
      <ThemeProvider>
        <p>content</p>
      </ThemeProvider>,
    );

    useThemeStore.getState().setPreset("dark");
    rerender(
      <ThemeProvider>
        <p>content</p>
      </ThemeProvider>,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute("data-theme")).toBe("dark");
    expect(root.style.getPropertyValue("--color-background")).toBe(
      darkTheme.semantic.color.background,
    );
    expect(root.style.getPropertyValue("--color-background")).not.toBe(
      lightTheme.semantic.color.background,
    );
  });

  it("seeds the theme store from defaultPreset on mount", async () => {
    const { container } = render(
      <ThemeProvider defaultPreset="dark">
        <p>content</p>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(useThemeStore.getState().presetName).toBe("dark");
    });
    await waitFor(() => {
      const root = container.firstChild as HTMLElement;
      expect(root.getAttribute("data-theme")).toBe("dark");
    });
  });

  it("merges a custom className without dropping the theme wrapper", () => {
    const { container } = render(
      <ThemeProvider className="custom-class">
        <p>content</p>
      </ThemeProvider>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("custom-class");
  });

  // Milestone 18: proves reduced-motion is actually wired app-wide, not just
  // that `MotionConfig` was imported. Reads Framer Motion's own context
  // directly (rather than triggering a real animation and inferring intent
  // from its absence) — the most direct assertion of "this provider tells
  // every motion.* descendant to respect the user's OS-level
  // prefers-reduced-motion setting" without needing a jsdom matchMedia
  // polyfill, which this repo's jsdom version doesn't provide.
  it("configures descendants to respect prefers-reduced-motion via MotionConfig", () => {
    let observedReducedMotion: string | undefined;
    function Probe() {
      observedReducedMotion = useContext(MotionConfigContext).reducedMotion;
      return null;
    }

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(observedReducedMotion).toBe("user");
  });
});
