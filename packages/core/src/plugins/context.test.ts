import { describe, expect, it, vi } from "vitest";
import type { Plugin, PluginContext } from "./types.js";
import { installPlugin } from "./context.js";

function makeContext(): PluginContext<string> {
  return {
    registerComponent: vi.fn(),
    registerAuthStrategy: vi.fn(),
    registerRequestInterceptor: vi.fn(),
  };
}

describe("installPlugin", () => {
  it("calls the plugin's install() with the given context", () => {
    const context = makeContext();
    const install = vi.fn();
    const plugin: Plugin<string> = { name: "test-plugin", install };

    installPlugin(plugin, context);

    expect(install).toHaveBeenCalledWith(context);
    expect(install).toHaveBeenCalledTimes(1);
  });

  it("lets a plugin call any/all of the three registration methods on the context it receives", () => {
    const context = makeContext();
    const plugin: Plugin<string> = {
      name: "test-plugin",
      install(ctx) {
        ctx.registerComponent("SchemaViewer", "CustomSchemaViewer");
        ctx.registerAuthStrategy({
          schemeType: "oauth2",
          describe: () => "OAuth",
          resolveCredentialField: () => undefined,
          injectCredential: () => ({ headers: {}, query: {} }),
        });
        ctx.registerRequestInterceptor((req) => req);
      },
    };

    installPlugin(plugin, context);

    expect(context.registerComponent).toHaveBeenCalledWith("SchemaViewer", "CustomSchemaViewer");
    expect(context.registerAuthStrategy).toHaveBeenCalledTimes(1);
    expect(context.registerRequestInterceptor).toHaveBeenCalledTimes(1);
  });
});
