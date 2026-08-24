// Maps a DocsConfig.specSource (Milestone 4) onto the existing parsing
// pipeline (Milestone 3). No new resolution/validation/normalization logic
// lives here — this is pure routing from "which kind of source is this" to
// the one parseOpenApiDocumentCached entry point every source type already
// goes through.
//
// Scope for this pass (post-M20 real-OpenAPI-integration task):
//   - "inline": value is a JSON string (an OpenAPI document, JSON-
//     stringified — see docs-app's example-openapi-spec.ts). Parsed with the
//     built-in JSON.parse; no YAML support here deliberately (see the
//     roadmap note below), and no new dependency was needed for this.
//   - "url": value is passed straight through to the existing string-based
//     parseOpenApiDocumentCached, unchanged from how a file path already
//     worked. @apidevtools/swagger-parser is documented to support both
//     Node and browser environments for URL resolution, so this is wired
//     for real rather than left stubbed — but a CORS-blocked URL will still
//     surface as a real SpecResolveError from the underlying fetch, which is
//     expected and NOT specific to this function. There is deliberately no
//     proxy/server fallback for that case (see ADR discussion — a proxy is
//     out of scope for this task).
//   - "file": explicitly NOT supported yet. A file path needs Node's
//     filesystem, which isn't reachable from the browser runtime this
//     function is actually called from (docs-app's spec-loading hook runs
//     client-side, matching every other store-population code path in the
//     app — see docs-app/app/docs/use-load-spec.ts). Rather than pretending
//     this works, it fails fast with a clear, dedicated error message. Real
//     "file" support would mean loading server-side (a Server
//     Component/Route Handler) — a bigger architectural fork explicitly
//     deferred, not a bug to silently paper over.

import type { SpecSource } from "../../config/schema.js";
import type { NormalizedSpec } from "../normalized-spec.js";
import { err, type Result } from "../../result.js";
import type { SpecResolveError } from "./errors.js";
import { parseOpenApiDocumentCached } from "./parse-openapi-document-cached.js";

export async function loadSpecFromSource(
  specSource: SpecSource,
  id: string,
): Promise<Result<NormalizedSpec, SpecResolveError>> {
  switch (specSource.type) {
    case "inline": {
      let parsed: unknown;
      try {
        parsed = JSON.parse(specSource.value);
      } catch (cause) {
        return err({
          stage: "validate",
          message: `specSource "inline" value is not valid JSON: ${
            cause instanceof Error ? cause.message : String(cause)
          }`,
          cause,
        });
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return err({
          stage: "validate",
          message: 'specSource "inline" value must parse to a JSON object.',
          cause: parsed,
        });
      }
      return parseOpenApiDocumentCached(parsed as Record<string, unknown>, id);
    }

    case "url":
      return parseOpenApiDocumentCached(specSource.value, id);

    case "file":
      return err({
        stage: "validate",
        message:
          'specSource.type "file" is not supported yet — loading a spec from a local file requires filesystem access that is not available in this application\'s browser runtime.',
        cause: undefined,
      });
  }
}
