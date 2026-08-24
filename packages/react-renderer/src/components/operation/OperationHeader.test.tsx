// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Operation } from "@docs-platform/core";
import { OperationHeader } from "./OperationHeader.js";

function makeOp(overrides: Partial<Operation> = {}): Operation {
  return {
    operationId: "listUsers",
    path: "/users",
    method: "get",
    tagNames: [],
    parameters: [],
    responses: [],
    security: [],
    ...overrides,
  };
}

describe("OperationHeader", () => {
  it("renders the method and path", () => {
    render(<OperationHeader operation={makeOp({ method: "post", path: "/users" })} />);

    // CSS `uppercase` is a visual transform only — the actual DOM text stays
    // lowercase, since that's what Operation.method's type is (HttpMethod).
    expect(screen.getByText("post")).toBeInTheDocument();
    expect(screen.getByText("/users")).toBeInTheDocument();
  });

  it("renders the summary as a heading when present", () => {
    render(<OperationHeader operation={makeOp({ summary: "List all users" })} />);

    expect(screen.getByRole("heading", { name: "List all users" })).toBeInTheDocument();
  });

  it("renders no heading at all when summary is absent, rather than an empty one", () => {
    render(<OperationHeader operation={makeOp({ summary: undefined })} />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("renders correctly for every HTTP method, not just get/post", () => {
    const methods: Operation["method"][] = ["get", "post", "put", "patch", "delete", "options", "head"];

    for (const method of methods) {
      const { unmount } = render(<OperationHeader operation={makeOp({ method })} />);
      expect(screen.getByText(method)).toBeInTheDocument();
      unmount();
    }
  });
});
