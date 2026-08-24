import { describe, expect, it } from "vitest";
import type { Parameter } from "@docs-platform/core";
import { groupParametersByLocation } from "./group-parameters-by-location.js";

function makeParam(overrides: Partial<Parameter>): Parameter {
  return {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string" },
    ...overrides,
  };
}

describe("groupParametersByLocation", () => {
  it("returns all-empty groups for an empty parameter list", () => {
    expect(groupParametersByLocation([])).toEqual({
      path: [],
      query: [],
      header: [],
      cookie: [],
    });
  });

  it("partitions a mixed-location list into the correct buckets", () => {
    const userId = makeParam({ name: "userId", in: "path" });
    const limit = makeParam({ name: "limit", in: "query", required: false });
    const apiKey = makeParam({ name: "X-Api-Key", in: "header", required: false });
    const session = makeParam({ name: "session", in: "cookie", required: false });

    const grouped = groupParametersByLocation([userId, limit, apiKey, session]);

    expect(grouped.path).toEqual([userId]);
    expect(grouped.query).toEqual([limit]);
    expect(grouped.header).toEqual([apiKey]);
    expect(grouped.cookie).toEqual([session]);
  });

  it("preserves input order within each bucket", () => {
    const first = makeParam({ name: "a", in: "query", required: false });
    const second = makeParam({ name: "b", in: "query", required: false });

    const grouped = groupParametersByLocation([second, first]);

    expect(grouped.query).toEqual([second, first]);
  });

  it("puts multiple parameters sharing a location all in the same bucket", () => {
    const path1 = makeParam({ name: "orgId", in: "path" });
    const path2 = makeParam({ name: "userId", in: "path" });

    const grouped = groupParametersByLocation([path1, path2]);

    expect(grouped.path).toHaveLength(2);
    expect(grouped.query).toHaveLength(0);
  });
});
