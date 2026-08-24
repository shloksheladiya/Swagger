import { describe, expect, it } from "vitest";
import type {
  MediaType,
  Parameter,
  RequestBody,
  Response,
} from "./operation-parts.js";

describe("Parameter", () => {
  it("represents a required path parameter", () => {
    const userId: Parameter = {
      name: "userId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
    };

    expect(userId.in).toBe("path");
    expect(userId.schema.format).toBe("uuid");
  });

  it("represents an optional query parameter", () => {
    const limit: Parameter = {
      name: "limit",
      in: "query",
      required: false,
      description: "Max number of results to return",
      schema: { type: "integer" },
    };

    expect(limit.required).toBe(false);
    expect(limit.in).toBe("query");
  });
});

describe("RequestBody", () => {
  it("carries a JSON schema keyed by media type", () => {
    const createUserBody: RequestBody = {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["email"],
            properties: {
              email: { type: "string", format: "email" },
            },
          },
        },
      },
    };

    const json = createUserBody.content["application/json"] as MediaType;
    expect(json.schema.properties?.email?.format).toBe("email");
  });
});

describe("Response", () => {
  it("represents a successful response with a body", () => {
    const ok: Response = {
      statusCode: "200",
      description: "The created user",
      content: {
        "application/json": {
          schema: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    };

    expect(ok.content?.["application/json"]?.schema.properties?.id).toBeDefined();
  });

  it("represents an error response with no body", () => {
    const notFound: Response = {
      statusCode: "404",
      description: "User not found",
    };

    expect(notFound.content).toBeUndefined();
  });
});
