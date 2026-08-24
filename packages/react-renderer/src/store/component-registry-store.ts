// componentRegistryStore: Milestone 17's component slot registry, wired
// into React. Wraps core's framework-agnostic createComponentSlotRegistry
// with an actual React component type and a Zustand store so that
// registering an override (today: react-renderer's own tests; later:
// Milestone 20's plugin API) triggers a re-render in anything consuming it —
// the same "any component, anywhere, no Context provider" payoff AppShell
// documents for the other stores (ADR §9).
//
// The registry instance itself lives in state rather than being
// reconstructed on every read — same precedent as uiStore storing a mutable
// Set. Its own methods mutate in place, so `version` is what actually
// notifies Zustand subscribers; nothing reads `version`'s value directly,
// it just needs to change.

import { create } from "zustand";
import type { ComponentType } from "react";
import { createComponentSlotRegistry, type ComponentSlotRegistry } from "@docs-platform/core";

interface ComponentRegistryState {
  registry: ComponentSlotRegistry<ComponentType<any>>;
  version: number;
  registerComponent: (slot: string, component: ComponentType<any>) => void;
}

export const useComponentRegistryStore = create<ComponentRegistryState>((set, get) => ({
  registry: createComponentSlotRegistry<ComponentType<any>>(),
  version: 0,
  registerComponent: (slot, component) => {
    get().registry.register(slot, component);
    set((state) => ({ version: state.version + 1 }));
  },
}));

/** Imperative, non-hook entry point for registering a slot override — e.g.
 * from app bootstrap code before the tree first renders, or (later) from a
 * Milestone 20 plugin's install step. Equivalent to calling
 * `useComponentRegistryStore.getState().registerComponent(...)` directly;
 * exported separately so callers don't need to know this is backed by a
 * Zustand store at all. */
export function registerSlotComponent(slot: string, component: ComponentType<any>): void {
  useComponentRegistryStore.getState().registerComponent(slot, component);
}
