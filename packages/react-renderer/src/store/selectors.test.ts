import { describe, expect, it } from "vitest";
import type { NormalizedSpec, Operation } from "@docs-platform/core";
import { getCanonicalTagName, selectOperationsByTag, UNTAGGED } from "./selectors.js";

function makeOperation(overrides: Partial<Operation>): Operation {
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

function makeSpec(operations: Operation[]): NormalizedSpec {
  return {
    id: "s",
    version: "1.0.0",
    title: "S",
    tags: [],
    operations,
    schemas: {},
    securitySchemes: {},
    servers: [],
  };
}

describe("selectOperationsByTag", () => {
  it("groups operations under each of their tags", () => {
    const listUsers = makeOperation({ operationId: "listUsers", tagNames: ["Users"] });
    const createUser = makeOperation({ operationId: "createUser", tagNames: ["Users"] });
    const spec = makeSpec([listUsers, createUser]);

    const grouped = selectOperationsByTag(spec);
    expect(grouped.Users).toHaveLength(2);
  });

  it("puts an operation under EVERY tag it declares, not just the first", () => {
    const op = makeOperation({ operationId: "adminListUsers", tagNames: ["Users", "Admin"] });
    const spec = makeSpec([op]);

    const grouped = selectOperationsByTag(spec);
    expect(grouped.Users?.[0]?.operationId).toBe("adminListUsers");
    expect(grouped.Admin?.[0]?.operationId).toBe("adminListUsers");
  });

  it("buckets untagged operations under 'Untagged' rather than dropping them", () => {
    const op = makeOperation({ operationId: "orphan", tagNames: [] });
    const spec = makeSpec([op]);

    const grouped = selectOperationsByTag(spec);
    expect(grouped.Untagged).toHaveLength(1);
  });

  it("memoizes: calling twice with the SAME spec object returns the identical result object, not a recomputed copy", () => {
    const spec = makeSpec([makeOperation({ tagNames: ["Users"] })]);

    const first = selectOperationsByTag(spec);
    const second = selectOperationsByTag(spec);

    expect(second).toBe(first); // reference equality — proves it wasn't recomputed
  });

  it("does NOT share cache entries between two different (even if structurally similar) spec objects", () => {
    const specA = makeSpec([makeOperation({ operationId: "a", tagNames: ["Users"] })]);
    const specB = makeSpec([makeOperation({ operationId: "b", tagNames: ["Users"] })]);

    const groupedA = selectOperationsByTag(specA);
    const groupedB = selectOperationsByTag(specB);

    expect(groupedA).not.toBe(groupedB);
    expect(groupedA.Users?.[0]?.operationId).toBe("a");
    expect(groupedB.Users?.[0]?.operationId).toBe("b");
  });
});

describe("getCanonicalTagName", () => {
  it("uses the single declared tag when there is exactly one", () => {
    const op = makeOperation({ tagNames: ["Pets"] });
    expect(getCanonicalTagName(op)).toBe("Pets");
  });

  it("uses tagNames[0] — the spec author's declared order — when an operation has multiple tags", () => {
    const op = makeOperation({ tagNames: ["Users", "Admin"] });
    expect(getCanonicalTagName(op)).toBe("Users");
  });

  it("falls back to the UNTAGGED sentinel for an operation with no tags, matching selectOperationsByTag's grouping", () => {
    const op = makeOperation({ tagNames: [] });
    expect(getCanonicalTagName(op)).toBe(UNTAGGED);
    expect(getCanonicalTagName(op)).toBe("Untagged");
  });

  // QA/hardening pass: the same 3 real multi-tag combinations from the large
  // synthetic stress-test fixture (packages/core/test-fixtures/large-spec.json)
  // — proves the M19 deep-link "canonical tag" rule holds for the actual
  // multi-tag shapes a larger real-world-ish document produces, not just a
  // 2-tag toy example.
  it("resolves the canonical tag correctly for the stress-fixture's real multi-tag operations", () => {
    expect(getCanonicalTagName(makeOperation({ tagNames: ["Reports", "Admin"] }))).toBe("Reports");
    expect(getCanonicalTagName(makeOperation({ tagNames: ["Orders", "Admin"] }))).toBe("Orders");
    expect(
      getCanonicalTagName(makeOperation({ tagNames: ["Notifications", "Users"] })),
    ).toBe("Notifications");
  });
});
