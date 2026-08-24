"use client";
// Uses useUiStore (selectedOperationId) — needs the client boundary, same
// reasoning as every other store-consuming component in this package.
//
// Takes `operations` as a prop rather than reading a spec store directly —
// same pattern Sidebar already uses. Real spec-loading wiring (a store
// providing the active spec's operations automatically) is later work; this
// component only needs to know how to render, given a list and a selection.

import { useUiStore } from "../../store/ui-store.js";
import { useSpecStore } from "../../store/spec-store.js";
import { useConfigStore } from "../../store/config-store.js";
import { defaultFeatures, type Operation, type SecurityScheme } from "@docs-platform/core";
import { AuthRequirementBadge } from "../auth/AuthRequirementBadge.js";
import { resolveOperationAuth } from "../auth/resolve-operation-auth.js";
import { OperationHeader } from "./OperationHeader.js";
import { ParametersTable } from "./ParametersTable.js";
import { RequestBodyViewer } from "./RequestBodyViewer.js";
import { ResponseViewer } from "./ResponseViewer.js";
import { MarkdownRenderer } from "../shared/MarkdownRenderer.js";
import { TryItOutPanel } from "../try-it-out/TryItOutPanel.js";

const EMPTY_SECURITY_SCHEMES: Record<string, SecurityScheme> = {};
const EMPTY_SERVERS: string[] = [];

export interface OperationViewProps {
  operations: Operation[];
}

export function OperationView({ operations }: OperationViewProps) {
  const selectedOperationId = useUiStore((state) => state.selectedOperationId);
  // Milestone 17: features.tryItOut hides the whole section when a config
  // turns it off. Falls back to the default (enabled) when no config has
  // been loaded yet, same pattern Sidebar uses for features.search.
  const tryItOutEnabled = useConfigStore(
    (state) => state.config?.features.tryItOut ?? defaultFeatures.tryItOut,
  );
  const securitySchemes = useSpecStore((state) => {
    const activeId = state.activeSpecId;
    if (!activeId) return EMPTY_SECURITY_SCHEMES;
    const entry = state.specs[activeId];
    return entry?.status === "ready" && entry.spec
      ? entry.spec.securitySchemes
      : EMPTY_SECURITY_SCHEMES;
  });
  // Try It Out's Base URL field defaults from this — see
  // useTryItOutExecution for why it's only ever used as a seed, never a
  // read-only mirror of the spec's declared servers.
  const servers = useSpecStore((state) => {
    const activeId = state.activeSpecId;
    if (!activeId) return EMPTY_SERVERS;
    const entry = state.specs[activeId];
    return entry?.status === "ready" && entry.spec ? entry.spec.servers : EMPTY_SERVERS;
  });
  const operation = operations.find((op) => op.operationId === selectedOperationId);

  if (!operation) {
    // Covers BOTH real cases: nothing selected yet, AND a selected id that no
    // longer matches anything (e.g. a stale selection after a spec reload) —
    // deliberately the same fallback for both, since neither has anything
    // meaningful to render.
    return (
      <div className="flex h-full items-center justify-center p-xl text-text-muted">
        <p>Select an endpoint to view its details.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <OperationHeader operation={operation} />
      <div className="flex flex-col gap-md p-lg">
        {operation.description && <MarkdownRenderer content={operation.description} />}
        <AuthRequirementBadge
          auth={resolveOperationAuth(operation.security, securitySchemes)}
        />
        <ParametersTable parameters={operation.parameters} />
        <RequestBodyViewer requestBody={operation.requestBody} />
        <ResponseViewer responses={operation.responses} />
        {tryItOutEnabled && (
          <TryItOutPanel operation={operation} securitySchemes={securitySchemes} servers={servers} />
        )}
      </div>
    </div>
  );
}
