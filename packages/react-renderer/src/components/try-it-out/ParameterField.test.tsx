// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Parameter } from "@docs-platform/core";
import { ParameterField } from "./ParameterField.js";

function makeParam(overrides: Partial<Parameter>): Parameter {
  return { name: "id", in: "path", required: true, schema: { type: "string" }, ...overrides };
}

describe("ParameterField", () => {
  it("renders a text input for a plain string parameter, controlled by value/onChange", () => {
    const onChange = vi.fn();
    render(<ParameterField parameter={makeParam({ name: "id" })} value="abc" error={undefined} onChange={onChange} />);

    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("abc");

    fireEvent.change(input, { target: { value: "xyz" } });
    expect(onChange).toHaveBeenCalledWith("xyz");
  });

  it("renders a number input for a number/integer parameter", () => {
    const onChange = vi.fn();
    render(
      <ParameterField
        parameter={makeParam({ name: "limit", in: "query", required: false, schema: { type: "integer" } })}
        value=""
        error={undefined}
        onChange={onChange}
      />,
    );

    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "10" } });
    expect(onChange).toHaveBeenCalledWith("10");
  });

  it("renders a checkbox for a boolean parameter", () => {
    const onChange = vi.fn();
    render(
      <ParameterField
        parameter={makeParam({ name: "active", in: "query", required: false, schema: { type: "boolean" } })}
        value=""
        error={undefined}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith("true");
  });

  it("renders a select for an enum parameter, with the enum's options", () => {
    const onChange = vi.fn();
    render(
      <ParameterField
        parameter={makeParam({
          name: "status",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["draft", "published"] },
        })}
        value=""
        error={undefined}
        onChange={onChange}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(screen.getByRole("option", { name: "draft" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "published" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "published" } });
    expect(onChange).toHaveBeenCalledWith("published");
  });

  it("shows an explicit unsupported message for an array-typed parameter, without a fake editable control", () => {
    render(
      <ParameterField
        parameter={makeParam({
          name: "tags",
          in: "query",
          required: false,
          schema: { type: "array", items: { type: "string" } },
        })}
        value={[]}
        error={undefined}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/not editable in this version/i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows a required indicator and the description when present", () => {
    render(
      <ParameterField
        parameter={makeParam({ name: "id", required: true, description: "The widget's id." })}
        value=""
        error={undefined}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("required")).toBeInTheDocument();
    expect(screen.getByText("The widget's id.")).toBeInTheDocument();
  });

  it("shows the validation error when present", () => {
    render(
      <ParameterField
        parameter={makeParam({ name: "id" })}
        value=""
        error="id is required"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("id is required")).toBeInTheDocument();
  });
});
