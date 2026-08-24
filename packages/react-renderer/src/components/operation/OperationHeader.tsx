// OperationHeader: pure presentation — method badge, path, and summary for
// one operation. Deliberately takes the Operation as a prop rather than
// reading uiStore itself (unlike every sidebar component so far) — THIS
// component doesn't need to know how the selected operation was determined,
// only how to display one. That's also why it's the first component in this
// package that does NOT need "use client": no hooks, no store access, just
// props in, JSX out. The lookup from uiStore.selectedOperationId to an
// actual Operation is OperationView's job (a later part), not this one's.

import type { Operation } from "@docs-platform/core";

export interface OperationHeaderProps {
  operation: Operation;
}

export function OperationHeader({ operation }: OperationHeaderProps) {
  return (
    <header className="border-b border-border px-lg py-md">
      <div className="flex items-center gap-sm">
        <span
          className="rounded-sm px-sm py-xs font-mono text-xs uppercase"
          style={{
            background: "var(--component-badge-background)",
            color: "var(--component-badge-text)",
            borderRadius: "var(--component-badge-radius)",
          }}
        >
          {operation.method}
        </span>
        <code className="font-mono text-md text-text">{operation.path}</code>
      </div>
      {operation.summary && (
        <h1 className="mt-sm text-xl font-semibold text-text">{operation.summary}</h1>
      )}
    </header>
  );
}
