import { describe, expect, it } from "vitest";
import { defaultTheme } from "./theme.js";
import { tokensToCssVariables } from "./css-variables.js";

describe("tokensToCssVariables", () => {
  const vars = tokensToCssVariables(defaultTheme);

  it("produces dash-joined CSS custom property names for semantic tokens", () => {
    expect(vars["--color-primary"]).toBe(defaultTheme.semantic.color.primary);
    expect(vars["--space-md"]).toBe(defaultTheme.semantic.space.md);
  });

  it("namespaces component tokens under their component name", () => {
    expect(vars["--component-button-background"]).toBe(
      defaultTheme.component.button.background,
    );
    expect(vars["--component-card-radius"]).toBe(
      defaultTheme.component.card.radius,
    );
  });

  it("never exposes raw primitives as CSS variables", () => {
    const keys = Object.keys(vars);
    expect(keys.some((k) => k.includes("blue600"))).toBe(false);
    expect(keys.some((k) => k.startsWith("--primitives"))).toBe(false);
  });
});
