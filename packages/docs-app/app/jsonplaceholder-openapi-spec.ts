// The real, live spec source used by the "Load JSONPlaceholder spec (dev)"
// QA control (see DocsShell.tsx's ConfigSwitcher) — a genuine, third-party-
// published OpenAPI 3.0.3 document for the real JSONPlaceholder public API
// (https://jsonplaceholder.typicode.com), not a synthetic/hand-authored
// fixture like example-openapi-spec.ts or stress-test-openapi-spec.ts.
//
// Deliberately a `specSource: {type: "url"}` pointing at the live document
// on GitHub, NOT `{type: "inline"}` with embedded JSON — the point of this
// QA config is to exercise the real `loadSpecFromSource` "url" branch (a
// real network fetch through @apidevtools/swagger-parser, run client-side
// in the browser) against a real external resource, not to pre-bake
// already-parsed content the same way the two customer-facing example
// configs do. raw.githubusercontent.com serves this file with
// `access-control-allow-origin: *`, so the fetch is not CORS-blocked from a
// browser. A frozen, offline copy of this exact document's content lives
// separately at packages/core/test-fixtures/jsonplaceholder-posts-openapi.json
// for a deterministic core pipeline test (see parse-openapi-document.test.ts)
// — that copy is NOT used here, so this config keeps testing the real fetch
// path rather than silently degrading into another inline example.
//
// Source: api-evangelist's public, independent JSONPlaceholder API profile
// (https://github.com/api-evangelist/jsonplaceholder) — covers the Posts
// resource's full REST surface (GET list/single, POST, PUT, PATCH, DELETE,
// plus two nested read routes) against the real base URL, which is enough
// to exercise every representative Try It Out scenario this QA pass cares
// about without pulling in the other five JSONPlaceholder resources
// (comments/albums/photos/todos/users), which would be unrelated scope.
export const jsonPlaceholderOpenApiSpecUrl =
  "https://raw.githubusercontent.com/api-evangelist/jsonplaceholder/main/openapi/jsonplaceholder-posts-api-openapi.yml";
