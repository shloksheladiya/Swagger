import { beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "@docs-platform/core";
import { useConfigStore } from "./config-store.js";

beforeEach(() => {
  useConfigStore.setState({ config: null, error: null });
});

describe("useConfigStore", () => {
  it("starts with no config and no error", () => {
    const state = useConfigStore.getState();
    expect(state.config).toBeNull();
    expect(state.error).toBeNull();
  });

  it("sets config and clears any prior error on a successful result", () => {
    useConfigStore.setState({
      config: null,
      error: { message: "old error", issues: [] },
    });

    useConfigStore.getState().setConfigResult({
      ok: true,
      data: {
        branding: { title: "Test Docs" },
        specSource: { type: "url", value: "https://example.com/openapi.json" },
        layout: { sidebarPosition: "left", mode: "two-pane" },
        features: { search: true, tryItOut: true },
      },
    });

    const state = useConfigStore.getState();
    expect(state.config?.branding.title).toBe("Test Docs");
    expect(state.error).toBeNull();
  });

  it("sets error and clears config on a failed result", () => {
    useConfigStore.getState().setConfigResult({
      ok: false,
      error: { message: "Invalid configuration.", issues: [] },
    });

    const state = useConfigStore.getState();
    expect(state.config).toBeNull();
    expect(state.error?.message).toBe("Invalid configuration.");
  });

  it("correctly reflects a REAL resolveConfig() result from core (integration, not just hand-built fixtures)", () => {
    const result = resolveConfig({
      branding: { title: "Real Integration Test" },
      specSource: { type: "file", value: "./openapi.json" },
    });

    useConfigStore.getState().setConfigResult(result);

    expect(useConfigStore.getState().config?.branding.title).toBe(
      "Real Integration Test",
    );
    // proves resolveConfig's defaulting (Milestone 4) reached the store correctly
    expect(useConfigStore.getState().config?.layout.mode).toBe("two-pane");
  });
});
