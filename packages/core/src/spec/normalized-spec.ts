// Operation assembles everything from operation-parts.ts and
// security-scheme.ts into one documented endpoint. NormalizedSpec is the
// top-level shape the parser (Milestone 3) produces and everything else in
// the app consumes (ADR §3).

import type { Parameter, RequestBody, Response } from "./operation-parts.js";
import type { SchemaNode } from "./schema-node.js";
import type { SecurityRequirement, SecurityScheme } from "./security-scheme.js";

export interface Tag {
  name: string;
  description?: string;
}

export type HttpMethod =
  | "get"
  | "post"
  | "put"
  | "patch"
  | "delete"
  | "options"
  | "head";

export interface Operation {
  operationId: string;
  path: string;
  method: HttpMethod;
  summary?: string;
  description?: string;
  tagNames: string[];
  parameters: Parameter[];
  requestBody?: RequestBody;
  responses: Response[];
  /** Empty array means no auth required. */
  security: SecurityRequirement[];
}

export interface NormalizedSpec {
  id: string;
  version: string;
  title: string;
  tags: Tag[];
  operations: Operation[];
  schemas: Record<string, SchemaNode>;
  securitySchemes: Record<string, SecurityScheme>;
  /** OpenAPI `servers[].url` values, in document order. Empty when the
   * document declares none — callers (e.g. Try It Out's base URL) decide how
   * to handle that case, this type just reports what the spec said. */
  servers: string[];
}
