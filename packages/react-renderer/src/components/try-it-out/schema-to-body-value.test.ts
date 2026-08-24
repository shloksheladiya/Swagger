import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { SchemaNode } from "@docs-platform/core";
import { parseOpenApiDocument } from "@docs-platform/core";
import { createInitialBodyValue } from "./schema-to-body-value.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../../core/test-fixtures/${name}`, import.meta.url));

describe("createInitialBodyValue", () => {
  describe("primitives", () => {
    it("initializes a string field to an empty string", () => {
      const value = createInitialBodyValue({ type: "string" });
      expect(value).toEqual({ kind: "primitive", schema: { type: "string" }, value: "" });
    });

    it("initializes number/integer/boolean fields to null, not 0/false", () => {
      const numberValue = createInitialBodyValue({ type: "number" });
      const integerValue = createInitialBodyValue({ type: "integer" });
      const booleanValue = createInitialBodyValue({ type: "boolean" });

      expect(numberValue.kind).toBe("primitive");
      expect(integerValue.kind).toBe("primitive");
      expect(booleanValue.kind).toBe("primitive");
      if (numberValue.kind !== "primitive" || integerValue.kind !== "primitive" || booleanValue.kind !== "primitive") {
        throw new Error("expected primitives");
      }
      expect(numberValue.value).toBeNull();
      expect(integerValue.value).toBeNull();
      expect(booleanValue.value).toBeNull();
    });

    it("initializes an enum field to null rather than pre-selecting the first option", () => {
      const schema: SchemaNode = { type: "string", enum: ["draft", "published"] };
      const value = createInitialBodyValue(schema);
      expect(value).toEqual({ kind: "primitive", schema, value: null });
    });
  });

  describe("objects", () => {
    it("initializes a flat object schema's fields, tracking required field names", () => {
      const schema: SchemaNode = {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
      };

      const value = createInitialBodyValue(schema);

      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      expect(value.requiredFields).toEqual(["name"]);
      expect(value.fields.name).toEqual({ kind: "primitive", schema: schema.properties!.name, value: "" });
      expect(value.fields.age).toEqual({ kind: "primitive", schema: schema.properties!.age, value: null });
    });

    it("supports one level of nested objects", () => {
      const addressSchema: SchemaNode = {
        type: "object",
        properties: { city: { type: "string" } },
      };
      const schema: SchemaNode = {
        type: "object",
        properties: { address: addressSchema },
      };

      const value = createInitialBodyValue(schema);

      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      const address = value.fields.address;
      expect(address.kind).toBe("object");
      if (address.kind !== "object") throw new Error("expected nested object");
      expect(address.fields.city).toEqual({ kind: "primitive", schema: addressSchema.properties!.city, value: "" });
    });

    it("marks a second level of object nesting as unsupported rather than pretending it's editable", () => {
      const level2: SchemaNode = { type: "object", properties: { deep: { type: "string" } } };
      const level1: SchemaNode = { type: "object", properties: { level2 } };
      const root: SchemaNode = { type: "object", properties: { level1 } };

      const value = createInitialBodyValue(root);

      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      const innerLevel1 = value.fields.level1;
      expect(innerLevel1.kind).toBe("object");
      if (innerLevel1.kind !== "object") throw new Error("expected level1 object");
      // level1's own "level2" property is where the third object frame
      // (root -> level1 -> level2) would begin — that's beyond the one
      // supported level of nesting.
      expect(innerLevel1.fields.level2).toEqual({
        kind: "unsupported",
        schema: level2,
        reason: "nested object exceeds the one supported level of nesting",
      });
    });
  });

  describe("arrays", () => {
    it("initializes an array of primitives to an empty items list, keeping the item schema", () => {
      const schema: SchemaNode = { type: "array", items: { type: "string" } };
      const value = createInitialBodyValue(schema);
      expect(value).toEqual({ kind: "array", schema, itemSchema: schema.items, items: [] });
    });

    it("marks array-of-objects as unsupported", () => {
      const itemSchema: SchemaNode = { type: "object", properties: { id: { type: "string" } } };
      const schema: SchemaNode = { type: "array", items: itemSchema };
      const value = createInitialBodyValue(schema);
      expect(value).toEqual({ kind: "unsupported", schema, reason: "array of objects" });
    });

    it("marks nested arrays (array of arrays) as unsupported", () => {
      const itemSchema: SchemaNode = { type: "array", items: { type: "string" } };
      const schema: SchemaNode = { type: "array", items: itemSchema };
      const value = createInitialBodyValue(schema);
      expect(value).toEqual({ kind: "unsupported", schema, reason: "nested arrays" });
    });
  });

  describe("polymorphism", () => {
    it("marks oneOf as explicitly unsupported rather than silently choosing a branch", () => {
      const schema: SchemaNode = {
        oneOf: [{ type: "object", properties: { cat: { type: "string" } } }, { type: "object", properties: { dog: { type: "string" } } }],
      };
      const value = createInitialBodyValue(schema);
      expect(value).toEqual({ kind: "unsupported", schema, reason: "oneOf" });
    });

    it("marks anyOf as explicitly unsupported", () => {
      const schema: SchemaNode = { anyOf: [{ type: "string" }, { type: "number" }] };
      const value = createInitialBodyValue(schema);
      expect(value).toEqual({ kind: "unsupported", schema, reason: "anyOf" });
    });

    it("merges allOf branches into a single editable object, last branch winning on overlaps", () => {
      const branchA: SchemaNode = {
        type: "object",
        required: ["name"],
        properties: { name: { type: "string" } },
      };
      const branchB: SchemaNode = {
        type: "object",
        required: ["id"],
        properties: { id: { type: "integer" } },
      };
      const schema: SchemaNode = { allOf: [branchA, branchB] };

      const value = createInitialBodyValue(schema);

      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      expect(value.requiredFields.sort()).toEqual(["id", "name"]);
      expect(value.fields.name).toEqual({ kind: "primitive", schema: branchA.properties!.name, value: "" });
      expect(value.fields.id).toEqual({ kind: "primitive", schema: branchB.properties!.id, value: null });
    });
  });

  describe("cycle protection", () => {
    it("detects a genuine self-referencing object cycle by object identity and stops without recursing forever", () => {
      // Built the same way core's own normalizeSchema produces cycles: a
      // real circular JS object graph, not a JSON-serializable stand-in.
      const selfReferencing: SchemaNode = { type: "object", properties: {} };
      selfReferencing.properties = { self: selfReferencing };

      const value = createInitialBodyValue(selfReferencing);

      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      // Caught specifically as a cycle (not as "nested object exceeds
      // depth") — proving the ancestors check, not the depth cap, is what
      // stopped it here.
      expect(value.fields.self).toEqual({
        kind: "unsupported",
        schema: selfReferencing,
        reason: "circular reference",
      });
    });

    it("does not falsely flag the same schema object reused in two unrelated properties as circular", () => {
      const shared: SchemaNode = { type: "string" };
      const schema: SchemaNode = { type: "object", properties: { a: shared, b: shared } };

      const value = createInitialBodyValue(schema);

      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      expect(value.fields.a).toEqual({ kind: "primitive", schema: shared, value: "" });
      expect(value.fields.b).toEqual({ kind: "primitive", schema: shared, value: "" });
    });

    it("regression: the repository's real circular-schema fixture (self-referencing array of objects) terminates safely", async () => {
      const parsed = await parseOpenApiDocument(fixture("circular-schema.yaml"), "circular-fixture");
      if (!parsed.ok) throw new Error(`fixture failed to parse: ${parsed.error.message}`);

      const getNode = parsed.data.operations.find((op) => op.operationId === "getNode");
      const responseSchema = getNode?.responses.find((r) => r.statusCode === "200")?.content?.["application/json"]
        ?.schema;
      if (!responseSchema) throw new Error("fixture did not produce the expected response schema");

      const start = Date.now();
      const value = createInitialBodyValue(responseSchema);
      const elapsedMs = Date.now() - start;

      expect(elapsedMs).toBeLessThan(1000); // proves it terminated, not just "didn't crash"
      expect(value.kind).toBe("object");
      if (value.kind !== "object") throw new Error("expected object");
      expect(value.fields.label).toEqual({ kind: "primitive", schema: responseSchema.properties!.label, value: "" });
      // "children" is an array of TreeNode objects — array-of-objects is
      // unsupported on its own terms, which is also exactly why this
      // particular cycle never reaches the ancestors check at all (see the
      // comment in buildArrayValue).
      expect(value.fields.children.kind).toBe("unsupported");
    });
  });
});
