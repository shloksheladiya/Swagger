// Milestone 20's one real example plugin — a request interceptor that logs
// every outgoing Try It Out request to the browser console before it's
// sent. Proves the plugin API works end-to-end: it's installed here (see
// DocsShell.tsx) and consumed entirely through
// @docs-platform/react-renderer's public installPlugin/PluginContext API —
// no change to any core or react-renderer SOURCE file was needed to add
// this plugin (their Milestone 20 additions are the extension points
// themselves, not this plugin).
//
// A logging interceptor was chosen over the roadmap's other suggested
// example (a custom SchemaViewer) because it exercises the part of this
// milestone that was genuinely incomplete before now — sendHttpRequest's
// `interceptors` option (Milestone 15) existed but nothing ever supplied
// it. The component-slot mechanism a custom SchemaViewer would exercise
// was already fully proven working end-to-end back in Milestone 17.
//
// Lives under packages/docs-app (a real workspace package, covered by the
// existing build/lint/test tooling) rather than the roadmap's literal
// top-level `examples/` path, which isn't part of this repo's pnpm
// workspace, vitest config, or tsconfig project references — see the
// Milestone 20 plan's "Roadmap vs Actual Repository" section for why.

import type { HttpRequestDescriptor, Plugin } from "@docs-platform/core";
import type { ComponentType } from "react";

export const requestLoggerPlugin: Plugin<ComponentType<any>> = {
  name: "request-logger",
  install(context) {
    context.registerRequestInterceptor((request: HttpRequestDescriptor) => {
      // The whole point of this example plugin is a visible, observable
      // side effect proving the interceptor extension point actually runs
      // — manual verification is "open Try It Out, send a request, see
      // this line in the console."
      // eslint-disable-next-line no-console
      console.log(`[request-logger plugin] ${request.method.toUpperCase()} ${request.url}`, {
        headers: request.headers,
        body: request.body,
      });
      return request;
    });
  },
};
