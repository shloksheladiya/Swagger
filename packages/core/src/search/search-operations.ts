// Aggregates scoreOperationMatch (Part 1) across every operation in a spec,
// filtering out non-matches and ranking the rest by relevance. This is the
// simple, default search behavior ADR §13 calls for — a plain scan, not a
// prebuilt inverted index. At realistic OpenAPI spec sizes (dozens to low
// hundreds of operations), rescanning on every keystroke is genuinely fast
// enough; an inverted index would be solving a scale problem this project
// doesn't have evidence of yet (same reasoning already applied to config's
// merge logic — add real machinery when a real need shows up, not before).

import type { Operation } from "../spec/normalized-spec.js";
import { scoreOperationMatch } from "./score-operation-match.js";

export interface SearchResult {
  operation: Operation;
  score: number;
}

export function searchOperations(
  operations: Operation[],
  query: string,
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const operation of operations) {
    const score = scoreOperationMatch(operation, query);
    if (score > 0) {
      results.push({ operation, score });
    }
  }

  // Highest score first. Ties keep their original relative order (Array.sort
  // is stable per the JS spec) rather than being arbitrarily reordered.
  results.sort((a, b) => b.score - a.score);

  return results;
}
