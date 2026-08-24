// Normalizes everything in a dereferenced OpenAPI document EXCEPT paths/
// operations — title, version, tags, the shared schema dictionary, and
// security schemes. Operations are handled separately (next step) since
// that's a meaningfully larger, separate piece of surface area.
//
// `id` is deliberately a caller-supplied argument, not derived from the
// document. Which identifier a loaded spec gets (e.g. a slug, a UUID) is a
// concern of whoever is registering it into a multi-spec collection later —
// not something inherent to the spec's content, so this stays a pure
// function of (document, id).

import type { NormalizedSpec, Tag } from "../normalized-spec.js";
import type { SchemaNode } from "../schema-node.js";
import type { SecurityScheme } from "../security-scheme.js";
import { normalizeSchema } from "./normalize-schema.js";
import { normalizeSecurityScheme } from "./normalize-security-scheme.js";

export type StaticSpecParts = Omit<NormalizedSpec, "operations">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeStaticParts(
  doc: Record<string, unknown>,
  id: string,
): StaticSpecParts {
  const info = isRecord(doc.info) ? doc.info : {};
  const title = typeof info.title === "string" ? info.title : "Untitled API";
  const version = typeof info.version === "string" ? info.version : "0.0.0";

  const tags: Tag[] = Array.isArray(doc.tags)
    ? doc.tags
        .filter(isRecord)
        .filter((t): t is Record<string, unknown> & { name: string } =>
          typeof t.name === "string",
        )
        .map((t) => ({
          name: t.name,
          ...(typeof t.description === "string"
            ? { description: t.description }
            : {}),
        }))
    : [];

  const components = isRecord(doc.components) ? doc.components : {};

  const schemas: Record<string, SchemaNode> = {};
  if (isRecord(components.schemas)) {
    for (const [name, raw] of Object.entries(components.schemas)) {
      schemas[name] = normalizeSchema(raw);
    }
  }

  const securitySchemes: Record<string, SecurityScheme> = {};
  if (isRecord(components.securitySchemes)) {
    for (const [name, raw] of Object.entries(components.securitySchemes)) {
      const scheme = normalizeSecurityScheme(raw);
      if (scheme) securitySchemes[name] = scheme; // unsupported kinds skipped — see normalize-security-scheme.ts
    }
  }

  // Order preserved from the document — the first entry is OpenAPI's own
  // "default server" convention, which is what Try It Out defaults its base
  // URL to. Entries missing a valid `url` string are skipped rather than
  // producing a garbage empty-string entry a caller would have to filter out.
  //
  // Deliberately unsupported: `servers[].variables` (OpenAPI's templated
  // server URLs, e.g. `https://{region}.api.example.com` with a `variables`
  // map of defaults/enums). Only `.url` is read here, verbatim — a
  // variable-templated URL is captured with its literal `{region}`
  // placeholder still in it, and nothing downstream (buildHttpRequest)
  // resolves it either. The Base URL field stays fully editable specifically
  // so a user hitting this can hand-fix it; building real variable
  // resolution is out of scope for this milestone (see build-request.ts).
  const servers: string[] = Array.isArray(doc.servers)
    ? doc.servers
        .filter(isRecord)
        .map((s) => s.url)
        .filter((url): url is string => typeof url === "string" && url.length > 0)
    : [];

  return { id, version, title, tags, schemas, securitySchemes, servers };
}
