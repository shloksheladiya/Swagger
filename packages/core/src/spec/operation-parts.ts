// Types for the pieces of an Operation that carry data in or out:
// Parameter (path/query/header/cookie values), RequestBody, and Response.
// All defer to SchemaNode (schema-node.ts) for the actual shape of the data.

import type { SchemaNode } from "./schema-node.js";

/** Where a parameter is placed in the HTTP request. A closed set on purpose —
 * this drives real request-building logic later (Milestone 14), so a typo
 * here should be a compile error, not a silent runtime miss. */
export type ParameterLocation = "path" | "query" | "header" | "cookie";

export interface Parameter {
  name: string;
  in: ParameterLocation;
  required: boolean;
  description?: string;
  schema: SchemaNode;
}

/** One entry in a content map, e.g. the value at content["application/json"]. */
export interface MediaType {
  schema: SchemaNode;
  example?: unknown;
}

export interface RequestBody {
  required: boolean;
  description?: string;
  /** Keyed by media type, e.g. "application/json", "multipart/form-data". */
  content: Record<string, MediaType>;
}

export interface Response {
  /** e.g. "200", "404", "default". Kept as a string — "default" is valid OpenAPI. */
  statusCode: string;
  description: string;
  content?: Record<string, MediaType>;
}
