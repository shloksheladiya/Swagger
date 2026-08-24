"use client";
// BodyFieldEditor: renders ONE TryItOutBodyValue node, recursing into
// supported object/array structure — the request-body-editing analog of
// SchemaViewer (Milestone 10). Pure presentation: value/error/setters are
// all supplied by the caller (ultimately useTryItOut, via RequestBuilder) —
// this component does no schema walking or validation of its own, it only
// interprets the tree Part B already built.
//
// Two path concepts are threaded down separately because they mean
// different things: `path` (BodyFieldPath, can include array indices) is
// what the Part B state-update helpers need to locate a node; `dotPath`
// (string, object-property segments only) is what collectBodyErrors' error
// keys use — arrays never appear in an error key, since only object fields
// carry required-ness.

import type { ReactNode } from "react";
import type { BodyPrimitiveValue, TryItOutBodyValue } from "./schema-to-body-value.js";
import type { BodyFieldPath } from "./body-value-tree.js";

export interface BodyFieldEditorProps {
  /** Omitted for array items and the true root — same convention SchemaField/
   * SchemaViewer use for "no field name at this level". */
  name?: string;
  required?: boolean;
  value: TryItOutBodyValue;
  path: BodyFieldPath;
  dotPath: string;
  errors: Record<string, string>;
  setBodyValue: (path: BodyFieldPath, value: BodyPrimitiveValue) => void;
  addBodyArrayItem: (path: BodyFieldPath) => void;
  removeBodyArrayItem: (path: BodyFieldPath, index: number) => void;
}

const inputClassName =
  "w-full rounded-md border border-border bg-background px-md py-sm text-sm text-text";

function FieldLabel({ name, required }: { name?: string; required?: boolean }) {
  if (!name) return null;
  return (
    <div className="flex flex-wrap items-baseline gap-sm">
      <code className="font-mono text-sm text-text">{name}</code>
      {required && <span className="text-xs text-danger">required</span>}
    </div>
  );
}

export function BodyFieldEditor({
  name,
  required,
  value,
  path,
  dotPath,
  errors,
  setBodyValue,
  addBodyArrayItem,
  removeBodyArrayItem,
}: BodyFieldEditorProps) {
  if (value.kind === "unsupported") {
    return (
      <div className="flex flex-col gap-xs py-xs">
        <FieldLabel name={name} required={required} />
        <p className="text-xs italic text-text-muted">Not editable in this version ({value.reason})</p>
      </div>
    );
  }

  if (value.kind === "object") {
    return (
      <div className="flex flex-col gap-xs py-xs">
        <FieldLabel name={name} required={required} />
        <div className={name ? "ml-md flex flex-col border-l border-border pl-md" : "flex flex-col"}>
          {Object.entries(value.fields).map(([fieldName, fieldValue]) => (
            <BodyFieldEditor
              key={fieldName}
              name={fieldName}
              required={value.requiredFields.includes(fieldName)}
              value={fieldValue}
              path={[...path, fieldName]}
              dotPath={dotPath ? `${dotPath}.${fieldName}` : fieldName}
              errors={errors}
              setBodyValue={setBodyValue}
              addBodyArrayItem={addBodyArrayItem}
              removeBodyArrayItem={removeBodyArrayItem}
            />
          ))}
        </div>
      </div>
    );
  }

  if (value.kind === "array") {
    return (
      <div className="flex flex-col gap-xs py-xs">
        <div className="flex flex-wrap items-baseline gap-sm">
          <FieldLabel name={name} required={required} />
          <button
            type="button"
            onClick={() => addBodyArrayItem(path)}
            className="rounded-sm px-sm py-xs text-xs"
            style={{
              background: "var(--component-button-background)",
              color: "var(--component-button-text)",
              borderRadius: "var(--component-button-radius)",
            }}
          >
            Add item
          </button>
        </div>
        <div className="ml-md flex flex-col gap-xs border-l border-border pl-md">
          {value.items.length === 0 && (
            <p className="text-xs italic text-text-muted">No items yet</p>
          )}
          {value.items.map((item, index) => (
            <div key={index} className="flex items-start gap-sm">
              <div className="flex-1">
                <BodyFieldEditor
                  value={item}
                  path={[...path, index]}
                  dotPath={dotPath}
                  errors={errors}
                  setBodyValue={setBodyValue}
                  addBodyArrayItem={addBodyArrayItem}
                  removeBodyArrayItem={removeBodyArrayItem}
                />
              </div>
              <button
                type="button"
                onClick={() => removeBodyArrayItem(path, index)}
                aria-label={`Remove item ${index + 1}`}
                className="rounded-sm border border-border px-sm py-xs text-xs text-text-muted"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // value.kind === "primitive"
  const error = dotPath ? errors[`body:${dotPath}`] : undefined;
  const fieldId = `try-it-out-body-${dotPath || "root"}`;

  let control: ReactNode;
  if (value.schema.enum && value.schema.enum.length > 0) {
    const stringValue = typeof value.value === "string" ? value.value : "";
    control = (
      <select
        id={fieldId}
        value={stringValue}
        onChange={(event) => setBodyValue(path, event.target.value)}
        className={inputClassName}
      >
        <option value="">Select…</option>
        {value.schema.enum.map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </select>
    );
  } else if (value.schema.type === "boolean") {
    control = (
      <input
        id={fieldId}
        type="checkbox"
        checked={value.value === true}
        onChange={(event) => setBodyValue(path, event.target.checked)}
        className="h-4 w-4"
      />
    );
  } else if (value.schema.type === "number" || value.schema.type === "integer") {
    const stringValue = value.value === null || value.value === undefined ? "" : String(value.value);
    control = (
      <input
        id={fieldId}
        type="number"
        value={stringValue}
        onChange={(event) =>
          setBodyValue(path, event.target.value === "" ? null : Number(event.target.value))
        }
        className={inputClassName}
      />
    );
  } else {
    const stringValue = typeof value.value === "string" ? value.value : "";
    control = (
      <input
        id={fieldId}
        type="text"
        value={stringValue}
        onChange={(event) => setBodyValue(path, event.target.value)}
        className={inputClassName}
      />
    );
  }

  return (
    <div className="flex flex-col gap-xs py-xs">
      {name && (
        <label htmlFor={fieldId} className="flex flex-wrap items-baseline gap-sm">
          <code className="font-mono text-sm text-text">{name}</code>
          {required && <span className="text-xs text-danger">required</span>}
        </label>
      )}
      {value.schema.description && (
        <p className="text-xs text-text-muted">{value.schema.description}</p>
      )}
      {control}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
