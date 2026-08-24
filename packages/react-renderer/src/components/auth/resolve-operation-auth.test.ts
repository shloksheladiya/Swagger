import { describe, expect, it } from "vitest";
import type { SecurityScheme } from "@docs-platform/core";
import { resolveOperationAuth } from "./resolve-operation-auth.js";

const bearerAuth: SecurityScheme = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
const apiKeyAuth: SecurityScheme = { type: "apiKey", in: "header", name: "X-Api-Key" };
const oauth2Auth: SecurityScheme = { type: "oauth2", flows: {} };

const securitySchemes = { bearerAuth, apiKeyAuth, oauth2Auth };

describe("resolveOperationAuth", () => {
  it("returns none when security is an empty array (explicitly no auth required)", () => {
    expect(resolveOperationAuth([], securitySchemes)).toEqual({ kind: "none" });
  });

  it("resolves a single authentication requirement", () => {
    const result = resolveOperationAuth([{ bearerAuth: [] }], securitySchemes);
    expect(result).toEqual({
      kind: "required",
      alternatives: [["Bearer Token (JWT)"]],
    });
  });

  it("resolves multiple alternative requirements (OR semantics)", () => {
    const result = resolveOperationAuth(
      [{ apiKeyAuth: [] }, { oauth2Auth: ["read"] }],
      securitySchemes,
    );
    expect(result).toEqual({
      kind: "required",
      alternatives: [
        ["API Key (header: X-Api-Key)"],
        ["OAuth 2.0 (scopes: read)"],
      ],
    });
  });

  it("resolves multiple schemes within one requirement as one AND-group", () => {
    const result = resolveOperationAuth(
      [{ apiKeyAuth: [], oauth2Auth: ["read", "write"] }],
      securitySchemes,
    );
    expect(result).toEqual({
      kind: "required",
      alternatives: [
        ["API Key (header: X-Api-Key)", "OAuth 2.0 (scopes: read, write)"],
      ],
    });
  });

  it("handles realistic bearer, API key, and OAuth2 combinations across OR alternatives", () => {
    const result = resolveOperationAuth(
      [{ bearerAuth: [] }, { apiKeyAuth: [] }, { oauth2Auth: ["admin"] }],
      securitySchemes,
    );
    expect(result).toEqual({
      kind: "required",
      alternatives: [
        ["Bearer Token (JWT)"],
        ["API Key (header: X-Api-Key)"],
        ["OAuth 2.0 (scopes: admin)"],
      ],
    });
  });

  it("defensively skips unknown scheme names within an alternative, consistent with resolveSecurityRequirement", () => {
    const result = resolveOperationAuth(
      [{ bearerAuth: [], nonExistentScheme: [] }, { unknownScheme: ["read"] }],
      securitySchemes,
    );
    expect(result).toEqual({
      kind: "required",
      alternatives: [["Bearer Token (JWT)"], []],
    });
  });

  it("returns an empty AND-group when a requirement references only unknown schemes", () => {
    const result = resolveOperationAuth([{ missingScheme: [] }], securitySchemes);
    expect(result).toEqual({
      kind: "required",
      alternatives: [[]],
    });
  });
});
