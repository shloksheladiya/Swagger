import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { normalizeOperations } from "./normalize-operations.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("normalizeOperations", () => {
  it("normalizes all 4 real operations from petstore-3.0, preserving messy real-world operationIds as-is", async () => {
    const doc = (await SwaggerParser.validate(fixture("petstore-3.0.yaml"))) as any;
    const operations = normalizeOperations(doc);

    expect(operations).toHaveLength(4);

    const ids = operations.map((op) => op.operationId).sort();
    expect(ids).toEqual(["addPet", "deletePet", "find pet by id", "findPets"]);

    const findPets = operations.find((op) => op.operationId === "findPets");
    expect(findPets?.method).toBe("get");
    expect(findPets?.path).toBe("/pets");
  });

  it("synthesizes an operationId only for the operation that omits one (real fixture)", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;
    const operations = normalizeOperations(doc);

    const get = operations.find((op) => op.method === "get");
    const put = operations.find((op) => op.method === "put");

    // GET had no operationId in the source -> synthesized, deterministic
    expect(get?.operationId).toBe("get_items_id");
    // PUT explicitly set "updateItem" -> preserved exactly, not overwritten
    expect(put?.operationId).toBe("updateItem");
  });

  it("gives every operation under /items/{id} the merged path-level id parameter", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;
    const operations = normalizeOperations(doc);

    expect(operations).toHaveLength(3);
    for (const op of operations) {
      expect(op.parameters).toHaveLength(1);
      expect(op.parameters[0]).toMatchObject({ name: "id", in: "path", required: true });
    }
  });

  it("resolves the correct effective security per operation (the absent-vs-empty case, end to end)", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;
    const operations = normalizeOperations(doc);

    const get = operations.find((op) => op.method === "get");
    const del = operations.find((op) => op.method === "delete");
    const put = operations.find((op) => op.method === "put");

    expect(get?.security).toEqual([{ globalAuth: [] }]); // inherited
    expect(del?.security).toEqual([]); // explicitly public
    expect(put?.security).toEqual([{ itemAuth: ["write"] }]); // overridden
  });

  it("attaches the request body only to the operation that has one", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;
    const operations = normalizeOperations(doc);

    const get = operations.find((op) => op.method === "get");
    const put = operations.find((op) => op.method === "put");

    expect(get?.requestBody).toBeUndefined();
    expect(put?.requestBody?.content["application/json"]?.schema.properties?.name).toBeDefined();
  });

  it("returns an empty array for a spec with no paths at all", () => {
    expect(normalizeOperations({})).toEqual([]);
  });
});
