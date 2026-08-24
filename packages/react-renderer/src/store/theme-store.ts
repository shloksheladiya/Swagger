// themeStore: which theme preset (light/dark) is currently active. A tiny,
// infrequently-changing store — same rationale as configStore (ADR §9) — so
// any component can read the active preset directly (e.g. CodeBlock picking
// a matching Shiki theme) without needing to be nested under a Context
// provider, consistent with how the other stores are consumed elsewhere in
// this package.

import { create } from "zustand";
import type { ThemePresetName } from "@docs-platform/theme";

interface ThemeStoreState {
  presetName: ThemePresetName;
  setPreset: (presetName: ThemePresetName) => void;
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  presetName: "light",
  setPreset: (presetName) => set({ presetName }),
}));
