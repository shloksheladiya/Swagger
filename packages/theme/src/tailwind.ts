// Tailwind v4 reads design tokens from CSS custom properties in an @theme
// block, using specific namespaces to generate utilities:
//   --color-*  -> bg-*, text-*, border-* utilities
//   --spacing-* -> p-*, m-*, gap-* utilities
//   --text-*   -> text-{size} utilities (font size, despite the name)
//   --font-*   -> font-{name} utilities (font family)
//   --radius-* -> rounded-* utilities
//   --shadow-* -> shadow-* utilities
//
// This function is the ONLY place that needs to know those namespace names.
// Our own semantic tokens (theme.ts) stay named for our own clarity, not
// Tailwind's — if Tailwind changes its conventions in a future major version,
// this is the one function that changes.

import type { Theme } from "./theme.js";

export function tokensToTailwindTheme(
  theme: Pick<Theme, "semantic" | "component">,
): Record<string, string> {
  const { semantic, component } = theme;
  const vars: Record<string, string> = {
    "--color-background": semantic.color.background,
    "--color-surface": semantic.color.surface,
    "--color-primary": semantic.color.primary,
    "--color-primary-hover": semantic.color.primaryHover,
    "--color-text": semantic.color.text,
    "--color-text-muted": semantic.color.textMuted,
    "--color-border": semantic.color.border,
    "--color-success": semantic.color.success,
    "--color-danger": semantic.color.danger,

    "--spacing-xs": semantic.space.xs,
    "--spacing-sm": semantic.space.sm,
    "--spacing-md": semantic.space.md,
    "--spacing-lg": semantic.space.lg,
    "--spacing-xl": semantic.space.xl,

    "--text-sm": semantic.font.sizeSm,
    "--text-md": semantic.font.sizeMd,
    "--text-lg": semantic.font.sizeLg,
    "--text-xl": semantic.font.sizeXl,

    "--font-sans": semantic.font.familyBody,
    "--font-mono": semantic.font.familyMono,

    "--radius-sm": semantic.radius.sm,
    "--radius-md": semantic.radius.md,
    "--radius-lg": semantic.radius.lg,

    "--shadow-sm": semantic.shadow.sm,
    "--shadow-md": semantic.shadow.md,
  };

  // Component tokens aren't Tailwind utilities — they're consumed directly by
  // components via var(--component-*). Still exposed here so one generated
  // CSS file carries the whole theme.
  vars["--component-button-background"] = component.button.background;
  vars["--component-button-background-hover"] =
    component.button.backgroundHover;
  vars["--component-button-text"] = component.button.text;
  vars["--component-button-radius"] = component.button.radius;
  vars["--component-card-background"] = component.card.background;
  vars["--component-card-border"] = component.card.border;
  vars["--component-card-radius"] = component.card.radius;
  vars["--component-card-shadow"] = component.card.shadow;
  vars["--component-card-padding"] = component.card.padding;
  vars["--component-badge-background"] = component.badge.background;
  vars["--component-badge-text"] = component.badge.text;
  vars["--component-badge-radius"] = component.badge.radius;

  return vars;
}
