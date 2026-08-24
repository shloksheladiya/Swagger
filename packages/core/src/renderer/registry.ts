// ComponentSlotRegistry: a generic, framework-agnostic map from a named
// "slot" to a value that should render there instead of the built-in
// default. Introduced for Milestone 17 (Config-Driven Customization) per the
// architecture doc §6.3 — config/schema.ts already anticipated this exact
// piece ("componentOverrides and plugins... depend on registries that don't
// exist yet"). Milestone 20's plugin `registerComponent()` API is expected
// to sit on top of this same registry, not reimplement it.
//
// Deliberately generic over TComponent rather than typed to React —
// dependency-cruiser's core-must-not-depend-on-react rule (ADR §6) means
// this package can never import "react". react-renderer is what
// instantiates this with an actual React component type (see
// component-registry-store.ts) and wires it into a Zustand store so
// registering an override triggers a re-render; this file only knows
// "slot name -> some value," nothing about how that value gets rendered.
//
// A plain Map wrapped in an object, not a class — matches this codebase's
// existing style (e.g. defaultSearchProvider) of small factory functions
// over class hierarchies.

export interface ComponentSlotRegistry<TComponent> {
  /** Registers `component` for `slot`, replacing any previous registration
   * for the same slot (last write wins — a plugin re-registering the same
   * slot is a deliberate override, not an error). */
  register(slot: string, component: TComponent): void;
  /** The currently registered value for `slot`, or `undefined` if nothing
   * has been registered there. */
  get(slot: string): TComponent | undefined;
  has(slot: string): boolean;
}

export function createComponentSlotRegistry<TComponent>(): ComponentSlotRegistry<TComponent> {
  const slots = new Map<string, TComponent>();

  return {
    register(slot, component) {
      slots.set(slot, component);
    },
    get(slot) {
      return slots.get(slot);
    },
    has(slot) {
      return slots.has(slot);
    },
  };
}
