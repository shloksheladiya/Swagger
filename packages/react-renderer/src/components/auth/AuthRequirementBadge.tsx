// AuthRequirementBadge: pure presentation — takes the already-resolved
// OperationAuthInfo as a prop and renders it. No store access, no "use client"
// needed, and no re-interpretation of OpenAPI security semantics (those were
// resolved upstream by core + resolveOperationAuth).
//
// OR between alternatives and AND within one alternative are shown as visible
// text separators; each scheme label uses the same badge tokens as method
// badges elsewhere in the renderer.

import type { OperationAuthInfo } from "./resolve-operation-auth.js";

export interface AuthRequirementBadgeProps {
  auth: OperationAuthInfo;
}

function SchemeBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-sm px-sm py-xs text-xs"
      style={{
        background: "var(--component-badge-background)",
        color: "var(--component-badge-text)",
        borderRadius: "var(--component-badge-radius)",
      }}
    >
      {label}
    </span>
  );
}

export function AuthRequirementBadge({ auth }: AuthRequirementBadgeProps) {
  if (auth.kind === "none") {
    return <p className="text-sm text-text-muted">No authentication required</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-sm text-sm">
      {auth.alternatives.map((andGroup, altIndex) => (
        <span key={altIndex} className="inline-flex flex-wrap items-center gap-xs">
          {altIndex > 0 && <span className="font-semibold text-text-muted">or</span>}
          {andGroup.map((schemeLabel, schemeIndex) => (
            <span key={schemeIndex} className="inline-flex items-center gap-xs">
              {schemeIndex > 0 && <span className="text-text-muted">and</span>}
              <SchemeBadge label={schemeLabel} />
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}
