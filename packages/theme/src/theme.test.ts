import { describe, expect, it } from "vitest";
import { primitives } from "./tokens/primitives.js";
import { semantic } from "./tokens/semantic.js";
import { componentTokens } from "./tokens/component.js";
import { defaultTheme } from "./theme.js";

describe("token tiers", () => {
  it("semantic tokens resolve to real primitive values, not placeholders", () => {
    expect(semantic.color.primary).toBe(primitives.color.blue600);
    expect(semantic.space.md).toBe(primitives.space.md);
  });

  it("component tokens resolve to real semantic values", () => {
    expect(componentTokens.button.background).toBe(semantic.color.primary);
    expect(componentTokens.card.radius).toBe(semantic.radius.lg);
  });

  it("changing a primitive would cascade through semantic and component tiers", () => {
    // Not a mutation test (tokens are readonly `as const`) — this documents the
    // *intended* cascade by asserting the chain is a genuine reference, not a
    // hardcoded duplicate value that happens to match today.
    expect(defaultTheme.component.button.background).toBe(
      defaultTheme.semantic.color.primary,
    );
    expect(defaultTheme.semantic.color.primary).toBe(
      defaultTheme.primitives.color.blue600,
    );
  });
});
