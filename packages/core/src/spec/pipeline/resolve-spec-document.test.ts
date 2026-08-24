import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveSpecDocument } from "./resolve-spec-document.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("resolveSpecDocument", () => {
  it("fully dereferences a real spec with $refs (petstore-expanded)", async () => {
    const result = await resolveSpecDocument(fixture("petstore-3.0.yaml"));

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrows the type for the assertions below

    const raw = JSON.stringify(result.data);
    expect(raw).not.toContain('"$ref"');
    expect(result.data.openapi).toBe("3.0.0");
    expect(result.data.paths).toBeDefined();
  });

  it("returns a structured error for a dangling $ref instead of throwing", async () => {
    const result = await resolveSpecDocument(fixture("broken-dangling-ref.yaml"));

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.stage).toBe("validate");
    expect(result.error.message).toBeTruthy();
  });

  it("returns a structured error for a nonexistent file instead of throwing", async () => {
    const result = await resolveSpecDocument(fixture("does-not-exist.yaml"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
  });

  it("accepts an already-parsed OpenAPI object (no path/URL at all) and dereferences its internal $refs", async () => {
    const result = await resolveSpecDocument({
      openapi: "3.0.0",
      info: { title: "Inline API", version: "1.0.0" },
      paths: {
        "/widgets": {
          get: {
            operationId: "listWidgets",
            responses: {
              "200": {
                description: "OK",
                content: {
                  "application/json": {
                    schema: { $ref: "#/components/schemas/Widget" },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Widget: { type: "object", properties: { id: { type: "string" } } },
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const raw = JSON.stringify(result.data);
    expect(raw).not.toContain('"$ref"');
    expect(result.data.openapi).toBe("3.0.0");
  });

  it("returns a structured error for an invalid inline object instead of throwing", async () => {
    const result = await resolveSpecDocument({ not: "an openapi document" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
  });

  it("fails with a structured error within the configured http timeout, instead of hanging indefinitely, when a request never responds", async () => {
    // A real server that accepts the connection but deliberately never
    // writes a response — the same "hung upstream" scenario the production
    // UX audit found (an indefinite wait with no eventual error). A short
    // httpTimeoutMs override keeps this test fast; production uses
    // DEFAULT_SPEC_HTTP_TIMEOUT_MS (15s).
    const server = createServer(() => {
      // no res.end() — the request is left hanging on purpose
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${port}/openapi.json`;

    const startedAt = Date.now();
    const result = await resolveSpecDocument(url, { httpTimeoutMs: 100 });
    const elapsedMs = Date.now() - startedAt;

    server.close();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.stage).toBe("validate");
    // Bounded by the timeout (plus reasonable overhead), not the previous
    // unbounded hang — this is the actual assertion the fix is for.
    expect(elapsedMs).toBeLessThan(5000);
  });
});
