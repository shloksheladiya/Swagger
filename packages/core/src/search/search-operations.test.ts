import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Operation } from "../spec/normalized-spec.js";
import { parseOpenApiDocument } from "../spec/pipeline/parse-openapi-document.js";
import { searchOperations } from "./search-operations.js";

function makeOp(overrides: Partial<Operation>): Operation {
  return {
    operationId: "op",
    path: "/x",
    method: "get",
    tagNames: [],
    parameters: [],
    responses: [],
    security: [],
    ...overrides,
  };
}

describe("searchOperations", () => {
  const listUsers = makeOp({ operationId: "listUsers", path: "/users", summary: "List users" });
  const createUser = makeOp({ operationId: "createUser", path: "/users", summary: "Create a user" });
  const listPets = makeOp({ operationId: "listPets", path: "/pets", summary: "List pets" });
  const operations = [listUsers, createUser, listPets];

  it("returns an empty array for an empty query — showing 'everything' is the caller's job, not search's", () => {
    expect(searchOperations(operations, "")).toEqual([]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(searchOperations(operations, "zzz-nonexistent")).toEqual([]);
  });

  it("excludes non-matching operations entirely, not just ranks them last", () => {
    const results = searchOperations(operations, "pets");
    expect(results).toHaveLength(1);
    expect(results[0]?.operation.operationId).toBe("listPets");
  });

  it("ranks stronger matches first (operationId match beats description-only match)", () => {
    const strongMatch = makeOp({ operationId: "widgets", path: "/w" });
    const weakMatch = makeOp({
      operationId: "other",
      path: "/o",
      description: "mentions widgets once",
    });

    const results = searchOperations([weakMatch, strongMatch], "widgets");

    expect(results).toHaveLength(2);
    expect(results[0]?.operation.operationId).toBe("widgets"); // stronger match first, despite array order
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("returns every operation matching a broader query, ranked correctly", () => {
    const results = searchOperations(operations, "users");

    // both listUsers and createUser match "users" (operationId + path); listPets does not
    expect(results.map((r) => r.operation.operationId).sort()).toEqual([
      "createUser",
      "listUsers",
    ]);
    expect(results.every((r) => r.score > 0)).toBe(true);
  });

  it("returns an empty array for an empty operations list, regardless of query", () => {
    expect(searchOperations([], "anything")).toEqual([]);
  });

  // QA/hardening pass: the fixtures above are small enough that ranking bugs
  // could hide behind "there were only 3 candidates anyway". Running the
  // same searchOperations against the real 60-operation stress fixture
  // proves scoring/filtering/stable-sort still behave correctly once there
  // are dozens of real candidates with overlapping vocabulary (multiple
  // "list"/"create"/"get"/"update"/"delete" operations across 10 resource
  // types), not just a handful of hand-picked ones.
  describe("against the large synthetic stress-test fixture (60 operations)", () => {
    const fixture = fileURLToPath(
      new URL("../../test-fixtures/large-spec.json", import.meta.url),
    );

    async function loadStressOperations(): Promise<Operation[]> {
      const result = await parseOpenApiDocument(fixture, "stress-test-search");
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("fixture failed to parse");
      return result.data.operations;
    }

    it("finds every matching operation across a tag-name query, not just the first few", async () => {
      const operations = await loadStressOperations();
      const results = searchOperations(operations, "orders");

      // Every operation path-scoped under /orders (list/create/get/update/
      // delete/cancel) should match a query for its own resource name.
      expect(results.length).toBeGreaterThanOrEqual(5);
      expect(results.every((r) => r.score > 0)).toBe(true);
      expect(results.some((r) => r.operation.operationId === "cancelOrder")).toBe(true);
    });

    it("ranks an exact operationId match above operations that merely mention the term", async () => {
      const operations = await loadStressOperations();
      const results = searchOperations(operations, "getHealth");

      expect(results[0]?.operation.operationId).toBe("getHealth");
    });

    it("still excludes non-matches entirely at this larger scale", async () => {
      const operations = await loadStressOperations();
      const results = searchOperations(operations, "zzz-nonexistent-term");

      expect(results).toEqual([]);
    });

    it("matches the intentionally long operationId used for the overflow/wrapping stress case", async () => {
      const operations = await loadStressOperations();
      const results = searchOperations(operations, "overflow");

      expect(
        results.some((r) =>
          r.operation.operationId.includes(
            "OverflowAndWrappingBehaviorTesting",
          ),
        ),
      ).toBe(true);
    });
  });
});
