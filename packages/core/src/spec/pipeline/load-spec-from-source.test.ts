import { describe, expect, it } from "vitest";
import { loadSpecFromSource } from "./load-spec-from-source.js";
import { clearParseCache } from "./parse-openapi-document-cached.js";

const validInlineDoc = {
  openapi: "3.0.0",
  info: { title: "Inline API", version: "1.0.0" },
  paths: {
    "/widgets": {
      get: {
        operationId: "listWidgets",
        responses: { "200": { description: "OK" } },
      },
    },
  },
};

describe("loadSpecFromSource", () => {
  it('type "inline": parses the JSON string value and runs it through the real pipeline', async () => {
    const result = await loadSpecFromSource(
      { type: "inline", value: JSON.stringify(validInlineDoc) },
      "inline-id",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.title).toBe("Inline API");
    expect(result.data.operations).toHaveLength(1);
  });

  it('type "inline": returns a structured error for a value that is not valid JSON', async () => {
    const result = await loadSpecFromSource(
      { type: "inline", value: "{ not valid json" },
      "bad-json-id",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
    expect(result.error.message).toMatch(/not valid JSON/i);
  });

  it('type "inline": returns a structured error when the JSON value is not an object (e.g. an array or primitive)', async () => {
    const result = await loadSpecFromSource(
      { type: "inline", value: JSON.stringify([1, 2, 3]) },
      "not-object-id",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
  });

  it('type "url": delegates to the existing string-based pipeline unchanged (an unresolvable source surfaces as a real SpecResolveError, not a thrown exception, and not new logic in loadSpecFromSource itself)', async () => {
    clearParseCache();
    // Deliberately not a real network call (avoids a slow/flaky DNS timeout
    // in CI) — a nonexistent local-style path is exactly what
    // resolve-spec-document.test.ts already uses to prove the underlying
    // pipeline fails fast and cleanly for an unresolvable string source.
    // This test isn't about swagger-parser's resolution behavior (already
    // covered there) — it's about loadSpecFromSource passing "url" values
    // straight through unchanged, with no new logic of its own.
    const result = await loadSpecFromSource(
      { type: "url", value: "./does-not-exist-anywhere.yaml" },
      "url-id",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
  });

  it('type "file": is explicitly deferred — returns a clear, dedicated error rather than attempting filesystem access', async () => {
    const result = await loadSpecFromSource(
      { type: "file", value: "./some/local/spec.yaml" },
      "file-id",
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
    expect(result.error.message).toMatch(/not supported yet/i);
  });
});
