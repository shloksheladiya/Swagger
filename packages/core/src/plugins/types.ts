// Milestone 20 — Plugin System Foundation: the framework-agnostic shapes
// every plugin API is built from. Deliberately limited to exactly the three
// extension points the roadmap names (registerComponent, registerAuthStrategy,
// registerRequestInterceptor) — no generic hook bus, no plugin manifest, no
// uninstall/lifecycle beyond a single synchronous `install(context)` call.
//
// PluginContext<TComponent> stays generic over the component type for the
// same reason ComponentSlotRegistry<TComponent> (Milestone 17) does: this
// package must never import React (ADR/core-must-not-depend-on-react).
// react-renderer is what instantiates PluginContext<ComponentType<any>>
// concretely and hands that concrete object to real plugins — see
// react-renderer/src/plugins/plugin-registry.ts.

import type { SecurityScheme } from "../spec/security-scheme.js";
import type { HttpRequestInterceptor } from "../http/types.js";

/** What a registered AuthStrategy's credential field turns into for
 * request-sending purposes — the same {headers, query} shape
 * apply-auth-credentials.ts's built-in bearer/apiKey injection already
 * produces, so a strategy-produced field is indistinguishable, at the
 * request level, from a built-in one. */
export interface AuthCredentialInjection {
  headers: Record<string, string>;
  query: Record<string, string>;
}

/** Deliberately reuses the exact "bearer" | "apiKey" input-kind vocabulary
 * the built-in credential fields already use (see react-renderer's
 * AuthCredentialField) — NOT a new UI input type. A registered strategy
 * describes ITS credential as one of these two existing shapes so it can be
 * collected through the current Authorization-section text input with zero
 * new rendering logic; strategies never supply their own UI component (out
 * of scope for Milestone 20 — see the AuthStrategy design decision). */
export type AuthCredentialDescriptor =
  | { kind: "bearer" }
  | { kind: "apiKey"; in: "header" | "query"; paramName: string };

/** One pluggable authentication scheme handler. Pure data/functions only —
 * no React, no JSX — so this can live in `core` and be consulted from
 * react-renderer's existing (Milestone 13/15) auth-resolution functions
 * without core ever depending on them or on React.
 *
 * Registered under `schemeType`, matched against a SecurityScheme's own
 * `type` discriminant (e.g. "oauth2"). Consulted ONLY as a fallback, after
 * the built-in bearer/http and apiKey handling in
 * resolve-auth-credential-fields.ts / apply-auth-credentials.ts — a plugin
 * can never shadow those two built-in, already-tested behaviors. */
export interface AuthStrategy {
  schemeType: string;
  /** Human-readable label for this scheme, shown in Try It Out's
   * Authorization section — the strategy's own equivalent of
   * describeSecurityScheme (Milestone 13), which stays untouched and keeps
   * driving the separate, read-only OperationView auth badge. */
  describe(scheme: SecurityScheme): string;
  /** Which credential field (if any) Try It Out should collect for this
   * scheme instance. Returning undefined means "nothing to collect" — the
   * same "unsupported" outcome the built-in fallback already produces when
   * no strategy is registered at all. */
  resolveCredentialField(
    schemeName: string,
    scheme: SecurityScheme,
  ): AuthCredentialDescriptor | undefined;
  /** Turns a user-entered credential value into the header/query entries a
   * request needs. */
  injectCredential(field: AuthCredentialDescriptor, value: string): AuthCredentialInjection;
}

/** The object a plugin's `install()` receives — its only way to affect the
 * running app. Exactly the three extension points the roadmap names; adding
 * a fourth here is out of scope unless a future milestone explicitly
 * requires it. */
export interface PluginContext<TComponent> {
  registerComponent(slot: string, component: TComponent): void;
  registerAuthStrategy(strategy: AuthStrategy): void;
  registerRequestInterceptor(interceptor: HttpRequestInterceptor): void;
}

/** A plugin is just a name plus a synchronous install step — no manifest
 * format, no async lifecycle, no uninstall. `installPlugin` (context.ts) is
 * the only way one of these ever runs. */
export interface Plugin<TComponent> {
  name: string;
  install(context: PluginContext<TComponent>): void;
}
