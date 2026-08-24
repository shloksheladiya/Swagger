// The concrete, React-flavored half of Milestone 20's plugin system. Core's
// plugins/* stays framework-agnostic (PluginContext<TComponent> generic, no
// React import); this file is where TComponent becomes a real React
// ComponentType — the exact same split component-registry-store.ts (M17)
// already established for ComponentSlotRegistry<TComponent>.
//
// registerComponent is wired to the EXISTING registerSlotComponent (M17) —
// deliberately NOT a second component-registry mechanism. Calling
// registerSlotComponent (rather than reaching into the raw
// ComponentSlotRegistry directly) matters: registerSlotComponent both
// writes the override AND bumps componentRegistryStore's `version` counter,
// which is what makes useSlotComponent's subscribers actually re-render — a
// plugin's registerComponent call needs that same reactivity, not just the
// underlying Map mutation.
//
// registerAuthStrategy / registerRequestInterceptor write into core's two
// new plain, non-reactive registries (see core/src/plugins/registry.ts).
// Deliberately NOT Zustand-backed, unlike the component registry: neither
// is ever consulted during a React render — an auth strategy is looked up
// inside a plain function call (resolve-auth-credential-fields.ts), and
// interceptors are read once per send() call
// (use-try-it-out-execution.ts) — so there is nothing that needs to trigger
// a re-render on registration.
//
// One module-level PluginContext instance, shared by every installPlugin()
// call — plugins don't get their own isolated context, matching the "one
// running app, one set of extension points" scope Milestone 20 asks for
// (no per-plugin sandboxing, no uninstall).

import type { ComponentType } from "react";
import {
  createAuthStrategyRegistry,
  createRequestInterceptorRegistry,
  installPlugin as installPluginWithContext,
  type AuthStrategy,
  type HttpRequestInterceptor,
  type Plugin,
  type PluginContext,
} from "@docs-platform/core";
import { registerSlotComponent } from "../store/component-registry-store.js";

const authStrategyRegistry = createAuthStrategyRegistry();
const requestInterceptorRegistry = createRequestInterceptorRegistry();

const pluginContext: PluginContext<ComponentType<any>> = {
  registerComponent: (slot, component) => registerSlotComponent(slot, component),
  registerAuthStrategy: (strategy) => authStrategyRegistry.register(strategy),
  registerRequestInterceptor: (interceptor) => requestInterceptorRegistry.register(interceptor),
};

/** The public entry point a host app (docs-app) calls at bootstrap to
 * install a real plugin — closes over the one real PluginContext above so
 * callers never need to construct one themselves. */
export function installPlugin(plugin: Plugin<ComponentType<any>>): void {
  installPluginWithContext(plugin, pluginContext);
}

/** Non-hook accessor: the auth strategy registered for `schemeType`, if
 * any. Consulted by resolve-auth-credential-fields.ts as a fallback, after
 * the built-in bearer/apiKey handling. Not reactive on purpose — see module
 * comment. */
export function getRegisteredAuthStrategy(schemeType: string): AuthStrategy | undefined {
  return authStrategyRegistry.get(schemeType);
}

/** Non-hook accessor: every registered request interceptor, in registration
 * order. Read once per send() call (use-try-it-out-execution.ts), never
 * during render. Not reactive on purpose — see module comment. */
export function getRegisteredRequestInterceptors(): readonly HttpRequestInterceptor[] {
  return requestInterceptorRegistry.getAll();
}
