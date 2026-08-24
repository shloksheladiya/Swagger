import { mkdtempSync, copyFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  clearParseCache,
  parseOpenApiDocumentCached,
} from "./parse-openapi-document-cached.js";

const petstoreFixture = fileURLToPath(
  new URL("../../../test-fixtures/petstore-3.0.yaml", import.meta.url),
);

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "docs-platform-cache-test-"));
  clearParseCache(); // isolate each test from cache state left by others
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe("parseOpenApiDocumentCached", () => {
  it("serves a cached result even after the underlying file is deleted (proves it's not re-reading)", async () => {
    const tempSpec = join(tempDir, "spec.yaml");
    copyFileSync(petstoreFixture, tempSpec);

    const first = await parseOpenApiDocumentCached(tempSpec, "cached-id");
    expect(first.ok).toBe(true);

    rmSync(tempSpec); // if the cache weren't working, the next call would fail here

    const second = await parseOpenApiDocumentCached(tempSpec, "cached-id");
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.data.title).toBe("Swagger Petstore");
  });

  it("keys the cache by id as well as source, so a different id is NOT served the other id's cached result", async () => {
    const tempSpec = join(tempDir, "spec.yaml");
    copyFileSync(petstoreFixture, tempSpec);

    await parseOpenApiDocumentCached(tempSpec, "id-a");
    rmSync(tempSpec);

    // "id-b" was never cached for this path — with the file now gone, this
    // MUST fail, proving the cache key isn't accidentally just the path
    const result = await parseOpenApiDocumentCached(tempSpec, "id-b");
    expect(result.ok).toBe(false);
  });

  it("does not cache a failed parse — a later successful attempt for the same key works", async () => {
    const tempSpec = join(tempDir, "spec.yaml");
    // file doesn't exist yet -> first call must fail
    const first = await parseOpenApiDocumentCached(tempSpec, "retry-id");
    expect(first.ok).toBe(false);

    copyFileSync(petstoreFixture, tempSpec); // now make it real

    const second = await parseOpenApiDocumentCached(tempSpec, "retry-id");
    expect(second.ok).toBe(true);
  });

  it("dedupes concurrent requests for the same (id, source) into one in-flight promise", () => {
    const tempSpec = join(tempDir, "spec.yaml");
    copyFileSync(petstoreFixture, tempSpec);

    // Both calls happen synchronously, before either has a chance to
    // resolve — the second one must find the first's promise already in the
    // cache (set synchronously, before any await) rather than starting a
    // second parse.
    const promiseA = parseOpenApiDocumentCached(tempSpec, "concurrent-id");
    const promiseB = parseOpenApiDocumentCached(tempSpec, "concurrent-id");

    expect(promiseA).toBe(promiseB); // same object reference, not just equal results
  });

  it("keys the cache by content for object input, so two different inline objects under the same id don't collide", async () => {
    const specA = {
      openapi: "3.0.0",
      info: { title: "Spec A", version: "1.0.0" },
      paths: {},
    };
    const specB = {
      openapi: "3.0.0",
      info: { title: "Spec B", version: "1.0.0" },
      paths: {},
    };

    const resultA = await parseOpenApiDocumentCached(specA, "same-id");
    const resultB = await parseOpenApiDocumentCached(specB, "same-id");

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    if (!resultA.ok || !resultB.ok) return;
    expect(resultA.data.title).toBe("Spec A");
    expect(resultB.data.title).toBe("Spec B"); // not served spec A's cached result
  });

  it("dedupes concurrent requests for the same (id, object-source) into one in-flight promise", () => {
    const spec = { openapi: "3.0.0", info: { title: "Spec", version: "1.0.0" }, paths: {} };

    const promiseA = parseOpenApiDocumentCached(spec, "object-concurrent-id");
    const promiseB = parseOpenApiDocumentCached(spec, "object-concurrent-id");

    expect(promiseA).toBe(promiseB);
  });

  it("clearParseCache forces a real re-parse for that key afterward", async () => {
    const tempSpec = join(tempDir, "spec.yaml");
    copyFileSync(petstoreFixture, tempSpec);

    await parseOpenApiDocumentCached(tempSpec, "clearable-id");
    rmSync(tempSpec);
    clearParseCache(tempSpec, "clearable-id");

    // cache was explicitly cleared, and the file is gone -> must fail now
    const result = await parseOpenApiDocumentCached(tempSpec, "clearable-id");
    expect(result.ok).toBe(false);
  });
});
