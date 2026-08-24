// Turns the credential VALUES a user typed into Try It Out's Authorization
// section into the extra header/query entries a request needs. Takes the
// FULL list of OR-alternatives plus which one is currently selected —
// deliberately, rather than a single already-picked field list — so that
// "only the selected/satisfied alternative's credentials are ever injected,
// values left over from a different alternative are not" is this function's
// own, directly testable behavior rather than something callers have to get
// right by only ever passing it the right slice.
//
// A blank credential value is treated exactly like a blank optional
// parameter elsewhere in Try It Out: silently not sent, not an error — a
// user leaving every field blank is a legitimate way to verify an operation
// actually enforces its documented auth.

import type { AuthAlternative } from "./resolve-auth-credential-fields.js";
import { getRegisteredAuthStrategy } from "../../plugins/plugin-registry.js";

export interface InjectedAuthValues {
  headers: Record<string, string>;
  query: Record<string, string>;
}

export function applyAuthCredentials(
  alternatives: AuthAlternative[],
  selectedAlternativeIndex: number,
  credentialValues: Record<string, string>,
): InjectedAuthValues {
  const headers: Record<string, string> = {};
  const query: Record<string, string> = {};

  const selected = alternatives.find((alternative) => alternative.index === selectedAlternativeIndex);
  // No alternatives (operation.security is empty — no auth required) or an
  // out-of-range index (shouldn't happen in practice; useTryItOutExecution
  // resets the selection whenever the operation, and therefore the
  // alternatives, change) — either way, nothing to inject.
  if (!selected) return { headers, query };

  for (const field of selected.fields) {
    const value = credentialValues[field.schemeName];
    if (!value || value.trim().length === 0) continue;

    if (field.kind === "bearer") {
      headers.Authorization = `Bearer ${value}`;
    } else if (field.kind === "apiKey" && field.in === "header") {
      headers[field.paramName] = value;
    } else if (field.kind === "apiKey" && field.in === "query") {
      query[field.paramName] = value;
    } else if (field.kind === "strategy") {
      // Milestone 20: a field produced by a registered AuthStrategy (see
      // resolve-auth-credential-fields.ts) — injection is delegated back to
      // that same strategy rather than handled here, since only the
      // plugin's own injectCredential knows what this scheme actually
      // needs. Looked up again by schemeType (not carried on the field
      // itself) for the same reason describeSecurityScheme/scheme lookups
      // elsewhere in this codebase re-derive rather than cache — the
      // registry is the single source of truth.
      const strategy = getRegisteredAuthStrategy(field.schemeType);
      if (strategy) {
        const injected = strategy.injectCredential(field.descriptor, value);
        Object.assign(headers, injected.headers);
        Object.assign(query, injected.query);
      }
    }
    // field.kind === "unsupported" (oauth2 with no registered strategy, or
    // apiKey-in-cookie) never gets a credential input rendered in the first
    // place, so there is nothing in credentialValues to inject even if a
    // stale entry existed.
  }

  return { headers, query };
}
