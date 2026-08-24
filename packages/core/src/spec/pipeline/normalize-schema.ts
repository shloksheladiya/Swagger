// Converts a raw, already-dereferenced OpenAPI schema object into our
// SchemaNode type — picking only the fields we model, so the result is
// genuinely normalized rather than a cast of whatever extra keywords the
// source spec happened to include (minimum, pattern, readOnly, etc. are
// dropped; add them here if a later milestone needs them).
//
// Cycle-safe: swagger-parser's dereferencing can (and does — see
// circular-schema.yaml) produce genuine object-identity cycles for
// self-referencing schemas. A plain recursive walk would stack-overflow on
// that. We register each node's (initially empty) SchemaNode in a WeakMap
// BEFORE recursing into its children — a cyclic reference then finds the
// same in-progress object instead of recursing again, and since the object
// is mutated in place, it ends up fully populated once the outer call
// finishes.

import type { SchemaNode, SchemaPrimitiveType } from "../schema-node.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const VALID_TYPES: ReadonlySet<string> = new Set([
  "object",
  "array",
  "string",
  "number",
  "integer",
  "boolean",
]);

export function normalizeSchema(
  raw: unknown,
  seen: WeakMap<object, SchemaNode> = new WeakMap(),
): SchemaNode {
  if (!isRecord(raw)) return {};

  const cached = seen.get(raw);
  if (cached) return cached;

  const node: SchemaNode = {};
  seen.set(raw, node); // registered before recursing — this is what breaks the cycle

  if (typeof raw.type === "string" && VALID_TYPES.has(raw.type)) {
    // OpenAPI 3.0 convention: a plain type string, with `nullable: true`
    // (handled separately below) marking nullability.
    node.type = raw.type as SchemaPrimitiveType;
  } else if (Array.isArray(raw.type)) {
    // OpenAPI 3.1 convention (plain JSON Schema): type is an array, e.g.
    // ["string", "null"]. This syntax never appears in valid 3.0 documents,
    // so no separate version flag is needed to know which case we're in.
    const typeValues = raw.type.filter((t): t is string => typeof t === "string");
    if (typeValues.includes("null")) node.nullable = true;
    const primaryType = typeValues.find((t) => t !== "null" && VALID_TYPES.has(t));
    if (primaryType) node.type = primaryType as SchemaPrimitiveType;
  }
  if (typeof raw.description === "string") node.description = raw.description;
  if (typeof raw.nullable === "boolean") node.nullable = raw.nullable;
  if (typeof raw.format === "string") node.format = raw.format;
  if ("example" in raw) node.example = raw.example;
  if (Array.isArray(raw.enum)) {
    node.enum = raw.enum.filter(
      (v): v is string | number | boolean =>
        typeof v === "string" || typeof v === "number" || typeof v === "boolean",
    );
  }
  if (Array.isArray(raw.required)) {
    node.required = raw.required.filter((r): r is string => typeof r === "string");
  }
  if (isRecord(raw.properties)) {
    node.properties = Object.fromEntries(
      Object.entries(raw.properties).map(([key, value]) => [
        key,
        normalizeSchema(value, seen),
      ]),
    );
  }
  if (raw.items !== undefined) node.items = normalizeSchema(raw.items, seen);
  if (Array.isArray(raw.oneOf)) {
    node.oneOf = raw.oneOf.map((s) => normalizeSchema(s, seen));
  }
  if (Array.isArray(raw.allOf)) {
    node.allOf = raw.allOf.map((s) => normalizeSchema(s, seen));
  }
  if (Array.isArray(raw.anyOf)) {
    node.anyOf = raw.anyOf.map((s) => normalizeSchema(s, seen));
  }

  return node;
}
