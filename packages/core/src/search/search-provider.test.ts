import { describe, expect, it } from "vitest";
import type { Operation } from "../spec/normalized-spec.js";
import type { SearchProvider } from "./search-provider.js";
import { defaultSearchProvider } from "./search-provider.js";

function makeOp(operationId: string, summary: string): Operation {
  return {
    operationId,
    path: `/${operationId}`,
    method: "get",
    summary,
    tagNames: [],
    parameters: [],
    responses: [],
    security: [],
  };
}

const operations = [makeOp("listUsers", "List users"), makeOp("listPets", "List pets")];

// Simulates how a real consumer (the future SearchBar component) would use
// a SearchProvider — depending only on the interface, never on a concrete
// implementation. This is the actual thing worth testing about an interface:
// not "does the default work" (already covered in Part 2), but "can this be
// genuinely substituted."
function runSearch(provider: SearchProvider, query: string): string[] {
  return provider.search(operations, query).map((r) => r.operation.operationId);
}

describe("SearchProvider", () => {
  it("defaultSearchProvider behaves identically to calling searchOperations directly", () => {
    expect(runSearch(defaultSearchProvider, "users")).toEqual(["listUsers"]);
  });

  it("a consumer coded against the interface works with a completely different implementation", () => {
    const alwaysReturnsEverything: SearchProvider = {
      search: (ops) => ops.map((operation) => ({ operation, score: 1 })),
    };

    // Same `runSearch` helper, same call shape, totally different behavior —
    // this is the actual proof the abstraction works: nothing about the
    // consumer needed to change.
    expect(runSearch(alwaysReturnsEverything, "literally anything")).toEqual([
      "listUsers",
      "listPets",
    ]);
  });

  it("a provider that never matches anything is equally valid — the interface doesn't assume matching behavior", () => {
    const alwaysEmpty: SearchProvider = { search: () => [] };
    expect(runSearch(alwaysEmpty, "users")).toEqual([]);
  });
});
