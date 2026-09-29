// The real production DocsConfig for this deployment — the one config a
// company actually ships with, as opposed to the hand-written example/QA
// configs in example-docs-configs.ts (sunnyLabsConfig, acmeConfig,
// stressTestConfig, jsonPlaceholderConfig), which stay available only as
// dev-only tools behind DocsShell.tsx's ConfigSwitcher.
//
// specSource is deliberately `{type: "url", value: "/openapi.json"}` — a
// same-origin, relative URL to a static file bundled under this app's
// public/ directory (packages/docs-app/public/openapi.json). This is NOT a
// new specSource type or a new loading path: it goes through the exact same
// "url" branch documented in core/spec/pipeline/load-spec-from-source.ts
// (swagger-parser fetching + parsing + dereferencing a URL, YAML or JSON),
// the same branch already proven against a real third-party document in the
// JSONPlaceholder QA pass. Next.js serves anything under public/ at its
// relative path automatically, so this fetch is same-origin — no CORS
// configuration needed.
//
// public/openapi.json is a byte-for-byte copy of
// packages/core/test-fixtures/jsonplaceholder-posts-openapi.json — the same
// real, third-party JSONPlaceholder document already covered by core's
// parse-openapi-document.test.ts and the JSONPlaceholder QA pass. It is
// bundled rather than fetched from GitHub so the deployed site doesn't depend
// on a third party's repo at runtime. `servers[0].url` in that document is
// the public https://jsonplaceholder.typicode.com API (no auth, CORS-enabled,
// writes simulated), so Try It Out works for any visitor — unlike the local
// demo API (packages/server, `pnpm demo-api`), which only a developer running
// it on their own machine can reach.
//
// A genuinely external, company-hosted document works the same way — just
// swap `value` for a real `https://company.example/openapi.json` URL. The
// one real difference is operational, not code: that host must allow
// cross-origin fetch (send permissive-enough CORS headers) for a browser to
// load it, same as any other cross-origin `fetch()`. This deployment does
// not implement any CORS workaround/proxy for that case — see
// load-spec-from-source.ts's own comment on the "url" branch.
export const productionConfig = {
  branding: { title: "JSONPlaceholder API Docs" },
  specSource: { type: "url", value: "/openapi.json" },
  layout: { sidebarPosition: "left" },
  features: { search: true, tryItOut: true },
};
