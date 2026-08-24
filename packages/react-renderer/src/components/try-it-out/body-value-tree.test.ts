import { describe, expect, it } from "vitest";
import type { SchemaNode } from "@docs-platform/core";
import { createInitialBodyValue } from "./schema-to-body-value.js";
import { addBodyArrayItem, collectBodyErrors, removeBodyArrayItem, setPrimitiveBodyValue } from "./body-value-tree.js";

describe("setPrimitiveBodyValue", () => {
  it("updates a top-level primitive field, leaving sibling fields untouched", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "integer" } },
    };
    const body = createInitialBodyValue(schema);

    const updated = setPrimitiveBodyValue(body, ["name"], "Ada");

    expect(updated.kind).toBe("object");
    if (updated.kind !== "object") throw new Error("expected object");
    expect(updated.fields.name).toEqual({ kind: "primitive", schema: schema.properties!.name, value: "Ada" });
    // sibling untouched — same object reference, not just an equal value
    expect(updated.fields.age).toBe((body as any).fields.age);
  });

  it("updates a nested object field via a multi-segment path, preserving the rest of the tree", () => {
    const addressSchema: SchemaNode = { type: "object", properties: { city: { type: "string" } } };
    const schema: SchemaNode = {
      type: "object",
      properties: { name: { type: "string" }, address: addressSchema },
    };
    const body = createInitialBodyValue(schema);

    const updated = setPrimitiveBodyValue(body, ["address", "city"], "Berlin");

    if (updated.kind !== "object") throw new Error("expected object");
    const address = updated.fields.address;
    if (address.kind !== "object") throw new Error("expected nested object");
    expect(address.fields.city).toEqual({ kind: "primitive", schema: addressSchema.properties!.city, value: "Berlin" });
    // the untouched top-level "name" field is preserved
    if (body.kind !== "object") throw new Error("expected object");
    expect(updated.fields.name).toBe(body.fields.name);
  });

  it("is a no-op when the path doesn't resolve to a primitive node", () => {
    const schema: SchemaNode = { type: "object", properties: { name: { type: "string" } } };
    const body = createInitialBodyValue(schema);

    const updated = setPrimitiveBodyValue(body, ["missingField"], "x");

    expect(updated).toBe(body);
  });
});

describe("addBodyArrayItem / removeBodyArrayItem", () => {
  const schema: SchemaNode = { type: "array", items: { type: "string" } };

  it("appends a new item built from the array's item schema", () => {
    const body = createInitialBodyValue(schema);

    const withOneItem = addBodyArrayItem(body, []);

    expect(withOneItem.kind).toBe("array");
    if (withOneItem.kind !== "array") throw new Error("expected array");
    expect(withOneItem.items).toEqual([{ kind: "primitive", schema: schema.items, value: "" }]);
  });

  it("removes an item at the given index, preserving order of the rest", () => {
    let body = createInitialBodyValue(schema);
    body = addBodyArrayItem(body, []);
    body = addBodyArrayItem(body, []);
    body = setPrimitiveBodyValue(body, [0], "first");
    body = setPrimitiveBodyValue(body, [1], "second");

    const updated = removeBodyArrayItem(body, [], 0);

    if (updated.kind !== "array") throw new Error("expected array");
    expect(updated.items).toHaveLength(1);
    expect((updated.items[0] as any).value).toBe("second");
  });

  it("adds items to a nested array field via a path", () => {
    const outer: SchemaNode = {
      type: "object",
      properties: { tags: { type: "array", items: { type: "string" } } },
    };
    const body = createInitialBodyValue(outer);

    const updated = addBodyArrayItem(body, ["tags"]);

    if (updated.kind !== "object") throw new Error("expected object");
    const tags = updated.fields.tags;
    if (tags.kind !== "array") throw new Error("expected array");
    expect(tags.items).toHaveLength(1);
  });

  it("is a no-op when the path doesn't resolve to an array node", () => {
    const body = createInitialBodyValue({ type: "string" });

    expect(addBodyArrayItem(body, [])).toBe(body);
    expect(removeBodyArrayItem(body, [], 0)).toBe(body);
  });
});

describe("collectBodyErrors", () => {
  it("returns no errors for a null body", () => {
    expect(collectBodyErrors(null)).toEqual({});
  });

  it("reports a top-level required field left empty, namespaced under body:", () => {
    const schema: SchemaNode = {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    };
    const body = createInitialBodyValue(schema);

    expect(collectBodyErrors(body)).toEqual({ "body:name": "name is required" });
  });

  it("clears the error once the required field is filled in", () => {
    const schema: SchemaNode = {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    };
    const body = setPrimitiveBodyValue(createInitialBodyValue(schema), ["name"], "Ada");

    expect(collectBodyErrors(body)).toEqual({});
  });

  it("reports a required nested-object field using a dot-separated path", () => {
    const addressSchema: SchemaNode = {
      type: "object",
      required: ["city"],
      properties: { city: { type: "string" } },
    };
    const schema: SchemaNode = {
      type: "object",
      properties: { address: addressSchema },
    };
    const body = createInitialBodyValue(schema);

    expect(collectBodyErrors(body)).toEqual({ "body:address.city": "city is required" });
  });

  it("does not report a required field that resolved to an unsupported node", () => {
    const schema: SchemaNode = {
      type: "object",
      required: ["variant"],
      properties: { variant: { oneOf: [{ type: "string" }, { type: "number" }] } },
    };
    const body = createInitialBodyValue(schema);

    expect(collectBodyErrors(body)).toEqual({});
  });

  it("does not report a non-required field left empty", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: { nickname: { type: "string" } },
    };
    const body = createInitialBodyValue(schema);

    expect(collectBodyErrors(body)).toEqual({});
  });
});
