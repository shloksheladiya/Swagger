import { describe, expect, it } from "vitest";
import type { Operation, Tag } from "@docs-platform/core";
import { buildSidebarRows } from "./build-sidebar-rows.js";
import { selectOperationsByTag } from "../../store/selectors.js";

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

const tags: Tag[] = [{ name: "Users" }, { name: "Admin" }];
const operationsByTag: Record<string, Operation[]> = {
  Users: [makeOp("listUsers"), makeOp("createUser")],
  Admin: [makeOp("banUser")],
};

describe("buildSidebarRows", () => {
  it("produces only header rows when nothing is expanded", () => {
    const rows = buildSidebarRows(tags, operationsByTag, new Set());

    expect(rows).toEqual([
      { type: "header", tagName: "Users" },
      { type: "header", tagName: "Admin" },
    ]);
  });

  it("interleaves a tag's item rows immediately after its header, only for expanded tags", () => {
    const rows = buildSidebarRows(tags, operationsByTag, new Set(["Users"]));

    expect(rows).toHaveLength(4); // Users header + 2 items, Admin header
    expect(rows[0]).toEqual({ type: "header", tagName: "Users" });
    expect(rows[1]).toMatchObject({ type: "item", operation: { operationId: "listUsers" } });
    expect(rows[2]).toMatchObject({ type: "item", operation: { operationId: "createUser" } });
    expect(rows[3]).toEqual({ type: "header", tagName: "Admin" });
  });

  it("expands multiple tags independently, preserving tag order", () => {
    const rows = buildSidebarRows(tags, operationsByTag, new Set(["Users", "Admin"]));

    expect(rows.map((r) => (r.type === "header" ? `H:${r.tagName}` : `I:${r.operation.operationId}`))).toEqual([
      "H:Users",
      "I:listUsers",
      "I:createUser",
      "H:Admin",
      "I:banUser",
    ]);
  });

  it("handles a tag with no operations gracefully (empty group, still expandable)", () => {
    const rows = buildSidebarRows(
      [{ name: "Empty" }],
      {},
      new Set(["Empty"]),
    );

    expect(rows).toEqual([{ type: "header", tagName: "Empty" }]);
  });

  it("returns an empty array for a spec with no tags at all", () => {
    expect(buildSidebarRows([], {}, new Set())).toEqual([]);
  });

  it("includes an Untagged bucket (not in spec.tags) appended after declared tags, rather than dropping it", () => {
    const orphan = makeOp("orphan");
    const rows = buildSidebarRows(
      tags, // "Users", "Admin" — does NOT include "Untagged"
      { ...operationsByTag, Untagged: [orphan] },
      new Set(["Untagged"]),
    );

    const headerNames = rows.filter((r) => r.type === "header").map((r) => r.tagName);
    expect(headerNames).toEqual(["Users", "Admin", "Untagged"]); // declared tags first, Untagged last

    const untaggedItem = rows.find(
      (r) => r.type === "item" && r.operation.operationId === "orphan",
    );
    expect(untaggedItem).toBeDefined();
  });

  // QA/hardening pass: mirrors the shape of the large synthetic stress-test
  // fixture (packages/core/test-fixtures/large-spec.json) — 12 tags, 60
  // operations, 3 genuinely multi-tag operations, 1 untagged operation — to
  // prove tag-grouping + row-flattening still behave correctly together at
  // that scale, not just with the 2-tag/3-operation fixtures above. Built
  // synthetically here (rather than importing the real fixture) so this
  // react-renderer test doesn't reach into core's private test-fixtures
  // directory — see stress-test-openapi-spec.ts's header comment for the
  // same reasoning applied to docs-app.
  describe("at stress-fixture scale (12 tags, 60 operations, multi-tag + untagged)", () => {
    const STRESS_TAG_NAMES = [
      "Users",
      "Products",
      "Orders",
      "Payments",
      "Inventory",
      "Webhooks",
      "Notifications",
      "Shipments",
      "Reviews",
      "Support",
      "Reports",
      "Admin",
    ];

    function buildStressSpec() {
      const operations: Operation[] = [];
      for (const tagName of STRESS_TAG_NAMES) {
        for (let i = 0; i < 5; i++) {
          operations.push(makeOp(`${tagName.toLowerCase()}Op${i}`));
          operations[operations.length - 1]!.tagNames = [tagName];
        }
      }
      // 3 real multi-tag operations, same combinations as the real fixture
      const multiTag1 = makeOp("getAnnualReport");
      multiTag1.tagNames = ["Reports", "Admin"];
      const multiTag2 = makeOp("cancelOrder");
      multiTag2.tagNames = ["Orders", "Admin"];
      const multiTag3 = makeOp("getNotificationPreferences");
      multiTag3.tagNames = ["Notifications", "Users"];
      // 1 untagged operation
      const untagged = makeOp("getHealth");
      untagged.tagNames = [];

      operations.push(multiTag1, multiTag2, multiTag3, untagged);

      const tags: Tag[] = STRESS_TAG_NAMES.map((name) => ({ name }));
      return {
        id: "stress",
        version: "1.0.0",
        title: "Stress Test API",
        tags,
        operations,
        schemas: {},
        securitySchemes: {},
        servers: [],
      };
    }

    it("groups every operation under all its declared tags, plus an Untagged bucket, at this scale", () => {
      const spec = buildStressSpec();
      const grouped = selectOperationsByTag(spec);

      expect(grouped.Reports?.some((op) => op.operationId === "getAnnualReport")).toBe(true);
      expect(grouped.Admin?.some((op) => op.operationId === "getAnnualReport")).toBe(true);
      expect(grouped.Admin?.some((op) => op.operationId === "cancelOrder")).toBe(true);
      expect(grouped.Notifications?.some((op) => op.operationId === "getNotificationPreferences")).toBe(
        true,
      );
      expect(grouped.Users?.some((op) => op.operationId === "getNotificationPreferences")).toBe(true);
      expect(grouped.Untagged).toHaveLength(1);
      expect(grouped.Untagged?.[0]?.operationId).toBe("getHealth");
    });

    it("produces one header per declared tag plus one Untagged header, with no duplicate or missing headers", () => {
      const spec = buildStressSpec();
      const grouped = selectOperationsByTag(spec);
      const rows = buildSidebarRows(spec.tags, grouped, new Set());

      const headerNames = rows.filter((r) => r.type === "header").map((r) => r.tagName);
      expect(headerNames).toEqual([...STRESS_TAG_NAMES, "Untagged"]);
      expect(new Set(headerNames).size).toBe(headerNames.length); // no duplicates
    });

    it("expanding every tag surfaces every operation exactly once per tag it declares (multi-tag ops appear twice, by design)", () => {
      const spec = buildStressSpec();
      const grouped = selectOperationsByTag(spec);
      const allTagNames = new Set([...STRESS_TAG_NAMES, "Untagged"]);
      const rows = buildSidebarRows(spec.tags, grouped, allTagNames);

      const itemRows = rows.filter((r) => r.type === "item");
      const annualReportAppearances = itemRows.filter(
        (r) => r.operation.operationId === "getAnnualReport",
      );
      // Appears once under Reports and once under Admin — this is
      // selectOperationsByTag's documented multi-tag behavior, not a bug.
      expect(annualReportAppearances).toHaveLength(2);

      const healthAppearances = itemRows.filter((r) => r.operation.operationId === "getHealth");
      expect(healthAppearances).toHaveLength(1);
    });
  });
});
