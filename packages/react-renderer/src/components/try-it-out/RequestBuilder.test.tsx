// @vitest-environment jsdom
//
// Integration-style: renders against the REAL useTryItOut hook (Parts A/B),
// not a mock — these tests exercise the actual wiring RequestBuilder is
// responsible for, per "prefer integration-style tests where they provide
// more confidence than testing implementation details".

import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Operation, Parameter, SchemaNode } from "@docs-platform/core";
import { RequestBuilder } from "./RequestBuilder.js";

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

describe("RequestBuilder", () => {
  it("renders a path parameter, clearly marked required", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("Path")).toBeInTheDocument();
    expect(screen.getByText("userId")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
  });

  it("renders a query parameter", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "limit", in: "query", required: false, schema: { type: "integer" } })],
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("Query")).toBeInTheDocument();
    expect(screen.getByText("limit")).toBeInTheDocument();
  });

  it("renders header and cookie parameters when present, and omits sections with nothing to show", () => {
    const operation = makeOperation({
      parameters: [
        makeParam({ name: "X-Api-Key", in: "header", required: false }),
        makeParam({ name: "session", in: "cookie", required: false }),
      ],
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("Headers")).toBeInTheDocument();
    expect(screen.getByText("X-Api-Key")).toBeInTheDocument();
    expect(screen.getByText("Cookies")).toBeInTheDocument();
    expect(screen.getByText("session")).toBeInTheDocument();
    expect(screen.queryByText("Path")).not.toBeInTheDocument();
    expect(screen.queryByText("Query")).not.toBeInTheDocument();
  });

  it("updates the underlying useTryItOut state when a parameter is edited", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });
    render(<RequestBuilder operation={operation} />);

    // Scoped by accessible name — Milestone 15's Base URL field is also a
    // plain textbox now present on every render, so an unscoped
    // getByRole("textbox") would match more than one element.
    const userIdField = screen.getByRole("textbox", { name: /userId/ });
    fireEvent.change(userIdField, { target: { value: "abc-123" } });

    expect(userIdField).toHaveValue("abc-123");
    // the required-error, present before typing, clears once filled in —
    // observable proof the edit reached useTryItOut's real state/validation,
    // not just the input's own DOM value
    expect(screen.queryByText("userId is required")).not.toBeInTheDocument();
  });

  it("shows a required-parameter error before the field is filled in", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("userId is required")).toBeInTheDocument();
  });

  it("renders supported primitive body fields for a JSON request body", () => {
    const bodySchema: SchemaNode = {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "integer" } },
    };
    const operation = makeOperation({
      requestBody: { required: true, content: { "application/json": { schema: bodySchema } } },
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("age")).toBeInTheDocument();
  });

  it("renders nested object body fields", () => {
    const bodySchema: SchemaNode = {
      type: "object",
      properties: { address: { type: "object", properties: { city: { type: "string" } } } },
    };
    const operation = makeOperation({
      requestBody: { required: true, content: { "application/json": { schema: bodySchema } } },
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("address")).toBeInTheDocument();
    expect(screen.getByText("city")).toBeInTheDocument();
  });

  it("supports adding an item to a supported array body field", () => {
    const bodySchema: SchemaNode = { type: "array", items: { type: "string" } };
    const operation = makeOperation({
      requestBody: { required: true, content: { "application/json": { schema: bodySchema } } },
    });
    render(<RequestBuilder operation={operation} />);

    // Milestone 15's Base URL field is a plain textbox present on every
    // render, so "no array items yet" is asserted as a count (1, just Base
    // URL) rather than "no textbox at all".
    expect(screen.getAllByRole("textbox")).toHaveLength(1); // no items yet
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Remove item 1" }));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it("shows an explicit unsupported message for an unsupported body structure, not a fake control", () => {
    const bodySchema: SchemaNode = {
      oneOf: [{ type: "object", properties: { cat: { type: "string" } } }, { type: "object", properties: { dog: { type: "string" } } }],
    };
    const operation = makeOperation({
      requestBody: { required: true, content: { "application/json": { schema: bodySchema } } },
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText(/not editable in this version/i)).toBeInTheDocument();
  });

  it("shows a required body-field error, namespaced separately from parameter errors", () => {
    const bodySchema: SchemaNode = {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    };
    const operation = makeOperation({
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
      requestBody: { required: true, content: { "application/json": { schema: bodySchema } } },
    });
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText("userId is required")).toBeInTheDocument();
    expect(screen.getByText("name is required")).toBeInTheDocument();
  });

  it("resets the form when the operation changes (through the existing hook)", () => {
    const first = makeOperation({
      operationId: "getWidget",
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });
    const second = makeOperation({
      operationId: "getGadget",
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });

    // Scoped by accessible name — see the "updates the underlying
    // useTryItOut state" test above for why an unscoped getByRole("textbox")
    // no longer identifies a single element.
    const { rerender } = render(<RequestBuilder operation={first} />);
    fireEvent.change(screen.getByRole("textbox", { name: /userId/ }), { target: { value: "widget-1" } });
    expect(screen.getByRole("textbox", { name: /userId/ })).toHaveValue("widget-1");

    rerender(<RequestBuilder operation={second} />);

    expect(screen.getByRole("textbox", { name: /userId/ })).toHaveValue("");
  });

  it("renders gracefully for an operation with no parameters and no request body", () => {
    const operation = makeOperation({});
    render(<RequestBuilder operation={operation} />);

    expect(screen.getByText(/no editable request inputs/i)).toBeInTheDocument();
  });
});
