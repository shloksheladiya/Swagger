"use client";
// Uses useUiStore (expand/collapse state) — see EndpointListItem.tsx for why
// this needs "use client".
//
// Deliberately renders ONLY the header button, unlike the original TagGroup
// it replaces. A virtualizer needs to own the full flat list of visible rows
// itself (see Sidebar.tsx / build-sidebar-rows.ts) — a component that
// silently renders 0..N children internally is invisible to a parent
// virtualizer trying to calculate scroll positions.
//
// Milestone 18: the +/− indicator crossfades (fade + small rotate) between
// its two states via AnimatePresence, instead of swapping instantly. This
// animates the SAME two characters this component already rendered — no new
// icon, no visual redesign — it's just no longer an instant text swap.
// `mode="wait"` and `initial={false}` keep this from playing on first mount.

import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "../../store/ui-store.js";
import { MOTION_TRANSITION } from "../../lib/motion.js";

export interface TagGroupHeaderProps {
  tagName: string;
  /** false during an active search: matched tags are always fully shown, so
   * there's nothing to expand/collapse — and leaving the toggle clickable
   * would let someone silently change expandedTagNames with no visible
   * effect while searching, only to be surprised once they clear the search. */
  interactive?: boolean;
}

export function TagGroupHeader({ tagName, interactive = true }: TagGroupHeaderProps) {
  const isExpanded = useUiStore((state) => state.expandedTagNames.has(tagName));
  const toggleTagExpanded = useUiStore((state) => state.toggleTagExpanded);

  if (!interactive) {
    return (
      <div className="px-md py-sm text-sm font-semibold text-text">{tagName}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleTagExpanded(tagName)}
      aria-expanded={isExpanded}
      className="flex w-full items-center justify-between px-md py-sm text-left text-sm font-semibold text-text"
    >
      <span>{tagName}</span>
      <span aria-hidden="true" className="relative inline-flex h-[1em] w-[1em] items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={isExpanded ? "expanded" : "collapsed"}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={MOTION_TRANSITION}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isExpanded ? "\u2212" : "+"}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
