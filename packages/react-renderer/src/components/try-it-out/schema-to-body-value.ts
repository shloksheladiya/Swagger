// Pure schema -> initial request-body form-value walker (Part B).
//
// Scope (approved for this milestone):
//   supported   — string / number / integer / boolean / enum, object,
//                 array of supported primitives, one level of nested
//                 objects, allOf composition
//   unsupported — oneOf, anyOf, array of objects, nested arrays, any
//                 object nesting beyond one level, and genuine schema
//                 cycles
//
// Unsupported shapes are represented explicitly (`kind: "unsupported"`)
// rather than dropped, defaulted, or resolved by picking a branch — the
// future UI decides how to communicate "not editable yet" for those.

import type { SchemaNode } from "@docs-platform/core";

export type BodyPrimitiveValue = string | number | boolean | null;

/**
 * Recursive tagged union for request-body form state. Each variant carries
 * its originating SchemaNode so downstream code (the future UI, and
 * Milestone 15's serializer) can read type/format/enum directly off the
 * value tree without re-walking the schema a second time.
 */
export type TryItOutBodyValue =
  | { kind: "primitive"; schema: SchemaNode; value: BodyPrimitiveValue }
  | {
      kind: "object";
      schema: SchemaNode;
      fields: Record<string, TryItOutBodyValue>;
      /** Field names required per the schema (merged across allOf branches
       * where applicable) — stored here so validation doesn't need to
       * re-derive the allOf merge a second time. */
      requiredFields: string[];
    }
  | {
      kind: "array";
      schema: SchemaNode;
      /** The (supported-primitive) item schema, kept so a future "add item"
       * operation can construct a new element without re-walking `schema`. */
      itemSchema: SchemaNode;
      items: TryItOutBodyValue[];
    }
  | { kind: "unsupported"; schema: SchemaNode; reason: string };

// One level of nested objects means: the root object itself is depth 0, one
// nested object property is depth 1 (supported), and anything at depth 2 is
// not.
const MAX_OBJECT_NESTING_DEPTH = 1;

/**
 * Mirrors SchemaViewer's private `mergeAllOfBranches` (that function isn't
 * exported from SchemaViewer.tsx, so it can't be imported — this
 * reproduces the same behavior rather than inventing a second, incompatible
 * interpretation of allOf): later branches win on overlapping property
 * names, and `required` is the union of every branch's required list.
 */
function mergeAllOfBranches(branches: SchemaNode[]): {
  properties: Record<string, SchemaNode>;
  required: string[];
} {
  const properties: Record<string, SchemaNode> = {};
  const required = new Set<string>();
  for (const branch of branches) {
    if (branch.properties) Object.assign(properties, branch.properties);
    for (const fieldName of branch.required ?? []) required.add(fieldName);
  }
  return { properties, required: Array.from(required) };
}

function unsupported(schema: SchemaNode, reason: string): TryItOutBodyValue {
  return { kind: "unsupported", schema, reason };
}

function isSupportedPrimitiveType(schema: SchemaNode): boolean {
  if (schema.enum && schema.enum.length > 0) return true;
  return (
    schema.type === "string" ||
    schema.type === "number" ||
    schema.type === "integer" ||
    schema.type === "boolean"
  );
}

function initialPrimitiveValue(schema: SchemaNode): BodyPrimitiveValue {
  // Enum takes priority over the declared type: silently pre-selecting the
  // first option would be an unrequested (and possibly wrong) default, so
  // "no selection yet" (null) is used instead — the same reasoning as
  // number/boolean below, just applied to enums specifically.
  if (schema.enum && schema.enum.length > 0) return null;

  switch (schema.type) {
    case "string":
      // "" here, not null, even though it's also the value of a
      // deliberately-empty string. This matches Part A's own convention for
      // text parameters. Unlike number/boolean/enum, free text has no
      // meaningful distinct "unset" state without adding a separate
      // touched-flag — which would be more machinery than this milestone's
      // "basic" scope calls for. Flagging this as a deliberate, small
      // asymmetry rather than an oversight.
      return "";
    case "number":
    case "integer":
    case "boolean":
      // null, not 0 / false — so a real user-entered 0 or false is never
      // read back as "the user hasn't touched this field".
      return null;
    default:
      return null;
  }
}

