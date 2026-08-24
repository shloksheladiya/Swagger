// SchemaViewer: recurses into object properties, array items, allOf
// composition, AND oneOf/anyOf alternatives, rendering a SchemaField
// (Part 1) for each field and continuing to recurse wherever there's more
// structure. Arbitrary nesting depth falls out naturally — each recursive
// call only needs to check its own node's shape.
//
// Array items use a synthetic "[]" field name — meaning "each item in this
// array looks like this." If items is itself an object, this naturally
// continues recursing into ITS properties; if items is a primitive, it
// renders as a single leaf row under the "[]" label.
//
// allOf composition (e.g. petstore-3.0's real Pet schema: allOf: [NewPet, {id}])
// means "must satisfy ALL of these" — in practice almost always object
// composition/inheritance, so branches' properties are MERGED into one
// combined view and rendered exactly like a plain object's properties.
// Overlapping property names across branches: last branch wins (plain
// Object.assign semantics) — a reasonable default for the rare case of
// genuinely conflicting branch definitions.
//
// oneOf/anyOf mean something fundamentally DIFFERENT from allOf — "matches
// ONE of these shapes" (or "any of," for anyOf), i.e. genuine alternatives,
// not a union to merge. Rendered as separate labeled variants ("Option 1",
// "Option 2", ...), each showing its own structure independently. A
// primitive branch (e.g. `{type: "string"}`) has nothing to recurse into,
// so its type is shown directly next to its option label instead of
// delegating to a nameless SchemaViewer call that would otherwise render
// nothing (the same trap array items solved with the "[]" synthetic name —
// here solved differently since each option needs its own distinct label,
// not one shared name).
//
// Circular-reference safety: `ancestors` tracks the chain of schema objects
// currently being rendered on THIS path — not a "have I ever seen this
// object anywhere" set. That distinction matters: the same schema object
// can legitimately appear in two unrelated branches (e.g. two properties
// both referencing a shared `Address` schema), and both must render fully,
// not have the second falsely flagged as circular. A genuine cycle (a
// schema that is its own ancestor — verified for real in Milestone 3,
// circular-schema.yaml: treeNode.properties.children.items === treeNode)
// is what this actually detects and stops. For allOf/oneOf/anyOf
// specifically: the ORIGINAL composed schema object is what gets
// registered as the ancestor (via `nextAncestors`, computed once, before
// branching into any case) — not a synthetic merged object — so a cycle
// routed back through any branch is still caught correctly.
//
// No store access, no "use client" needed — pure props in, JSX out, same as
// every component in this hierarchy so far.

import type { SchemaNode } from "@docs-platform/core";
import { SchemaField } from "./SchemaField.js";

// The component slot registry (Milestone 17) key for overriding
// SchemaViewer's TOP-LEVEL usages (RequestBodyViewer, ResponseViewer) with a
// custom renderer for a whole request/response body — e.g. a plugin that
// understands a non-JSON-Schema format. This deliberately does not affect
// SchemaViewer's own internal recursive self-calls (nested properties,
// array items, oneOf/anyOf branches) — those stay the built-in
// implementation regardless of an override, so a custom top-level renderer
// doesn't have to reimplement recursion, circular-reference protection, etc.
// unless it explicitly chooses to.
export const SCHEMA_VIEWER_SLOT = "SchemaViewer";

export interface SchemaViewerProps {
  schema: SchemaNode;
  /** Omitted at the true top level (e.g. viewing a request body's root
   * schema directly) — there's no "field name" for the root itself. */
  name?: string;
  required?: boolean;
  /** Internal: the chain of schema objects currently being rendered, used to
   * detect circular references. Not meant to be passed by external callers
   * — always starts empty (the default) at the true root. */
  ancestors?: ReadonlySet<SchemaNode>;
}

function mergeAllOfBranches(
  branches: SchemaNode[],
): { properties: Record<string, SchemaNode>; required: Set<string> } {
  const properties: Record<string, SchemaNode> = {};
  const required = new Set<string>();

  for (const branch of branches) {
    if (branch.properties) Object.assign(properties, branch.properties);
    for (const fieldName of branch.required ?? []) required.add(fieldName);
  }

  return { properties, required };
}

/** Whether a schema has any structure worth recursing into. Mirrors the
 * top-level checks in SchemaViewer itself — kept small and local rather than
 * a shared helper, since it's only used to decide how to label one oneOf/
 * anyOf option, not as a general-purpose utility. */
