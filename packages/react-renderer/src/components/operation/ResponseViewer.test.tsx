// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createComponentSlotRegistry, type Response } from "@docs-platform/core";
import { ResponseViewer } from "./ResponseViewer.js";
import { SCHEMA_VIEWER_SLOT, type SchemaViewerProps } from "../schema/SchemaViewer.js";
import { useComponentRegistryStore } from "../../store/component-registry-store.js";

beforeEach(() => {
  useComponentRegistryStore.setState({
    registry: createComponentSlotRegistry<ComponentType<any>>(),
    version: 0,
  });
});

describe("ResponseViewer", () => {
  it("renders nothing at all for an empty response list", () => {
    const { container } = render(<ResponseViewer responses={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the status code and description", () => {
    const responses: Response[] = [{ statusCode: "200", description: "Successful response" }];
    render(<ResponseViewer responses={responses} />);

    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("Successful response")).toBeInTheDocument();
  });

  it("renders the body schema via SchemaViewer for a response that has content", () => {
    const responses: Response[] = [
      {
        statusCode: "200",
        description: "OK",
        content: {
          "application/json": {
            schema: { type: "object", properties: { id: { type: "string" } } },
          },
        },
      },
    ];
    render(<ResponseViewer responses={responses} />);

    expect(screen.getByText("application/json")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument(); // real proof SchemaViewer actually ran
  });

  it("shows no schema section at all for a response with no content (e.g. a 204)", () => {
    const responses: Response[] = [{ statusCode: "204", description: "No content" }];
    render(<ResponseViewer responses={responses} />);

    expect(screen.getByText("204")).toBeInTheDocument();
    expect(screen.queryByText("application/json")).not.toBeInTheDocument();
  });

  it("renders multiple responses independently — a 200 with a body and a 404 without", () => {
    const responses: Response[] = [
      {
        statusCode: "200",
        description: "OK",
        content: {
          "application/json": { schema: { type: "object", properties: { id: { type: "string" } } } },
        },
      },
      { statusCode: "404", description: "Not found" },
    ];
    render(<ResponseViewer responses={responses} />);

    expect(screen.getByText("200")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("renders multiple media types on the same response, not just the first", () => {
    const responses: Response[] = [
      {
        statusCode: "200",
        description: "OK",
        content: {
          "application/json": { schema: { type: "string" } },
          "application/xml": { schema: { type: "string" } },
        },
      },
    ];
    render(<ResponseViewer responses={responses} />);

    expect(screen.getByText("application/json")).toBeInTheDocument();
    expect(screen.getByText("application/xml")).toBeInTheDocument();
  });

  it("shows no Example section at all when the media type has no example — the common case", () => {
    const responses: Response[] = [
      {
        statusCode: "200",
        description: "OK",
        content: { "application/json": { schema: { type: "string" } } },
      },
    ];
    render(<ResponseViewer responses={responses} />);

    expect(screen.queryByText("Example")).not.toBeInTheDocument();
  });

  it("renders the example as syntax-highlighted JSON via CodeBlock when present", async () => {
    const responses: Response[] = [
      {
        statusCode: "200",
        description: "OK",
        content: {
          "application/json": {
            schema: { type: "object" },
            example: { id: "abc123", email: "user@example.com" },
          },
        },
      },
    ];
    const { container } = render(<ResponseViewer responses={responses} />);

    expect(screen.getByText("Example")).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeInTheDocument();
    });
    expect(container.textContent).toContain("abc123");
  });

  it("renders a registered SchemaViewer override instead of the built-in one (Milestone 17)", () => {
    function CustomSchemaViewer({ name }: SchemaViewerProps) {
      return <div data-testid="custom-schema-viewer">custom: {name ?? "(root)"}</div>;
    }
    useComponentRegistryStore.getState().registerComponent(SCHEMA_VIEWER_SLOT, CustomSchemaViewer);

    const responses: Response[] = [
      {
        statusCode: "200",
        description: "OK",
        content: {
          "application/json": {
            schema: { type: "object", properties: { id: { type: "string" } } },
          },
        },
      },
    ];
    render(<ResponseViewer responses={responses} />);

    expect(screen.getByTestId("custom-schema-viewer")).toBeInTheDocument();
    // proves the real built-in SchemaViewer did NOT also run for this response
    expect(screen.queryByText("id")).not.toBeInTheDocument();
  });
});