function buildObjectFields(
  schema: SchemaNode,
  properties: Record<string, SchemaNode>,
  required: string[],
  ancestors: ReadonlySet<SchemaNode>,
  depth: number,
): TryItOutBodyValue {
  // Register the ORIGINAL schema object (not a synthetic allOf-merged one)
  // before recursing — same identity convention SchemaViewer's cycle guard
  // uses, and the reason this is a per-path Set rebuilt on each call rather
  // than a global "have I ever seen this" collection: a schema legitimately
  // reused by two unrelated properties must not be flagged as circular.
  const nextAncestors = new Set(ancestors).add(schema);

  const fields: Record<string, TryItOutBodyValue> = {};
  for (const [name, propertySchema] of Object.entries(properties)) {
    fields[name] = buildBodyValue(propertySchema, nextAncestors, depth + 1);
  }
  return { kind: "object", schema, fields, requiredFields: required };
}

function buildArrayValue(schema: SchemaNode): TryItOutBodyValue {
  const itemSchema = schema.items;
  if (!itemSchema) return unsupported(schema, "array item schema is missing");

  const itemHasComposition =
    (Array.isArray(itemSchema.oneOf) && itemSchema.oneOf.length > 0) ||
    (Array.isArray(itemSchema.anyOf) && itemSchema.anyOf.length > 0) ||
    (Array.isArray(itemSchema.allOf) && itemSchema.allOf.length > 0);

  // Array items are deliberately NOT walked recursively here (unlike object
  // properties) — Part B only supports arrays of primitives, so there is no
  // supported case that needs to descend into itemSchema's own structure.
  // This is also why the existing circular-schema fixture (a self-referencing
  // array of objects) never reaches the ancestors check below: "array of
  // objects" is unsupported on its own terms, independent of the cycle.
  if (itemSchema.type === "object" || itemHasComposition) {
    return unsupported(schema, "array of objects");
  }
  if (itemSchema.type === "array") {
    return unsupported(schema, "nested arrays");
  }
  if (!isSupportedPrimitiveType(itemSchema)) {
    return unsupported(schema, "array item schema not supported");
  }

  return { kind: "array", schema, itemSchema, items: [] };
}

function buildBodyValue(
  schema: SchemaNode,
  ancestors: ReadonlySet<SchemaNode>,
  depth: number,
): TryItOutBodyValue {
  if (ancestors.has(schema)) {
    // A genuine cycle on this path — stop here. This must be checked before
    // any other classification, and must be object-identity based: not
    // depth, not property-name matching, not JSON serialization (which
    // would recurse forever trying to serialize a truly circular object).
    return unsupported(schema, "circular reference");
  }

  const isOneOf = Array.isArray(schema.oneOf) && schema.oneOf.length > 0;
  const isAnyOf = Array.isArray(schema.anyOf) && schema.anyOf.length > 0;
  const isAllOf = Array.isArray(schema.allOf) && schema.allOf.length > 0;

  // oneOf/anyOf are genuine alternatives with potentially different, mutually
  // exclusive shapes — picking one silently (e.g. "first branch") could
  // produce a body that satisfies neither alternative. Represented as
  // explicitly unsupported instead, same as SchemaViewer treats them as "not
  // a union to merge".
  if (isOneOf) return unsupported(schema, "oneOf");
  if (isAnyOf) return unsupported(schema, "anyOf");

  if (isAllOf) {
    if (depth > MAX_OBJECT_NESTING_DEPTH) {
      return unsupported(schema, "nested object exceeds the one supported level of nesting");
    }
    const { properties, required } = mergeAllOfBranches(schema.allOf as SchemaNode[]);
    return buildObjectFields(schema, properties, required, ancestors, depth);
  }

  if (schema.type === "object") {
    if (depth > MAX_OBJECT_NESTING_DEPTH) {
      return unsupported(schema, "nested object exceeds the one supported level of nesting");
    }
    return buildObjectFields(schema, schema.properties ?? {}, schema.required ?? [], ancestors, depth);
  }

  if (schema.type === "array") {
    return buildArrayValue(schema);
  }

  if (isSupportedPrimitiveType(schema)) {
    return { kind: "primitive", schema, value: initialPrimitiveValue(schema) };
  }

  // No type, no enum, no recognizable structure — rather than guessing at an
  // editable representation for an unmodeled shape, this is explicit too.
  return unsupported(schema, "unmodeled schema shape");
}

/** Entry point: build the initial (all-empty) body form value for a request
 * body's schema. */
export function createInitialBodyValue(schema: SchemaNode): TryItOutBodyValue {
  return buildBodyValue(schema, new Set<SchemaNode>(), 0);
}
