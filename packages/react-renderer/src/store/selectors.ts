// Derived-data selectors, memoized by spec object identity. This is the
// concrete case ADR §9/§13 flagged: the sidebar needs "operations grouped by
// tag" constantly, and recomputing that grouping on every render (rather
// than once per spec load) is exactly the kind of avoidable cost the
// architecture review called out for large specs.
//
// Keyed by object identity (WeakMap), not content — a NormalizedSpec is
// treated as immutable once produced by the parser (Milestone 3), so the
// same spec object reference will always produce the same grouping. If the
// spec is reloaded, parseOpenApiDocumentCached either returns the same
// cached object (no-op) or a genuinely new one (real change) — either way,
// identity-based caching here does the right thing without this file needing
// to know anything about spec parsing itself.

import type { NormalizedSpec, Operation } from "@docs-platform/core";

/** The sentinel tag name used for operations that declare no `tagNames`.
 * Exported (Milestone 19) so anything that needs to agree with the sidebar's
 * grouping — e.g. deep-link canonical-tag resolution in docs-app — reuses
 * this exact string instead of re-declaring it. */
export const UNTAGGED = "Untagged";

const operationsByTagCache = new WeakMap<NormalizedSpec, Record<string, Operation[]>>();

export function selectOperationsByTag(
  spec: NormalizedSpec,
): Record<string, Operation[]> {
  const cached = operationsByTagCache.get(spec);
  if (cached) return cached;

  const grouped: Record<string, Operation[]> = {};
  for (const operation of spec.operations) {
    const tagNames = operation.tagNames.length > 0 ? operation.tagNames : [UNTAGGED];
    for (const tagName of tagNames) {
      (grouped[tagName] ??= []).push(operation);
    }
  }

  operationsByTagCache.set(spec, grouped);
  return grouped;
}

/** The single tag an operation is considered to "belong to" for purposes
 * that need exactly one tag rather than the full `tagNames` list — currently
 * just deep-link URL generation (Milestone 19): `/docs/[tag]/[operationId]`
 * needs one canonical segment even though `selectOperationsByTag` above
 * (correctly) files a multi-tag operation under every tag it declares for
 * sidebar display.
 *
 * Multi-tag operations use `tagNames[0]` (the order the spec author declared
 * them in) — the sidebar has no other established "primary tag" concept to
 * defer to, so this is the simplest rule that's still deterministic.
 * Untagged operations reuse the same `UNTAGGED` sentinel the sidebar groups
 * them under, so a deep link and the sidebar never disagree about where an
 * untagged operation "lives". */
export function getCanonicalTagName(operation: Operation): string {
  return operation.tagNames[0] ?? UNTAGGED;
}
