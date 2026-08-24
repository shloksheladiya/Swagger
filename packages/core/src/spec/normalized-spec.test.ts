import { describe, expect, it } from "vitest";
import type { NormalizedSpec, Operation } from "./normalized-spec.js";

describe("NormalizedSpec", () => {
  const userSchema = {
    type: "object" as const,
    required: ["id", "email"],
    properties: {
      id: { type: "string" as const, format: "uuid" },
      email: { type: "string" as const, format: "email" },
    },
  };

  const listUsers: Operation = {
    operationId: "listUsers",
    path: "/users",
    method: "get",
    summary: "List users",
    tagNames: ["Users"],
    parameters: [
      {
        name: "limit",
        in: "query",
        required: false,
        schema: { type: "integer" },
      },
    ],
    responses: [
      {
        statusCode: "200",
        description: "A list of users",
        content: {
          "application/json": {
            schema: { type: "array", items: userSchema },
          },
        },
      },
    ],
    security: [{ bearerAuth: [] }],
  };

  const createUser: Operation = {
    operationId: "createUser",
    path: "/users",
    method: "post",
    summary: "Create a user",
    tagNames: ["Users"],
    parameters: [],
    requestBody: {
      required: true,
      content: { "application/json": { schema: userSchema } },
    },
    responses: [
      { statusCode: "201", description: "Created" },
      { statusCode: "400", description: "Invalid input" },
    ],
    security: [{ bearerAuth: [] }],
  };

  const spec: NormalizedSpec = {
    id: "example-api",
    version: "1.0.0",
    title: "Example API",
    tags: [{ name: "Users", description: "User management" }],
    operations: [listUsers, createUser],
    schemas: { User: userSchema },
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    servers: ["https://api.example.com/v1"],
  };

  it("groups operations under the tags they declare", () => {
    const usersOps = spec.operations.filter((op) =>
      op.tagNames.includes("Users"),
    );
    expect(usersOps).toHaveLength(2);
  });

  it("resolves an operation's security requirement to a real security scheme", () => {
    const [requirement] = createUser.security;
    const schemeName = Object.keys(requirement ?? {})[0] as string;
    const scheme = spec.securitySchemes[schemeName];

    expect(scheme).toEqual({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
  });

  it("carries different response shapes for success and error responses", () => {
    const created = createUser.responses.find((r) => r.statusCode === "201");
    const badRequest = createUser.responses.find((r) => r.statusCode === "400");

    expect(created?.description).toBe("Created");
    expect(badRequest?.content).toBeUndefined();
  });

  it("keeps a top-level schema dictionary independent of where it's referenced", () => {
    expect(spec.schemas.User?.properties?.email?.format).toBe("email");
  });
});
