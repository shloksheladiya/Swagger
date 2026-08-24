// Resolves an operation's full `security` array into display-ready auth info.
//
// The outer array uses OR semantics: any one alternative satisfies the
// operation. Each alternative is resolved via `resolveSecurityRequirement`,
// which handles AND semantics when a single requirement references multiple
// schemes.
//
// An empty `security` array is the normalized signal for "no authentication
// required" — the absent-vs-empty OpenAPI distinction was already resolved
// upstream; this function does not reinterpret it.

import type { SecurityRequirement, SecurityScheme } from "@docs-platform/core";
import { resolveSecurityRequirement } from "./resolve-security-requirement.js";

export type OperationAuthInfo =
  | { kind: "none" }
  | { kind: "required"; alternatives: string[][] };

export function resolveOperationAuth(
  security: SecurityRequirement[],
  securitySchemes: Record<string, SecurityScheme>,
): OperationAuthInfo {
  if (security.length === 0) {
    return { kind: "none" };
  }

  return {
    kind: "required",
    alternatives: security.map((requirement) =>
      resolveSecurityRequirement(requirement, securitySchemes),
    ),
  };
}
