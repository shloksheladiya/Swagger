// The "dark" theme preset — a complete, standalone `Theme`. Reuses the same
// Tier 1 primitives as the light/default theme (spacing, typography, radius,
// and shadow scales don't change with color scheme, and the extra dark-only
// color primitives already live in tokens/primitives.ts), but supplies its
// own semantic and component tiers so every color role resolves to a
// dark-appropriate value.

import { primitives } from "../tokens/primitives.js";
import { darkSemantic } from "./dark-semantic.js";
import { darkComponentTokens } from "./dark-component.js";
import type { Theme } from "../theme.js";

export const darkTheme = {
  primitives,
  semantic: darkSemantic,
  component: darkComponentTokens,
} as const satisfies Theme;
