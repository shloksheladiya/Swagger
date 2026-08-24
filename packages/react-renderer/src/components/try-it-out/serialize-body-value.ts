// Converts a TryItOutBodyValue tree (Part B's in-progress form state) into a
// plain, JSON-serializable value — the last step before a request body is
// handed to core's buildHttpRequest. Kept separate from body-value-tree.ts
// (which only ever mutates the tree, never reads it out to a plain value)
// and from useTryItOut itself, same "pure, independently testable function"
// reasoning the rest of Part B already follows.
//
// Most primitive leaves already carry a correctly-typed JS value —
// BodyFieldEditor's number/boolean inputs call Number()/checked directly, so
// value.value is already a real number/boolean, not a string. The one
// exception is enum-backed primitives: BodyFieldEditor always renders those
// as a <select>, whose onChange only ever produces a string
// (event.target.value) — even when the underlying schema is
// `{ type: "integer", enum: [...] }`. That's this module's one real job:
// coerce a string value back to the schema's declared type specifically for
// the enum case, not for every primitive (doing it unconditionally would
// "fix" values that were never broken and risk corrupting an intentionally
// free-text string field).

import type { TryItOutBodyValue } from "./schema-to-body-value.js";

function coercePrimitiveValue(node: Extract<TryItOutBodyValue, { kind: "primitive" }>): unknown {
  const { schema, value } = node;

  // Unset (no selection / never touched) — omitted from the serialized
  // output entirely rather than sent as an explicit `null`, so an untouched
  // optional field doesn't show up in the request body at all. An empty
  // string ("") is deliberately NOT treated the same way here — per
  // schema-to-body-value.ts's own comment, "" is string fields' genuine
  // rest value, not a distinct "unset" marker, so it's sent as-is below.
  if (value === null) return undefined;

  // Only enum-backed fields can have a string value that disagrees with the
  // schema's declared type (see module comment) — every other primitive
  // already carries the right JS type by construction.
  if (schema.enum && schema.enum.length > 0 && typeof value === "string") {
    if (schema.type === "integer" || schema.type === "number") {
      const numeric = Number(value);
      return Number.isNaN(numeric) ? undefined : numeric;
    }
    if (schema.type === "boolean") {
      return value === "true";
    }
  }

  return value;
}

/**
 * Recursively converts one TryItOutBodyValue node into a plain value ready
 * for JSON.stringify. Returns `undefined` for a node with nothing to send
 * (an unset primitive, or an "unsupported" node — Part B never gave the
 * user an editable control for those, so there's nothing collected to
 * serialize either), which object-serialization below omits as a key
 * entirely rather than sending an explicit `null`/`{}` in its place.
 */
export function serializeBodyValue(node: TryItOutBodyValue): unknown {
  switch (node.kind) {
    case "primitive":
      return coercePrimitiveValue(node);

    case "array":
      return node.items.map((item) => serializeBodyValue(item));

    case "object": {
      const result: Record<string, unknown> = {};
      for (const [fieldName, fieldValue] of Object.entries(node.fields)) {
        const serialized = serializeBodyValue(fieldValue);
        if (serialized !== undefined) result[fieldName] = serialized;
      }
      return result;
    }

    case "unsupported":
      // No editable representation ever existed for this node (oneOf,
      // array-of-objects, a genuine cycle, etc.) — there is nothing a user
      // could have entered, so nothing to serialize. Not an error case: the
      // parent object simply omits this field, same as an untouched
      // optional primitive.
      return undefined;
  }
}
