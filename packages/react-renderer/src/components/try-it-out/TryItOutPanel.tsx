// TryItOutPanel: the outer "Try It Out" section OperationView mounts.
// Deliberately thin — it does NOT call useTryItOut itself (RequestBuilder
// does, per the approved architecture: OperationView -> TryItOutPanel ->
// RequestBuilder -> useTryItOut). This component's only job is section
// framing (heading + card styling) and passing the already-resolved
// Operation straight through, the same "operation as a prop, not re-derived
// from a store" pattern every component in this hierarchy already follows.

import type { Operation, SecurityScheme } from "@docs-platform/core";
import { RequestBuilder } from "./RequestBuilder.js";

export interface TryItOutPanelProps {
  operation: Operation;
  /** Forwarded straight through to RequestBuilder — see its own prop docs
   * for the `{}`/`[]` default behavior when omitted. */
  securitySchemes?: Record<string, SecurityScheme>;
  servers?: string[];
}

export function TryItOutPanel({ operation, securitySchemes, servers }: TryItOutPanelProps) {
  return (
    <section
      aria-label="Try It Out"
      className="flex flex-col gap-md"
      style={{
        background: "var(--component-card-background)",
        border: "1px solid var(--component-card-border)",
        borderRadius: "var(--component-card-radius)",
        boxShadow: "var(--component-card-shadow)",
        padding: "var(--component-card-padding)",
      }}
    >
      <span className="text-md font-semibold text-text">Try It Out</span>
      <RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={servers} />
    </section>
  );
}
