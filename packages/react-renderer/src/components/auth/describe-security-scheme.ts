// Describes ONE SecurityScheme as human-readable text. The atomic unit of
// auth display: everything else (resolving a full requirement, which can
// reference multiple schemes; handling the array of alternative
// requirements; the actual badge component) is built on top of this.
//
// Kept as a plain function, not a component — this is pure text generation,
// no JSX, no store access, testable with zero rendering involved.
//
// OAuth2 gets only a generic label ("OAuth 2.0") rather than describing its
// flows in detail — OAuth is a designed-for extension point, not a v1
// deliverable (ADR §2/§15): the shape is modeled (Milestone 3) so this
// doesn't break when a spec references it, but real flow-specific display
// (authorization code vs. client credentials, scopes, etc.) is deliberately
// out of scope until OAuth is actually acted on.

import type { SecurityScheme } from "@docs-platform/core";

export function describeSecurityScheme(scheme: SecurityScheme): string {
  switch (scheme.type) {
    case "http":
      return scheme.bearerFormat ? `Bearer Token (${scheme.bearerFormat})` : "Bearer Token";
    case "apiKey":
      return `API Key (${scheme.in}: ${scheme.name})`;
    case "oauth2":
      return "OAuth 2.0";
  }
}
