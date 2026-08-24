// Two concrete, hand-written example DocsConfig inputs — same shape/spirit
// as two separate config *files* a real deployment would maintain (only a
// literal TS module instead of on-disk JSON, since docs-app has no file
// loading yet — see the Milestone 17 completion report's noted
// limitation). Deliberately untyped as `unknown`-compatible plain objects
// rather than `satisfies DocsConfig`: the whole point of routing them
// through `resolveConfig()` (not constructing a DocsConfig directly) is to
// exercise the same validate-and-default path a hand-edited file would go
// through, same reasoning as parse-config.ts's own comment about
// `DocsConfig` being realistically hand-edited input.
//
// `layout.mode` is deliberately omitted from both — intentionally out of
// scope for Milestone 17 (see the roadmap's Goal line, which names only
// "sidebar position" under layout options). Omitting it here just proves
// resolveConfig's existing defaulting behavior (Milestone 4), not any new
// mode-driven rendering.
//
// Chosen so every Milestone 17 concern visibly differs between the two:
// branding title, branding logo, sidebar position, and both feature
// toggles.
//
// `specSource` was `{ type: "inline", value: "{}" }` in both configs —
// syntactically valid JSON, but not an OpenAPI document, so it was never
// actually consumed by anything (real spec loading didn't exist yet). Now
// that use-load-spec.ts really parses this through the core pipeline, both
// configs point at the same real example document (example-openapi-spec.ts)
// — switching between them via ConfigSwitcher demonstrates a genuine
// reload through specStore, not just a branding/layout swap.

import { exampleOpenApiSpecJson } from "./example-openapi-spec";
import { stressTestOpenApiSpecJson } from "./stress-test-openapi-spec";
import { jsonPlaceholderOpenApiSpecUrl } from "./jsonplaceholder-openapi-spec";

export const sunnyLabsConfig = {
  branding: { title: "Sunny Labs API" },
  specSource: { type: "inline", value: exampleOpenApiSpecJson },
  layout: { sidebarPosition: "left" },
  features: { search: true, tryItOut: true },
};

export const acmeConfig = {
  branding: {
    title: "Acme Widgets API",
    logoUrl: "https://acme.example/logo.png",
  },
  specSource: { type: "inline", value: exampleOpenApiSpecJson },
  layout: { sidebarPosition: "right" },
  features: { search: false, tryItOut: false },
};

// QA/hardening-pass config — NOT a customer-facing example. Loads the large
// synthetic stress-test document (stress-test-openapi-spec.ts) so the real
// Sidebar/Search/Routing/SchemaViewer/Try It Out stack can be exercised
// against 50+ operations for regression testing, on demand, without
// disturbing either polished example above. See DocsShell.tsx's
// ConfigSwitcher for how this is kept visually distinct as a developer tool.
export const stressTestConfig = {
  branding: { title: "Stress Test (Dev)" },
  specSource: { type: "inline", value: stressTestOpenApiSpecJson },
  layout: { sidebarPosition: "left" },
  features: { search: true, tryItOut: true },
};

// QA/hardening-pass config — JSONPlaceholder real-API integration QA. Also
// NOT a customer-facing example (see DocsShell.tsx's ConfigSwitcher for how
// this is kept visually distinct as a developer tool). Unlike every other
// config here, `specSource` is `{type: "url"}` pointing at a real, live,
// third-party-published OpenAPI document for the real JSONPlaceholder public
// API — this exercises the existing loader's real network-fetch path against
// a genuine external resource, not pre-baked inline JSON. See
// jsonplaceholder-openapi-spec.ts for the full reasoning.
export const jsonPlaceholderConfig = {
  branding: { title: "JSONPlaceholder (QA)" },
  specSource: { type: "url", value: jsonPlaceholderOpenApiSpecUrl },
  layout: { sidebarPosition: "left" },
  features: { search: true, tryItOut: true },
};
