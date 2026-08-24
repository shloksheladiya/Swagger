import { beforeEach, describe, expect, it } from "vitest";
import { useThemeStore } from "./theme-store.js";

beforeEach(() => {
  useThemeStore.setState({ presetName: "light" });
});

describe("useThemeStore", () => {
  it("starts on the light preset", () => {
    expect(useThemeStore.getState().presetName).toBe("light");
  });

  it("setPreset switches the active preset", () => {
    useThemeStore.getState().setPreset("dark");
    expect(useThemeStore.getState().presetName).toBe("dark");
  });

  it("setPreset can switch back", () => {
    useThemeStore.getState().setPreset("dark");
    useThemeStore.getState().setPreset("light");
    expect(useThemeStore.getState().presetName).toBe("light");
  });
});
