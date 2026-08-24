// Stage 1-2 of the parsing pipeline (ADR §8): validate + resolveRefs.
//
// Deliberately delegates to a well-established library rather than hand-
// rolling $ref resolution (circular refs, external file refs are fiddly,
// well-solved problems — see ADR §8's Decision Record). Our own code starts
// at the next stage: normalizing the dereferenced OpenAPI document into our
// NormalizedSpec shape (a later step in this milestone).
//
// Takes a file path, a URL, or an already-parsed OpenAPI document object —
// swagger-parser handles all three natively (its own type is
// `string | OpenAPI.Document`); fetching from a URL vs. reading a local file
// vs. accepting an in-memory object is exactly the kind of detail this stage
// exists to hide from everything downstream. The object case was added for
// `DocsConfig.specSource`'s "inline" source (see load-spec-from-source.ts) —
// no new resolution logic, just widening this stage's accepted input to a
// shape the underlying library already supports.

import SwaggerParser from "@apidevtools/swagger-parser";
import { err, ok, type Result } from "../../result.js";
import type { SpecResolveError } from "./errors.js";

// Production UX audit (Milestone 21, "spec-load timeout"): bounds how long a
// single HTTP request during resolution may take — the root document fetch
// itself (for a "url" specSource), and any external $ref file it in turn
// references. Deliberately a PER-REQUEST timeout, not a total-pipeline one:
// a large-but-valid spec with many external $refs that each complete
// promptly is never cut off just because the overall resolution takes a
// while: only a single genuinely hung request trips this. 15s is generous
// for a real network fetch (same-origin static files and typical external
// hosts both resolve in well under a second) while still bounding the
// previously-unbounded hang the audit found (~10-15s of undifferentiated
// "Loading…" with no eventual timeout at all).
//
// Passed straight through to swagger-parser's underlying HTTP resolver
// (@apidevtools/json-schema-ref-parser's `resolvers/http.js`), which already
// implements the cutoff via a real `AbortController` — no new network
// abstraction needed here, just configuring the one that already exists.
// Inert for "inline" sources (no HTTP resolution happens unless the inline
// document itself references an external URL, in which case bounding that
// fetch too is correct, not a regression).
export const DEFAULT_SPEC_HTTP_TIMEOUT_MS = 15_000;

export interface ResolveSpecDocumentOptions {
  /** Overrides DEFAULT_SPEC_HTTP_TIMEOUT_MS — exposed only so tests can
   * exercise the timeout path quickly, without waiting out the real
   * production value. */
  httpTimeoutMs?: number;
}

export async function resolveSpecDocument(
  input: string | Record<string, unknown>,
  options?: ResolveSpecDocumentOptions,
): Promise<Result<Record<string, unknown>, SpecResolveError>> {
  const httpTimeoutMs = options?.httpTimeoutMs ?? DEFAULT_SPEC_HTTP_TIMEOUT_MS;
  try {
    // SwaggerParser's own .d.ts types `api` as `string | OpenAPI.Document`,
    // a specific union of versioned document interfaces we deliberately
    // don't import here — an inline object from config is only loosely
    // typed (Record<string, unknown>) at our boundary, and whether it's
    // actually a valid document is exactly what .validate() itself checks
    // at runtime (the catch below already handles "no, it wasn't").
    const dereferenced = await SwaggerParser.validate(input as any, {
      resolve: { http: { timeout: httpTimeoutMs } },
    } as any);
    return ok(dereferenced as unknown as Record<string, unknown>);
  } catch (cause) {
    return err({
      stage: "validate",
      message: cause instanceof Error ? cause.message : String(cause),
      cause,
    });
  }
}
