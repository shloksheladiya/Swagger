import { describe, expect, it } from "vitest";
import type { SecurityRequirement, SecurityScheme } from "@docs-platform/core";
import { resolveAuthCredentialAlternatives } from "./resolve-auth-credential-fields.js";

const schemes: Record<string, SecurityScheme> = {
  bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  apiKeyHeaderAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
  apiKeyQueryAuth: { type: "apiKey", in: "query", name: "api_key" },
  apiKeyCookieAuth: { type: "apiKey", in: "cookie", name: "session" },
  oauth2Auth: { type: "oauth2", flows: {} },
};

describe("resolveAuthCredentialAlternatives", () => {
  it("returns nothing for an operation with no security requirements", () => {
    expect(resolveAuthCredentialAlternatives([], schemes)).toEqual([]);
  });

  it("one scheme: a single requirement produces a single alternative with one field", () => {
    const security: SecurityRequirement[] = [{ bearerAuth: [] }];

    expect(resolveAuthCredentialAlternatives(security, schemes)).toEqual([
      {
        index: 0,
        fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token (JWT)" }],
      },
    ]);
  });

  it("resolves a header apiKey scheme to an apiKey/header credential field", () => {
    const security: SecurityRequirement[] = [{ apiKeyHeaderAuth: [] }];
    const [alternative] = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternative?.fields).toEqual([
      {
        kind: "apiKey",
        schemeName: "apiKeyHeaderAuth",
        label: "API Key (header: X-Api-Key)",
        in: "header",
        paramName: "X-Api-Key",
      },
    ]);
  });

  it("resolves a query apiKey scheme to an apiKey/query credential field", () => {
    const security: SecurityRequirement[] = [{ apiKeyQueryAuth: [] }];
    const [alternative] = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternative?.fields).toEqual([
      {
        kind: "apiKey",
        schemeName: "apiKeyQueryAuth",
        label: "API Key (query: api_key)",
        in: "query",
        paramName: "api_key",
      },
    ]);
  });

  it("marks a cookie apiKey scheme as unsupported (browsers can't set cookies from JS)", () => {
    const security: SecurityRequirement[] = [{ apiKeyCookieAuth: [] }];
    const [alternative] = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternative?.fields).toEqual([
      {
        kind: "unsupported",
        schemeName: "apiKeyCookieAuth",
        label: "API Key (cookie: session)",
        reason: "cookies can't be set from browser JavaScript",
      },
    ]);
  });

  it("marks an oauth2 scheme as unsupported (no acquisition flow in this milestone)", () => {
    const security: SecurityRequirement[] = [{ oauth2Auth: ["read"] }];
    const [alternative] = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternative?.fields).toEqual([
      {
        kind: "unsupported",
        schemeName: "oauth2Auth",
        label: "OAuth 2.0",
        reason: "OAuth2 credential entry isn't supported yet",
      },
    ]);
  });

  it("skips a requirement referencing a scheme name the spec never defined", () => {
    const security: SecurityRequirement[] = [{ notDefinedAnywhere: [] }];
    expect(resolveAuthCredentialAlternatives(security, schemes)).toEqual([{ index: 0, fields: [] }]);
  });

  it("two OR alternatives: each SecurityRequirement entry becomes its own alternative, not a flattened list", () => {
    const security: SecurityRequirement[] = [{ apiKeyHeaderAuth: [] }, { bearerAuth: [] }];
    const alternatives = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternatives).toHaveLength(2);
    expect(alternatives[0]).toEqual({
      index: 0,
      fields: [
        {
          kind: "apiKey",
          schemeName: "apiKeyHeaderAuth",
          label: "API Key (header: X-Api-Key)",
          in: "header",
          paramName: "X-Api-Key",
        },
      ],
    });
    expect(alternatives[1]).toEqual({
      index: 1,
      fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token (JWT)" }],
    });
  });

  it("two schemes in one AND requirement: a single alternative with both fields", () => {
    const security: SecurityRequirement[] = [{ apiKeyHeaderAuth: [], bearerAuth: [] }];
    const alternatives = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternatives).toHaveLength(1);
    expect(alternatives[0]?.fields.map((f) => f.schemeName)).toEqual(["apiKeyHeaderAuth", "bearerAuth"]);
  });

  it("mixed OR/AND: [{a}, {b, c}] produces two alternatives — one single-field, one two-field", () => {
    const security: SecurityRequirement[] = [{ bearerAuth: [] }, { apiKeyHeaderAuth: [], oauth2Auth: [] }];
    const alternatives = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternatives).toHaveLength(2);
    expect(alternatives[0]?.fields.map((f) => f.schemeName)).toEqual(["bearerAuth"]);
    expect(alternatives[1]?.fields.map((f) => f.schemeName)).toEqual(["apiKeyHeaderAuth", "oauth2Auth"]);
    // the AND alternative's unsupported member is still represented, not
    // silently dropped — see the oauth2 test above.
    expect(alternatives[1]?.fields[1]?.kind).toBe("unsupported");
  });

  it("a scheme referenced by more than one OR alternative appears independently in each, not deduplicated away", () => {
    // Deduplicating by scheme name was the earlier (incorrect) flattened
    // behavior — each alternative must keep its own copy so selecting
    // either one still shows/injects it correctly.
    const security: SecurityRequirement[] = [{ bearerAuth: [] }, { bearerAuth: [] }];
    const alternatives = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternatives).toHaveLength(2);
    expect(alternatives[0]?.fields).toEqual(alternatives[1]?.fields);
  });
});
