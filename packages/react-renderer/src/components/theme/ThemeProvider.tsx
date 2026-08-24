"use client";
// Required: reads/writes useThemeStore (Zustand + useSyncExternalStore),
// same "use client" rationale as AppShell.
//
// ThemeProvider's actual job is narrow: resolve the active preset's tokens
// to the same Tailwind-namespaced CSS variable map generate-theme.mjs writes
// into theme.generated.css at build time (tokensToTailwindTheme — single
// source of truth, not a second copy of that mapping), then apply it as an
// inline style on a wrapping element. Every existing component already
// renders Tailwind utility classes like `bg-background` / `text-primary`,
// which Tailwind v4 compiles to `var(--color-background)` / `var(--color-primary)`
// — so overriding those custom properties on an ancestor element is enough
// to swap the whole subtree's theme; no component below this one needs to
// change. (Previously deferred here — see css-variables.ts's note that the
// DOM-injecting ThemeProvider was "a separate, later concern (ADR §16)".)
//
// Which preset is *active* lives in useThemeStore, not local state or
// Context — consistent with ADR §9 (Zustand over Context for shared state):
// any component, including this one, can read or change the active preset
// directly (e.g. CodeBlock picks a matching Shiki theme this same way).
//
// Milestone 18: also the single app-wide place `prefers-reduced-motion` is
// wired up. `MotionConfig reducedMotion="user"` makes every `motion.*`
// element anywhere below this provider automatically skip transform/layout
// animation when the user's OS-level reduced-motion setting is on — that's
// Framer Motion's own built-in mechanism, not a bespoke hook, so individual
// animated components (Sidebar, ResponsePanel, ...) never need to check this
// themselves. `MotionConfig` renders no DOM element of its own, so this adds
// no wrapper node and doesn't change this component's existing output shape.

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { presets, tokensToTailwindTheme, type ThemePresetName } from "@docs-platform/theme";
import { cn } from "../../lib/cn.js";
import { useThemeStore } from "../../store/theme-store.js";

export interface ThemeProviderProps {
  children: ReactNode;
  /**
   * Preset to activate on mount. Only takes effect once, when this
   * ThemeProvider first mounts (via an effect, so it does not affect the
   * server-rendered / first-paint markup — a brief flash from the store's
   * "light" default is possible if this is set to "dark"). To switch presets
   * afterward, call `useThemeStore().setPreset(...)` — the same store this
   * component reads from — rather than changing this prop.
   */
  defaultPreset?: ThemePresetName;
  className?: string;
}

export function ThemeProvider({ children, defaultPreset, className }: ThemeProviderProps) {
  const presetName = useThemeStore((state) => state.presetName);
  const setPreset = useThemeStore((state) => state.setPreset);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
  // seeds the store once on mount from the initial `defaultPreset` prop;
  // later prop changes are not re-applied (see the doc comment above).
  useEffect(() => {
    if (defaultPreset) {
      setPreset(defaultPreset);
    }
  }, []);

  const theme = presets[presetName];
  const style = tokensToTailwindTheme(theme) as CSSProperties;

  return (
    <div data-theme={presetName} className={cn(className)} style={style}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </div>
  );
}
