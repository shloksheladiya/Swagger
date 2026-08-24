// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { SchemaNode } from "@docs-platform/core";
import { createInitialBodyValue, type TryItOutBodyValue } from "./schema-to-body-value.js";
import { BodyFieldEditor } from "./BodyFieldEditor.js";

function renderBody(schema: SchemaNode, errors: Record<string, string> = {}) {
  const value = createInitialBodyValue(schema);
  const setBodyValue = vi.fn();
  const addBodyArrayItem = vi.fn();
  const removeBodyArrayItem = vi.fn();

  render(
    <BodyFieldEditor
      value={value}
      path={[]}
      dotPath=""
      errors={errors}
      setBodyValue={setBodyValue}
      addBodyArrayItem={addBodyArrayItem}
      removeBodyArrayItem={removeBodyArrayItem}
    />,
  );

  return { setBodyValue, addBodyArrayItem, removeBodyArrayItem };
}

describe("BodyFieldEditor", () => {
  it("renders a flat object schema's supported primitive fields", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: { name: { type: "string" }, age: { type: "integer" }, active: { type: "boolean" } },
    };
    renderBody(schema);

    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument(); // name's string input
    expect(screen.getByText("age")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument(); // age's number input
    expect(screen.getByText("active")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument(); // active's boolean control
  });

  it("renders nested object fields (one level of nesting)", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: { address: { type: "object", properties: { city: { type: "string" } } } },
    };
    renderBody(schema);

    expect(screen.getByText("address")).toBeInTheDocument();
    expect(screen.getByText("city")).toBeInTheDocument();
  });

  it("renders an enum body field as a select with its options", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: { status: { type: "string", enum: ["draft", "published"] } },
    };
    renderBody(schema);

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "draft" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "published" })).toBeInTheDocument();
  });

  it("calls setBodyValue with the field's path when a primitive field changes", () => {
    const schema: SchemaNode = { type: "object", properties: { name: { type: "string" } } };
    const { setBodyValue } = renderBody(schema);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Ada" } });

    expect(setBodyValue).toHaveBeenCalledWith(["name"], "Ada");
  });

  it("calls setBodyValue with a nested path for a field inside a nested object", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: { address: { type: "object", properties: { city: { type: "string" } } } },
    };
    const { setBodyValue } = renderBody(schema);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Berlin" } });

    expect(setBodyValue).toHaveBeenCalledWith(["address", "city"], "Berlin");
  });

  it("clears a number field back to null, not 0, when the input is emptied", () => {
    const ageSchema: SchemaNode = { type: "integer" };
    const value: TryItOutBodyValue = {
      kind: "object",
      schema: { type: "object", properties: { age: ageSchema } },
      fields: { age: { kind: "primitive", schema: ageSchema, value: 42 } },
      requiredFields: [],
    };
    const setBodyValue = vi.fn();
    render(
      <BodyFieldEditor
        value={value}
        path={[]}
        dotPath=""
        errors={{}}
        setBodyValue={setBodyValue}
        addBodyArrayItem={vi.fn()}
        removeBodyArrayItem={vi.fn()}
      />,
    );

    expect(screen.getByRole("spinbutton")).toHaveValue(42);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });

    expect(setBodyValue).toHaveBeenCalledWith(["age"], null);
  });

  it("calls addBodyArrayItem with the array's path when 'Add item' is clicked", () => {
    const schema: SchemaNode = { type: "array", items: { type: "string" } };
    const { addBodyArrayItem } = renderBody(schema);

    fireEvent.click(screen.getByRole("button", { name: "Add item" }));

    expect(addBodyArrayItem).toHaveBeenCalledWith([]);
  });

  it("renders existing array items and calls removeBodyArrayItem with the item's index", () => {
    const schema: SchemaNode = { type: "array", items: { type: "string" } };
    const value = createInitialBodyValue(schema);
    if (value.kind !== "array") throw new Error("expected array");
    value.items = [{ kind: "primitive", schema: value.itemSchema, value: "tag-a" }];

    const setBodyValue = vi.fn();
    const addBodyArrayItem = vi.fn();
    const removeBodyArrayItem = vi.fn();
    render(
      <BodyFieldEditor
        value={value}
        path={[]}
        dotPath=""
        errors={{}}
        setBodyValue={setBodyValue}
        addBodyArrayItem={addBodyArrayItem}
        removeBodyArrayItem={removeBodyArrayItem}
      />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("tag-a");
    fireEvent.click(screen.getByRole("button", { name: "Remove item 1" }));
    expect(removeBodyArrayItem).toHaveBeenCalledWith([], 0);
  });

  it("displays an explicit unsupported message for oneOf, without a fake editable control", () => {
    const schema: SchemaNode = {
      oneOf: [
        { type: "object", properties: { cat: { type: "string" } } },
        { type: "object", properties: { dog: { type: "string" } } },
      ],
    };
    renderBody(schema);

    expect(screen.getByText(/not editable in this version/i)).toBeInTheDocument();
    expect(screen.getByText(/oneOf/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("displays an explicit unsupported message for array-of-objects", () => {
    const schema: SchemaNode = {
      type: "array",
      items: { type: "object", properties: { id: { type: "string" } } },
    };
    renderBody(schema);

    expect(screen.getByText(/not editable in this version/i)).toBeInTheDocument();
    expect(screen.getByText(/array of objects/)).toBeInTheDocument();
  });

  it("displays a field-level error next to the field it applies to", () => {
    const schema: SchemaNode = {
      type: "object",
      required: ["name"],
      properties: { name: { type: "string" } },
    };
    renderBody(schema, { "body:name": "name is required" });

    expect(screen.getByText("name is required")).toBeInTheDocument();
  });
});
