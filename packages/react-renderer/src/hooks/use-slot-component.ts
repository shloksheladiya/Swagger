"use client";
// useSlotComponent: the hook that makes an existing component
// "override-aware" (Milestone 17) — resolves to whatever is registered for
// `slot` in componentRegistryStore, falling back to the caller's own
// default when nothing is registered there. Needs "use client": it
// subscribes to a Zustand store, same reasoning as every other
// store-consuming hook in this package (see use-try-it-out.ts).

import type { ComponentType } from "react";
import { useComponentRegistryStore } from "../store/component-registry-store.js";

export function useSlotComponent<P extends object>(
  slot: string,
  defaultComponent: ComponentType<P>,
): ComponentType<P> {
  // Subscribing to `version` — not calling registry.get() inside the
  // selector — is what makes this reactive: registry.get()'s return value
  // doesn't change reference between renders on its own, so a selector
  // built around it alone would never trigger a re-render when a new
  // override is registered later. version changing is the actual signal;
  // the fresh lookup below runs on every render this hook is subscribed to.
  useComponentRegistryStore((state) => state.version);
  const registry = useComponentRegistryStore.getState().registry;
  const override = registry.get(slot);
  return (override ?? defaultComponent) as ComponentType<P>;
}
