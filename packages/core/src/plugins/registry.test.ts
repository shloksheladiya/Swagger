import { describe, expect, it } from "vitest";
import type { AuthStrategy } from "./types.js";
import { createAuthStrategyRegistry, createRequestInterceptorRegistry } from "./registry.js";

function makeStrategy(overrides: Partial<AuthStrategy> = {}): AuthStrategy {
  return {
    schemeType: "oauth2",
    describe: () => "Custom OAuth 2.0",
    resolveCredentialField: () => ({ kind: "bearer" }),
    injectCredential: (_field, value) => ({ headers: { Authorization: `Bearer ${value}` }, query: {} }),
    ...overrides,
  };
}

describe("createAuthStrategyRegistry", () => {
  it("returns undefined for a scheme type nothing has been registered for", () => {
    const registry = createAuthStrategyRegistry();
    expect(registry.get("oauth2")).toBeUndefined();
  });

  it("returns exactly what was registered for a scheme type", () => {
    const registry = createAuthStrategyRegistry();
    const strategy = makeStrategy();
    registry.register(strategy);
    expect(registry.get("oauth2")).toBe(strategy);
  });

  it("last write wins when the same scheme type is registered twice", () => {
    const registry = createAuthStrategyRegistry();
    registry.register(makeStrategy({ describe: () => "First" }));
    const second = makeStrategy({ describe: () => "Second" });
    registry.register(second);
    expect(registry.get("oauth2")).toBe(second);
  });

  it("keeps scheme types independent of one another", () => {
    const registry = createAuthStrategyRegistry();
    registry.register(makeStrategy({ schemeType: "oauth2" }));
    expect(registry.get("customScheme")).toBeUndefined();
  });

  it("gives each registry its own independent state", () => {
    const a = createAuthStrategyRegistry();
    const b = createAuthStrategyRegistry();
    a.register(makeStrategy());
    expect(b.get("oauth2")).toBeUndefined();
  });
});

describe("createRequestInterceptorRegistry", () => {
  it("starts with no registered interceptors", () => {
    const registry = createRequestInterceptorRegistry();
    expect(registry.getAll()).toEqual([]);
  });

  it("returns registered interceptors in registration order", () => {
    const registry = createRequestInterceptorRegistry();
    const first = (req: unknown) => req;
    const second = (req: unknown) => req;
    registry.register(first as never);
    registry.register(second as never);
    expect(registry.getAll()).toEqual([first, second]);
  });

  it("gives each registry its own independent state", () => {
    const a = createRequestInterceptorRegistry();
    const b = createRequestInterceptorRegistry();
    a.register(((req: unknown) => req) as never);
    expect(b.getAll()).toEqual([]);
  });
});
