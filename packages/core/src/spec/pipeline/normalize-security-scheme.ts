// Converts a raw OpenAPI security scheme object into our SecurityScheme
// union. Only http+bearer, apiKey, and oauth2 are supported in v1 (ADR §2 —
// OAuth's *shape* is modeled but not acted on yet). Anything else (e.g.
// http+basic, openIdConnect) returns null and is skipped by the caller,
// rather than failing normalization of the whole spec over one unsupported
// scheme.
//
// Known limitation: skipped schemes are silently dropped right now — there's
// no logger yet (ADR §11 is a later milestone) to surface a warning that,
// say, "legacyBasicAuth" was ignored. Worth revisiting once that exists.

import type { SecurityScheme } from "../security-scheme.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeSecurityScheme(raw: unknown): SecurityScheme | null {
  if (!isRecord(raw) || typeof raw.type !== "string") return null;

  switch (raw.type) {
    case "http": {
      if (raw.scheme !== "bearer") return null; // e.g. "basic" — unsupported in v1
      const scheme: SecurityScheme = { type: "http", scheme: "bearer" };
      if (typeof raw.bearerFormat === "string") {
        scheme.bearerFormat = raw.bearerFormat;
      }
      return scheme;
    }
    case "apiKey": {
      const location = raw.in;
      if (
        typeof raw.name !== "string" ||
        (location !== "header" && location !== "query" && location !== "cookie")
      ) {
        return null;
      }
      return { type: "apiKey", in: location, name: raw.name };
    }
    case "oauth2": {
      return { type: "oauth2", flows: isRecord(raw.flows) ? raw.flows : {} };
    }
    default:
      return null; // e.g. "openIdConnect" — unsupported in v1
  }
}
