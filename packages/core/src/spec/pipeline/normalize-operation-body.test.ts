import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { normalizeRequestBody, normalizeResponses } from "./normalize-operation-parts.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("normalizeRequestBody", () => {
  it("returns undefined when there's no request body at all", () => {
    expect(normalizeRequestBody(undefined)).toBeUndefined();
  });

  it("normalizes a real JSON request body (PUT /items/{id})", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;

    const result = normalizeRequestBody(doc.paths["/items/{id}"].put.requestBody);

    expect(result?.required).toBe(true);
    expect(result?.content["application/json"]?.schema.properties?.name?.type).toBe(
      "string",
    );
  });
});

describe("normalizeResponses", () => {
  it("normalizes a real response set with mixed content presence (petstore /pets/{id})", async () => {
    const doc = (await SwaggerParser.validate(fixture("petstore-3.0.yaml"))) as any;
    const responses = normalizeResponses(doc.paths["/pets/{id}"].delete.responses);

    const deleted = responses.find((r) => r.statusCode === "204");
    const unexpected = responses.find((r) => r.statusCode === "default");

    // The trap this test exists to catch: a response with NO body in the
    // source spec must end up with content === undefined, not {} — that
    // distinction is what Response.content's optionality means.
    expect(deleted?.content).toBeUndefined();
    expect(unexpected?.content).toBeDefined();
    expect(unexpected?.content?.["application/json"]?.schema).toBeDefined();
  });

  it("returns an empty array when there are no responses at all", () => {
    expect(normalizeResponses(undefined)).toEqual([]);
  });

  it("falls back to an empty description rather than throwing when one is missing", () => {
    const result = normalizeResponses({ "200": {} });
    expect(result[0]?.description).toBe("");
  });
});
