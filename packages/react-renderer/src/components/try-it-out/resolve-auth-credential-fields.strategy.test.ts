// Milestone 20: auth-strategy fallback coverage for resolveAuthCredentialAlternatives.
// Kept in its own file (rather than added to resolve-auth-credential-fields.test.ts)
// because it registers a real plugin via installPlugin against the shared,
// process-wide plugin registry — vitest gives each test FILE its own fresh
// module graph, so this registration can never leak into
// resolve-auth-credential-fields.test.ts's "marks an oauth2 scheme as
// unsupported" case, which must keep passing with no strategy registered at
// all.

import { describe, expect, it } from "vitest";
import type { SecurityRequirement, SecurityScheme } from "@docs-platform/core";
import { resolveAuthCredentialAlternatives } from "./resolve-auth-credential-fields.js";
import { installPlugin } from "../../plugins/plugin-registry.js";

const schemes: Record<string, SecurityScheme> = {
  oauth2Auth: { type: "oauth2", flows: {} },
};

installPlugin({
  name: "oauth2-strategy-plugin",
  install(context) {
    context.registerAuthStrategy({
      schemeType: "oauth2",
      describe: () => "OAuth 2.0 (Client Credentials)",
      resolveCredentialField: () => ({ kind: "bearer" }),
      injectCredential: (_field, value) => ({
        headers: { Authorization: `Bearer ${value}` },
        query: {},
      }),
    });
  },
});

describe("resolveAuthCredentialAlternatives — AuthStrategy fallback (Milestone 20)", () => {
  it("resolves a scheme with a registered strategy to a 'strategy' field, not 'unsupported'", () => {
    const security: SecurityRequirement[] = [{ oauth2Auth: ["read"] }];
    const [alternative] = resolveAuthCredentialAlternatives(security, schemes);

    expect(alternative?.fields).toEqual([
      {
        kind: "strategy",
        schemeName: "oauth2Auth",
        label: "OAuth 2.0 (Client Credentials)",
        schemeType: "oauth2",
        descriptor: { kind: "bearer" },
      },
    ]);
  });
});
