import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { normalizeStaticParts } from "./normalize-static.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("normalizeStaticParts", () => {
  it("extracts title/version and an empty tags/securitySchemes when absent (petstore-3.0)", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("petstore-3.0.yaml"),
    )) as any;
    const result = normalizeStaticParts(doc, "petstore");

    expect(result.id).toBe("petstore");
    expect(result.title).toBe("Swagger Petstore");
    expect(result.version).toBe("1.0.0");
    expect(result.tags).toEqual([]);
    expect(result.securitySchemes).toEqual({});
    // Pet, NewPet, Error
    expect(Object.keys(result.schemas)).toHaveLength(3);
    expect(result.servers).toEqual(["https://petstore.swagger.io/v2"]);
  });

  it("returns an empty servers array when the document declares none", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("tags-and-security.yaml"),
    )) as any;
    const result = normalizeStaticParts(doc, "tagged-api");

    expect(result.servers).toEqual([]);
  });

  it("extracts real tags and security schemes, skipping unsupported kinds", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("tags-and-security.yaml"),
    )) as any;
    const result = normalizeStaticParts(doc, "tagged-api");

    expect(result.tags).toEqual([
      { name: "Users", description: "User management" },
      { name: "Admin" },
    ]);

    expect(result.securitySchemes.bearerAuth).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    expect(result.securitySchemes.apiKeyAuth).toEqual({
      type: "apiKey",
      in: "header",
      name: "X-API-Key",
    });

    // legacyBasicAuth (http+basic) and oidcAuth (openIdConnect) are
    // unsupported in v1 and should be skipped, not present as garbage entries
    expect(result.securitySchemes.legacyBasicAuth).toBeUndefined();
    expect(result.securitySchemes.oidcAuth).toBeUndefined();
    expect(Object.keys(result.securitySchemes)).toHaveLength(2);
  });

  it("captures a variable-templated server's url verbatim, without resolving or dropping it", () => {
    // A hand-built doc (not a fixture file) — this targets one specific,
    // documented limitation (servers[].variables isn't resolved, see this
    // function's own comment) rather than exercising the full parse
    // pipeline, so a real spec fixture isn't needed for it.
    const doc = {
      info: { title: "Templated API", version: "1.0.0" },
      servers: [
        {
          url: "https://{region}.api.example.com/{version}",
          variables: {
            region: { default: "us", enum: ["us", "eu"] },
            version: { default: "v1" },
          },
        },
      ],
      paths: {},
    };

    const result = normalizeStaticParts(doc, "templated-api");

    // The literal placeholder text is kept as-is — no substitution using
    // the variables' defaults, and the `variables` map itself isn't carried
    // into the result at all (NormalizedSpec.servers is just string[]).
    expect(result.servers).toEqual(["https://{region}.api.example.com/{version}"]);
  });
});
