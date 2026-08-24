// Milestone 20: auth-strategy injection coverage for applyAuthCredentials.
// Own file for the same reason as resolve-auth-credential-fields.strategy.test.ts
// — registers a real plugin against the shared, process-wide (but
// per-test-file-isolated) plugin registry.

import { describe, expect, it } from "vitest";
import type { AuthAlternative } from "./resolve-auth-credential-fields.js";
import { applyAuthCredentials } from "./apply-auth-credentials.js";
import { installPlugin } from "../../plugins/plugin-registry.js";

installPlugin({
  name: "custom-header-strategy-plugin",
  install(context) {
    context.registerAuthStrategy({
      schemeType: "customScheme",
      describe: () => "Custom Scheme",
      resolveCredentialField: () => ({ kind: "apiKey", in: "header", paramName: "X-Custom-Token" }),
      // Deliberately does something a built-in apiKey field never would —
      // uppercases the value — so this test can only pass if injection
      // genuinely went through THIS strategy's injectCredential, not the
      // built-in apiKey branch.
      injectCredential: (field, value) => {
        if (field.kind !== "apiKey") return { headers: {}, query: {} };
        return { headers: { [field.paramName]: value.toUpperCase() }, query: {} };
      },
    });
  },
});

describe("applyAuthCredentials — AuthStrategy fallback (Milestone 20)", () => {
  it("routes a 'strategy' field's injection through the registered strategy's own injectCredential", () => {
    const alternatives: AuthAlternative[] = [
      {
        index: 0,
        fields: [
          {
            kind: "strategy",
            schemeName: "customAuth",
            label: "Custom Scheme",
            schemeType: "customScheme",
            descriptor: { kind: "apiKey", in: "header", paramName: "X-Custom-Token" },
          },
        ],
      },
    ];

    const result = applyAuthCredentials(alternatives, 0, { customAuth: "secret" });

    expect(result).toEqual({ headers: { "X-Custom-Token": "SECRET" }, query: {} });
  });

  it("injects nothing for a strategy field whose strategy has since gone unregistered/renamed", () => {
    const alternatives: AuthAlternative[] = [
      {
        index: 0,
        fields: [
          {
            kind: "strategy",
            schemeName: "unknownAuth",
            label: "Unknown Scheme",
            schemeType: "no-such-registered-scheme-type",
            descriptor: { kind: "bearer" },
          },
        ],
      },
    ];

    const result = applyAuthCredentials(alternatives, 0, { unknownAuth: "secret" });

    expect(result).toEqual({ headers: {}, query: {} });
  });
});
