import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HttpRequestDescriptor } from "./types.js";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock("axios", () => {
  class AxiosError extends Error {}
  return {
    default: { request: requestMock },
    AxiosError,
  };
});

const { sendHttpRequest } = await import("./client.js");

beforeEach(() => {
  requestMock.mockClear();
});

function makeRequest(overrides: Partial<HttpRequestDescriptor> = {}): HttpRequestDescriptor {
  return {
    method: "get",
    url: "https://api.example.com/pets",
    headers: {},
    ...overrides,
  };
}

describe("sendHttpRequest", () => {
  it("normalizes a successful axios response into an HttpResponseResult", async () => {
    requestMock.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      data: { id: 1 },
    });

    const result = await sendHttpRequest(makeRequest());

    expect(result.kind).toBe("response");
    if (result.kind !== "response") throw new Error("expected a response result");
    expect(result.status).toBe(200);
    expect(result.statusText).toBe("OK");
    expect(result.headers).toEqual({ "content-type": "application/json" });
    expect(result.body).toEqual({ id: 1 });
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("still reports a non-2xx status as a response, not an error (validateStatus override)", async () => {
    requestMock.mockResolvedValueOnce({
      status: 404,
      statusText: "Not Found",
      headers: {},
      data: { message: "not found" },
    });

    const result = await sendHttpRequest(makeRequest());

    expect(result.kind).toBe("response");
    if (result.kind !== "response") throw new Error("expected a response result");
    expect(result.status).toBe(404);

    // Confirms this layer explicitly opts out of Axios's own throw-on-error
    // behavior rather than relying on it never triggering.
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({ validateStatus: expect.any(Function) }),
    );
    const passedConfig = requestMock.mock.calls[0]?.[0];
    expect(passedConfig.validateStatus(500)).toBe(true);
  });

  it("joins repeated response header values with a comma", async () => {
    requestMock.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: { "set-cookie": ["a=1", "b=2"] },
      data: null,
    });

    const result = await sendHttpRequest(makeRequest());

    expect(result.kind).toBe("response");
    if (result.kind !== "response") throw new Error("expected a response result");
    expect(result.headers["set-cookie"]).toBe("a=1, b=2");
  });

  it("reports a thrown network error as an HttpNetworkErrorResult, not a rejected promise", async () => {
    requestMock.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    const result = await sendHttpRequest(makeRequest());

    expect(result).toEqual(
      expect.objectContaining({
        kind: "network-error",
        message: "connect ECONNREFUSED",
      }),
    );
  });

  it("applies interceptors in order before sending", async () => {
    requestMock.mockResolvedValueOnce({
      status: 200,
      statusText: "OK",
      headers: {},
      data: null,
    });

    await sendHttpRequest(makeRequest({ headers: {} }), {
      interceptors: [
        (req) => ({ ...req, headers: { ...req.headers, "X-Step": "1" } }),
        (req) => ({
          ...req,
          headers: { ...req.headers, "X-Step": `${req.headers["X-Step"]}-2` },
        }),
      ],
    });

    const passedConfig = requestMock.mock.calls[0]?.[0];
    expect(passedConfig.headers).toEqual({ "X-Step": "1-2" });
  });

  it("passes the request's method, url, headers, and body straight through to axios", async () => {
    requestMock.mockResolvedValueOnce({
      status: 201,
      statusText: "Created",
      headers: {},
      data: null,
    });

    await sendHttpRequest(
      makeRequest({
        method: "post",
        url: "https://api.example.com/pets",
        headers: { "X-Trace-Id": "abc" },
        body: { name: "Rex" },
      }),
    );

    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        url: "https://api.example.com/pets",
        headers: { "X-Trace-Id": "abc" },
        data: { name: "Rex" },
      }),
    );
  });
});