function hasRenderableStructure(node: SchemaNode): boolean {
  return (
    (node.type === "object" && !!node.properties) ||
    (node.type === "array" && !!node.items) ||
    (Array.isArray(node.allOf) && node.allOf.length > 0) ||
    (Array.isArray(node.oneOf) && node.oneOf.length > 0) ||
    (Array.isArray(node.anyOf) && node.anyOf.length > 0)
  );
}

export function SchemaViewer({
  schema,
  name,
  required = false,
  ancestors = new Set(),
}: SchemaViewerProps) {
  if (ancestors.has(schema)) {
    // Genuine cycle: this exact schema object is already an ancestor of
    // itself on this path. Stop here instead of recursing forever.
    return name ? (
      <div className="flex items-baseline gap-sm py-xs">
        <code className="font-mono text-sm text-text">{name}</code>
        <span className="text-xs italic text-text-muted">(circular reference)</span>
      </div>
    ) : null;
  }

  const isObjectWithProperties = schema.type === "object" && !!schema.properties;
  const isArrayWithItems = schema.type === "array" && !!schema.items;
  const isAllOf = Array.isArray(schema.allOf) && schema.allOf.length > 0;
  const isOneOf = Array.isArray(schema.oneOf) && schema.oneOf.length > 0;
  const isAnyOf = Array.isArray(schema.anyOf) && schema.anyOf.length > 0;

  if (!isObjectWithProperties && !isArrayWithItems && !isAllOf && !isOneOf && !isAnyOf) {
    // True leaf case: nothing to recurse into. A nameless leaf (shouldn't
    // normally happen at the true root, but defensively handled) renders
    // nothing rather than an empty row.
    return name ? <SchemaField name={name} schema={schema} required={required} /> : null;
  }

  // Extended ONCE here, before branching into any case below, and computed
  // from the ORIGINAL schema object — critically, not from a synthetic
  // merged/composed object — so a cycle routed through any branch (allOf,
  // oneOf, or anyOf) is still correctly caught by the ancestors.has(schema)
  // check above.
  const nextAncestors = new Set(ancestors).add(schema);

  if (isOneOf || isAnyOf) {
    const branches = (isOneOf ? schema.oneOf : schema.anyOf) as SchemaNode[];
    const keyword = isOneOf ? "oneOf" : "anyOf";

    return (
      <div>
        {name && (
          <div className="flex items-baseline gap-sm py-xs">
            <code className="font-mono text-sm text-text">{name}</code>
            <span className="font-mono text-xs text-text-muted">{keyword}</span>
            {required && <span className="text-xs text-danger">required</span>}
          </div>
        )}
        <div className={name ? "ml-md border-l border-border pl-md" : undefined}>
          {branches.map((branch, index) => {
            const branchHasStructure = hasRenderableStructure(branch);
            return (
              <div key={index} className="py-xs">
                <div className="text-xs font-semibold uppercase text-text-muted">
                  Option {index + 1}
                  {!branchHasStructure ? `: ${branch.type ?? "any"}` : ""}
                </div>
                {branchHasStructure && (
                  <SchemaViewer schema={branch} ancestors={nextAncestors} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const merged = isAllOf ? mergeAllOfBranches(schema.allOf as SchemaNode[]) : null;
  const properties = merged?.properties ?? schema.properties ?? {};
  const requiredFields = merged?.required ?? new Set(schema.required ?? []);

  // allOf schemas typically don't set their own top-level `type` (the type
  // comes from within each branch) — but in practice they're almost always
  // object composition, so the summary row displays "object" rather than
  // SchemaField's default "any" fallback. A small, deliberate display
  // simplification, not a claim about the raw schema's literal keywords.
  const summarySchema = isAllOf ? { ...schema, type: "object" as const } : schema;

  return (
    <div>
      {name && <SchemaField name={name} schema={summarySchema} required={required} />}
      <div className={name ? "ml-md border-l border-border pl-md" : undefined}>
        {(isObjectWithProperties || isAllOf) &&
          Object.entries(properties).map(([propName, propSchema]) => (
            <SchemaViewer
              key={propName}
              name={propName}
              schema={propSchema}
              required={requiredFields.has(propName)}
              ancestors={nextAncestors}
            />
          ))}
        {isArrayWithItems && schema.items && (
          <SchemaViewer
            schema={schema.items}
            name="[]"
            required={false}
            ancestors={nextAncestors}
          />
        )}
      </div>
    </div>
  );
}
