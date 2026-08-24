// The complete parsing pipeline (ADR §8): resolve -> normalize -> build.
// Pure assembly — every piece this calls (resolveSpecDocument,
// normalizeStaticParts, normalizeOperations) was already tested in
// isolation, so this function's own tests are about wiring, not logic.

import type { NormalizedSpec } from "../normalized-spec.js";
import { err, ok, type Result } from "../../result.js";
import type { SpecResolveError } from "./errors.js";
import { normalizeOperations } from "./normalize-operations.js";
import { normalizeStaticParts } from "./normalize-static.js";
import { resolveSpecDocument } from "./resolve-spec-document.js";

export async function parseOpenApiDocument(
  input: string | Record<string, unknown>,
  id: string,
): Promise<Result<NormalizedSpec, SpecResolveError>> {
  const resolved = await resolveSpecDocument(input);
  if (!resolved.ok) return err(resolved.error);

  const staticParts = normalizeStaticParts(resolved.data, id);
  const operations = normalizeOperations(resolved.data);

  return ok({ ...staticParts, operations });
}
