// Converts the semantic and component tiers into CSS custom properties
// (e.g. semantic.color.primary -> "--color-primary"). Primitives are
// deliberately excluded — components should never reference a raw primitive
// directly, only a semantic or component-scoped role.
//
// This is a pure data transform; the React ThemeProvider that injects the
// result onto the DOM is a separate, later concern (ADR §16) — this function
// just produces the map.

import type { Theme } from "./theme.js";

type TokenBranch = { [key: string]: string | TokenBranch };

function flatten(
  branch: TokenBranch,
  path: string[],
  out: Record<string, string>,
): void {
  for (const [key, value] of Object.entries(branch)) {
    const nextPath = [...path, key];
    if (typeof value === "string") {
      out[`--${nextPath.join("-")}`] = value;
    } else {
      flatten(value, nextPath, out);
    }
  }
}

export function tokensToCssVariables(
  theme: Pick<Theme, "semantic" | "component">,
): Record<string, string> {
  const out: Record<string, string> = {};
  flatten(theme.semantic as TokenBranch, [], out);
  flatten(theme.component as TokenBranch, ["component"], out);
  return out;
}
