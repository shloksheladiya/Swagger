"use client";
// Uses useUiStore (expand/collapse state, to compute the flat row list) —
// see EndpointListItem.tsx for why this needs "use client".

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { defaultFeatures, type Operation, type Tag } from "@docs-platform/core";
import { useUiStore } from "../../store/ui-store.js";
import { useConfigStore } from "../../store/config-store.js";
import { buildSidebarRows } from "./build-sidebar-rows.js";
import { buildFilteredSidebarRows } from "./build-filtered-sidebar-rows.js";
import { TagGroupHeader } from "./TagGroupHeader.js";
import { EndpointListItem } from "./EndpointListItem.js";
import { SearchBar } from "./SearchBar.js";
import { fadeSlide, MOTION_TRANSITION } from "../../lib/motion.js";

export interface SidebarProps {
  tags: Tag[];
  operationsByTag: Record<string, Operation[]>;
}

// Uniform row-height estimate in pixels. Real rendered rows may differ
// slightly (a long summary could wrap); react-virtual's default dynamic
// measurement corrects the actual scroll math after first render regardless
// — this estimate only affects the INITIAL layout guess, not correctness.
const ESTIMATED_ROW_HEIGHT = 40;

export function Sidebar({ tags, operationsByTag }: SidebarProps) {
  const expandedTagNames = useUiStore((state) => state.expandedTagNames);
  const searchQuery = useUiStore((state) => state.searchQuery);
  // Milestone 17: features.search hides the search box entirely (not just
  // disables it) when a config turns it off. Falls back to the default
  // (enabled) when no config has been loaded yet — same "?? default"
  // fallback pattern AppShell already uses for branding.title.
  const searchEnabled = useConfigStore(
    (state) => state.config?.features.search ?? defaultFeatures.search,
  );
  const parentRef = useRef<HTMLDivElement>(null);

  const isSearching = searchQuery.trim() !== "";

  const rows = useMemo(
    () =>
      isSearching
        ? buildFilteredSidebarRows(tags, operationsByTag, searchQuery)
        : buildSidebarRows(tags, operationsByTag, expandedTagNames),
    [isSearching, tags, operationsByTag, expandedTagNames, searchQuery],
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 8,
  });

  return (
    <div className="flex h-full flex-col">
      {searchEnabled && (
        <div className="p-md">
          <SearchBar />
        </div>
      )}
      <nav
        ref={parentRef}
        aria-label="Endpoints"
        className="flex-1 overflow-y-auto"
      >
        {isSearching && rows.length === 0 ? (
          // Production UX audit (Milestone 21, "zero-result search state"):
          // buildFilteredSidebarRows deliberately omits tags with no
          // matches (see that file's own comment) — without this branch,
          // zero matches meant an entirely empty nav region with no
          // indication search even ran. Search scoring, virtualization, and
          // the non-empty rendering path below are all untouched; this only
          // replaces what renders when there is nothing to virtualize.
          <p className="p-md text-sm text-text-muted">
            No matching endpoints
            {searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ""}.
          </p>
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.type === "header" ? (
                    <TagGroupHeader
                      tagName={row.tagName}
                      interactive={!isSearching}
                    />
                  ) : (
                    // Milestone 18: entrance-only fade/slide, applied to this
                    // INNER wrapper — never to the outer virtualizer-positioned
                    // div above (that div's `transform: translateY(...)` is
                    // owned entirely by react-virtual; animating a second
                    // `transform` on the same element would fight it). No
                    // `exit` animation: react-virtual removes a collapsed
                    // group's item rows from the DOM the instant
                    // `expandedTagNames` changes and `rows` gets shorter —
                    // there is no lingering DOM node for an exit transition to
                    // run on, and delaying that removal to manufacture one
                    // would mean changing how the virtualizer itself works,
                    // which is out of scope here. This also plays on every
                    // mount, including a row scrolling back into view (the
                    // virtualizer recycles rows), not only on a fresh expand —
                    // distinguishing the two would need extra state tracking;
                    // the fade is subtle/short enough (150ms) that replaying it
                    // on scroll doesn't read as a bug.
                    <motion.div
                      initial={fadeSlide.initial}
                      animate={fadeSlide.animate}
                      transition={MOTION_TRANSITION}
                    >
                      <EndpointListItem operation={row.operation} />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </nav>
    </div>
  );
}
