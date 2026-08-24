import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { normalizeSchema } from "./normalize-schema.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("normalizeSchema", () => {
  it("normalizes a plain object schema, dropping unmodeled keywords", () => {
    const result = normalizeSchema({
      type: "object",
      required: ["id"],
      properties: { id: { type: "string" } },
      // keywords we deliberately don't model:
      readOnly: true,
      "x-internal": true,
    });

    expect(result.type).toBe("object");
    expect(result.required).toEqual(["id"]);
    expect(result).not.toHaveProperty("readOnly");
    expect(result).not.toHaveProperty("x-internal");
  });

  it("normalizes the real, allOf-composed Pet schema from petstore-3.0", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("petstore-3.0.yaml"),
    )) as any;
    const pet = normalizeSchema(doc.components.schemas.Pet);

    expect(pet.allOf).toHaveLength(2);
    // NewPet's properties, via allOf[0]
    expect(pet.allOf?.[0]?.properties?.name?.type).toBe("string");
    // the inline object's own `id` property, via allOf[1]
    expect(pet.allOf?.[1]?.properties?.id?.type).toBe("integer");
  });

  it("normalizes a genuinely circular schema without stack-overflowing", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("circular-schema.yaml"),
    )) as any;

    const start = Date.now();
    const treeNode = normalizeSchema(doc.components.schemas.TreeNode);
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(1000); // proves it terminated, not just "didn't crash"
    expect(treeNode.properties?.label?.type).toBe("string");
    // the cycle resolves to the SAME normalized object, not an infinite copy
    expect(treeNode.properties?.children?.items).toBe(treeNode);
  });

  it("normalizes OpenAPI 3.1's type-array nullable convention to the same shape as 3.0's nullable:true", () => {
    // 3.1's raw shape: { type: ["string", "null"] }
    const result = normalizeSchema({ type: ["string", "null"] });

    expect(result.type).toBe("string");
    expect(result.nullable).toBe(true);
  });

  it("normalizes the real Widget schema from a real 3.1 document end to end", async () => {
    const doc = (await SwaggerParser.validate(fixture("nullable-3.1.yaml"))) as any;
    const widget = normalizeSchema(doc.components.schemas.Widget);

    expect(widget.properties?.name).toEqual({ type: "string" });
    expect(widget.properties?.description).toEqual({
      type: "string",
      nullable: true,
    });
    expect(widget.properties?.tags?.items?.type).toBe("string");
  });
});
