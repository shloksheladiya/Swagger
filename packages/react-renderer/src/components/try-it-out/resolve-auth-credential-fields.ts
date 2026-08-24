// Resolves an operation's security requirements into the OR-of-AND
// alternatives Try It Out's Authorization UI should offer for credential
// entry — mirrors the exact semantics already established in Milestone 13's
// resolveOperationAuth/resolveSecurityRequirement:
//   - multiple entries in operation.security (the outer array) = OR
//     alternatives — satisfying any ONE alternative is enough.
//   - multiple scheme names within one SecurityRequirement object = AND —
//     all of them are required together for that alternative.
// This module produces the same grouping, just as structured (scheme name,
// location, parameter name) data instead of resolveOperationAuth's
// human-readable descriptions — resolveOperationAuth itself is untouched.
//
// An earlier version of this module flattened every scheme referenced
// anywhere in operation.security into one independent, optional list. That
// was wrong: it let a user "satisfy" an OR by partially filling in schemes
// from two different alternatives, and gave no indication that two schemes
// in one AND group belong together. This version keeps each
// SecurityRequirement as its own alternative — Try It Out lets the user
// pick ONE (via selectedAlternativeIndex, see useTryItOutExecution) — with
// that alternative's own AND-grouped fields inside it.

import type { AuthCredentialDescriptor, SecurityRequirement, SecurityScheme } from "@docs-platform/core";
import { describeSecurityScheme } from "../auth/describe-security-scheme.js";
import { getRegisteredAuthStrategy } from "../../plugins/plugin-registry.js";

export type AuthCredentialField =
  | { kind: "bearer"; schemeName: string; label: string }
  | {
      kind: "apiKey";
      schemeName: string;
      label: string;
      in: "header" | "query";
      paramName: string;
    }
  // Milestone 20: a credential field produced by a plugin-registered
  // AuthStrategy (see resolveField below) rather than the built-in
  // bearer/apiKey handling above. `schemeType` + `descriptor` are exactly
  // what apply-auth-credentials.ts needs to look the same strategy back up
  // and call its injectCredential at send time.
  | {
      kind: "strategy";
      schemeName: string;
      label: string;
      schemeType: string;
      descriptor: AuthCredentialDescriptor;
    }
  | { kind: "unsupported"; schemeName: string; label: string; reason: string };

/** One OR-alternative from operation.security. `fields` is that
 * alternative's AND-group of credential inputs, in the requirement object's
 * own key order. `index` is the alternative's position within
 * operation.security — stable identity for the alternative-selector UI and
 * for useTryItOutExecution's selectedAlternativeIndex. */
export interface AuthAlternative {
  index: number;
  fields: AuthCredentialField[];
}

function resolveField(schemeName: string, scheme: SecurityScheme): AuthCredentialField {
  const label = describeSecurityScheme(scheme);

  if (scheme.type === "http" && scheme.scheme === "bearer") {
    return { kind: "bearer", schemeName, label };
  }

  if (scheme.type === "apiKey") {
    if (scheme.in === "cookie") {
      // Browsers do not let JavaScript set a Cookie header on an outgoing
      // request (it's on the fetch/XHR forbidden-header list) —
      // representing this as editable would silently fail to send it.
      // Shown as explicitly unsupported instead, the same pattern Part A/B
      // already use for their own out-of-scope cases.
      return {
        kind: "unsupported",
        schemeName,
        label,
        reason: "cookies can't be set from browser JavaScript",
      };
    }
    return { kind: "apiKey", schemeName, label, in: scheme.in, paramName: scheme.name };
  }

  // scheme.type === "oauth2" — a designed-for extension point (Milestone
  // 3/13), not acted on yet by the built-in handling above; token
  // ACQUISITION (a login flow) stays explicitly out of scope regardless.
  //
  // Milestone 20: before falling back to "not supported yet", check whether
  // a plugin registered an AuthStrategy for this scheme's `type`. This is
  // the ONLY place a strategy is ever consulted — it can never shadow the
  // bearer/http or apiKey handling above, since both already return before
  // reaching here.
  const strategy = getRegisteredAuthStrategy(scheme.type);
  if (strategy) {
    const descriptor = strategy.resolveCredentialField(schemeName, scheme);
    if (descriptor) {
      return {
        kind: "strategy",
        schemeName,
        label: strategy.describe(scheme),
        schemeType: scheme.type,
        descriptor,
      };
    }
  }

  return {
    kind: "unsupported",
    schemeName,
    label,
    reason: "OAuth2 credential entry isn't supported yet",
  };
}

export function resolveAuthCredentialAlternatives(
  security: SecurityRequirement[],
  securitySchemes: Record<string, SecurityScheme>,
): AuthAlternative[] {
  return security.map((requirement, index) => {
    const fields: AuthCredentialField[] = [];
    for (const schemeName of Object.keys(requirement)) {
      const scheme = securitySchemes[schemeName];
      // A requirement referencing a scheme name the spec never defined —
      // same defensive skip resolveSecurityRequirement already uses, for
      // the same reason: an inconsistency in someone's spec shouldn't crash
      // Try It Out. (An alternative made up ENTIRELY of unknown scheme
      // names ends up with an empty fields array here — the same "known,
      // deliberately unfixed obscure edge case" Milestone 13 already
      // documents for resolveOperationAuth's analogous `alternatives:
      // [[]]` — not something this module resolves differently.)
      if (!scheme) continue;
      fields.push(resolveField(schemeName, scheme));
    }
    return { index, fields };
  });
}
