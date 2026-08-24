import { describe, expect, it } from "vitest";
import { resolveConfig } from "./resolve-config.js";

describe("resolveConfig", () => {
  it("fills in both layout and features entirely when a config omits them completely", () => {
    const result = resolveConfig({
      branding: { title: "My Docs" },
      specSource: { type: "url", value: "https://example.com/openapi.json" },
      // layout and features omitted entirely
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.layout).toEqual({ sidebarPosition: "left", mode: "two-pane" });
    expect(result.data.features).toEqual({ search: true, tryItOut: true });
  });

  it("fills in only the missing field within a partially-specified section", () => {
    const result = resolveConfig({
      branding: { title: "My Docs" },
      specSource: { type: "file", value: "./openapi.json" },
      layout: { sidebarPosition: "right" }, // mode deliberately omitted
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // the user's explicit choice is preserved...
    expect(result.data.layout.sidebarPosition).toBe("right");
    // ...and the omitted field gets the default, not left undefined
    expect(result.data.layout.mode).toBe("two-pane");
  });

  it("never overrides a user's explicit value with a default", () => {
    const result = resolveConfig({
      branding: { title: "My Docs" },
      specSource: { type: "inline", value: "{}" },
      features: { search: false, tryItOut: false },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.features).toEqual({ search: false, tryItOut: false });
  });

  it("still fails validation when a truly required section (branding) is missing — defaults don't paper over it", () => {
    const result = resolveConfig({
      specSource: { type: "url", value: "https://example.com/openapi.json" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.issues.some((i) => i.path === "branding")).toBe(true);
  });

  it("handles completely non-object input without throwing", () => {
    const result = resolveConfig(null);
    expect(result.ok).toBe(false);
  });
});
