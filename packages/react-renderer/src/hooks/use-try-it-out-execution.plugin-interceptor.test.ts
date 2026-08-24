// @vitest-environment jsdom
//
// Milestone 20 end-to-end proof for registerRequestInterceptor: this is
// deliberately NOT just "the interceptor registry stores what was
// registered" (plugin-registry.test.ts already covers that in isolation).
// This test drives the REAL path a user actually triggers —
// installPlugin() -> registerRequestInterceptor() -> Try It Out's real
// send() (via the real useTryItOutExecution hook and the real
// buildHttpRequest serializer) -> the interceptor is actually invoked with
// the real outgoing request -> its (mutated) return value is what would
// reach the network.
//
// sendHttpRequest itself is mocked (same "mock only the I/O boundary"
// convention use-try-it-out-execution.test.ts already uses), but — unlike
// that file's mock — this one's mockImplementation re-applies
// `options.interceptors` before resolving, faithfully mirroring the one-line
// contract core's real sendHttpRequest has (and that core's OWN
// client.test.ts, "applies interceptors in order before sending", already
// independently verifies in isolation). Axios can't be mocked directly from
// a react-renderer test file (it's core's dependency, not
// react-renderer's — not resolvable from this package's node_modules), so
// this is the boundary this test can faithfully exercise: it isolates and
// proves the NEW part Milestone 20 actually adds — that a plugin-registered
// interceptor genuinely reaches, and runs against, the real request
// use-try-it-out-execution.ts builds — without re-deriving core's own
// already-tested interceptor-loop correctness.
//
// Own file, isolated from use-try-it-out-execution.test.ts: vitest gives
// each test file a fresh module graph, so installing a plugin here can't
// leak a registered interceptor into that file's assertions (which expect
// sendHttpRequest to be called with exactly one, request-only, argument
// when no plugin is installed).

import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { HttpRequestDescriptor, Operation, SendHttpRequestOptions } from "@docs-platform/core";

const { sendHttpRequestMock } = vi.hoisted(() => ({ sendHttpRequestMock: vi.fn() }));

vi.mock("@docs-platform/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@docs-platform/core")>();
  return { ...actual, sendHttpRequest: sendHttpRequestMock };
});

const { useTryItOutExecution } = await import("./use-try-it-out-execution.js");
const { installPlugin } = await import("../plugins/plugin-registry.js");

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

let sentRequests: HttpRequestDescriptor[] = [];

beforeEach(() => {
  sendHttpRequestMock.mockReset();
  sentRequests = [];
  sendHttpRequestMock.mockImplementation(
    async (request: HttpRequestDescriptor, options?: SendHttpRequestOptions) => {
      let effectiveRequest = request;
      for (const interceptor of options?.interceptors ?? []) {
        effectiveRequest = await interceptor(effectiveRequest);
      }
      sentRequests.push(effectiveRequest);
      return okResponse;
    },
  );
});

describe("registerRequestInterceptor — end-to-end through Try It Out execution (Milestone 20)", () => {
  it("invokes a plugin-registered interceptor with the real outgoing request, and sends its mutated result", async () => {
    const observedRequests: HttpRequestDescriptor[] = [];

    // installPlugin -> registerRequestInterceptor: the exact sequence a
    // real host app performs at bootstrap (see docs-app's request-logger
    // plugin). The interceptor both records what it saw AND mutates the
    // request, so a passing assertion below can only mean it genuinely ran
    // against the real request, not that the plugin object was merely
    // constructed or registered.
    installPlugin({
      name: "test-observer-plugin",
      install(context) {
        context.registerRequestInterceptor((request) => {
          observedRequests.push(request);
          return { ...request, headers: { ...request.headers, "X-Plugin-Ran": "yes" } };
        });
      },
    });

    const { result } = renderHook(() =>
      useTryItOutExecution(makeOperation(), {}, ["https://api.example.com"]),
    );

    act(() => {
      result.current.send({ path: { id: "42" }, query: {}, header: {}, cookie: {}, body: null });
    });
    await flush();

    // The interceptor received the real, fully-built request — proves it
    // executed against the real pipeline's output, not in isolation.
    expect(observedRequests).toHaveLength(1);
    expect(observedRequests[0]).toMatchObject({
      method: "get",
      url: "https://api.example.com/widgets/42",
    });

    // What actually reached the (mocked) network is the interceptor's
    // mutated output — the observable proof that the interceptor's return
    // value, not just its side effect, feeds into the real request that
    // gets sent.
    expect(sentRequests).toHaveLength(1);
    expect(sentRequests[0]?.headers["X-Plugin-Ran"]).toBe("yes");

    expect(result.current.status).toBe("done");
    expect(result.current.result).toEqual(okResponse);
  });

  it("passes registered interceptors to sendHttpRequest's options", async () => {
    installPlugin({
      name: "test-observer-plugin-2",
      install: (context) => context.registerRequestInterceptor((request) => request),
    });

    const { result } = renderHook(() =>
      useTryItOutExecution(makeOperation(), {}, ["https://api.example.com"]),
    );
    act(() => {
      result.current.send({ path: { id: "1" }, query: {}, header: {}, cookie: {}, body: null });
    });
    await flush();

    expect(sendHttpRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({ method: "get" }),
      expect.objectContaining({ interceptors: expect.any(Array) }),
    );
    const passedOptions = sendHttpRequestMock.mock.calls[0]?.[1] as SendHttpRequestOptions;
    expect(passedOptions.interceptors?.length).toBeGreaterThan(0);
  });
});
