import { describe, expect, it } from "vitest";
import { defaultTheme } from "./theme.js";
import { tokensToTailwindTheme } from "./tailwind.js";

describe("tokensToTailwindTheme", () => {
  const vars = tokensToTailwindTheme(defaultTheme);

  it("maps color tokens to Tailwind's --color-* namespace", () => {
    expect(vars["--color-primary"]).toBe(defaultTheme.semantic.color.primary);
  });

  it("maps space tokens to Tailwind's --spacing-* namespace (not --space-*)", () => {
    expect(vars["--spacing-md"]).toBe(defaultTheme.semantic.space.md);
    expect(vars["--space-md"]).toBeUndefined();
  });

  it("maps font size tokens to Tailwind's --text-* namespace", () => {
    expect(vars["--text-md"]).toBe(defaultTheme.semantic.font.sizeMd);
  });

  it("maps font family tokens to Tailwind's --font-* namespace", () => {
    expect(vars["--font-sans"]).toBe(defaultTheme.semantic.font.familyBody);
  });

  it("includes component tokens for direct var() consumption", () => {
    expect(vars["--component-button-background"]).toBe(
      defaultTheme.component.button.background,
    );
  });
});
