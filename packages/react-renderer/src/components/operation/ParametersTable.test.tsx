// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { Parameter } from "@docs-platform/core";
import { ParametersTable } from "./ParametersTable.js";

function makeParam(overrides: Partial<Parameter>): Parameter {
  return {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string" },
    ...overrides,
  };
}

describe("ParametersTable", () => {
  it("renders nothing at all for an empty parameter list", () => {
    const { container } = render(<ParametersTable parameters={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a row with name, location, type, required, and description", () => {
    const param = makeParam({
      name: "userId",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "The user's unique identifier",
    });
    render(<ParametersTable parameters={[param]} />);

    // Scoped to the data row specifically — the column HEADER also literally
    // says "Required", so an unscoped getByText("Required") is ambiguous
    // between the header and this row's cell (verified: that's exactly what
    // failed here initially).
    const rows = screen.getAllByRole("row");
    const dataRow = within(rows[1] as HTMLElement);

    expect(dataRow.getByText("userId")).toBeInTheDocument();
    expect(dataRow.getByText("path")).toBeInTheDocument();
    expect(dataRow.getByText("string")).toBeInTheDocument();
    expect(dataRow.getByText("Required")).toBeInTheDocument();
    expect(dataRow.getByText("The user's unique identifier")).toBeInTheDocument();
  });

  it("shows 'Optional' for a non-required parameter", () => {
    render(<ParametersTable parameters={[makeParam({ required: false })]} />);
    expect(screen.getByText("Optional")).toBeInTheDocument(); // no header collision for this one
  });

  it("falls back to an em dash when the schema has no type, rather than showing blank or crashing", () => {
    render(<ParametersTable parameters={[makeParam({ schema: {} })]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders correctly when description is absent", () => {
    const param = makeParam({ description: undefined });
    expect(() => render(<ParametersTable parameters={[param]} />)).not.toThrow();
  });

  it("renders one row per parameter, including two parameters with the same name in different locations", () => {
    // a real, if unusual, case: an "id" in the path AND an unrelated "id" query param
    const pathId = makeParam({ name: "id", in: "path" });
    const queryId = makeParam({ name: "id", in: "query", required: false });
    render(<ParametersTable parameters={[pathId, queryId]} />);

    const rows = screen.getAllByText("id");
    expect(rows).toHaveLength(2);
  });
});
