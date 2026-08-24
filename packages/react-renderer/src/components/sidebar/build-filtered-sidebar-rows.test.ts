import { describe, expect, it } from "vitest";
import type { Operation, SearchProvider, Tag } from "@docs-platform/core";
import { buildFilteredSidebarRows } from "./build-filtered-sidebar-rows.js";

function makeOp(operationId: string): Operation {
  return {
    operationId,
    path: `/${operationId}`,
    method: "get",
    tagNames: [],
    parameters: [],
    responses: [],
    security: [],
  };
}

const tags: Tag[] = [{ name: "Users" }, { name: "Pets" }];
const listUsers = makeOp("listUsers");
const createUser = makeOp("createUser");
const listPets = makeOp("listPets");
const operationsByTag = {
  Users: [listUsers, createUser],
  Pets: [listPets],
};

// A fake provider with fully controlled, predictable matches — keeps these
// tests independent of core's real scoring behavior (already covered by
// core's own test suite) and focused purely on this function's own logic:
// filtering, hiding empty tags, and order preservation.
function fakeProviderMatching(...operationIds: string[]): SearchProvider {
  const matchSet = new Set(operationIds);
  return {
    search: (operations) =>
      operations
        .filter((op) => matchSet.has(op.operationId))
        .map((operation) => ({ operation, score: 1 })),
  };
}

describe("buildFilteredSidebarRows", () => {
  it("shows only tags containing a match, omitting tags with zero matches entirely", () => {
    const rows = buildFilteredSidebarRows(
      tags,
      operationsByTag,
      "listUsers",
      fakeProviderMatching("listUsers"),
    );

    const headerNames = rows.filter((r) => r.type === "header").map((r) => r.tagName);
    expect(headerNames).toEqual(["Users"]); // "Pets" omitted — it has no matches
  });

  it("includes only the matching operations within a matched tag, not all of them", () => {
    const rows = buildFilteredSidebarRows(
      tags,
      operationsByTag,
      "listUsers",
      fakeProviderMatching("listUsers"),
    );

    const items = rows.filter((r) => r.type === "item");
    expect(items).toHaveLength(1);
    expect(items[0]?.operation.operationId).toBe("listUsers");
  });

  it("preserves original operation order within a tag, not search-score order", () => {
    // fakeProvider returns matches in reversed order — but operationsByTag.Users
    // is [listUsers, createUser]. The ORIGINAL order must win in the output,
    // proving score/provider order isn't used for display order. Filters by
    // query itself (unlike the other fakes above) so it doesn't accidentally
    // "match" listPets too, once every tag's operations get flattened together.
    const reorderingProvider: SearchProvider = {
      search: (operations) =>
        [...operations]
          .filter((op) => op.operationId.toLowerCase().includes("user"))
          .reverse()
          .map((operation) => ({ operation, score: 1 })),
    };

    const rows = buildFilteredSidebarRows(tags, operationsByTag, "user", reorderingProvider);
    const items = rows.filter((r) => r.type === "item");

    expect(items.map((r) => (r.type === "item" ? r.operation.operationId : null))).toEqual([
      "listUsers",
      "createUser",
    ]); // original operationsByTag order, not the provider's reversed order
  });

  it("returns an empty array when nothing matches at all", () => {
    const rows = buildFilteredSidebarRows(tags, operationsByTag, "nothing", fakeProviderMatching());
    expect(rows).toEqual([]);
  });

  it("includes a synthetic tag bucket (e.g. Untagged) not present in the declared tags, same as buildSidebarRows", () => {
    const orphan = makeOp("orphan");
    const rows = buildFilteredSidebarRows(
      tags,
      { ...operationsByTag, Untagged: [orphan] },
      "orphan",
      fakeProviderMatching("orphan"),
    );

    const headerNames = rows.filter((r) => r.type === "header").map((r) => r.tagName);
    expect(headerNames).toEqual(["Untagged"]);
  });

  it("uses the real defaultSearchProvider when none is passed explicitly", () => {
    // No fake provider — proves the default parameter actually wires up
    // core's real search, not just that the function accepts an override.
    const rows = buildFilteredSidebarRows(tags, operationsByTag, "listUsers");
    const items = rows.filter((r) => r.type === "item");
    expect(items.map((r) => (r.type === "item" ? r.operation.operationId : null))).toEqual([
      "listUsers",
    ]);
  });
});
