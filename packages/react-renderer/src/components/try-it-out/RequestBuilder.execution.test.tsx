// @vitest-environment jsdom
//
// Milestone 15 integration coverage: RequestBuilder wiring the Base URL
// field, the Authorization section, the Send button, and ResponsePanel
// together through the REAL useTryItOut / useTryItOutExecution hooks and
// the REAL buildHttpRequest serializer — only sendHttpRequest (the actual
// network call) is mocked, same "mock only the I/O boundary" approach as
// use-try-it-out-execution.test.ts. Kept as a separate file from
// RequestBuilder.test.tsx (Milestone 14's form-building coverage) so that
// file's existing tests don't need to reason about a mocked core module.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Operation, Parameter, SecurityScheme } from "@docs-platform/core";

const { sendHttpRequestMock } = vi.hoisted(() => ({ sendHttpRequestMock: vi.fn() }));

vi.mock("@docs-platform/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@docs-platform/core")>();
  return { ...actual, sendHttpRequest: sendHttpRequestMock };
});

const { RequestBuilder } = await import("./RequestBuilder.js");

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

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  sendHttpRequestMock.mockReset();
  sendHttpRequestMock.mockResolvedValue({
    kind: "response",
    status: 200,
    statusText: "OK",
    headers: { "content-type": "application/json" },
    body: { ok: true },
    durationMs: 12,
  });
});

