// Tier 2: Semantic tokens for the "dark" preset.
// Same shape as ../tokens/semantic.ts (both satisfy `Semantic`), but the
// color roles point at different primitives so the preset actually reads as
// a dark UI. Spacing/typography/radius/shadow are theme-independent, so
// they're reused verbatim from the light semantic tier rather than
// duplicated.

import { primitives } from "../tokens/primitives.js";
import { semantic } from "../tokens/semantic.js";

export const darkSemantic = {
  color: {
    background: primitives.color.gray900,
    surface: primitives.color.gray800,
    primary: primitives.color.blue400,
    primaryHover: primitives.color.blue300,
    text: primitives.color.gray50,
    textMuted: primitives.color.gray400,
    border: primitives.color.gray700,
    success: primitives.color.green400,
    danger: primitives.color.red400,
  },
  space: semantic.space,
  font: semantic.font,
  radius: semantic.radius,
  shadow: semantic.shadow,
} as const;
