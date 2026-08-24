import { lightTheme } from "./light.js";
import { darkTheme } from "./dark.js";
import type { Theme } from "../theme.js";

export { lightTheme } from "./light.js";
export { darkTheme } from "./dark.js";

export const presets = {
  light: lightTheme,
  dark: darkTheme,
} as const satisfies Record<string, Theme>;

export type ThemePresetName = keyof typeof presets;
