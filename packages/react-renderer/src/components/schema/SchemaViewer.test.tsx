// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { SchemaNode } from "@docs-platform/core";
import { SchemaViewer } from "./SchemaViewer.js";

describe("SchemaViewer", () => {
  it("renders each property of a flat object", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    };
    render(<SchemaViewer schema={schema} />);

    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("name")).toBeInTheDocument();
  });

  it("does not render a wrapping field row at the true top level (no name given)", () => {
    const schema: SchemaNode = { type: "object", properties: { id: { type: "string" } } };
    render(<SchemaViewer schema={schema} />);

    // "object" would appear as this schema's own type badge if it rendered
    // itself as a field — it shouldn't, since there's no name for the root.
    expect(screen.queryByText("object")).not.toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
  });

  it("DOES render a wrapping field row for a nested object property", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: {
        address: {
          type: "object",
          properties: { city: { type: "string" } },
        },
      },
    };
    render(<SchemaViewer schema={schema} />);

    expect(screen.getByText("address")).toBeInTheDocument();
    expect(screen.getByText("object")).toBeInTheDocument(); // address's own type badge
    expect(screen.getByText("city")).toBeInTheDocument(); // recursed into address's properties
  });

  it("recurses through multiple levels of nesting correctly", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: {
        level1: {
          type: "object",
          properties: {
            level2: {
              type: "object",
              properties: {
                level3: { type: "string" },
              },
            },
          },
        },
      },
    };
    render(<SchemaViewer schema={schema} />);

    expect(screen.getByText("level1")).toBeInTheDocument();
    expect(screen.getByText("level2")).toBeInTheDocument();
    expect(screen.getByText("level3")).toBeInTheDocument();
  });

  it("marks a property as required based on the PARENT's required array, not the property's own schema", () => {
    const schema: SchemaNode = {
      type: "object",
      required: ["email"],
      properties: {
        email: { type: "string" },
        nickname: { type: "string" },
      },
    };
    render(<SchemaViewer schema={schema} />);

    const requiredBadges = screen.getAllByText("required");
    expect(requiredBadges).toHaveLength(1); // only email, not nickname
  });

  it("renders a plain SchemaField for a top-level leaf (non-object) schema, when given a name", () => {
    render(<SchemaViewer schema={{ type: "string" }} name="count" />);
    expect(screen.getByText("count")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("renders nothing for a nameless, non-object schema (defensive edge case)", () => {
    const { container } = render(<SchemaViewer schema={{ type: "string" }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders an object with zero properties without crashing", () => {
    expect(() =>
      render(<SchemaViewer schema={{ type: "object", properties: {} }} />),
    ).not.toThrow();
  });

  it("shows what's inside an array of primitives, not just the 'array' badge alone", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: {
        tags: { type: "array", items: { type: "string" } },
      },
    };
    render(<SchemaViewer schema={schema} />);

    expect(screen.getByText("tags")).toBeInTheDocument();
    expect(screen.getByText("array")).toBeInTheDocument();
    // the item shape must be visible too — an array badge alone tells you
    // nothing about what's actually inside it
    expect(screen.getByText("[]")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("recurses into an array of objects, showing that object's own properties", () => {
    const schema: SchemaNode = {
      type: "object",
      properties: {
        users: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" } },
          },
        },
      },
    };
    render(<SchemaViewer schema={schema} />);

    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("[]")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument(); // recursed into the item object's properties
  });

  it("handles an array at the true top level (e.g. a response body that's directly an array)", () => {
    const schema: SchemaNode = { type: "array", items: { type: "string" } };
    render(<SchemaViewer schema={schema} />);

    // no wrapping field for the nameless root array itself...
    expect(screen.queryByText("array")).not.toBeInTheDocument();
    // ...but the item shape still shows, since "[]" is always an explicit name
    expect(screen.getByText("[]")).toBeInTheDocument();
    expect(screen.getByText("string")).toBeInTheDocument();
  });

  it("handles nested arrays (an array of arrays) without crashing", () => {
    const schema: SchemaNode = {
      type: "array",
      items: { type: "array", items: { type: "integer" } },
    };
    expect(() => render(<SchemaViewer schema={schema} />)).not.toThrow();
    expect(screen.getByText("integer")).toBeInTheDocument();
  });

  it("marks an array-typed property as required correctly (required applies to the array field, not its items)", () => {
    const schema: SchemaNode = {
      type: "object",
      required: ["tags"],
      properties: {
        tags: { type: "array", items: { type: "string" } },
      },
    };
    render(<SchemaViewer schema={schema} />);

    // exactly one "required" badge — on the array field itself, not on "[]"
    expect(screen.getAllByText("required")).toHaveLength(1);
  });

  it("renders a genuinely circular schema without infinite recursion (real object-identity cycle, same shape as Milestone 3's circular-schema.yaml)", () => {
    const treeNode: SchemaNode = { type: "object", properties: {} };
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- constructing a true self-reference on purpose
    treeNode.properties!.children = { type: "array", items: treeNode };
    treeNode.properties!.label = { type: "string" };

    const start = Date.now();
    render(<SchemaViewer schema={treeNode} name="root" />);
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(1000); // proves it terminated, not just "didn't crash yet"
    expect(screen.getByText("label")).toBeInTheDocument();
    expect(screen.getByText("children")).toBeInTheDocument();
    expect(screen.getByText("(circular reference)")).toBeInTheDocument();
  });

  it("does NOT false-positive on a shared (but non-circular) schema object appearing in two different branches", () => {
    const address: SchemaNode = { type: "object", properties: { city: { type: "string" } } };
    // The SAME address object, referenced from two unrelated properties —
    // not a cycle, since neither is an ancestor of the other.
    const schema: SchemaNode = {
      type: "object",
      properties: {
        homeAddress: address,
        workAddress: address,
      },
    };

    render(<SchemaViewer schema={schema} />);

    // both branches must render fully — "city" should appear twice, and
    // NEITHER should be flagged as circular
    expect(screen.getAllByText("city")).toHaveLength(2);
    expect(screen.queryByText("(circular reference)")).not.toBeInTheDocument();
  });

  it("merges allOf branches into one combined property view (real-shaped: petstore-3.0's actual Pet schema)", () => {
    // Mirrors the real petstore-3.0.yaml fixture's Pet schema exactly:
    // allOf: [NewPet (name, tag), { required: [id], properties: { id } }]
    const newPetLike: SchemaNode = {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string" },
        tag: { type: "string" },
      },
    };
    const idExtension: SchemaNode = {
      type: "object",
      required: ["id"],
      properties: { id: { type: "integer" } },
    };
    const pet: SchemaNode = { allOf: [newPetLike, idExtension] };

    render(<SchemaViewer schema={pet} name="Pet" />);

    // properties from BOTH branches present
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("tag")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    // required propagated correctly from each branch's own required array
    expect(screen.getAllByText("required")).toHaveLength(2); // name AND id, not tag
  });

  it("shows 'object' as the allOf summary row's type, even though allOf itself sets no top-level type", () => {
    const schema: SchemaNode = {
      allOf: [{ type: "object", properties: { x: { type: "string" } } }],
    };
    render(<SchemaViewer schema={schema} name="Composite" />);

    expect(screen.getByText("Composite")).toBeInTheDocument();
    expect(screen.getByText("object")).toBeInTheDocument();
  });

  it("last branch wins for a property name that appears in more than one allOf branch", () => {
    const schema: SchemaNode = {
      allOf: [
        { type: "object", properties: { status: { type: "string" } } },
        { type: "object", properties: { status: { type: "integer" } } }, // overrides
      ],
    };
    render(<SchemaViewer schema={schema} />);

    // only ONE "status" row should exist (merged, not duplicated), typed
    // per the LAST branch (integer)
    expect(screen.getAllByText("status")).toHaveLength(1);
    expect(screen.getByText("integer")).toBeInTheDocument();
    expect(screen.queryByText("string")).not.toBeInTheDocument();
  });

  it("renders allOf correctly at the true top level (no wrapping name)", () => {
    const schema: SchemaNode = {
      allOf: [{ type: "object", properties: { id: { type: "string" } } }],
    };
    render(<SchemaViewer schema={schema} />);

    expect(screen.queryByText("object")).not.toBeInTheDocument(); // no summary row at root
    expect(screen.getByText("id")).toBeInTheDocument();
  });

  it("detects a cycle routed through an allOf branch, not just direct object/array nesting", () => {
    const selfReferencing: SchemaNode = { allOf: [] };
    const branch: SchemaNode = {
      type: "object",
      properties: { parent: selfReferencing },
    };
    selfReferencing.allOf = [branch];
    // selfReferencing -> branch.properties.parent -> selfReferencing (cycle via allOf)

    const start = Date.now();
    render(<SchemaViewer schema={selfReferencing} name="root" />);
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(1000);
    expect(screen.getByText("(circular reference)")).toBeInTheDocument();
  });

  it("renders oneOf branches as separate labeled alternatives, not a merge", () => {
    const schema: SchemaNode = {
      oneOf: [
        { type: "object", properties: { cardNumber: { type: "string" } } },
        { type: "object", properties: { bankAccount: { type: "string" } } },
      ],
    };
    render(<SchemaViewer schema={schema} name="paymentMethod" />);

    expect(screen.getByText("paymentMethod")).toBeInTheDocument();
    expect(screen.getByText("oneOf")).toBeInTheDocument();
    expect(screen.getByText(/Option 1/)).toBeInTheDocument();
    expect(screen.getByText(/Option 2/)).toBeInTheDocument();
    // both alternatives' own properties are shown independently — proving
    // this is NOT a merge (an allOf-style merge would combine them into one)
    expect(screen.getByText("cardNumber")).toBeInTheDocument();
    expect(screen.getByText("bankAccount")).toBeInTheDocument();
  });

  it("distinguishes anyOf from oneOf in the summary label", () => {
    const schema: SchemaNode = {
      anyOf: [{ type: "string" }, { type: "integer" }],
    };
    render(<SchemaViewer schema={schema} name="flexibleField" />);

    expect(screen.getByText("anyOf")).toBeInTheDocument();
    expect(screen.queryByText("oneOf")).not.toBeInTheDocument();
  });

  it("shows a primitive branch's type directly next to its option label, rather than rendering nothing", () => {
    const schema: SchemaNode = {
      oneOf: [{ type: "string" }, { type: "integer" }],
    };
    render(<SchemaViewer schema={schema} name="idOrCode" />);

    // this is the specific trap flagged before writing the code: a nameless
    // recursive call for a primitive branch would render NOTHING under the
    // old leaf-case rule — the fix shows the type inline with the label instead
    expect(screen.getByText("Option 1: string")).toBeInTheDocument();
    expect(screen.getByText("Option 2: integer")).toBeInTheDocument();
  });

  it("handles a mix of primitive and object branches in the same oneOf correctly", () => {
    const schema: SchemaNode = {
      oneOf: [
        { type: "string" },
        { type: "object", properties: { id: { type: "integer" } } },
      ],
    };
    render(<SchemaViewer schema={schema} name="mixed" />);

    expect(screen.getByText("Option 1: string")).toBeInTheDocument();
    expect(screen.getByText(/Option 2/)).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument(); // recursed into the object branch
  });

  it("renders oneOf correctly at the true top level (no wrapping name)", () => {
    const schema: SchemaNode = { oneOf: [{ type: "string" }, { type: "integer" }] };
    render(<SchemaViewer schema={schema} />);

    expect(screen.queryByText("oneOf")).not.toBeInTheDocument(); // no summary row at root
    expect(screen.getByText("Option 1: string")).toBeInTheDocument();
  });

  it("detects a cycle routed through a oneOf branch without infinite recursion", () => {
    const selfReferencing: SchemaNode = { oneOf: [] };
    const branch: SchemaNode = {
      type: "object",
      properties: { self: selfReferencing },
    };
    selfReferencing.oneOf = [branch];

    const start = Date.now();
    render(<SchemaViewer schema={selfReferencing} name="root" />);
    const elapsedMs = Date.now() - start;

    expect(elapsedMs).toBeLessThan(1000);
    expect(screen.getByText("(circular reference)")).toBeInTheDocument();
  });
});
