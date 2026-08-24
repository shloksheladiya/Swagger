// Tier 3: Component tokens.
// Scoped to exactly one component. Each value borrows a semantic role — this is
// what lets someone reskin just the buttons without redefining the theme globally.

import { semantic } from "./semantic.js";
import type { Widen } from "../type-utils.js";

export const componentTokens = {
  button: {
    background: semantic.color.primary,
    backgroundHover: semantic.color.primaryHover,
    text: semantic.color.background,
    radius: semantic.radius.md,
  },
  card: {
    background: semantic.color.surface,
    border: semantic.color.border,
    radius: semantic.radius.lg,
    shadow: semantic.shadow.sm,
    padding: semantic.space.md,
  },
  badge: {
    background: semantic.color.surface,
    text: semantic.color.textMuted,
    radius: semantic.radius.sm,
  },
} as const;

export type ComponentTokens = Widen<typeof componentTokens>;
