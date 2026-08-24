import { describe, expect, it } from "vitest";
import type { SecurityScheme } from "@docs-platform/core";
import { describeSecurityScheme } from "./describe-security-scheme.js";

describe("describeSecurityScheme", () => {
  it("describes a bearer scheme with a format", () => {
    const scheme: SecurityScheme = { type: "http", scheme: "bearer", bearerFormat: "JWT" };
    expect(describeSecurityScheme(scheme)).toBe("Bearer Token (JWT)");
  });

  it("describes a bearer scheme without a format", () => {
    const scheme: SecurityScheme = { type: "http", scheme: "bearer" };
    expect(describeSecurityScheme(scheme)).toBe("Bearer Token");
  });

  it("describes an apiKey scheme, including its location and header/param name", () => {
    const scheme: SecurityScheme = { type: "apiKey", in: "header", name: "X-Api-Key" };
    expect(describeSecurityScheme(scheme)).toBe("API Key (header: X-Api-Key)");
  });

  it("describes an apiKey scheme in a query parameter", () => {
    const scheme: SecurityScheme = { type: "apiKey", in: "query", name: "api_key" };
    expect(describeSecurityScheme(scheme)).toBe("API Key (query: api_key)");
  });

  it("describes an apiKey scheme in a cookie", () => {
    const scheme: SecurityScheme = { type: "apiKey", in: "cookie", name: "session" };
    expect(describeSecurityScheme(scheme)).toBe("API Key (cookie: session)");
  });

  it("describes an oauth2 scheme with a generic label, not flow-specific detail", () => {
    const scheme: SecurityScheme = { type: "oauth2", flows: {} };
    expect(describeSecurityScheme(scheme)).toBe("OAuth 2.0");
  });
});
