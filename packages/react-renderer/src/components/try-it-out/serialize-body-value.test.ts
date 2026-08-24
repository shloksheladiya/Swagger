import { describe, expect, it } from "vitest";
import type { SchemaNode } from "@docs-platform/core";
import type { TryItOutBodyValue } from "./schema-to-body-value.js";
import { serializeBodyValue } from "./serialize-body-value.js";

describe("serializeBodyValue", () => {
  it("passes a correctly-typed string primitive through unchanged", () => {
    const node: TryItOutBodyValue = { kind: "primitive", schema: { type: "string" }, value: "hello" };
    expect(serializeBodyValue(node)).toBe("hello");
  });

  it("passes a correctly-typed number primitive through unchanged", () => {
    const node: TryItOutBodyValue = { kind: "primitive", schema: { type: "integer" }, value: 42 };
    expect(serializeBodyValue(node)).toBe(42);
  });

  it("passes a correctly-typed boolean primitive through unchanged", () => {
    const node: TryItOutBodyValue = { kind: "primitive", schema: { type: "boolean" }, value: true };
    expect(serializeBodyValue(node)).toBe(true);
  });

  it("omits an unset (null) primitive rather than sending an explicit null", () => {
    const node: TryItOutBodyValue = { kind: "primitive", schema: { type: "integer" }, value: null };
    expect(serializeBodyValue(node)).toBeUndefined();
  });

  it("sends a genuinely empty string as-is, not as omitted", () => {
    const node: TryItOutBodyValue = { kind: "primitive", schema: { type: "string" }, value: "" };
    expect(serializeBodyValue(node)).toBe("");
  });

  it("coerces an enum-backed integer field's string value to a number", () => {
    const node: TryItOutBodyValue = {
      kind: "primitive",
      schema: { type: "integer", enum: [1, 2, 3] },
      value: "2", // what a <select>'s onChange actually produces
    };
    expect(serializeBodyValue(node)).toBe(2);
  });

  it("coerces an enum-backed number field's string value to a number", () => {
    const node: TryItOutBodyValue = {
      kind: "primitive",
      schema: { type: "number", enum: [1.5, 2.5] },
      value: "2.5",
    };
    expect(serializeBodyValue(node)).toBe(2.5);
  });

  it("coerces an enum-backed boolean field's string value to a real boolean", () => {
    const trueNode: TryItOutBodyValue = {
      kind: "primitive",
      schema: { type: "boolean", enum: [true, false] },
      value: "true",
    };
    const falseNode: TryItOutBodyValue = {
      kind: "primitive",
      schema: { type: "boolean", enum: [true, false] },
      value: "false",
    };
    expect(serializeBodyValue(trueNode)).toBe(true);
    expect(serializeBodyValue(falseNode)).toBe(false);
  });

  it("leaves an enum-backed string field's value alone (already the right type)", () => {
    const node: TryItOutBodyValue = {
      kind: "primitive",
      schema: { type: "string", enum: ["a", "b"] },
      value: "b",
    };
    expect(serializeBodyValue(node)).toBe("b");
  });

  it("omits an unset enum field rather than coercing null", () => {
    const node: TryItOutBodyValue = {
      kind: "primitive",
      schema: { type: "integer", enum: [1, 2] },
      value: null,
    };
    expect(serializeBodyValue(node)).toBeUndefined();
  });

  it("serializes an object, omitting fields with nothing to send", () => {
    const schema: SchemaNode = { type: "object" };
    const node: TryItOutBodyValue = {
      kind: "object",
      schema,
      requiredFields: ["name"],
      fields: {
        name: { kind: "primitive", schema: { type: "string" }, value: "Ada" },
        age: { kind: "primitive", schema: { type: "integer" }, value: null },
      },
    };

    expect(serializeBodyValue(node)).toEqual({ name: "Ada" });
  });

  it("serializes a nested object (one level deep, per Part B's supported scope)", () => {
    const node: TryItOutBodyValue = {
      kind: "object",
      schema: { type: "object" },
      requiredFields: [],
      fields: {
        address: {
          kind: "object",
          schema: { type: "object" },
          requiredFields: [],
          fields: {
            city: { kind: "primitive", schema: { type: "string" }, value: "Berlin" },
          },
        },
      },
    };

    expect(serializeBodyValue(node)).toEqual({ address: { city: "Berlin" } });
  });

  it("serializes an array of primitives", () => {
    const node: TryItOutBodyValue = {
      kind: "array",
      schema: { type: "array" },
      itemSchema: { type: "string" },
      items: [
        { kind: "primitive", schema: { type: "string" }, value: "a" },
        { kind: "primitive", schema: { type: "string" }, value: "b" },
      ],
    };

    expect(serializeBodyValue(node)).toEqual(["a", "b"]);
  });

  it("serializes an unsupported node to undefined, so the parent omits it entirely", () => {
    const node: TryItOutBodyValue = {
      kind: "object",
      schema: { type: "object" },
      requiredFields: [],
      fields: {
        weird: { kind: "unsupported", schema: { oneOf: [] }, reason: "oneOf" },
      },
    };

    expect(serializeBodyValue(node)).toEqual({});
  });

  it("serializes a top-level unsupported schema to undefined", () => {
    const node: TryItOutBodyValue = { kind: "unsupported", schema: {}, reason: "unmodeled schema shape" };
    expect(serializeBodyValue(node)).toBeUndefined();
  });
});
