// installPlugin: the entire "dependency injection" mechanism the roadmap's
// Milestone 20 concepts line calls for — a plugin never reaches into any
// registry directly, it only ever gets handed a PluginContext and calls
// methods on it. Deliberately just a direct function call, not a generic
// hook/event bus: a plugin's install() runs synchronously, once, and that's
// the whole contract.
//
// Generic over TComponent so this stays valid to import from core (no
// React) — react-renderer supplies the concrete PluginContext<ComponentType
// <any>> instance real plugins install against (see
// react-renderer/src/plugins/plugin-registry.ts), and re-exports its own
// `installPlugin(plugin)` convenience wrapper that closes over that context
// so callers (docs-app) never have to construct one themselves.

import type { Plugin, PluginContext } from "./types.js";

export function installPlugin<TComponent>(
  plugin: Plugin<TComponent>,
  context: PluginContext<TComponent>,
): void {
  plugin.install(context);
}
