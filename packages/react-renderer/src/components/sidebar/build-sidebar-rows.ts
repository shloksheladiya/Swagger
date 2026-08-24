// The flattening logic virtualization requires: a single flat array of rows
// (tag headers interleaved with their expanded items), computed from tags,
// grouped operations, and the current expansion state. Kept as a pure
// function, separate from the Sidebar component itself, specifically so the
// actual logic — which is where real bugs would hide — is testable without
// touching React or a DOM at all.

import type { Operation, Tag } from "@docs-platform/core";

export type SidebarRow =
  | { type: "header"; tagName: string }
  | { type: "item"; operation: Operation };

export function buildSidebarRows(
  tags: Tag[],
  operationsByTag: Record<string, Operation[]>,
  expandedTagNames: ReadonlySet<string>,
): SidebarRow[] {
  const rows: SidebarRow[] = [];
  const declaredTagNames = new Set(tags.map((t) => t.name));

  for (const tag of tags) {
    rows.push({ type: "header", tagName: tag.name });

    if (expandedTagNames.has(tag.name)) {
      const operations = operationsByTag[tag.name] ?? [];
      for (const operation of operations) {
        rows.push({ type: "item", operation });
      }
    }
  }

  // selectOperationsByTag (Milestone 5) creates buckets — most notably
  // "Untagged" — for keys that don't come from the spec's own declared
  // `tags` array. Without this, those operations silently never appear in
  // the sidebar at all (verified: an "Untagged" bucket with a real operation
  // in it produced zero rows for it, even when explicitly expanded).
  // Appended after all declared tags, in the order they appear in
  // operationsByTag, so declared tags always come first.
  for (const tagName of Object.keys(operationsByTag)) {
    if (declaredTagNames.has(tagName)) continue;

    rows.push({ type: "header", tagName });
    if (expandedTagNames.has(tagName)) {
      for (const operation of operationsByTag[tagName] ?? []) {
        rows.push({ type: "item", operation });
      }
    }
  }

  return rows;
}
