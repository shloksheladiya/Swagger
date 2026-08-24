"use client";
// Uses useUiStore (selection state) — needs the client boundary (same
// reasoning as AppShell.tsx: Zustand hooks require it, and establishing the
// boundary here means consuming pages never need to think about it).

import type { Operation } from "@docs-platform/core";
import { useUiStore } from "../../store/ui-store.js";
import { cn } from "../../lib/cn.js";

export interface EndpointListItemProps {
  operation: Operation;
}

export function EndpointListItem({ operation }: EndpointListItemProps) {
  const isSelected = useUiStore(
    (state) => state.selectedOperationId === operation.operationId,
  );
  const selectOperation = useUiStore((state) => state.selectOperation);

  return (
    <button
      type="button"
      onClick={() => selectOperation(operation.operationId)}
      aria-current={isSelected ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-sm px-md py-sm text-left text-sm",
        isSelected && "bg-surface",
      )}
    >
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
      <span className="truncate text-text">
        {operation.summary ?? operation.path}
      </span>
    </button>
  );
}
