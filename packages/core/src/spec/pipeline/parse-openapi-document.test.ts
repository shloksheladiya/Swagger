import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseOpenApiDocument } from "./parse-openapi-document.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("parseOpenApiDocument (full pipeline)", () => {
  it("produces a complete, correct NormalizedSpec from a real spec, end to end", async () => {
    const result = await parseOpenApiDocument(
      fixture("petstore-3.0.yaml"),
      "petstore",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const spec = result.data;
    expect(spec.id).toBe("petstore");
    expect(spec.title).toBe("Swagger Petstore");
    expect(spec.version).toBe("1.0.0");
    expect(spec.operations).toHaveLength(4);
    expect(Object.keys(spec.schemas)).toHaveLength(3);

    // spot-check that operations and schemas both came through correctly,
    // not just that the counts happen to match
    const findPets = spec.operations.find((op) => op.operationId === "findPets");
    expect(findPets?.responses[0]?.content?.["application/json"]?.schema.items).toBeDefined();
    expect(spec.schemas.Pet?.allOf).toHaveLength(2);
  });

  it("propagates a resolve-stage error rather than throwing or silently returning an empty spec", async () => {
    const result = await parseOpenApiDocument(
      fixture("broken-dangling-ref.yaml"),
      "broken",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
  });

  it("correctly resolves security end to end (the trickiest case, one more time at the top level)", async () => {
    const result = await parseOpenApiDocument(
      fixture("operation-edge-cases.yaml"),
      "edge-cases",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const del = result.data.operations.find((op) => op.method === "delete");
    expect(del?.security).toEqual([]);
  });

  it("produces a complete NormalizedSpec from an already-parsed object input, same as a file path", async () => {
    const result = await parseOpenApiDocument(
      {
        openapi: "3.0.0",
        info: { title: "Inline API", version: "2.0.0" },
        servers: [{ url: "https://inline.example/api" }],
        tags: [{ name: "Widgets" }],
        paths: {
          "/widgets": {
            get: {
              operationId: "listWidgets",
              tags: ["Widgets"],
              responses: {
                "200": {
                  description: "OK",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/Widget" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            Widget: { type: "object", properties: { id: { type: "string" } } },
          },
        },
      },
      "inline-object",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.id).toBe("inline-object");
    expect(result.data.title).toBe("Inline API");
    expect(result.data.servers).toEqual(["https://inline.example/api"]);
    expect(result.data.operations).toHaveLength(1);
    expect(result.data.operations[0]?.operationId).toBe("listWidgets");
  });

  it("normalizes a real OpenAPI 3.1 document end to end, converging to the same SchemaNode shape as 3.0", async () => {
    const result = await parseOpenApiDocument(fixture("nullable-3.1.yaml"), "nullable");

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.operations).toHaveLength(1);
    // the schema in the response body should already reflect the
    // nullable-array -> nullable:true translation, with no caller-visible
    // difference from how a 3.0 document would have expressed the same thing
    const widget = result.data.operations[0]?.responses[0]?.content?.[
      "application/json"
    ]?.schema;
    expect(widget?.properties?.description).toEqual({
      type: "string",
      nullable: true,
    });
  });

  // QA/hardening pass: a larger, more realistic synthetic document (60
  // operations / 30 paths / 12 tags / 26 schemas / 3 security schemes / 2
  // servers) than any other fixture in this suite, used to prove the real
  // pipeline holds up at a scale closer to a real-world API than the small
  // hand-authored fixtures above. See packages/core/test-fixtures/large-spec.json
  // and packages/docs-app/app/stress-test-openapi-spec.ts (a byte-for-byte
  // mirror used to drive the same document through the running app via a
  // dedicated "Stress Test (dev)" config).
  describe("large synthetic stress-test fixture", () => {
    it("parses a 60-operation / 12-tag document end to end with the expected shape", async () => {
      const result = await parseOpenApiDocument(fixture("large-spec.json"), "stress-test");

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const spec = result.data;
      expect(spec.title).toBe("Stress Test API");
      expect(spec.operations).toHaveLength(60);
      expect(spec.tags.map((t) => t.name)).toHaveLength(12);
      expect(Object.keys(spec.schemas)).toHaveLength(26);
      expect(Object.keys(spec.securitySchemes)).toHaveLength(3);
      expect(spec.servers).toHaveLength(2);
    });

    it("puts each multi-tag operation under every declared tag, in declared order", async () => {
      const result = await parseOpenApiDocument(fixture("large-spec.json"), "stress-test");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const byId = (id: string) =>
        result.data.operations.find((op) => op.operationId === id);

      expect(byId("getAnnualReport")?.tagNames).toEqual(["Reports", "Admin"]);
      expect(byId("cancelOrder")?.tagNames).toEqual(["Orders", "Admin"]);
      expect(byId("getNotificationPreferences")?.tagNames).toEqual([
        "Notifications",
        "Users",
      ]);
    });

    it("leaves the one deliberately untagged operation with an empty tagNames array", async () => {
      const result = await parseOpenApiDocument(fixture("large-spec.json"), "stress-test");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(result.data.operations.find((op) => op.operationId === "getHealth")?.tagNames).toEqual(
        [],
      );
    });

    it("normalizes the self-referencing CategoryNode schema without hanging or throwing", async () => {
      // The real regression here is upstream: a genuinely circular $ref graph
      // must not cause parseOpenApiDocument itself to loop forever or throw.
      // If this test completes at all (with `ok: true`), that's already the
      // meaningful assertion; the shape check below just confirms the ref
      // survived normalization as a normal nested schema, not silently dropped.
      const result = await parseOpenApiDocument(fixture("large-spec.json"), "stress-test");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const categoryNode = result.data.schemas.CategoryNode;
      expect(categoryNode?.properties?.children?.type).toBe("array");
      expect(categoryNode?.properties?.children?.items).toBeDefined();
    });

    it("keeps the security requirement for an unknown/undeclared scheme name intact (the M13 edge-case source data)", async () => {
      // This is the exact shape that later makes resolveOperationAuth (in
      // react-renderer) produce the documented `alternatives: [[]]` edge
      // case — see resolve-operation-auth.test.ts's own regression test for
      // that. Core's job is only to pass the requirement through unchanged;
      // it does not know or care whether "legacySsoScheme" is a declared
      // security scheme.
      const result = await parseOpenApiDocument(fixture("large-spec.json"), "stress-test");
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const op = result.data.operations.find(
        (o) => o.operationId === "getLegacyIntegrationStatus",
      );
      expect(op?.security).toEqual([{ legacySsoScheme: [] }]);
    });
  });

  // JSONPlaceholder real-API QA pass: a genuine, third-party-published
  // OpenAPI 3.0.3 document (api-evangelist's public JSONPlaceholder profile,
  // openapi/jsonplaceholder-posts-api-openapi.yml, frozen here for a
  // deterministic offline test) for a real, live, no-auth public REST API —
  // unlike every other fixture in this file, this is not hand-authored or
  // synthetic. See packages/docs-app/app/jsonplaceholder-openapi-spec.ts for
  // the live "url" specSource that drives the same real document through the
  // running app's actual network-fetch path (a "Load JSONPlaceholder spec
  // (dev)" QA control, same spirit as the stress-test config above).
  describe("real-world fixture: JSONPlaceholder Posts API", () => {
    it("parses the real spec end to end with the expected shape (8 operations, no security)", async () => {
      const result = await parseOpenApiDocument(
        fixture("jsonplaceholder-posts-openapi.json"),
        "jsonplaceholder-posts",
      );

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const spec = result.data;
      expect(spec.title).toBe("JSONPlaceholder REST Albums Posts API");
      expect(spec.servers).toEqual(["https://jsonplaceholder.typicode.com"]);
      expect(spec.operations).toHaveLength(8);
      // The real document declares no components.securitySchemes and no
      // operation ever sets `security` — every operation should resolve to
      // the "no authentication" empty array, matching the real, no-auth API.
      expect(Object.keys(spec.securitySchemes)).toHaveLength(0);
      for (const op of spec.operations) {
        expect(op.security).toEqual([]);
      }
    });

    it("normalizes each representative CRUD operation's method, path, and required path parameter correctly", async () => {
      const result = await parseOpenApiDocument(
        fixture("jsonplaceholder-posts-openapi.json"),
        "jsonplaceholder-posts",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const byId = (id: string) =>
        result.data.operations.find((op) => op.operationId === id);

      expect(byId("listPosts")).toMatchObject({ method: "get", path: "/posts" });
      expect(byId("createPost")).toMatchObject({ method: "post", path: "/posts" });
      expect(byId("getPost")).toMatchObject({ method: "get", path: "/posts/{id}" });
      expect(byId("replacePost")).toMatchObject({ method: "put", path: "/posts/{id}" });
      expect(byId("updatePost")).toMatchObject({ method: "patch", path: "/posts/{id}" });
      expect(byId("deletePost")).toMatchObject({ method: "delete", path: "/posts/{id}" });

      // Per the OpenAPI spec (and normalize-operation-parts.ts's own rule),
      // a path parameter is always required, regardless of what the source
      // document says — confirmed against the real `id` path parameter
      // shared by every /posts/{id} operation.
      for (const id of ["getPost", "replacePost", "updatePost", "deletePost"]) {
        const pathParam = byId(id)?.parameters.find((p) => p.in === "path" && p.name === "id");
        expect(pathParam).toMatchObject({ required: true, schema: { type: "integer" } });
      }
    });

    it("normalizes listPosts' optional query parameters (userId, id)", async () => {
      const result = await parseOpenApiDocument(
        fixture("jsonplaceholder-posts-openapi.json"),
        "jsonplaceholder-posts",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const listPosts = result.data.operations.find((op) => op.operationId === "listPosts");
      const queryParams = listPosts?.parameters.filter((p) => p.in === "query") ?? [];
      expect(queryParams).toHaveLength(2);
      expect(queryParams.find((p) => p.name === "userId")).toMatchObject({
        required: false,
        schema: { type: "integer" },
      });
      expect(queryParams.find((p) => p.name === "id")).toMatchObject({
        required: false,
        schema: { type: "integer" },
      });
    });

    it("normalizes each write operation's application/json request body", async () => {
      const result = await parseOpenApiDocument(
        fixture("jsonplaceholder-posts-openapi.json"),
        "jsonplaceholder-posts",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const byId = (id: string) =>
        result.data.operations.find((op) => op.operationId === id);

      const createPost = byId("createPost");
      expect(createPost?.requestBody?.required).toBe(true);
      expect(createPost?.requestBody?.content["application/json"]?.schema.properties?.userId).toMatchObject(
        { type: "integer" },
      );

      const replacePost = byId("replacePost");
      expect(replacePost?.requestBody?.content["application/json"]?.schema.properties?.title).toMatchObject(
        { type: "string" },
      );

      const updatePost = byId("updatePost");
      expect(updatePost?.requestBody?.content["application/json"]?.schema.properties?.body).toMatchObject(
        { type: "string" },
      );

      // Read-only/delete operations have no request body at all.
      expect(byId("getPost")?.requestBody).toBeUndefined();
      expect(byId("deletePost")?.requestBody).toBeUndefined();
    });

    it("keeps the documented 404 response on GET /posts/{id} alongside the 200", async () => {
      const result = await parseOpenApiDocument(
        fixture("jsonplaceholder-posts-openapi.json"),
        "jsonplaceholder-posts",
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const getPost = result.data.operations.find((op) => op.operationId === "getPost");
      const statusCodes = getPost?.responses.map((r) => r.statusCode);
      expect(statusCodes).toEqual(["200", "404"]);

      const notFound = getPost?.responses.find((r) => r.statusCode === "404");
      expect(notFound?.description).toBe("Post not found.");
      // The real document gives the 404 response a description but no
      // content/schema — normalizeResponses (normalize-operation-parts.ts)
      // correctly leaves `content` undefined rather than fabricating one.
      expect(notFound?.content).toBeUndefined();
    });
  });
});
