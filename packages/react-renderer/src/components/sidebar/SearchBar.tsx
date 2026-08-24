"use client";
// Uses useUiStore (searchQuery state) — needs the client boundary, same
// reasoning as every other store-consuming component in this package (see
// EndpointListItem.tsx).
//
// Deliberately just the input + store wiring — no filtering logic here.
// What the sidebar DOES with an active search query is separate, testable
// logic (next part), not this component's concern.

import { useUiStore } from "../../store/ui-store.js";

export function SearchBar() {
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);

  return (
    <input
      type="search"
      role="searchbox"
      aria-label="Search endpoints"
      placeholder="Search endpoints..."
      value={searchQuery}
      onChange={(event) => setSearchQuery(event.target.value)}
      className="w-full rounded-md border border-border bg-background px-md py-sm text-sm text-text"
    />
  );
}
