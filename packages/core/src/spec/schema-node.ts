// SchemaNode: our normalized, version-agnostic representation of an OpenAPI
// schema. Recursive by design (ADR §3) — OpenAPI schemas nest arbitrarily and
// mix composition keywords (oneOf/allOf/anyOf) with plain properties, so a
// single flexible shape mirrors that reality better than a strict
// discriminated union would (see ADR §3's Decision Record for the reasoning).
//
// This is intentionally NOT the final word on every OpenAPI schema keyword —
// only what we know we need. Add fields when the normalization pipeline
// (Milestone 3) actually needs to carry them, not speculatively.

export type SchemaPrimitiveType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean";

export interface SchemaNode {
  /** Absent when a schema is composition-only (e.g. just a oneOf). */
  type?: SchemaPrimitiveType;
  description?: string;
  nullable?: boolean;

  /** Only meaningful when type === "object". */
  properties?: Record<string, SchemaNode>;
  /** Property names required on this object. Only meaningful when type === "object". */
  required?: string[];

  /** Only meaningful when type === "array". */
  items?: SchemaNode;

  enum?: Array<string | number | boolean>;
  format?: string;
  example?: unknown;

  oneOf?: SchemaNode[];
  allOf?: SchemaNode[];
  anyOf?: SchemaNode[];
}
