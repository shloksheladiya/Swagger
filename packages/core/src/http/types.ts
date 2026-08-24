// HTTP request/response types shared by build-request.ts (pure construction)
// and client.ts (execution). Deliberately generic — nothing here knows about
// Operation, TryItOutValues, or any other Try It Out UI type; that mapping
// is the caller's job (buildHttpRequest for construction, react-renderer for
// pulling values out of its own UI state before calling it).

import type { HttpMethod } from "../spec/normalized-spec.js";

export type { HttpMethod };

/** A fully-constructed request, ready to execute — no further templating,
 * encoding, or serialization left to do. `url` already includes any query
 * string (see build-request.ts). */
export interface HttpRequestDescriptor {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

/** A real response was received — including a non-2xx one. Whether a 404 or
 * 500 counts as "an error" is a display concern for the caller, not this
 * layer: the server answered, so it's a response, not a failure. */
export interface HttpResponseResult {
  kind: "response";
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
}

/** The request never got a response at all — DNS/connection failure,
 * timeout, CORS rejection, etc. Kept as a separate variant from
 * HttpResponseResult rather than a thrown exception so callers (the future
 * ResponsePanel) can render both cases from one plain value without a
 * try/catch of their own. */
export interface HttpNetworkErrorResult {
  kind: "network-error";
  message: string;
  durationMs: number;
}

export type HttpResult = HttpResponseResult | HttpNetworkErrorResult;

/** Seed of the future request-interceptor plugin point the roadmap calls
 * out (Milestone 20) — kept intentionally minimal: a function that can
 * read/modify the outgoing request before it's sent. No response
 * interceptors, no registry, no plugin context yet; add those only when a
 * real plugin needs them. */
export type HttpRequestInterceptor = (
  request: HttpRequestDescriptor,
) => HttpRequestDescriptor | Promise<HttpRequestDescriptor>;
