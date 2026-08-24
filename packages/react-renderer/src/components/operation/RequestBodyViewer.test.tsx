// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { ComponentType } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { createComponentSlotRegistry, type RequestBody } from "@docs-platform/core";
import { RequestBodyViewer } from "./RequestBodyViewer.js";
import { SCHEMA_VIEWER_SLOT, type SchemaViewerProps } from "../schema/SchemaViewer.js";
import { useComponentRegistryStore } from "../../store/component-registry-store.js";

beforeEach(() => {
  useComponentRegistryStore.setState({
    registry: createComponentSlotRegistry<ComponentType<any>>(),
    version: 0,
  });
});

describe("RequestBodyViewer", () => {
  it("renders nothing when there is no request body — the common case, not an edge case", () => {
    const { container } = render(<RequestBodyViewer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a 'Request Body' heading with a required badge when required", () => {
    const requestBody: RequestBody = {
      required: true,
      content: { "application/json": { schema: { type: "string" } } },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.getByText("Request Body")).toBeInTheDocument();
    expect(screen.getByText("required")).toBeInTheDocument();
  });

  it("shows no required badge when the request body is optional", () => {
    const requestBody: RequestBody = {
      required: false,
      content: { "application/json": { schema: { type: "string" } } },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.queryByText("required")).not.toBeInTheDocument();
  });

  it("renders the description when present", () => {
    const requestBody: RequestBody = {
      required: true,
      description: "The user to create",
      content: { "application/json": { schema: { type: "string" } } },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.getByText("The user to create")).toBeInTheDocument();
  });

  it("renders the schema via SchemaViewer — real proof of integration, not just that something rendered", () => {
    const requestBody: RequestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { type: "object", properties: { email: { type: "string" } } },
        },
      },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.getByText("application/json")).toBeInTheDocument();
    expect(screen.getByText("email")).toBeInTheDocument();
  });

  it("renders multiple media types on the same request body", () => {
    const requestBody: RequestBody = {
      required: true,
      content: {
        "application/json": { schema: { type: "string" } },
        "multipart/form-data": { schema: { type: "string" } },
      },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.getByText("application/json")).toBeInTheDocument();
    expect(screen.getByText("multipart/form-data")).toBeInTheDocument();
  });

  it("shows no Example section when the media type has no example — the common case", () => {
    const requestBody: RequestBody = {
      required: true,
      content: { "application/json": { schema: { type: "string" } } },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.queryByText("Example")).not.toBeInTheDocument();
  });

  it("renders the example as syntax-highlighted JSON via CodeBlock when present", async () => {
    const requestBody: RequestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { type: "object" },
          example: { email: "new-user@example.com" },
        },
      },
    };
    const { container } = render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.getByText("Example")).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeInTheDocument();
    });
    expect(container.textContent).toContain("new-user@example.com");
  });

  it("renders a registered SchemaViewer override instead of the built-in one (Milestone 17)", () => {
    function CustomSchemaViewer({ name }: SchemaViewerProps) {
      return <div data-testid="custom-schema-viewer">custom: {name ?? "(root)"}</div>;
    }
    useComponentRegistryStore.getState().registerComponent(SCHEMA_VIEWER_SLOT, CustomSchemaViewer);

    const requestBody: RequestBody = {
      required: true,
      content: {
        "application/json": {
          schema: { type: "object", properties: { email: { type: "string" } } },
        },
      },
    };
    render(<RequestBodyViewer requestBody={requestBody} />);

    expect(screen.getByTestId("custom-schema-viewer")).toBeInTheDocument();
    // proves the real built-in SchemaViewer did NOT also run for this body
    expect(screen.queryByText("email")).not.toBeInTheDocument();
  });
});
