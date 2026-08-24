import { describe, expect, it } from "vitest";
import type { SecurityScheme } from "@docs-platform/core";
import { resolveSecurityRequirement } from "./resolve-security-requirement.js";

const bearerAuth: SecurityScheme = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
const apiKeyAuth: SecurityScheme = { type: "apiKey", in: "header", name: "X-Api-Key" };
const oauth2Auth: SecurityScheme = { type: "oauth2", flows: {} };

const securitySchemes = { bearerAuth, apiKeyAuth, oauth2Auth };

describe("resolveSecurityRequirement", () => {
  it("resolves a single-scheme requirement", () => {
    const result = resolveSecurityRequirement({ bearerAuth: [] }, securitySchemes);
    expect(result).toEqual(["Bearer Token (JWT)"]);
  });

  it("resolves a multi-scheme requirement (AND semantics — all required together)", () => {
    const result = resolveSecurityRequirement(
      { apiKeyAuth: [], oauth2Auth: [] },
      securitySchemes,
    );
    expect(result).toHaveLength(2);
    expect(result).toContain("API Key (header: X-Api-Key)");
    expect(result).toContain("OAuth 2.0");
  });

  it("appends scopes to the description when present", () => {
    const result = resolveSecurityRequirement(
      { oauth2Auth: ["read", "write"] },
      securitySchemes,
    );
    expect(result).toEqual(["OAuth 2.0 (scopes: read, write)"]);
  });

  it("omits the scope suffix entirely when scopes is an empty array", () => {
    const result = resolveSecurityRequirement({ bearerAuth: [] }, securitySchemes);
    expect(result[0]).not.toContain("scopes");
  });

  it("returns an empty array for an empty requirement (no auth needed)", () => {
    expect(resolveSecurityRequirement({}, securitySchemes)).toEqual([]);
  });

  it("defensively skips a scheme name not present in securitySchemes, rather than throwing", () => {
    const result = resolveSecurityRequirement(
      { bearerAuth: [], nonExistentScheme: [] },
      securitySchemes,
    );
    expect(result).toEqual(["Bearer Token (JWT)"]); // the valid one still resolves correctly
  });
});