describe("RequestBuilder execution (Milestone 15)", () => {
  it("defaults the Base URL field from the servers prop and allows editing it", () => {
    const operation = makeOperation({});
    render(<RequestBuilder operation={operation} servers={["https://api.example.com"]} />);

    const baseUrlField = screen.getByLabelText("Base URL");
    expect(baseUrlField).toHaveValue("https://api.example.com");

    fireEvent.change(baseUrlField, { target: { value: "http://localhost:3000" } });
    expect(baseUrlField).toHaveValue("http://localhost:3000");
  });

  it("renders an Authorization section only for schemes the operation actually requires", () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      bearerAuth: { type: "http", scheme: "bearer" },
    };
    const operation = makeOperation({ security: [{ bearerAuth: [] }] });
    render(<RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={[]} />);

    expect(screen.getByText("Authorization")).toBeInTheDocument();
    expect(screen.getByLabelText("Bearer Token")).toBeInTheDocument();
  });

  it("omits the Authorization section entirely when the operation requires no auth", () => {
    const operation = makeOperation({ security: [] });
    render(<RequestBuilder operation={operation} servers={[]} />);

    expect(screen.queryByText("Authorization")).not.toBeInTheDocument();
  });

  it("disables Send when the base URL is empty", () => {
    render(<RequestBuilder operation={makeOperation({})} servers={[]} />);
    expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled();
  });

  it("disables Send while a required field is left empty", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "userId", in: "path", required: true })],
    });
    render(<RequestBuilder operation={operation} servers={["https://api.example.com"]} />);

    expect(screen.getByRole("button", { name: /^send$/i })).toBeDisabled();
  });

  it("sends a real request end-to-end and renders the response", async () => {
    const operation = makeOperation({
      path: "/widgets/{id}",
      parameters: [makeParam({ name: "id", in: "path", required: true })],
    });
    render(<RequestBuilder operation={operation} servers={["https://api.example.com"]} />);

    fireEvent.change(screen.getByRole("textbox", { name: /id/ }), { target: { value: "42" } });
    expect(screen.getByRole("button", { name: /^send$/i })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    expect(screen.getByRole("status")).toHaveTextContent(/sending/i);

    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: "get", url: "https://api.example.com/widgets/42" }),
    );
    expect(screen.getByText(/200 OK/)).toBeInTheDocument();
  });

  it("injects a filled-in credential into the executed request", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
    };
    const operation = makeOperation({ path: "/widgets", security: [{ apiKeyAuth: [] }] });
    render(
      <RequestBuilder
        operation={operation}
        securitySchemes={securitySchemes}
        servers={["https://api.example.com"]}
      />,
    );

    fireEvent.change(screen.getByLabelText("API Key (header: X-Api-Key)"), {
      target: { value: "secret-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ "X-Api-Key": "secret-key" }) }),
    );
  });

  it("shows a network-error result distinctly, without treating it as a crash", async () => {
    sendHttpRequestMock.mockReset();
    sendHttpRequestMock.mockResolvedValue({
      kind: "network-error",
      message: "Network Error",
      durationMs: 3,
    });

    render(<RequestBuilder operation={makeOperation({})} servers={["https://api.example.com"]} />);
    fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
    await flush();

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Network Error")).toBeInTheDocument();
  });

  it("shows a note that cookies aren't actually sent, next to the (still editable) Cookies section", () => {
    const operation = makeOperation({
      parameters: [makeParam({ name: "session", in: "cookie", required: false })],
    });
    render(<RequestBuilder operation={operation} servers={["https://api.example.com"]} />);

    expect(screen.getByText("Cookies")).toBeInTheDocument();
    expect(screen.getByText(/can.t be sent from the browser/i)).toBeInTheDocument();
  });

  describe("multi-alternative OR security (AND/OR semantics)", () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
      bearerAuth: { type: "http", scheme: "bearer" },
    };

    it("shows no alternative selector for a single-requirement operation", () => {
      const operation = makeOperation({ security: [{ apiKeyAuth: [] }] });
      render(
        <RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={["https://api.example.com"]} />,
      );

      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
      expect(screen.getByLabelText("API Key (header: X-Api-Key)")).toBeInTheDocument();
    });

    it("shows a selector with one option per OR alternative for a multi-requirement operation", () => {
      // security: [{apiKeyAuth}, {bearerAuth}] — "API key OR bearer token".
      const operation = makeOperation({ security: [{ apiKeyAuth: [] }, { bearerAuth: [] }] });
      render(
        <RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={["https://api.example.com"]} />,
      );

      const radiogroup = screen.getByRole("radiogroup", { name: /authentication method/i });
      expect(radiogroup).toBeInTheDocument();
      expect(screen.getAllByRole("radio")).toHaveLength(2);
      // The selected (first) alternative's own credential field is also
      // rendered below the selector, hence exact getByText here — its label
      // text is NOT prefixed with "Use ", unlike the radio options
      // themselves (see RequestBuilder's own comment for why they differ).
      expect(screen.getByText("API Key (header: X-Api-Key)")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Bearer Token/ })).toBeInTheDocument();
    });

    it("sends only the credential for the initially-selected (first) OR alternative, not a value typed into the other one", async () => {
      const operation = makeOperation({
        path: "/widgets",
        security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
      });
      render(
        <RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={["https://api.example.com"]} />,
      );

      // Fill in both fields — both are visible/editable even though only
      // one alternative is "active" at a time.
      fireEvent.change(screen.getByLabelText("API Key (header: X-Api-Key)"), {
        target: { value: "key-value" },
      });

      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
      await flush();

      const sentRequest = sendHttpRequestMock.mock.calls[0]?.[0];
      expect(sentRequest.headers["X-Api-Key"]).toBe("key-value");
      expect(sentRequest.headers.Authorization).toBeUndefined();
    });

    it("switching the selected alternative via the radio group changes which credential gets sent", async () => {
      const operation = makeOperation({
        path: "/widgets",
        security: [{ apiKeyAuth: [] }, { bearerAuth: [] }],
      });
      render(
        <RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={["https://api.example.com"]} />,
      );

      // Fill in both credentials up front...
      fireEvent.change(screen.getByLabelText("API Key (header: X-Api-Key)"), {
        target: { value: "key-value" },
      });
      // Switching the radio selection re-renders the Authorization section
      // around the Bearer Token field, so look it up after switching.
      fireEvent.click(screen.getByRole("radio", { name: /Bearer Token/ }));
      fireEvent.change(screen.getByLabelText("Bearer Token"), { target: { value: "token-value" } });

      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
      await flush();

      const sentRequest = sendHttpRequestMock.mock.calls[0]?.[0];
      expect(sentRequest.headers.Authorization).toBe("Bearer token-value");
      expect(sentRequest.headers["X-Api-Key"]).toBeUndefined();
    });

    it("shows both fields of a single AND-group alternative together, with no selector", async () => {
      // security: [{apiKeyAuth AND bearerAuth}] — both required together.
      const operation = makeOperation({
        path: "/widgets",
        security: [{ apiKeyAuth: [], bearerAuth: [] }],
      });
      render(
        <RequestBuilder operation={operation} securitySchemes={securitySchemes} servers={["https://api.example.com"]} />,
      );

      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("API Key (header: X-Api-Key)"), {
        target: { value: "key-value" },
      });
      fireEvent.change(screen.getByLabelText("Bearer Token"), { target: { value: "token-value" } });
      fireEvent.click(screen.getByRole("button", { name: /^send$/i }));
      await flush();

      const sentRequest = sendHttpRequestMock.mock.calls[0]?.[0];
      expect(sentRequest.headers["X-Api-Key"]).toBe("key-value");
      expect(sentRequest.headers.Authorization).toBe("Bearer token-value");
    });
  });
});
