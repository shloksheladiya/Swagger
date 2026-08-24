// The one place Axios is actually called from (roadmap: "Request execution
// goes through one central httpClient, not scattered axios.get() calls" —
// this is the exact seam future request-interceptor plugins hook into).
// Deliberately thin: build-request.ts already did all the construction
// work, this only executes and normalizes the result.
//
// A real HTTP response (whatever its status code) and a genuine network
// failure are kept as separate HttpResult variants (see types.ts) rather
// than the usual Axios pattern of throwing on non-2xx — callers (the future
// ResponsePanel) need to render "got a 404" and "DNS lookup failed"
// differently, and a single try/catch that has to inspect the thrown error
// to tell them apart is worse than the branch already being done here.

import axios, { AxiosError } from "axios";
import type {
  HttpRequestDescriptor,
  HttpRequestInterceptor,
  HttpResult,
} from "./types.js";

export interface SendHttpRequestOptions {
  /** Applied in order before the request is sent — the seed of the future
   * request-interceptor plugin point (Milestone 20). Empty/omitted today. */
  interceptors?: HttpRequestInterceptor[];
  /** Milliseconds before the request is aborted and reported as a
   * network-error result. Undefined means no client-side timeout beyond
   * Axios's own default (none). */
  timeoutMs?: number;
}

function normalizeResponseHeaders(headers: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (headers && typeof headers === "object") {
    for (const [name, value] of Object.entries(
      headers as Record<string, unknown>,
    )) {
      if (typeof value === "string") result[name] = value;
      // Axios (via Node's http client) can hand back a multi-value header
      // (e.g. repeated Set-Cookie) as string[] — joined for display rather
      // than dropped, since HttpResult's headers are plain strings.
      else if (Array.isArray(value)) result[name] = value.join(", ");
    }
  }
  return result;
}

export async function sendHttpRequest(
  request: HttpRequestDescriptor,
  options: SendHttpRequestOptions = {},
): Promise<HttpResult> {
  let effectiveRequest = request;
  for (const interceptor of options.interceptors ?? []) {
    effectiveRequest = await interceptor(effectiveRequest);
  }

  // Date.now() rather than performance.now(): this package's ES2022 lib
  // target has no DOM/Node lib types in scope, and millisecond resolution
  // is plenty for a displayed execution time — sub-millisecond precision
  // isn't a real requirement here.
  const startedAt = Date.now();

  try {
    const response = await axios.request({
      method: effectiveRequest.method,
      url: effectiveRequest.url,
      headers: effectiveRequest.headers,
      data: effectiveRequest.body,
      timeout: options.timeoutMs,
      // A non-2xx status is still a real, displayable response — this
      // function's job is to report it, not to decide (the way Axios does
      // by default) that it's an error worth throwing for.
      validateStatus: () => true,
    });

    return {
      kind: "response",
      status: response.status,
      statusText: response.statusText,
      headers: normalizeResponseHeaders(response.headers),
      body: response.data,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message =
      error instanceof AxiosError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown network error";
    return { kind: "network-error", message, durationMs };
  }
}
