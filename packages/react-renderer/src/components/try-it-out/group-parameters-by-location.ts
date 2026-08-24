// Pure partitioning of a flat Operation.parameters list into its four
// ParameterLocation buckets. Kept separate from useTryItOut itself — same
// reasoning as build-sidebar-rows.ts being separate from Sidebar: the actual
// logic (which is where real bugs would hide) is testable without touching
// React at all.
//
// Order within each bucket is preserved from the input array — no sorting.
// Operation.parameters is already deduplicated by (in, name) upstream (see
// mergeParameters in normalize-operation-parts.ts), so no dedup is needed
// here either.

import type { Parameter } from "@docs-platform/core";

export interface GroupedParameters {
  path: Parameter[];
  query: Parameter[];
  header: Parameter[];
  cookie: Parameter[];
}

export function groupParametersByLocation(parameters: Parameter[]): GroupedParameters {
  const grouped: GroupedParameters = { path: [], query: [], header: [], cookie: [] };

  for (const parameter of parameters) {
    grouped[parameter.in].push(parameter);
  }

  return grouped;
}
