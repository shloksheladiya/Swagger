// Pure, immutable operations over a TryItOutBodyValue tree (Part B).
// Kept separate from useTryItOut so the recursive tree-editing logic is
// plain, independently testable functions rather than embedded in the hook.

import { createInitialBodyValue, type BodyPrimitiveValue, type TryItOutBodyValue } from "./schema-to-body-value.js";

/**
 * Locates a field within the body tree. A string segment indexes into an
 * object's `fields`; a number segment indexes into an array's `items`.
 * E.g. `["address", "street"]` or `["tags", 0]`.
 */
export type BodyFieldPath = ReadonlyArray<string | number>;

function updateAtPath(
  node: TryItOutBodyValue,
  path: BodyFieldPath,
  updater: (leaf: TryItOutBodyValue) => TryItOutBodyValue,
): TryItOutBodyValue {
  if (path.length === 0) return updater(node);

  const [head, ...rest] = path;

  if (typeof head === "string" && node.kind === "object") {
    const child = node.fields[head];
    // A path that doesn't match the current tree shape (e.g. left over
    // after an operation switch) is a no-op, not a silent write to the
    // wrong place — the rest of the tree is returned untouched.
    if (!child) return node;
    return { ...node, fields: { ...node.fields, [head]: updateAtPath(child, rest, updater) } };
  }

  if (typeof head === "number" && node.kind === "array") {
    const child = node.items[head];
    if (!child) return node;
    const items = node.items.slice();
    items[head] = updateAtPath(child, rest, updater);
    return { ...node, items };
  }

  return node;
}

/** Sets a primitive leaf's value, preserving the rest of the tree. A no-op
 * if the path doesn't resolve to a primitive node. */
export function setPrimitiveBodyValue(
  body: TryItOutBodyValue,
  path: BodyFieldPath,
  value: BodyPrimitiveValue,
): TryItOutBodyValue {
  return updateAtPath(body, path, (leaf) => (leaf.kind === "primitive" ? { ...leaf, value } : leaf));
}

/** Appends a new item (built fresh from the array's itemSchema) to the array
 * at `path`. A no-op if the path doesn't resolve to an array node. */
export function addBodyArrayItem(body: TryItOutBodyValue, path: BodyFieldPath): TryItOutBodyValue {
  return updateAtPath(body, path, (leaf) =>
    leaf.kind === "array" ? { ...leaf, items: [...leaf.items, createInitialBodyValue(leaf.itemSchema)] } : leaf,
  );
}

/** Removes the item at `index` from the array at `path`, preserving the
 * order and values of the remaining items. A no-op if the path doesn't
 * resolve to an array node. */
export function removeBodyArrayItem(
  body: TryItOutBodyValue,
  path: BodyFieldPath,
  index: number,
): TryItOutBodyValue {
  return updateAtPath(body, path, (leaf) =>
    leaf.kind === "array" ? { ...leaf, items: leaf.items.filter((_, i) => i !== index) } : leaf,
  );
}

function isEmptyBodyValue(value: TryItOutBodyValue): boolean {
  if (value.kind === "primitive") {
    return value.value === null || (typeof value.value === "string" && value.value.trim().length === 0);
  }
  if (value.kind === "array") return value.items.length === 0;
  // "object" and "unsupported" nodes aren't judged empty/non-empty here —
  // an object field's own required sub-fields are checked separately by the
  // walk below, and an unsupported field has no editable representation to
  // judge as empty in the first place.
  return false;
}

function collectRequiredFieldErrors(
  node: TryItOutBodyValue,
  pathPrefix: string,
  errors: Record<string, string>,
): void {
  if (node.kind !== "object") return;

  for (const fieldName of node.requiredFields) {
    const child = node.fields[fieldName];
    if (!child || child.kind === "unsupported") continue; // nothing editable to report as empty
    if (isEmptyBodyValue(child)) {
      const fieldPath = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;
      errors[`body:${fieldPath}`] = `${fieldName} is required`;
    }
  }

  for (const [fieldName, child] of Object.entries(node.fields)) {
    if (child.kind === "object") {
      collectRequiredFieldErrors(child, pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName, errors);
    }
  }
}

/** Required-field validation only ("basic" per this milestone's scope) — no
 * pattern/min-max/format checks. Keys are namespaced `body:<field-path>`
 * (dot-separated for nested fields) so they can never collide with Part A's
 * `${location}:${name}` parameter-error keys. */
export function collectBodyErrors(body: TryItOutBodyValue | null): Record<string, string> {
  const errors: Record<string, string> = {};
  if (body) collectRequiredFieldErrors(body, "", errors);
  return errors;
}
