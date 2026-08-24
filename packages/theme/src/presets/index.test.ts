import { describe, expect, it } from "vitest";
import { presets, lightTheme, darkTheme } from "./index.js";

describe("presets", () => {
  it("exposes exactly the light and dark presets, keyed by name", () => {
    expect(Object.keys(presets).sort()).toEqual(["dark", "light"]);
    expect(presets.light).toBe(lightTheme);
    expect(presets.dark).toBe(darkTheme);
  });
});
