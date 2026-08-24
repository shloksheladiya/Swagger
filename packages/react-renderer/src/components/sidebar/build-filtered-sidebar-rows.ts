// Builds sidebar rows for an ACTIVE search — distinct from buildSidebarRows
// (the normal, manually-expanded view). Two deliberate UX decisions:
//
//   - Tags with zero matching operations are omitted entirely, not shown
//     with an empty body. A search results view cluttered with empty
//     headers isn't useful.
//   - Within a tag, matched operations keep their ORIGINAL order, not
//     re-sorted by search score. Score decides which operations qualify;
//     reordering the visible list while someone is still typing would feel
//     jumpy. Ranking is used for inclusion, not display order.

import type { Operation, SearchProvider, Tag } from "@docs-platform/core";
import { defaultSearchProvider } from "@docs-platform/core";
import type { SidebarRow } from "./build-sidebar-rows.js";

export function buildFilteredSidebarRows(
  tags: Tag[],
  operationsByTag: Record<string, Operation[]>,
  query: string,
  searchProvider: SearchProvider = defaultSearchProvider,
): SidebarRow[] {
  const allOperations = Object.values(operationsByTag).flat();
  const results = searchProvider.search(allOperations, query);
  const matchedIds = new Set(results.map((r) => r.operation.operationId));

  // Declared tags first (in the spec's own order), then any synthetic
  // buckets (e.g. "Untagged") not present in `tags` — same ordering
  // convention as buildSidebarRows, for consistency between the two views.
  const declaredTagNames = tags.map((t) => t.name);
  const extraTagNames = Object.keys(operationsByTag).filter(
    (name) => !declaredTagNames.includes(name),
  );
  const orderedTagNames = [...declaredTagNames, ...extraTagNames];

  const rows: SidebarRow[] = [];

  for (const tagName of orderedTagNames) {
    const matchingOperations = (operationsByTag[tagName] ?? []).filter((op) =>
      matchedIds.has(op.operationId),
    );
    if (matchingOperations.length === 0) continue; // hide tags with no matches

    rows.push({ type: "header", tagName });
    for (const operation of matchingOperations) {
      rows.push({ type: "item", operation });
    }
  }

  return rows;
}
