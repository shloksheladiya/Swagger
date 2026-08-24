import { describe, expect, it } from "vitest";
import type { Operation } from "../spec/normalized-spec.js";
import { scoreOperationMatch } from "./score-operation-match.js";

function makeOp(overrides: Partial<Operation> = {}): Operation {
  return {
    operationId: "listUsers",
    path: "/users",
    method: "get",
    summary: "List all users",
    description: "Returns a paginated list of user accounts.",
    tagNames: ["Users", "Admin"],
    parameters: [],
    responses: [],
    security: [],
    ...overrides,
  };
}

describe("scoreOperationMatch", () => {
  it("returns 0 for an empty query", () => {
    expect(scoreOperationMatch(makeOp(), "")).toBe(0);
    expect(scoreOperationMatch(makeOp(), "   ")).toBe(0);
  });

  it("returns 0 when nothing matches", () => {
    expect(scoreOperationMatch(makeOp(), "zzz-nonexistent-zzz")).toBe(0);
  });

  it("matches on operationId, case-insensitively", () => {
    expect(scoreOperationMatch(makeOp(), "listusers")).toBeGreaterThan(0);
    expect(scoreOperationMatch(makeOp(), "LISTUSERS")).toBeGreaterThan(0);
  });

  it("matches on path", () => {
    expect(scoreOperationMatch(makeOp(), "/users")).toBeGreaterThan(0);
  });

  it("matches on summary", () => {
    const op = makeOp({ operationId: "op1", path: "/x", summary: "A very specific summary" });
    expect(scoreOperationMatch(op, "specific")).toBeGreaterThan(0);
  });

  it("matches on tag names", () => {
    const op = makeOp({ operationId: "op1", path: "/x", summary: undefined, tagNames: ["Billing"] });
    expect(scoreOperationMatch(op, "billing")).toBeGreaterThan(0);
  });

  it("matches on description as a last resort", () => {
    const op = makeOp({
      operationId: "op1",
      path: "/x",
      summary: undefined,
      tagNames: [],
      description: "mentions widgets nowhere else",
    });
    expect(scoreOperationMatch(op, "widgets")).toBeGreaterThan(0);
  });

  it("weights operationId/path matches higher than a description-only match", () => {
    const idMatch = makeOp({
      operationId: "specialOperation",
      summary: undefined,
      tagNames: [],
      description: "nothing relevant",
    });
    const descriptionOnlyMatch = makeOp({
      operationId: "unrelated",
      path: "/unrelated",
      summary: undefined,
      tagNames: [],
      description: "mentions specialOperation only here",
    });

    const idScore = scoreOperationMatch(idMatch, "specialOperation");
    const descriptionScore = scoreOperationMatch(descriptionOnlyMatch, "specialOperation");

    expect(idScore).toBeGreaterThan(descriptionScore);
  });

  it("sums weights when a query matches multiple fields at once", () => {
    // "users" matches operationId ("listUsers"), path ("/users"), AND a tag ("Users")
    const op = makeOp();
    const multiFieldScore = scoreOperationMatch(op, "users");

    const singleFieldOnly = makeOp({
      operationId: "op1",
      path: "/x",
      tagNames: [],
      summary: "mentions users only here",
    });
    const singleFieldScore = scoreOperationMatch(singleFieldOnly, "users");

    expect(multiFieldScore).toBeGreaterThan(singleFieldScore);
  });

  it("does not throw when summary/description are absent", () => {
    const bareOp = makeOp({ summary: undefined, description: undefined, tagNames: [] });
    expect(() => scoreOperationMatch(bareOp, "anything")).not.toThrow();
    expect(scoreOperationMatch(bareOp, "listUsers")).toBeGreaterThan(0); // still matches via operationId
  });
});
