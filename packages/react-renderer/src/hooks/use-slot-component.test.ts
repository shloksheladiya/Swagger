// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import { act, renderHook } from "@testing-library/react";
import { createComponentSlotRegistry } from "@docs-platform/core";
import { useComponentRegistryStore } from "../store/component-registry-store.js";
import { useSlotComponent } from "./use-slot-component.js";

const DefaultComponent = (() => null) as ComponentType;
const OverrideComponent = (() => null) as ComponentType;

beforeEach(() => {
  useComponentRegistryStore.setState({
    registry: createComponentSlotRegistry<ComponentType<any>>(),
    version: 0,
  });
});

describe("useSlotComponent", () => {
  it("returns the default component when nothing is registered for the slot", () => {
    const { result } = renderHook(() => useSlotComponent("SchemaViewer", DefaultComponent));
    expect(result.current).toBe(DefaultComponent);
  });

  it("returns the registered override once one exists for the slot", () => {
    useComponentRegistryStore.getState().registerComponent("SchemaViewer", OverrideComponent);
    const { result } = renderHook(() => useSlotComponent("SchemaViewer", DefaultComponent));
    expect(result.current).toBe(OverrideComponent);
  });

  it("re-renders with the override after a registration made after initial mount", () => {
    const { result, rerender } = renderHook(() => useSlotComponent("SchemaViewer", DefaultComponent));
    expect(result.current).toBe(DefaultComponent);

    act(() => {
      useComponentRegistryStore.getState().registerComponent("SchemaViewer", OverrideComponent);
    });
    rerender();

    expect(result.current).toBe(OverrideComponent);
  });

  it("ignores overrides registered for a different slot", () => {
    useComponentRegistryStore.getState().registerComponent("AuthRequirementBadge", OverrideComponent);
    const { result } = renderHook(() => useSlotComponent("SchemaViewer", DefaultComponent));
    expect(result.current).toBe(DefaultComponent);
  });
});
