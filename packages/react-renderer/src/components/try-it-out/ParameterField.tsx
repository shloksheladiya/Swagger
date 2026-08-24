"use client";
// ParameterField: renders ONE parameter's label, description, control, and
// error — the parameter-UI analog of SchemaField (Milestone 10's leaf case).
// Pure presentation: value/onChange/error are all supplied by the caller
// (RequestBuilder, backed by useTryItOut) — no state of its own, so this
// component can never drift out of sync with useTryItOut's values.

import type { ReactNode } from "react";
import type { Parameter } from "@docs-platform/core";

export interface ParameterFieldProps {
  parameter: Parameter;
  value: string | string[];
  error?: string;
  onChange: (value: string | string[]) => void;
}

const inputClassName =
  "w-full rounded-md border border-border bg-background px-md py-sm text-sm text-text";

export function ParameterField({ parameter, value, error, onChange }: ParameterFieldProps) {
  const inputId = `try-it-out-param-${parameter.in}-${parameter.name}`;
  const stringValue = typeof value === "string" ? value : "";

  let control: ReactNode;

  if (parameter.schema.type === "array") {
    // Array-typed parameters (e.g. repeated `?tag=a&tag=b`) aren't in this
    // milestone's supported parameter-control list (string/number/integer/
    // boolean/enum) — shown as explicitly not editable rather than
    // inventing comma-splitting or repeated-key serialization that wasn't
    // requested ("do not add advanced parameter serialization behavior yet").
    control = (
      <p className="text-xs italic text-text-muted">
        Not editable in this version (array-typed parameter)
      </p>
    );
  } else if (parameter.schema.enum && parameter.schema.enum.length > 0) {
    control = (
      <select
        id={inputId}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      >
        <option value="">Select…</option>
        {parameter.schema.enum.map((option) => (
          <option key={String(option)} value={String(option)}>
            {String(option)}
          </option>
        ))}
      </select>
    );
  } else if (parameter.schema.type === "boolean") {
    control = (
      <input
        id={inputId}
        type="checkbox"
        checked={stringValue === "true"}
        onChange={(event) => onChange(event.target.checked ? "true" : "false")}
        className="h-4 w-4"
      />
    );
  } else {
    const inputType =
      parameter.schema.type === "number" || parameter.schema.type === "integer" ? "number" : "text";
    control = (
      <input
        id={inputId}
        type={inputType}
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
      />
    );
  }

  return (
    <div className="flex flex-col gap-xs py-xs">
      <label htmlFor={inputId} className="flex flex-wrap items-baseline gap-sm">
        <code className="font-mono text-sm text-text">{parameter.name}</code>
        {parameter.required && <span className="text-xs text-danger">required</span>}
      </label>
      {parameter.description && <p className="text-xs text-text-muted">{parameter.description}</p>}
      {control}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
