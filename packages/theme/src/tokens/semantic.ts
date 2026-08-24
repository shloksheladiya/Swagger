// Tier 2: Semantic tokens.
// Each value here is a *reference* to a primitive, chosen for the role it plays.
// A company re-theming this app changes primitives.ts (or overrides semantics
// directly) — components never need to change.

import { primitives } from "./primitives.js";
import type { Widen } from "../type-utils.js";

export const semantic = {
  color: {
    background: primitives.color.white,
    surface: primitives.color.gray50,
    primary: primitives.color.blue600,
    primaryHover: primitives.color.blue700,
    text: primitives.color.gray900,
    textMuted: primitives.color.gray600,
    border: primitives.color.gray200,
    success: primitives.color.green600,
    danger: primitives.color.red600,
  },
  space: {
    xs: primitives.space.xs,
    sm: primitives.space.sm,
    md: primitives.space.md,
    lg: primitives.space.lg,
    xl: primitives.space.xl,
  },
  font: {
    familyBody: primitives.fontFamily.sans,
    familyMono: primitives.fontFamily.mono,
    sizeSm: primitives.fontSize.sm,
    sizeMd: primitives.fontSize.md,
    sizeLg: primitives.fontSize.lg,
    sizeXl: primitives.fontSize.xl,
  },
  radius: {
    sm: primitives.radius.sm,
    md: primitives.radius.md,
    lg: primitives.radius.lg,
  },
  shadow: {
    sm: primitives.shadow.sm,
    md: primitives.shadow.md,
  },
} as const;

export type Semantic = Widen<typeof semantic>;
