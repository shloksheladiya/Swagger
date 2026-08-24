// Resolves ONE SecurityRequirement into a list of human-readable
// descriptions — one per referenced scheme name. A requirement can
// reference MULTIPLE schemes at once (AND semantics: all must be satisfied
// together, e.g. an API key AND an OAuth token simultaneously — rare, but
// valid per the OpenAPI spec), which is why this returns an array, not a
// single string.
//
// Scopes (meaningful for oauth2, typically empty for bearer/apiKey) are
// appended to the description when present and non-empty.
//
// Defensively skips a scheme name that isn't in `securitySchemes` rather
// than throwing — this shouldn't normally happen (the parsing pipeline
// keeps operation security requirements and the spec's securitySchemes
// dictionary consistent), but a display function crashing on an
// inconsistency in someone's spec is a worse failure mode than silently
// omitting one unresolvable entry.

import type { SecurityRequirement, SecurityScheme } from "@docs-platform/core";
import { describeSecurityScheme } from "./describe-security-scheme.js";

export function resolveSecurityRequirement(
  requirement: SecurityRequirement,
  securitySchemes: Record<string, SecurityScheme>,
): string[] {
  const descriptions: string[] = [];

  for (const [schemeName, scopes] of Object.entries(requirement)) {
    const scheme = securitySchemes[schemeName];
    if (!scheme) continue;

    const base = describeSecurityScheme(scheme);
    descriptions.push(scopes.length > 0 ? `${base} (scopes: ${scopes.join(", ")})` : base);
  }

  return descriptions;
}
