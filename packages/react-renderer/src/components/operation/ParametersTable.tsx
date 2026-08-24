// ParametersTable: pure presentation, same shape as OperationHeader — takes
// data as a prop, no store access, no "use client" needed.
//
// Deliberately a single flat table (one row per parameter, with a
// "Located in" column) rather than sections grouped by location
// (Path/Query/Header/Cookie). Grouped sections are a reasonable future
// refinement, but nothing about this milestone's scope requires it yet —
// add that grouping if/when it's actually needed, not speculatively.

import type { Parameter } from "@docs-platform/core";

export interface ParametersTableProps {
  parameters: Parameter[];
}

export function ParametersTable({ parameters }: ParametersTableProps) {
  if (parameters.length === 0) return null;

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-text-muted">
          <th className="px-md py-sm font-semibold">Name</th>
          <th className="px-md py-sm font-semibold">Located in</th>
          <th className="px-md py-sm font-semibold">Type</th>
          <th className="px-md py-sm font-semibold">Required</th>
          <th className="px-md py-sm font-semibold">Description</th>
        </tr>
      </thead>
      <tbody>
        {parameters.map((parameter) => (
          <tr key={`${parameter.in}-${parameter.name}`} className="border-b border-border">
            <td className="px-md py-sm font-mono text-text">{parameter.name}</td>
            <td className="px-md py-sm text-text-muted">{parameter.in}</td>
            <td className="px-md py-sm font-mono text-text-muted">
              {parameter.schema.type ?? "—"}
            </td>
            <td className="px-md py-sm text-text-muted">
              {parameter.required ? "Required" : "Optional"}
            </td>
            <td className="px-md py-sm text-text-muted">{parameter.description ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
