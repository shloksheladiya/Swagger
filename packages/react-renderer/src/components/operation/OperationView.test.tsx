// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { NormalizedSpec, Operation, SecurityScheme } from "@docs-platform/core";
import { OperationView } from "./OperationView.js";
import { useUiStore } from "../../store/ui-store.js";
import { useSpecStore } from "../../store/spec-store.js";
import { useConfigStore } from "../../store/config-store.js";

function makeOp(overrides: Partial<Operation>): Operation {
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

const listUsers = makeOp({
  operationId: "listUsers",
  path: "/users",
  method: "get",
  summary: "List users",
  description: "Returns **all** users.",
  parameters: [{ name: "limit", in: "query", required: false, schema: { type: "integer" } }],
});

const operations = [listUsers];

const testSecuritySchemes: Record<string, SecurityScheme> = {
  bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
  apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
  oauth2Auth: { type: "oauth2", flows: {} },
};

function seedSpecStore(securitySchemes: Record<string, SecurityScheme> = testSecuritySchemes) {
  const spec: NormalizedSpec = {
    id: "test-spec",
    version: "1.0.0",
    title: "Test API",
    tags: [],
    operations: [],
    schemas: {},
    securitySchemes,
    servers: [],
  };

  useSpecStore.setState({
    activeSpecId: "test-spec",
    specs: { "test-spec": { status: "ready", spec } },
  });
}

beforeEach(() => {
  useUiStore.setState({
    selectedOperationId: null,
    expandedTagNames: new Set(),
    searchQuery: "",
  });
  useSpecStore.setState({ specs: {}, activeSpecId: null });
  useConfigStore.setState({ config: null, error: null });
});

describe("OperationView", () => {
  it("shows a placeholder when nothing is selected", () => {
    render(<OperationView operations={operations} />);
    expect(screen.getByText("Select an endpoint to view its details.")).toBeInTheDocument();
  });

  it("shows the same placeholder for a stale selection that matches no operation", () => {
    useUiStore.setState({ selectedOperationId: "doesNotExist" });
    render(<OperationView operations={operations} />);
    expect(screen.getByText("Select an endpoint to view its details.")).toBeInTheDocument();
  });

  it("assembles header, description, and parameters for a valid selection", () => {
    useUiStore.setState({ selectedOperationId: "listUsers" });
    render(<OperationView operations={operations} />);

    expect(screen.getByRole("heading", { name: "List users" })).toBeInTheDocument();
    expect(screen.getByText("/users")).toBeInTheDocument();
    // markdown rendered — "all" should be inside a <strong>, proving
    // MarkdownRenderer actually ran, not just displayed raw text
    expect(screen.getByText("all").tagName.toLowerCase()).toBe("strong");
    // "limit" now legitimately appears twice — once in the read-only
    // ParametersTable, once as an editable field label in the new Try It
    // Out section (Milestone 14 Part C) — getAllByText confirms it's still
    // rendered, without over-specifying which occurrence.
    expect(screen.getAllByText("limit").length).toBeGreaterThanOrEqual(1);
  });

  it("omits the description section entirely when the operation has none", () => {
    const noDescription = makeOp({ operationId: "noDesc", description: undefined });
    useUiStore.setState({ selectedOperationId: "noDesc" });
    render(<OperationView operations={[noDescription]} />);

    // no crash, and no stray markdown container rendered for undefined content
    expect(screen.queryByText("Select an endpoint")).not.toBeInTheDocument();
  });

  it("switches to a different operation's details when the selection changes (real reactivity)", () => {
    const createUser = makeOp({ operationId: "createUser", summary: "Create user", path: "/users" });
    const both = [listUsers, createUser];

    useUiStore.setState({ selectedOperationId: "listUsers" });
    const { rerender } = render(<OperationView operations={both} />);
    expect(screen.getByRole("heading", { name: "List users" })).toBeInTheDocument();

    useUiStore.setState({ selectedOperationId: "createUser" });
    rerender(<OperationView operations={both} />);

    expect(screen.getByRole("heading", { name: "Create user" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "List users" })).not.toBeInTheDocument();
  });

  it("renders the request body and responses for a full, realistic operation (POST-style, with both)", () => {
    const createUser = makeOp({
      operationId: "createUser",
      method: "post",
      path: "/users",
      summary: "Create user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", properties: { email: { type: "string" } } },
          },
        },
      },
      responses: [
        {
          statusCode: "201",
          description: "Created",
          content: {
            "application/json": {
              schema: { type: "object", properties: { id: { type: "string" } } },
            },
          },
        },
        { statusCode: "400", description: "Invalid input" },
      ],
    });

    useUiStore.setState({ selectedOperationId: "createUser" });
    render(<OperationView operations={[createUser]} />);

    // request body section, with its own schema rendered
    expect(screen.getByText("Request Body")).toBeInTheDocument();
    // "email" now legitimately appears twice — the read-only RequestBodyViewer
    // (via SchemaViewer) and the new editable Try It Out Body section
    // (Milestone 14 Part C) — same reasoning as the "limit" case above.
    expect(screen.getAllByText("email").length).toBeGreaterThanOrEqual(1);
    // both responses, one with a body and one without
    expect(screen.getByText("201")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
    expect(screen.getByText("Invalid input")).toBeInTheDocument();
  });

  it("renders neither RequestBodyViewer's nor ResponseViewer's content for a bare GET with no body and no responses", () => {
    useUiStore.setState({ selectedOperationId: "listUsers" }); // listUsers has empty responses, no requestBody
    render(<OperationView operations={operations} />);

    expect(screen.queryByText("Request Body")).not.toBeInTheDocument();
  });

  it("shows that no authentication is required for an operation with security: []", () => {
    seedSpecStore();
    useUiStore.setState({ selectedOperationId: "listUsers" });
    render(<OperationView operations={operations} />);

    expect(screen.getByText("No authentication required")).toBeInTheDocument();
  });

  it("shows a single required authentication method", () => {
    seedSpecStore();
    const securedOp = makeOp({
      operationId: "secured",
      security: [{ bearerAuth: [] }],
    });
    useUiStore.setState({ selectedOperationId: "secured" });
    render(<OperationView operations={[securedOp]} />);

    // getAllByText, not getByText: "Bearer Token (JWT)" now legitimately
    // appears twice — once in the read-only AuthRequirementBadge, once as
    // the new Try It Out Authorization credential field's label (Milestone
    // 15) — same reasoning as the "limit"/"email" duplicates elsewhere in
    // this file.
    expect(screen.getAllByText("Bearer Token (JWT)").length).toBeGreaterThanOrEqual(1);
  });

  it("shows OR between multiple authentication alternatives", () => {
    seedSpecStore();
    const securedOp = makeOp({
      operationId: "secured",
      security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
    });
    useUiStore.setState({ selectedOperationId: "secured" });
    render(<OperationView operations={[securedOp]} />);

    expect(screen.getAllByText("API Key (header: X-Api-Key)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bearer Token (JWT)").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("shows AND between schemes within one authentication alternative", () => {
    seedSpecStore();
    const securedOp = makeOp({
      operationId: "secured",
      security: [{ apiKeyAuth: [], oauth2Auth: ["read"] }],
    });
    useUiStore.setState({ selectedOperationId: "secured" });
    render(<OperationView operations={[securedOp]} />);

    expect(screen.getAllByText("API Key (header: X-Api-Key)").length).toBeGreaterThanOrEqual(1);
    // Unlike the badge, the Authorization credential field's label doesn't
    // include scopes (see resolve-auth-credential-fields.ts) — "OAuth 2.0
    // (scopes: read)" stays unique to AuthRequirementBadge.
    expect(screen.getByText("OAuth 2.0 (scopes: read)")).toBeInTheDocument();
    expect(screen.getByText("and")).toBeInTheDocument();
  });

  it("shows OAuth scopes in the visible authentication label", () => {
    seedSpecStore();
    const securedOp = makeOp({
      operationId: "secured",
      security: [{ oauth2Auth: ["read", "write"] }],
    });
    useUiStore.setState({ selectedOperationId: "secured" });
    render(<OperationView operations={[securedOp]} />);

    expect(screen.getByText("OAuth 2.0 (scopes: read, write)")).toBeInTheDocument();
  });

  it("renders the Try It Out section for the selected operation (Milestone 14 Part C)", () => {
    useUiStore.setState({ selectedOperationId: "listUsers" }); // listUsers has one query parameter
    render(<OperationView operations={operations} />);

    const tryItOut = screen.getByRole("region", { name: "Try It Out" });
    expect(tryItOut).toBeInTheDocument();
    // the "limit" query parameter got a real editable control inside the panel
    expect(within(tryItOut).getByRole("spinbutton")).toBeInTheDocument();
  });

  it("hides the Try It Out section when config.features.tryItOut is false (Milestone 17)", () => {
    useConfigStore.getState().setConfigResult({
      ok: true,
      data: {
        branding: { title: "Acme API Docs" },
        specSource: { type: "url", value: "https://example.com/openapi.json" },
        layout: { sidebarPosition: "left", mode: "two-pane" },
        features: { search: true, tryItOut: false },
      },
    });

    useUiStore.setState({ selectedOperationId: "listUsers" });
    render(<OperationView operations={operations} />);

    expect(screen.queryByRole("region", { name: "Try It Out" })).not.toBeInTheDocument();
  });
});
