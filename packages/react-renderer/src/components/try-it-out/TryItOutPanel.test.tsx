// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Operation, Parameter } from "@docs-platform/core";
import { TryItOutPanel } from "./TryItOutPanel.js";

function makeParam(overrides: Partial<Parameter>): Parameter {
  return { name: "id", in: "path", required: true, schema: { type: "string" }, ...overrides };
}

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

describe("TryItOutPanel", () => {
  it("renders as a labeled region titled 'Try It Out'", () => {
    render(<TryItOutPanel operation={makeOperation({})} />);
    expect(screen.getByRole("region", { name: "Try It Out" })).toBeInTheDocument();
  });

  it("delegates the actual request-building UI to RequestBuilder", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });
    render(<TryItOutPanel operation={operation} />);

    expect(screen.getByText("userId")).toBeInTheDocument();
  });

  it("still renders the panel (with its graceful empty state) for an operation with no request inputs", () => {
    render(<TryItOutPanel operation={makeOperation({})} />);

    expect(screen.getByRole("region", { name: "Try It Out" })).toBeInTheDocument();
    expect(screen.getByText(/no editable request inputs/i)).toBeInTheDocument();
  });
});
