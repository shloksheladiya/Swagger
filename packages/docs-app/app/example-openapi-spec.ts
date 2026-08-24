// A real, valid OpenAPI 3.0 document — run through the actual
// @docs-platform/core parsing pipeline (parseOpenApiDocument /
// resolveSpecDocument / normalizeStaticParts / normalizeOperations), not a
// hand-built `Operation`/`Tag` object graph like the old demo-data.ts. This
// is what proves the app is now OpenAPI-driven rather than driven by
// internally-normalized fixtures that skip the parser entirely.
//
// Deliberately still a hand-authored object (not a fetched/uploaded file):
// per the current productization scope, `specSource.type: "inline"` expects
// a JSON string (see load-spec-from-source.ts), and building this as a
// plain JS object here — then JSON.stringify-ing it into
// example-docs-configs.ts's `specSource.value` — needs no new dependency
// (no YAML parser) and no filesystem/network access, while still exercising
// every documented pipeline capability in one document: tags, global vs.
// per-operation security (see the `security: []` override below), multiple
// security scheme types, servers, path/query parameters, a request body,
// and multiple response status codes.
//
// Domain kept deliberately close to the old demo-data.ts (Users/Pets) so a
// before/after comparison is easy, but every field below is genuine OpenAPI
// document shape — nothing here is an internal `Operation` object.
//
// `servers[0].url` points at the local demo API (packages/server/src/
// demo-api) — started separately via `pnpm demo-api` — rather than the
// original https://api.example.com/v1 placeholder, which was never a real,
// reachable host. This is the one intentional edit to this document for the
// "local demo API" task: fixing the one field that was always meant to be a
// stand-in for a real backend, not a change to any path/schema/operation.
export const exampleOpenApiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Example Docs API",
    version: "1.0.0",
    description: "A small real OpenAPI document driving this docs app end to end.",
  },
  servers: [{ url: "http://localhost:4000/v1" }],
  tags: [{ name: "Users", description: "User management" }, { name: "Pets" }],
  security: [{ bearerAuth: [] }],
  paths: {
    "/users": {
      get: {
        operationId: "listUsers",
        tags: ["Users"],
        summary: "List users",
        description: "Returns a **paginated** list of all users in the system.",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            description: "Maximum number of results to return.",
            schema: { type: "integer", format: "int32" },
          },
        ],
        responses: {
          "200": {
            description: "A list of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/User" },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: "createUser",
        tags: ["Users"],
        summary: "Create user",
        description: "Creates a new user account.",
        // Overrides the document's global `bearerAuth` requirement — proves
        // per-operation security resolution (resolveOperationAuth), same
        // semantics already covered by core's own security tests.
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/NewUser" },
              example: { email: "new-user@example.com", name: "Ada Lovelace" },
            },
          },
        },
        responses: {
          "201": {
            description: "The created user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "400": { description: "Invalid input" },
        },
      },
    },
    "/users/{userId}": {
      get: {
        operationId: "getUser",
        tags: ["Users"],
        summary: "Get user by ID",
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            description: "ID of the user to fetch.",
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          "200": {
            description: "The requested user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/User" },
              },
            },
          },
          "404": { description: "User not found" },
        },
      },
    },
    "/pets": {
      get: {
        operationId: "listPets",
        tags: ["Pets"],
        summary: "List pets",
        security: [],
        responses: {
          "200": {
            description: "A list of pets",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Pet" },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
        },
      },
      NewUser: {
        type: "object",
        required: ["email"],
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string" },
        },
      },
      Pet: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
        },
      },
    },
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-API-Key" },
    },
  },
};

/** JSON-stringified form — what `specSource.type: "inline"` actually stores
 * (`value` is a `string` per docsConfigSchema), and what
 * loadSpecFromSource's JSON.parse expects to receive. */
export const exampleOpenApiSpecJson = JSON.stringify(exampleOpenApiSpec);
