import { describe, expect, it } from "vitest";
import { parseConfig } from "./parse-config.js";

const validConfig = {
  branding: { title: "My API Docs" },
  specSource: { type: "url", value: "https://example.com/openapi.json" },
  layout: { sidebarPosition: "left", mode: "two-pane" },
  features: { search: true, tryItOut: true },
};

describe("parseConfig", () => {
  it("accepts a complete, valid config", () => {
    const result = parseConfig(validConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.branding.title).toBe("My API Docs");
    }
  });

  it("accepts an optional logoUrl when present and valid", () => {
    const result = parseConfig({
      ...validConfig,
      branding: { ...validConfig.branding, logoUrl: "https://example.com/logo.png" },
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a missing required field with a readable error path", () => {
    const { branding, ...withoutBranding } = validConfig;
    const result = parseConfig(withoutBranding);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues.some((i) => i.path === "branding")).toBe(true);
    }
  });

  it("rejects an empty title (a realistic hand-editing mistake)", () => {
    const result = parseConfig({
      ...validConfig,
      branding: { title: "" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.issues.some((i) => i.path === "branding.title")).toBe(true);
    }
  });

  it("rejects an invalid specSource.type (an enum typo)", () => {
    const result = parseConfig({
      ...validConfig,
      specSource: { type: "fiel", value: "./spec.json" }, // typo: "fiel" not "file"
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a malformed logoUrl instead of silently accepting garbage", () => {
    const result = parseConfig({
      ...validConfig,
      branding: { title: "X", logoUrl: "not-a-url" },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a non-object entirely (e.g. a config file that's just a string)", () => {
    const result = parseConfig("oops, not an object");
    expect(result.ok).toBe(false);
  });
});
