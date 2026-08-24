// Milestone 18: a couple of shared Framer Motion values used by the small
// number of components that actually animate (Sidebar row entrance/chevron,
// Try It Out's ResponsePanel) — kept here so those few files agree on timing
// rather than each hardcoding its own numbers. Deliberately minimal: this is
// NOT a design-token system (see `@docs-platform/theme` for real tokens) —
// promoting these to theme tokens is a separate decision for if/when
// animation usage grows beyond this handful of call sites.

export const MOTION_TRANSITION = { duration: 0.15, ease: "easeOut" } as const;

// A small fade + upward slide, reused for both "this just appeared" (sidebar
// rows expanding) and "this just appeared/disappeared" (ResponsePanel inside
// AnimatePresence) cases. `exit` is only meaningful to callers that render
// this inside an `AnimatePresence` boundary — sidebar rows do not (see
// TagGroupHeader.tsx for why: the virtualizer removes collapsed rows from
// the DOM immediately, so there is nothing for an exit animation to run on).
export const fadeSlide = {
  initial: { opacity: 0, y: -4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
} as const;
