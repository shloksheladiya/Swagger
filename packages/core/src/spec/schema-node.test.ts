import { describe, expect, it } from "vitest";
import type { SchemaNode } from "./schema-node.js";

describe("SchemaNode", () => {
  it("represents a nested object schema with required properties", () => {
    const userSchema: SchemaNode = {
      type: "object",
      required: ["id", "email"],
      properties: {
        id: { type: "string", format: "uuid" },
        email: { type: "string", format: "email" },
        address: {
          type: "object",
          properties: {
            city: { type: "string" },
            zip: { type: "string", nullable: true },
          },
        },
      },
    };

    expect(userSchema.type).toBe("object");
    expect(userSchema.required).toContain("email");
    // nested access proves the recursive `properties` field genuinely nests,
    // not just one level deep
    expect(userSchema.properties?.address?.properties?.city?.type).toBe(
      "string",
    );
  });

  it("represents an array of objects via items", () => {
    const usersListSchema: SchemaNode = {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
        },
      },
    };

    expect(usersListSchema.type).toBe("array");
    expect(usersListSchema.items?.type).toBe("object");
    expect(usersListSchema.items?.properties?.id?.type).toBe("string");
  });

  it("represents oneOf composition without a top-level type", () => {
    const paymentMethodSchema: SchemaNode = {
      oneOf: [
        {
          type: "object",
          properties: { cardNumber: { type: "string" } },
        },
        {
          type: "object",
          properties: { bankAccount: { type: "string" } },
        },
      ],
    };

    expect(paymentMethodSchema.type).toBeUndefined();
    expect(paymentMethodSchema.oneOf).toHaveLength(2);
    expect(paymentMethodSchema.oneOf?.[0]?.properties?.cardNumber).toBeDefined();
  });

  it("represents a self-similar recursive structure (e.g. a tree/comment thread)", () => {
    // Proves the type supports arbitrary depth, which is what a real circular
    // $ref (resolved in Milestone 3) will eventually produce.
    const commentSchema: SchemaNode = {
      type: "object",
      properties: {
        text: { type: "string" },
        replies: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              replies: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    };

    expect(commentSchema.properties?.replies?.items?.properties?.replies?.type).toBe(
      "array",
    );
  });
});
