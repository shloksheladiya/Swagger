// @vitest-environment jsdom
//
// Covers all three PluginContext methods a plugin can call through
// installPlugin(), plus — the part that actually matters for
// registerComponent — that a registered override is REACTIVE: a component
// already mounted via useSlotComponent (Milestone 17) re-renders and picks
// up the override, exactly like a direct registerSlotComponent call would.
// This is the "component-registration portion must continue to use the
// existing reactive mechanism" requirement, proven end-to-end rather than
// just asserted at the registry level.

import { beforeEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import { act, renderHook } from "@testing-library/react";
import { createComponentSlotRegistry, type AuthStrategy, type Plugin } from "@docs-platform/core";
import { useComponentRegistryStore } from "../store/component-registry-store.js";
import { useSlotComponent } from "../hooks/use-slot-component.js";
import {
  installPlugin,
  getRegisteredAuthStrategy,
  getRegisteredRequestInterceptors,
} from "./plugin-registry.js";

const DefaultComponent = (() => null) as ComponentType;
const OverrideComponent = (() => null) as ComponentType;

beforeEach(() => {
  useComponentRegistryStore.setState({
    registry: createComponentSlotRegistry<ComponentType<any>>(),
    version: 0,
  });
});

function makeStrategy(overrides: Partial<AuthStrategy> = {}): AuthStrategy {
  return {
    schemeType: "plugin-registry-test-scheme",
    describe: () => "Custom Scheme",
    resolveCredentialField: () => ({ kind: "bearer" }),
    injectCredential: (_field, value) => ({ headers: { Authorization: `Bearer ${value}` }, query: {} }),
    ...overrides,
  };
}

describe("installPlugin / registerComponent", () => {
  it("registers a component override that a mounted useSlotComponent consumer picks up reactively", () => {
    const plugin: Plugin<ComponentType<any>> = {
      name: "component-plugin",
      install(context) {
        context.registerComponent("PluginRegistryTestSlot", OverrideComponent);
      },
    };

    const { result, rerender } = renderHook(() =>
      useSlotComponent("PluginRegistryTestSlot", DefaultComponent),
    );
    expect(result.current).toBe(DefaultComponent);

    act(() => {
      installPlugin(plugin);
    });
    rerender();

    expect(result.current).toBe(OverrideComponent);
  });

  it("goes through the existing registerSlotComponent mechanism — installing bumps componentRegistryStore's version", () => {
    const before = useComponentRegistryStore.getState().version;
    installPlugin({
      name: "component-plugin-2",
      install: (context) => context.registerComponent("AnotherPluginSlot", OverrideComponent),
    });
    expect(useComponentRegistryStore.getState().version).toBe(before + 1);
    expect(useComponentRegistryStore.getState().registry.get("AnotherPluginSlot")).toBe(OverrideComponent);
  });
});

describe("installPlugin / registerAuthStrategy", () => {
  it("makes a registered strategy retrievable by its schemeType", () => {
    const strategy = makeStrategy({ schemeType: "plugin-registry-auth-test" });
    installPlugin({
      name: "auth-plugin",
      install: (context) => context.registerAuthStrategy(strategy),
    });

    expect(getRegisteredAuthStrategy("plugin-registry-auth-test")).toBe(strategy);
  });

  it("returns undefined for a schemeType nothing has registered", () => {
    expect(getRegisteredAuthStrategy("nothing-registered-for-this-one")).toBeUndefined();
  });
});

describe("installPlugin / registerRequestInterceptor", () => {
  it("appends a registered interceptor to the list returned by getRegisteredRequestInterceptors", () => {
    const before = getRegisteredRequestInterceptors().length;
    const interceptor = (req: unknown) => req;

    installPlugin({
      name: "interceptor-plugin",
      install: (context) => context.registerRequestInterceptor(interceptor as never),
    });

    const after = getRegisteredRequestInterceptors();
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]).toBe(interceptor);
  });

  it("preserves registration order across multiple plugins", () => {
    const before = getRegisteredRequestInterceptors().length;
    const first = (req: unknown) => req;
    const second = (req: unknown) => req;

    installPlugin({ name: "p1", install: (c) => c.registerRequestInterceptor(first as never) });
    installPlugin({ name: "p2", install: (c) => c.registerRequestInterceptor(second as never) });

    const after = getRegisteredRequestInterceptors();
    expect(after.slice(before)).toEqual([first, second]);
  });
});
