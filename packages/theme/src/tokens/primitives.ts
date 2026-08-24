// Tier 1: Primitive tokens.
// Raw values only. Nothing here should be referenced directly by a component —
// components consume semantic or component tokens (see semantic.ts, component.ts).
// This file is the only place actual color/size values are allowed to appear.
//
// blue300/blue400, gray700/gray800, red400, and green400 exist solely so the
// dark preset (../presets/dark-semantic.ts) has appropriately dark/light
// values to pick for each role — the light preset (semantic.ts) never
// references them. Non-color tiers (space/fontSize/fontFamily/radius/shadow)
// are shared as-is by every preset; only color roles change per theme.

import type { Widen } from "../type-utils.js";

export const primitives = {
  color: {
    blue50: "#eff6ff",
    blue100: "#dbeafe",
    blue300: "#93c5fd",
    blue400: "#60a5fa",
    blue600: "#2563eb",
    blue700: "#1d4ed8",
    gray50: "#f9fafb",
    gray100: "#f3f4f6",
    gray200: "#e5e7eb",
    gray400: "#9ca3af",
    gray600: "#4b5563",
    gray700: "#374151",
    gray800: "#1f2937",
    gray900: "#111827",
    red50: "#fef2f2",
    red400: "#f87171",
    red600: "#dc2626",
    green50: "#f0fdf4",
    green400: "#4ade80",
    green600: "#16a34a",
    white: "#ffffff",
  },
  space: {
    "0": "0px",
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    "2xl": "48px",
  },
  fontSize: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "20px",
    xl: "24px",
  },
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  },
  radius: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
  shadow: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
} as const;

export type Primitives = Widen<typeof primitives>;
