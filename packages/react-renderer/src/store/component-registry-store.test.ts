import { beforeEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import { createComponentSlotRegistry } from "@docs-platform/core";
import { useComponentRegistryStore } from "./component-registry-store.js";

const FakeComponent = (() => null) as ComponentType;
const AnotherFakeComponent = (() => null) as ComponentType;

beforeEach(() => {
  useComponentRegistryStore.setState({
    registry: createComponentSlotRegistry<ComponentType<any>>(),
    version: 0,
  });
});

describe("useComponentRegistryStore", () => {
  it("starts with no registered overrides", () => {
    expect(useComponentRegistryStore.getState().registry.get("SchemaViewer")).toBeUndefined();
  });

  it("registerComponent makes the override retrievable via the underlying registry", () => {
    useComponentRegistryStore.getState().registerComponent("SchemaViewer", FakeComponent);
    expect(useComponentRegistryStore.getState().registry.get("SchemaViewer")).toBe(FakeComponent);
  });

  it("registerComponent bumps version, so subscribers relying on it re-render", () => {
    const before = useComponentRegistryStore.getState().version;
    useComponentRegistryStore.getState().registerComponent("SchemaViewer", FakeComponent);
    expect(useComponentRegistryStore.getState().version).toBe(before + 1);
  });

  it("registering a different slot doesn't disturb an existing registration", () => {
    useComponentRegistryStore.getState().registerComponent("SchemaViewer", FakeComponent);
    useComponentRegistryStore.getState().registerComponent("AuthRequirementBadge", AnotherFakeComponent);

    expect(useComponentRegistryStore.getState().registry.get("SchemaViewer")).toBe(FakeComponent);
    expect(useComponentRegistryStore.getState().registry.get("AuthRequirementBadge")).toBe(
      AnotherFakeComponent,
    );
  });

  it("last write wins when the same slot is registered twice", () => {
    useComponentRegistryStore.getState().registerComponent("SchemaViewer", FakeComponent);
    useComponentRegistryStore.getState().registerComponent("SchemaViewer", AnotherFakeComponent);
    expect(useComponentRegistryStore.getState().registry.get("SchemaViewer")).toBe(
      AnotherFakeComponent,
    );
  });
});
