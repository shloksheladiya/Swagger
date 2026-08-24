// The paths/methods loop: assembles normalize-operation-parts.ts (parameters,
// request bodies, responses) and normalize-security.ts (security resolution)
// into the final Operation[]. This is deliberately the LAST piece built in
// this step — everything it calls was already tested in isolation, so bugs
// here are about assembly/looping, not about any individual conversion.

import type { HttpMethod, Operation } from "../normalized-spec.js";
import type { Parameter } from "../operation-parts.js";
import type { SecurityRequirement } from "../security-scheme.js";
import {
  mergeParameters,
  normalizeParameter,
  normalizeRequestBody,
  normalizeResponses,
} from "./normalize-operation-parts.js";
import { normalizeSecurity, resolveEffectiveSecurity } from "./normalize-security.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const HTTP_METHODS: readonly HttpMethod[] = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
];

/** Synthesizes a stable operationId for specs that omit one (it's technically
 * optional per the OpenAPI spec, even though most real specs set it). Kept
 * deterministic — same method+path always produces the same id — so
 * something like deep-linking (Milestone 19) doesn't get a random id on
 * every reload. */
function synthesizeOperationId(method: string, path: string): string {
  return `${method}_${path}`
    .toLowerCase()
    .replace(/[{}]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeParameterList(raw: unknown): Parameter[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeParameter)
    .filter((p): p is Parameter => p !== null);
}

export function normalizeOperations(doc: Record<string, unknown>): Operation[] {
  const operations: Operation[] = [];
  if (!isRecord(doc.paths)) return operations;

  const globalSecurity: SecurityRequirement[] = normalizeSecurity(doc.security) ?? [];

  for (const [path, rawPathItemUnknown] of Object.entries(doc.paths)) {
    if (!isRecord(rawPathItemUnknown)) continue;
    const rawPathItem = rawPathItemUnknown;

    const pathLevelParams = normalizeParameterList(rawPathItem.parameters);

    for (const method of HTTP_METHODS) {
      const rawOp = rawPathItem[method];
      if (!isRecord(rawOp)) continue;

      const operationLevelParams = normalizeParameterList(rawOp.parameters);

      const operationId =
        typeof rawOp.operationId === "string" && rawOp.operationId.length > 0
          ? rawOp.operationId
          : synthesizeOperationId(method, path);

      const operation: Operation = {
        operationId,
        path,
        method,
        tagNames: Array.isArray(rawOp.tags)
          ? rawOp.tags.filter((t): t is string => typeof t === "string")
          : [],
        parameters: mergeParameters(pathLevelParams, operationLevelParams),
        responses: normalizeResponses(rawOp.responses),
        security: resolveEffectiveSecurity(rawOp.security, globalSecurity),
      };

      if (typeof rawOp.summary === "string") operation.summary = rawOp.summary;
      if (typeof rawOp.description === "string") {
        operation.description = rawOp.description;
      }
      const requestBody = normalizeRequestBody(rawOp.requestBody);
      if (requestBody) operation.requestBody = requestBody;

      operations.push(operation);
    }
  }

  return operations;
}
