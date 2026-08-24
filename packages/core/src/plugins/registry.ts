// The two NEW plugin registries Milestone 20 needs. Deliberately does NOT
// include a third "component" registry here — that already exists
// (createComponentSlotRegistry, Milestone 17, ../renderer/registry.ts) and
// is reused as-is: react-renderer wires PluginContext's registerComponent
// straight to its existing, reactive registerSlotComponent rather than
// standing up a second component-registry mechanism (see
// react-renderer/src/plugins/plugin-registry.ts).
//
// Both registries below are plain, non-reactive data structures — a Map for
// auth strategies (keyed by scheme type, last-write-wins, mirroring
// ComponentSlotRegistry's own semantics) and a plain array for request
// interceptors (order-preserving, mirroring the `interceptors` list
// sendHttpRequest already accepts). Neither needs a Zustand wrapper the way
// the component registry does: an auth strategy is looked up inside a plain
// function call (resolveAuthCredentialAlternatives), and interceptors are
// read once at request-send time — neither happens during a React render,
// so there is nothing that needs to trigger a re-render on registration.

import type { AuthStrategy } from "./types.js";
import type { HttpRequestInterceptor } from "../http/types.js";

export interface AuthStrategyRegistry {
  register(strategy: AuthStrategy): void;
  get(schemeType: string): AuthStrategy | undefined;
}

export function createAuthStrategyRegistry(): AuthStrategyRegistry {
  const strategies = new Map<string, AuthStrategy>();

  return {
    register(strategy) {
      strategies.set(strategy.schemeType, strategy);
    },
    get(schemeType) {
      return strategies.get(schemeType);
    },
  };
}

export interface RequestInterceptorRegistry {
  register(interceptor: HttpRequestInterceptor): void;
  getAll(): readonly HttpRequestInterceptor[];
}

export function createRequestInterceptorRegistry(): RequestInterceptorRegistry {
  const interceptors: HttpRequestInterceptor[] = [];

  return {
    register(interceptor) {
      interceptors.push(interceptor);
    },
    getAll() {
      return interceptors;
    },
  };
}
