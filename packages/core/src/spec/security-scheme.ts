// SecurityScheme: a discriminated union, deliberately unlike SchemaNode's
// loose shape. OpenAPI only defines a handful of security scheme kinds, each
// with a fixed, well-known set of fields — a union lets TypeScript catch a
// missing field (e.g. forgetting `bearerFormat`) at compile time.
//
// OAuth2 is a designed-for extension point, not a v1 deliverable (ADR §2) —
// its shape exists so security-requirement resolution doesn't break the
// moment a spec references it, but we don't act on it yet.

export type SecurityScheme =
  | { type: "http"; scheme: "bearer"; bearerFormat?: string }
  | { type: "apiKey"; in: "header" | "query" | "cookie"; name: string }
  | { type: "oauth2"; flows: Record<string, unknown> };

/** An operation's security requirement: scheme name -> required scopes
 * (empty for non-OAuth schemes). An operation's `security` array holds
 * several of these; multiple entries mean "any one of these satisfies it". */
export type SecurityRequirement = Record<string, string[]>;
