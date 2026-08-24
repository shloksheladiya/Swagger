import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { mergeParameters, normalizeParameter } from "./normalize-operation-parts.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("normalizeParameter", () => {
  it("normalizes a query parameter, defaulting required to false", () => {
    const result = normalizeParameter({
      name: "limit",
      in: "query",
      schema: { type: "integer" },
    });

    expect(result?.required).toBe(false);
    expect(result?.in).toBe("query");
  });

  it("forces path parameters to required, even if the source spec forgets to say so", () => {
    const result = normalizeParameter({
      name: "id",
      in: "path",
      // deliberately no `required` field, and even a wrong explicit false —
      // both should be overridden per the OpenAPI spec's own rule
      required: false,
      schema: { type: "string" },
    });

    expect(result?.required).toBe(true);
  });

  it("returns null for a malformed parameter (missing name or invalid location)", () => {
    expect(normalizeParameter({ in: "query", schema: {} })).toBeNull();
    expect(normalizeParameter({ name: "x", in: "body", schema: {} })).toBeNull();
    expect(normalizeParameter("not an object")).toBeNull();
  });
});

describe("mergeParameters", () => {
  it("includes path-level parameters an operation doesn't redeclare", () => {
    const pathLevel = [
      { name: "id", in: "path" as const, required: true, schema: { type: "string" as const } },
    ];
    const merged = mergeParameters(pathLevel, []);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.name).toBe("id");
  });

  it("lets an operation-level parameter override a path-level one with the same name+location", () => {
    const pathLevel = [
      { name: "id", in: "path" as const, required: true, schema: { type: "string" as const } },
    ];
    const operationLevel = [
      {
        name: "id",
        in: "path" as const,
        required: true,
        schema: { type: "string" as const },
        description: "overridden at the operation level",
      },
    ];
    const merged = mergeParameters(pathLevel, operationLevel);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.description).toBe("overridden at the operation level");
  });

  it("against the real fixture: GET/DELETE/PUT under /items/{id} all inherit the path-level id param", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;

    const pathItem = doc.paths["/items/{id}"];
    const pathLevelParams = pathItem.parameters
      .map(normalizeParameter)
      .filter((p: unknown): p is NonNullable<typeof p> => p !== null);

    for (const method of ["get", "delete", "put"]) {
      const rawOp = pathItem[method];
      const opLevelParams = Array.isArray(rawOp.parameters)
        ? rawOp.parameters.map(normalizeParameter).filter((p: unknown) => p !== null)
        : [];
      const merged = mergeParameters(pathLevelParams, opLevelParams);

      expect(merged).toHaveLength(1);
      expect(merged[0]?.name).toBe("id");
      expect(merged[0]?.in).toBe("path");
      expect(merged[0]?.required).toBe(true);
    }
  });
});
