// Memoizes parseOpenApiDocument by (id, source) for the process lifetime.
//
// Deviation from ADR §8 worth being explicit about: ADR calls for memoizing
// by "a hash of the raw spec content." In practice, swagger-parser bundles
// fetching + validating + dereferencing into one call we don't control
// internally — we never see the raw bytes ourselves before that work is
// already done, so hashing "the content" would require duplicating its fetch
// logic just to compute a cache key. What this does instead: cache by the
// spec's source identifier (path/URL + the id it's registered under), which
// captures the practically useful case — the same spec re-requested
// repeatedly in a session — without that duplication. In-memory only, never
// persisted, per ADR §8's staleness warning.
//
// Two behaviors worth calling out:
//   - Failed parses are NOT cached — a transient network blip shouldn't
//     permanently "poison" a spec source; the next call retries for real.
//   - The in-flight PROMISE is cached, not just the resolved result — two
//     concurrent requests for the same spec share one underlying parse
//     instead of running it twice.

import type { NormalizedSpec } from "../normalized-spec.js";
import type { Result } from "../../result.js";
import type { SpecResolveError } from "./errors.js";
import { parseOpenApiDocument } from "./parse-openapi-document.js";

const cache = new Map<string, Promise<Result<NormalizedSpec, SpecResolveError>>>();

// An inline object (DocsConfig's "inline" specSource, see
// load-spec-from-source.ts) has no path/URL string to key by — JSON.stringify
// gives a cheap, correct-enough content key for the same reason ADR §8's
// "hash of the raw spec content" idea was deemed impractical above: these
// are small, in-memory, already-parsed objects, not something we'd want to
// duplicate a real hashing scheme for.
function cacheKey(input: string | Record<string, unknown>, id: string): string {
  const sourceKey = typeof input === "string" ? input : JSON.stringify(input);
  return `${id}::${sourceKey}`;
}

export function parseOpenApiDocumentCached(
  input: string | Record<string, unknown>,
  id: string,
): Promise<Result<NormalizedSpec, SpecResolveError>> {
  const key = cacheKey(input, id);
  const existing = cache.get(key);
  if (existing) return existing;

  const promise = parseOpenApiDocument(input, id);
  cache.set(key, promise); // cached synchronously, before any await — this is what makes concurrent calls dedupe

  void promise.then((result) => {
    if (!result.ok) cache.delete(key); // don't let a failure stick around
  });

  return promise;
}

/** Clears one cached entry, or the entire cache if called with no arguments —
 * e.g. for a future "refresh spec" UI action to force a real re-parse. */
export function clearParseCache(input?: string | Record<string, unknown>, id?: string): void {
  if (input === undefined || id === undefined) {
    cache.clear();
    return;
  }
  cache.delete(cacheKey(input, id));
}
