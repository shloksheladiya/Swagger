// Tier 3: Component tokens for the "dark" preset.
// Mirrors ../tokens/component.ts's structure exactly, borrowing roles from
// darkSemantic instead of the light semantic tier — same pattern, same
// resulting contrast relationships (e.g. button text still resolves to
// "the background color", which is dark in this preset), just against a
// different palette.

import { darkSemantic } from "./dark-semantic.js";

export const darkComponentTokens = {
  button: {
    background: darkSemantic.color.primary,
    backgroundHover: darkSemantic.color.primaryHover,
    text: darkSemantic.color.background,
    radius: darkSemantic.radius.md,
  },
  card: {
    background: darkSemantic.color.surface,
    border: darkSemantic.color.border,
    radius: darkSemantic.radius.lg,
    shadow: darkSemantic.shadow.sm,
    padding: darkSemantic.space.md,
  },
  badge: {
    background: darkSemantic.color.surface,
    text: darkSemantic.color.textMuted,
    radius: darkSemantic.radius.sm,
  },
} as const;
