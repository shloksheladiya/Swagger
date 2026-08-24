// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Operation, Parameter, SchemaNode } from "@docs-platform/core";
import { useTryItOut } from "./use-try-it-out.js";

function makeParam(overrides: Partial<Parameter>): Parameter {
  return {
    name: "id",
    in: "path",
    required: true,
    schema: { type: "string" },
    ...overrides,
  };
}

function makeOperation(overrides: Partial<Operation>): Operation {
  return {
    operationId: "getWidget",
    path: "/widgets/{id}",
    method: "get",
    tagNames: [],
    parameters: [],
    responses: [],
    security: [],
    ...overrides,
  };
}

describe("useTryItOut", () => {
  it("initializes empty values for every parameter, grouped by location", () => {
    const operation = makeOperation({
      parameters: [
        makeParam({ name: "id", in: "path", required: true }),
        makeParam({ name: "limit", in: "query", required: false }),
        makeParam({ name: "X-Api-Key", in: "header", required: false }),
      ],
    });

    const { result } = renderHook(() => useTryItOut(operation));

    expect(result.current.values).toEqual({
      path: { id: "" },
      query: { limit: "" },
      header: { "X-Api-Key": "" },
      cookie: {},
      body: null,
    });
  });

  it("initializes an array-typed query parameter to an empty array, not an empty string", () => {
    const operation = makeOperation({
      parameters: [
        makeParam({ name: "tags", in: "query", required: false, schema: { type: "array", items: { type: "string" } } }),
      ],
    });

    const { result } = renderHook(() => useTryItOut(operation));

    expect(result.current.values.query.tags).toEqual([]);
  });

  it("updates only the targeted parameter, leaving others untouched", () => {
    const operation = makeOperation({
      parameters: [
        makeParam({ name: "id", in: "path", required: true }),
        makeParam({ name: "limit", in: "query", required: false }),
      ],
    });

    const { result } = renderHook(() => useTryItOut(operation));

    act(() => {
      result.current.setParameterValue("path", "id", "abc-123");
    });

    expect(result.current.values.path.id).toBe("abc-123");
    expect(result.current.values.query.limit).toBe("");
  });

  it("reports an error for a required parameter left empty, and no error once filled in", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "id", in: "path", required: true })],
    });

    const { result } = renderHook(() => useTryItOut(operation));

    expect(result.current.errors).toEqual({ "path:id": "id is required" });

    act(() => {
      result.current.setParameterValue("path", "id", "abc-123");
    });

    expect(result.current.errors).toEqual({});
  });

  it("does not report an error for an optional parameter left empty", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "limit", in: "query", required: false })],
    });

    const { result } = renderHook(() => useTryItOut(operation));

    expect(result.current.errors).toEqual({});
  });

  it("resets values when the operation changes, so no value leaks across operations", () => {
    const first = makeOperation({
      operationId: "getWidget",
      parameters: [makeParam({ name: "id", in: "path", required: true })],
    });
    const second = makeOperation({
      operationId: "getGadget",
      parameters: [makeParam({ name: "id", in: "path", required: true })],
    });

    const { result, rerender } = renderHook(({ operation }) => useTryItOut(operation), {
      initialProps: { operation: first },
    });

    act(() => {
      result.current.setParameterValue("path", "id", "widget-1");
    });
    expect(result.current.values.path.id).toBe("widget-1");

    rerender({ operation: second });

    expect(result.current.values.path.id).toBe("");
  });

  describe("request body", () => {
    const widgetBodySchema: SchemaNode = {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    };

    function makeOperationWithBody(overrides: Partial<Operation> = {}): Operation {
      return makeOperation({
        requestBody: {
          required: true,
          content: { "application/json": { schema: widgetBodySchema } },
        },
        ...overrides,
      });
    }

    it("initializes body to null when the operation has no request body", () => {
      const operation = makeOperation({});
      const { result } = renderHook(() => useTryItOut(operation));
      expect(result.current.values.body).toBeNull();
    });

    it("initializes body from the operation's application/json request-body schema", () => {
      const operation = makeOperationWithBody();
      const { result } = renderHook(() => useTryItOut(operation));

      expect(result.current.values.body).toEqual({
        kind: "object",
        schema: widgetBodySchema,
        fields: { name: { kind: "primitive", schema: widgetBodySchema.properties!.name, value: "" } },
        requiredFields: ["name"],
      });
    });

    it("setBodyValue updates a body field without touching parameter values", () => {
      const operation = makeOperationWithBody({
        parameters: [makeParam({ name: "id", in: "path", required: true })],
      });
      const { result } = renderHook(() => useTryItOut(operation));

      act(() => {
        result.current.setBodyValue(["name"], "New Widget");
      });

      const body = result.current.values.body;
      expect(body?.kind).toBe("object");
      if (body?.kind !== "object") throw new Error("expected object body");
      expect(body.fields.name).toEqual({
        kind: "primitive",
        schema: widgetBodySchema.properties!.name,
        value: "New Widget",
      });
      expect(result.current.values.path.id).toBe("");
    });

    it("addBodyArrayItem / removeBodyArrayItem update an array body field through the hook", () => {
      const arraySchema: SchemaNode = { type: "array", items: { type: "string" } };
      const operation = makeOperation({
        requestBody: { required: true, content: { "application/json": { schema: arraySchema } } },
      });
      const { result } = renderHook(() => useTryItOut(operation));

      act(() => {
        result.current.addBodyArrayItem([]);
      });
      expect(result.current.values.body?.kind === "array" && result.current.values.body.items).toHaveLength(1);

      act(() => {
        result.current.removeBodyArrayItem([], 0);
      });
      expect(result.current.values.body?.kind === "array" && result.current.values.body.items).toHaveLength(0);
    });

    it("reports a required-and-empty body field as a body:-namespaced error, merged with parameter errors", () => {
      const operation = makeOperationWithBody({
        parameters: [makeParam({ name: "id", in: "path", required: true })],
      });
      const { result } = renderHook(() => useTryItOut(operation));

      expect(result.current.errors).toEqual({
        "path:id": "id is required",
        "body:name": "name is required",
      });

      act(() => {
        result.current.setParameterValue("path", "id", "abc-123");
        result.current.setBodyValue(["name"], "New Widget");
      });

      expect(result.current.errors).toEqual({});
    });

    it("resets body state (not just parameter state) when the operation changes", () => {
      const first = makeOperationWithBody({ operationId: "createWidget" });
      const second = makeOperationWithBody({ operationId: "createGadget" });

      const { result, rerender } = renderHook(({ operation }) => useTryItOut(operation), {
        initialProps: { operation: first },
      });

      act(() => {
        result.current.setBodyValue(["name"], "Widget A");
      });
      const bodyAfterEdit = result.current.values.body;
      expect(bodyAfterEdit?.kind).toBe("object");
      if (bodyAfterEdit?.kind !== "object") throw new Error("expected object body");
      expect(bodyAfterEdit.fields.name).toEqual({
        kind: "primitive",
        schema: widgetBodySchema.properties!.name,
        value: "Widget A",
      });

      rerender({ operation: second });

      const resetBody = result.current.values.body;
      expect(resetBody?.kind).toBe("object");
      if (resetBody?.kind !== "object") throw new Error("expected object body");
      expect(resetBody.fields.name).toEqual({
        kind: "primitive",
        schema: widgetBodySchema.properties!.name,
        value: "",
      });
    });
  });
});
