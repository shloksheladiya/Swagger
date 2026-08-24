// Scores how well ONE operation matches a search query. This is the atomic
// unit of search (ADR §13): given one operation and one query, how relevant
// is it? Everything else — an index across a whole spec, incremental index
// building, the UI search box — is built on top of this single function.
//
// Deliberately a numeric score (0 = no match), not a boolean, from the
// start: ADR calls for "scored substring/token matching," and starting with
// a score now means the index (next part) doesn't need a shape change later
// to support ranking results by relevance.
//
// Case-insensitive substring matching to start — no fuzzy matching, no typo
// tolerance. That's the deliberately simple default the architecture doc
// calls for (ADR §13: hide behind a SearchProvider interface, default
// implementation stays simple; swap in something like Fuse.js later only if
// real usage demands it).

import type { Operation } from "../spec/normalized-spec.js";

// Higher weight = more relevant when matched. operationId/path are what a
// developer most often searches by; description is the broadest, least
// specific match surface.
const FIELD_WEIGHTS = {
  operationId: 10,
  path: 10,
  summary: 6,
  tagNames: 3,
  description: 1,
} as const;

function includesQuery(haystack: string, query: string): boolean {
  return haystack.toLowerCase().includes(query.toLowerCase());
}

export function scoreOperationMatch(operation: Operation, query: string): number {
  const trimmedQuery = query.trim();
  if (trimmedQuery === "") return 0; // empty query matches nothing — an empty search box shouldn't "score" every operation

  let score = 0;

  if (includesQuery(operation.operationId, trimmedQuery)) {
    score += FIELD_WEIGHTS.operationId;
  }
  if (includesQuery(operation.path, trimmedQuery)) {
    score += FIELD_WEIGHTS.path;
  }
  if (operation.summary && includesQuery(operation.summary, trimmedQuery)) {
    score += FIELD_WEIGHTS.summary;
  }
  if (operation.tagNames.some((tag) => includesQuery(tag, trimmedQuery))) {
    score += FIELD_WEIGHTS.tagNames;
  }
  if (operation.description && includesQuery(operation.description, trimmedQuery)) {
    score += FIELD_WEIGHTS.description;
  }

  return score;
}
