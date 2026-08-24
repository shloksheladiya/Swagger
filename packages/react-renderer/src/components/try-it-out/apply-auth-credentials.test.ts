import { describe, expect, it } from "vitest";
import type { AuthAlternative } from "./resolve-auth-credential-fields.js";
import { applyAuthCredentials } from "./apply-auth-credentials.js";

describe("applyAuthCredentials", () => {
  it("injects a bearer credential as an Authorization header", () => {
    const alternatives: AuthAlternative[] = [
      { index: 0, fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token" }] },
    ];
    const result = applyAuthCredentials(alternatives, 0, { bearerAuth: "secret-token" });

    expect(result).toEqual({ headers: { Authorization: "Bearer secret-token" }, query: {} });
  });

  it("injects a header apiKey credential under its declared parameter name", () => {
    const alternatives: AuthAlternative[] = [
      {
        index: 0,
        fields: [{ kind: "apiKey", schemeName: "apiKeyAuth", label: "API Key", in: "header", paramName: "X-Api-Key" }],
      },
    ];
    const result = applyAuthCredentials(alternatives, 0, { apiKeyAuth: "abc123" });

    expect(result).toEqual({ headers: { "X-Api-Key": "abc123" }, query: {} });
  });

  it("injects a query apiKey credential under its declared parameter name", () => {
    const alternatives: AuthAlternative[] = [
      {
        index: 0,
        fields: [{ kind: "apiKey", schemeName: "apiKeyAuth", label: "API Key", in: "query", paramName: "api_key" }],
      },
    ];
    const result = applyAuthCredentials(alternatives, 0, { apiKeyAuth: "abc123" });

    expect(result).toEqual({ headers: {}, query: { api_key: "abc123" } });
  });

  it("skips a field with no credential value supplied", () => {
    const alternatives: AuthAlternative[] = [
      { index: 0, fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token" }] },
    ];
    expect(applyAuthCredentials(alternatives, 0, {})).toEqual({ headers: {}, query: {} });
  });

  it("skips a field whose credential value is blank/whitespace-only", () => {
    const alternatives: AuthAlternative[] = [
      { index: 0, fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token" }] },
    ];
    expect(applyAuthCredentials(alternatives, 0, { bearerAuth: "   " })).toEqual({ headers: {}, query: {} });
  });

  it("never injects anything for an unsupported field, even with a stray value present", () => {
    const alternatives: AuthAlternative[] = [
      { index: 0, fields: [{ kind: "unsupported", schemeName: "oauth2Auth", label: "OAuth 2.0", reason: "not supported yet" }] },
    ];
    const result = applyAuthCredentials(alternatives, 0, { oauth2Auth: "some-token" });

    expect(result).toEqual({ headers: {}, query: {} });
  });

  it("injects every field of the selected AND-group alternative", () => {
    const alternatives: AuthAlternative[] = [
      {
        index: 0,
        fields: [
          { kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token" },
          { kind: "apiKey", schemeName: "apiKeyAuth", label: "API Key", in: "header", paramName: "X-Api-Key" },
        ],
      },
    ];
    const result = applyAuthCredentials(alternatives, 0, { bearerAuth: "tok", apiKeyAuth: "key" });

    expect(result).toEqual({
      headers: { Authorization: "Bearer tok", "X-Api-Key": "key" },
      query: {},
    });
  });

  describe("credential application for the selected/satisfied requirement", () => {
    const orAlternatives: AuthAlternative[] = [
      { index: 0, fields: [{ kind: "apiKey", schemeName: "apiKeyAuth", label: "API Key", in: "header", paramName: "X-Api-Key" }] },
      { index: 1, fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token" }] },
    ];
    const bothValues = { apiKeyAuth: "key-value", bearerAuth: "token-value" };

    it("injects only alternative 0's credential when it's selected, ignoring alternative 1's filled-in value", () => {
      const result = applyAuthCredentials(orAlternatives, 0, bothValues);
      expect(result).toEqual({ headers: { "X-Api-Key": "key-value" }, query: {} });
    });

    it("injects only alternative 1's credential when it's selected, ignoring alternative 0's filled-in value", () => {
      const result = applyAuthCredentials(orAlternatives, 1, bothValues);
      expect(result).toEqual({ headers: { Authorization: "Bearer token-value" }, query: {} });
    });

    it("injects nothing when the selected index doesn't match any alternative", () => {
      const result = applyAuthCredentials(orAlternatives, 5, bothValues);
      expect(result).toEqual({ headers: {}, query: {} });
    });

    it("injects nothing when there are no alternatives at all (operation requires no auth)", () => {
      const result = applyAuthCredentials([], 0, bothValues);
      expect(result).toEqual({ headers: {}, query: {} });
    });
  });
});
