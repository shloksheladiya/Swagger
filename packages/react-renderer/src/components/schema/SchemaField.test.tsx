// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SchemaNode } from "@docs-platform/core";
import { SchemaField } from "./SchemaField.js";

describe("SchemaField", () => {
  it("renders the field name and type", () => {
    render(<SchemaField name="email" schema={{ type: "string" }} />);
    expect(screen.getByText("email")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("falls back to 'any' when the schema has no type", () => {
    render(<SchemaField name="metadata" schema={{}} />);
    expect(screen.getByText("any")).toBeInTheDocument();
  });

  it("shows a required badge only when required is true", () => {
    const { rerender } = render(
      <SchemaField name="email" schema={{ type: "string" }} required />,
    );
    expect(screen.getByText("required")).toBeInTheDocument();

    rerender(<SchemaField name="email" schema={{ type: "string" }} required={false} />);
    expect(screen.queryByText("required")).not.toBeInTheDocument();
  });

  it("defaults to not-required when the prop is omitted entirely", () => {
    render(<SchemaField name="email" schema={{ type: "string" }} />);
    expect(screen.queryByText("required")).not.toBeInTheDocument();
  });

  it("shows a nullable badge when the schema is nullable", () => {
    render(<SchemaField name="description" schema={{ type: "string", nullable: true }} />);
    expect(screen.getByText("nullable")).toBeInTheDocument();
  });

  it("shows the format when present, in parentheses", () => {
    render(<SchemaField name="id" schema={{ type: "string", format: "uuid" }} />);
    expect(screen.getByText("(uuid)")).toBeInTheDocument();
  });

  it("renders the description when present", () => {
    const schema: SchemaNode = { type: "string", description: "The user's email address" };
    render(<SchemaField name="email" schema={schema} />);
    expect(screen.getByText("The user's email address")).toBeInTheDocument();
  });

  it("renders correctly with only the minimum required props (name + empty schema)", () => {
    expect(() => render(<SchemaField name="x" schema={{}} />)).not.toThrow();
  });
});
