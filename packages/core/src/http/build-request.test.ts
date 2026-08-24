import { describe, expect, it } from "vitest";
import type { Operation } from "../spec/normalized-spec.js";
import { buildHttpRequest } from "./build-request.js";

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

describe("buildHttpRequest", () => {
  it("substitutes path parameters with URI encoding", () => {
    const operation = makeOperation({ path: "/pets/{petId}" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com/v1",
      pathValues: { petId: "a b/c" },
      queryValues: {},
      headerValues: {},
    });

    expect(result.url).toBe("https://api.example.com/v1/pets/a%20b%2Fc");
    expect(result.method).toBe("get");
  });

  it("substitutes a missing path value with an empty string rather than leaving the placeholder", () => {
    const operation = makeOperation({ path: "/pets/{petId}" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: {},
      headerValues: {},
    });

    expect(result.url).toBe("https://api.example.com/pets/");
  });

  it("does not resolve OpenAPI server-variable placeholders in baseUrl — documented, deliberate scope boundary", () => {
    // A `servers[].variables`-templated URL (e.g. from a spec declaring
    // `https://{region}.api.example.com` with a variables map) arrives here
    // as a literal string with the `{region}` placeholder still in it —
    // normalize-static.ts never resolves it, and neither does this
    // function. The placeholder is passed straight through, unresolved,
    // exactly like any other baseUrl text; see joinUrl's own comment.
    const operation = makeOperation({ path: "/pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://{region}.api.example.com/{version}",
      pathValues: {},
      queryValues: {},
      headerValues: {},
    });

    expect(result.url).toBe("https://{region}.api.example.com/{version}/pets");
  });

  it("joins baseUrl and path regardless of surrounding slashes", () => {
    const operation = makeOperation({ path: "pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com/v1/",
      pathValues: {},
      queryValues: {},
      headerValues: {},
    });

    expect(result.url).toBe("https://api.example.com/v1/pets");
  });

  it("appends non-empty query values and skips empty ones", () => {
    const operation = makeOperation({ path: "/pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: { limit: "10", search: "", tag: "cat dog" },
      headerValues: {},
    });

    expect(result.url).toBe(
      "https://api.example.com/pets?limit=10&tag=cat%20dog",
    );
  });

  it("serializes a non-empty array query value as repeated keys and skips an empty array entirely", () => {
    const operation = makeOperation({ path: "/pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: { tags: ["a", "", "b"], unused: [] },
      headerValues: {},
    });

    expect(result.url).toBe("https://api.example.com/pets?tags=a&tags=b");
  });

  it("omits the query string entirely when there is nothing to send", () => {
    const operation = makeOperation({ path: "/pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: { tag: "" },
      headerValues: {},
    });

    expect(result.url).toBe("https://api.example.com/pets");
  });

  it("includes non-empty headers and skips empty ones", () => {
    const operation = makeOperation({ path: "/pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: {},
      headerValues: { "X-Trace-Id": "abc", "X-Empty": "" },
    });

    expect(result.headers).toEqual({ "X-Trace-Id": "abc" });
  });

  it("sets Content-Type from the body's content type and includes the body data", () => {
    const operation = makeOperation({ path: "/pets", method: "post" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: {},
      headerValues: {},
      body: { contentType: "application/json", data: { name: "Rex" } },
    });

    expect(result.headers["Content-Type"]).toBe("application/json");
    expect(result.body).toEqual({ name: "Rex" });
  });

  it("does not overwrite an explicitly supplied Content-Type header", () => {
    const operation = makeOperation({ path: "/pets", method: "post" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: {},
      headerValues: { "content-type": "application/vnd.custom+json" },
      body: { contentType: "application/json", data: {} },
    });

    expect(result.headers["content-type"]).toBe("application/vnd.custom+json");
    expect(Object.keys(result.headers)).toHaveLength(1);
  });

  it("omits body entirely from the descriptor when the operation has none", () => {
    const operation = makeOperation({ path: "/pets" });

    const result = buildHttpRequest({
      operation,
      baseUrl: "https://api.example.com",
      pathValues: {},
      queryValues: {},
      headerValues: {},
    });

    expect("body" in result).toBe(false);
  });
});
