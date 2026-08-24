// SchemaField: the leaf case, built first — same reasoning as building
// EndpointListItem before TagGroup, or OperationHeader before OperationView.
// Renders ONE field's name/type/required/nullable/description. Deliberately
// does NOT recurse into nested properties/items/oneOf yet — that's the next
// part(s), once this leaf case is proven correct on its own.
//
// A SchemaNode has no name of its own (the name comes from whichever parent
// object's `properties` key it's under) — so `name` and `required` are both
// passed in by the caller, not read from the schema itself.

import type { SchemaNode } from "@docs-platform/core";

export interface SchemaFieldProps {
  name: string;
  schema: SchemaNode;
  required?: boolean;
  /** Overrides the displayed type text (default: schema.type ?? "any").
   * Used by SchemaViewer to show e.g. "array of string" for array fields —
   * SchemaField itself has no array-specific knowledge; it just displays
   * whatever label it's given. */
  typeLabel?: string;
}

export function SchemaField({ name, schema, required = false, typeLabel }: SchemaFieldProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-sm py-xs">
      <code className="font-mono text-sm text-text">{name}</code>
      <span className="font-mono text-xs text-text-muted">
        {typeLabel ?? schema.type ?? "any"}
      </span>
      {required && <span className="text-xs text-danger">required</span>}
      {schema.nullable && <span className="text-xs text-text-muted">nullable</span>}
      {schema.format && <span className="text-xs text-text-muted">({schema.format})</span>}
      {schema.description && (
        <p className="w-full text-xs text-text-muted">{schema.description}</p>
      )}
    </div>
  );
}
