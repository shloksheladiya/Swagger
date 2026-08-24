import { describe, expect, it } from "vitest";
import { createComponentSlotRegistry } from "./registry.js";

describe("createComponentSlotRegistry", () => {
  it("returns undefined and false for a slot nothing has been registered to", () => {
    const registry = createComponentSlotRegistry<string>();
    expect(registry.get("SchemaViewer")).toBeUndefined();
    expect(registry.has("SchemaViewer")).toBe(false);
  });

  it("returns exactly what was registered for a slot", () => {
    const registry = createComponentSlotRegistry<string>();
    registry.register("SchemaViewer", "CustomSchemaViewer");
    expect(registry.get("SchemaViewer")).toBe("CustomSchemaViewer");
    expect(registry.has("SchemaViewer")).toBe(true);
  });

  it("last write wins when the same slot is registered twice", () => {
    const registry = createComponentSlotRegistry<string>();
    registry.register("SchemaViewer", "First");
    registry.register("SchemaViewer", "Second");
    expect(registry.get("SchemaViewer")).toBe("Second");
  });

  it("keeps slots independent of one another", () => {
    const registry = createComponentSlotRegistry<string>();
    registry.register("SchemaViewer", "CustomSchemaViewer");
    expect(registry.get("AuthRequirementBadge")).toBeUndefined();
    expect(registry.has("AuthRequirementBadge")).toBe(false);
  });

  it("gives each registry its own independent state", () => {
    const a = createComponentSlotRegistry<string>();
    const b = createComponentSlotRegistry<string>();
    a.register("SchemaViewer", "CustomSchemaViewer");
    expect(b.has("SchemaViewer")).toBe(false);
  });
});
