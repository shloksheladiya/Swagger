import { describe, expect, it } from "vitest";
import { lightTheme } from "./light.js";
import { darkTheme } from "./dark.js";
import { tokensToTailwindTheme } from "../tailwind.js";
import { tokensToCssVariables } from "../css-variables.js";

describe("darkTheme", () => {
  it("provides a color for every semantic role the light theme defines", () => {
    const lightColorKeys = Object.keys(lightTheme.semantic.color).sort();
    const darkColorKeys = Object.keys(darkTheme.semantic.color).sort();
    expect(darkColorKeys).toEqual(lightColorKeys);
  });

  it("actually differs from the light theme's colors (a real second preset, not a copy)", () => {
    expect(darkTheme.semantic.color.background).not.toBe(
      lightTheme.semantic.color.background,
    );
    expect(darkTheme.semantic.color.text).not.toBe(lightTheme.semantic.color.text);
    expect(darkTheme.semantic.color.primary).not.toBe(
      lightTheme.semantic.color.primary,
    );
  });

  it("reuses the theme-independent tiers (spacing/typography/radius/shadow) as-is", () => {
    expect(darkTheme.semantic.space).toEqual(lightTheme.semantic.space);
    expect(darkTheme.semantic.font).toEqual(lightTheme.semantic.font);
    expect(darkTheme.semantic.radius).toEqual(lightTheme.semantic.radius);
    expect(darkTheme.semantic.shadow).toEqual(lightTheme.semantic.shadow);
  });

  it("cascades component tokens from its own semantic tier, not the light one", () => {
    expect(darkTheme.component.button.background).toBe(
      darkTheme.semantic.color.primary,
    );
    expect(darkTheme.component.button.background).not.toBe(
      lightTheme.component.button.background,
    );
    expect(darkTheme.component.card.background).toBe(darkTheme.semantic.color.surface);
  });

  it("produces a distinct, complete CSS variable map via the same transform used by the light theme", () => {
    const lightVars = tokensToCssVariables(lightTheme);
    const darkVars = tokensToCssVariables(darkTheme);

    expect(Object.keys(darkVars).sort()).toEqual(Object.keys(lightVars).sort());
    expect(darkVars["--color-background"]).toBe(darkTheme.semantic.color.background);
    expect(darkVars["--color-background"]).not.toBe(lightVars["--color-background"]);
  });

  it("produces a distinct, complete Tailwind theme variable map", () => {
    const lightVars = tokensToTailwindTheme(lightTheme);
    const darkVars = tokensToTailwindTheme(darkTheme);

    expect(Object.keys(darkVars).sort()).toEqual(Object.keys(lightVars).sort());
    expect(darkVars["--color-primary"]).toBe(darkTheme.semantic.color.primary);
    expect(darkVars["--color-primary"]).not.toBe(lightVars["--color-primary"]);
    // Non-color namespaces are identical between presets, as intended.
    expect(darkVars["--spacing-md"]).toBe(lightVars["--spacing-md"]);
  });
});
