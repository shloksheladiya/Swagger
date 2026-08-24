// Normalizes a raw `security` array (found at both the document level and
// per-operation) into SecurityRequirement[].
//
// The one thing this function exists to get right: `undefined` and `[]` are
// NOT the same input.
//   - `security` field absent entirely (raw === undefined) -> this operation
//     didn't specify anything -> caller should fall back to the document's
//     global security.
//   - `security: []` present but empty -> this operation EXPLICITLY requires
//     no auth, overriding global security.
// Collapsing these into one case (e.g. "just default to []") would silently
// turn "explicitly public" and "inherits whatever global security is" into
// the same thing — a real auth-display bug, not a cosmetic one.

import type { SecurityRequirement } from "../security-scheme.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSecurity(
  raw: unknown,
): SecurityRequirement[] | undefined {
  if (raw === undefined) return undefined; // signal: "caller, use global fallback"
  if (!Array.isArray(raw)) return []; // malformed (present but not an array) -> treat as no requirements

  return raw.filter(isRecord).map((entry) => {
    const requirement: SecurityRequirement = {};
    for (const [schemeName, scopes] of Object.entries(entry)) {
      requirement[schemeName] = Array.isArray(scopes)
        ? scopes.filter((s): s is string => typeof s === "string")
        : [];
    }
    return requirement;
  });
}

/** Resolves an operation's effective security: its own requirement if it
 * specified one at all (even an empty array), otherwise the document's
 * global security. This is the actual absent-vs-empty resolution — callers
 * should use this rather than reimplementing the `?? ` fallback themselves. */
export function resolveEffectiveSecurity(
  operationLevelRaw: unknown,
  globalSecurity: SecurityRequirement[],
): SecurityRequirement[] {
  return normalizeSecurity(operationLevelRaw) ?? globalSecurity;
}
