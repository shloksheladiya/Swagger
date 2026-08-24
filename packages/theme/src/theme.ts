import { primitives } from "./tokens/primitives.js";
import { semantic } from "./tokens/semantic.js";
import { componentTokens } from "./tokens/component.js";
import type { Widen } from "./type-utils.js";

export const defaultTheme = {
  primitives,
  semantic,
  component: componentTokens,
} as const;

// Widened to shape-only (see type-utils.ts) so other presets — e.g. the dark
// preset in ./presets — can satisfy `Theme` with their own token values
// instead of only the exact default/light ones.
export type Theme = Widen<typeof defaultTheme>;
