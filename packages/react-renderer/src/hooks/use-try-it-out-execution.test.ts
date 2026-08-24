// @vitest-environment jsdom
//
// buildHttpRequest is left REAL (not mocked) so these tests exercise the
// actual serialization + auth-injection pipeline, not just the hook's own
// state transitions — only sendHttpRequest (the network call) is mocked, the
// same "mock only the actual I/O" boundary client.test.ts already uses one
// layer down in core.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Operation, SecurityScheme } from "@docs-platform/core";
import type { TryItOutValues } from "./use-try-it-out.js";
import type { TryItOutBodyValue } from "../components/try-it-out/schema-to-body-value.js";

const { sendHttpRequestMock } = vi.hoisted(() => ({ sendHttpRequestMock: vi.fn() }));

vi.mock("@docs-platform/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@docs-platform/core")>();
  return { ...actual, sendHttpRequest: sendHttpRequestMock };
});

const { useTryItOutExecution } = await import("./use-try-it-out-execution.js");

function makeOperation(overrides: Partial<Operation> = {}): Operation {
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

function makeValues(overrides: Partial<TryItOutValues> = {}): TryItOutValues {
  return {
    path: {},
    query: {},
    header: {},
    cookie: {},
    body: null,
    ...overrides,
  };
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

const okResponse = {
  kind: "response" as const,
  status: 200,
  statusText: "OK",
  headers: {},
  body: null,
  durationMs: 5,
};

beforeEach(() => {
  sendHttpRequestMock.mockReset();
  sendHttpRequestMock.mockResolvedValue(okResponse);
});

describe("useTryItOutExecution", () => {
  it("seeds baseUrl from the first declared server", () => {
    const { result } = renderHook(() =>
      useTryItOutExecution(makeOperation(), {}, ["https://api.example.com", "https://backup.example.com"]),
    );
    expect(result.current.baseUrl).toBe("https://api.example.com");
  });

  it("defaults baseUrl to an empty string when the spec declares no servers", () => {
    const { result } = renderHook(() => useTryItOutExecution(makeOperation(), {}, []));
    expect(result.current.baseUrl).toBe("");
  });

  it("starts idle with no result", () => {
    const { result } = renderHook(() => useTryItOutExecution(makeOperation(), {}, []));
    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
  });

  it("transitions idle -> loading -> done and stores the response", async () => {
    const { result } = renderHook(() => useTryItOutExecution(makeOperation(), {}, ["https://api.example.com"]));

    act(() => {
      result.current.send(makeValues({ path: { id: "42" } }));
    });
    expect(result.current.status).toBe("loading");

    await flush();

    expect(result.current.status).toBe("done");
    expect(result.current.result).toEqual(okResponse);
  });

  it("builds the request with the substituted path and configured base URL", async () => {
    const operation = makeOperation({ path: "/widgets/{id}" });
    const { result } = renderHook(() => useTryItOutExecution(operation, {}, ["https://api.example.com"]));

    act(() => {
      result.current.send(makeValues({ path: { id: "42" } }));
    });
    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: "get", url: "https://api.example.com/widgets/42" }),
    );
  });

  it("serializes a JSON body through serializeBodyValue before sending", async () => {
    const schema = { type: "object" as const, properties: { name: { type: "string" as const } } };
    const operation = makeOperation({
      method: "post",
      requestBody: { required: true, content: { "application/json": { schema } } },
    });
    const { result } = renderHook(() => useTryItOutExecution(operation, {}, ["https://api.example.com"]));

    const filledBody: TryItOutBodyValue = {
      kind: "object",
      schema,
      requiredFields: [],
      fields: {
        name: { kind: "primitive", schema: schema.properties.name, value: "Rex" },
      },
    };

    act(() => {
      result.current.send(makeValues({ body: filledBody }));
    });
    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ body: { name: "Rex" }, headers: expect.objectContaining({ "Content-Type": "application/json" }) }),
    );
  });

  it("injects a filled-in bearer credential as an Authorization header (single-alternative operation)", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      bearerAuth: { type: "http", scheme: "bearer" },
    };
    const operation = makeOperation({ security: [{ bearerAuth: [] }] });
    const { result } = renderHook(() =>
      useTryItOutExecution(operation, securitySchemes, ["https://api.example.com"]),
    );

    expect(result.current.authAlternatives).toEqual([
      { index: 0, fields: [{ kind: "bearer", schemeName: "bearerAuth", label: "Bearer Token" }] },
    ]);
    expect(result.current.selectedAlternativeIndex).toBe(0);

    act(() => {
      result.current.setCredentialValue("bearerAuth", "my-token");
    });
    act(() => {
      result.current.send(makeValues());
    });
    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer my-token" }) }),
    );
  });

  it("only injects the SELECTED OR-alternative's credential, ignoring a filled-in value for the other one", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
      bearerAuth: { type: "http", scheme: "bearer" },
    };
    // OR: apiKeyAuth or bearerAuth — NOT both required.
    const operation = makeOperation({ security: [{ apiKeyAuth: [] }, { bearerAuth: [] }] });
    const { result } = renderHook(() =>
      useTryItOutExecution(operation, securitySchemes, ["https://api.example.com"]),
    );

    expect(result.current.authAlternatives).toHaveLength(2);

    // Fill in BOTH — a real user might have typed something into each field
    // before deciding which method to actually use.
    act(() => {
      result.current.setCredentialValue("apiKeyAuth", "key-value");
      result.current.setCredentialValue("bearerAuth", "token-value");
    });

    // Alternative 0 (apiKeyAuth) is selected by default.
    act(() => {
      result.current.send(makeValues());
    });
    await flush();
    expect(sendHttpRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ "X-Api-Key": "key-value" }),
      }),
    );
    expect(sendHttpRequestMock.mock.calls[0]?.[0].headers.Authorization).toBeUndefined();

    // Switch to alternative 1 (bearerAuth) and send again.
    act(() => {
      result.current.setSelectedAlternativeIndex(1);
    });
    act(() => {
      result.current.send(makeValues());
    });
    await flush();
    expect(sendHttpRequestMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token-value" }),
      }),
    );
    expect(sendHttpRequestMock.mock.calls[1]?.[0].headers["X-Api-Key"]).toBeUndefined();
  });

  it("injects every field of a selected AND-group alternative together", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
      bearerAuth: { type: "http", scheme: "bearer" },
    };
    // AND: both apiKeyAuth and bearerAuth required together.
    const operation = makeOperation({ security: [{ apiKeyAuth: [], bearerAuth: [] }] });
    const { result } = renderHook(() =>
      useTryItOutExecution(operation, securitySchemes, ["https://api.example.com"]),
    );

    expect(result.current.authAlternatives).toHaveLength(1);
    expect(result.current.authAlternatives[0]?.fields).toHaveLength(2);

    act(() => {
      result.current.setCredentialValue("apiKeyAuth", "key-value");
      result.current.setCredentialValue("bearerAuth", "token-value");
    });
    act(() => {
      result.current.send(makeValues());
    });
    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Api-Key": "key-value",
          Authorization: "Bearer token-value",
        }),
      }),
    );
  });

  it("mixed OR/AND: selecting the AND alternative injects both of its fields, not the OR alternative's", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      bearerAuth: { type: "http", scheme: "bearer" },
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
      oauth2Auth: { type: "oauth2", flows: {} },
    };
    // [{bearerAuth}] OR [{apiKeyAuth AND oauth2Auth}]
    const operation = makeOperation({
      security: [{ bearerAuth: [] }, { apiKeyAuth: [], oauth2Auth: [] }],
    });
    const { result } = renderHook(() =>
      useTryItOutExecution(operation, securitySchemes, ["https://api.example.com"]),
    );

    expect(result.current.authAlternatives.map((alt) => alt.fields.map((f) => f.schemeName))).toEqual([
      ["bearerAuth"],
      ["apiKeyAuth", "oauth2Auth"],
    ]);

    act(() => {
      result.current.setSelectedAlternativeIndex(1);
      result.current.setCredentialValue("bearerAuth", "unused-token");
      result.current.setCredentialValue("apiKeyAuth", "key-value");
    });
    act(() => {
      result.current.send(makeValues());
    });
    await flush();

    const sentRequest = sendHttpRequestMock.mock.calls[0]?.[0];
    expect(sentRequest.headers["X-Api-Key"]).toBe("key-value");
    expect(sentRequest.headers.Authorization).toBeUndefined(); // bearerAuth belongs to the unselected alternative
  });

  it("resolves an oauth2-only requirement to an unsupported alternative field, and never sends a credential for it", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      oauth2Auth: { type: "oauth2", flows: {} },
    };
    const operation = makeOperation({ security: [{ oauth2Auth: ["read"] }] });
    const { result } = renderHook(() =>
      useTryItOutExecution(operation, securitySchemes, ["https://api.example.com"]),
    );

    expect(result.current.authAlternatives).toEqual([
      {
        index: 0,
        fields: [
          {
            kind: "unsupported",
            schemeName: "oauth2Auth",
            label: "OAuth 2.0",
            reason: "OAuth2 credential entry isn't supported yet",
          },
        ],
      },
    ]);

    act(() => {
      result.current.send(makeValues());
    });
    await flush();

    const sentRequest = sendHttpRequestMock.mock.calls[0]?.[0];
    expect(Object.keys(sentRequest.headers)).not.toContain("Authorization");
  });

  it("never forwards cookie values as a Cookie header (browsers won't allow it)", async () => {
    const { result } = renderHook(() => useTryItOutExecution(makeOperation(), {}, ["https://api.example.com"]));

    act(() => {
      result.current.send(makeValues({ cookie: { session: "abc" } }));
    });
    await flush();

    const sentRequest = sendHttpRequestMock.mock.calls[0]?.[0];
    expect(Object.keys(sentRequest.headers).map((h) => h.toLowerCase())).not.toContain("cookie");
  });

  it("ignores a send() call while a request is already in flight", async () => {
    let resolveFirst!: (value: typeof okResponse) => void;
    sendHttpRequestMock.mockReset();
    sendHttpRequestMock.mockImplementationOnce(
      () => new Promise((resolve) => { resolveFirst = resolve; }),
    );

    const { result } = renderHook(() => useTryItOutExecution(makeOperation(), {}, ["https://api.example.com"]));

    act(() => {
      result.current.send(makeValues());
    });
    expect(result.current.status).toBe("loading");

    act(() => {
      result.current.send(makeValues()); // should be a no-op — still loading
    });
    expect(sendHttpRequestMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(okResponse);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(result.current.status).toBe("done");
  });

  it("resets status/result/selectedAlternativeIndex (but not baseUrl/credentialValues) when the operation changes", async () => {
    const securitySchemes: Record<string, SecurityScheme> = {
      apiKeyAuth: { type: "apiKey", in: "header", name: "X-Api-Key" },
      bearerAuth: { type: "http", scheme: "bearer" },
    };
    const withOrAuth = (operationId: string) =>
      makeOperation({ operationId, security: [{ apiKeyAuth: [] }, { bearerAuth: [] }] });

    const { result, rerender } = renderHook(
      ({ operation }) => useTryItOutExecution(operation, securitySchemes, ["https://api.example.com"]),
      { initialProps: { operation: withOrAuth("getWidget") } },
    );

    act(() => {
      result.current.setBaseUrl("https://custom.example.com");
      result.current.setCredentialValue("someScheme", "some-value");
      result.current.setSelectedAlternativeIndex(1);
    });
    act(() => {
      result.current.send(makeValues());
    });
    await flush();
    expect(result.current.status).toBe("done");

    rerender({ operation: withOrAuth("getGadget") });

    expect(result.current.status).toBe("idle");
    expect(result.current.result).toBeNull();
    expect(result.current.selectedAlternativeIndex).toBe(0);
    expect(result.current.baseUrl).toBe("https://custom.example.com");
    expect(result.current.credentialValues).toEqual({ someScheme: "some-value" });
  });
});
