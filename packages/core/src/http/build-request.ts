// Pure construction of an HttpRequestDescriptor from an Operation and plain,
// already-typed values — no React, no TryItOutBodyValue tree, no
// SecurityScheme awareness. Callers (react-renderer's Try It Out execution
// wiring) are responsible for pulling values out of their own UI state
// (including turning any auth credentials into extra header/query entries)
// into the plain shapes this function expects; this function only knows how
// to turn "here are the path/query/header values and a body" into a real
// request. Kept dependency-free (no Axios import) specifically so it stays
// trivially unit-testable without mocking a network layer.

import type { Operation } from "../spec/normalized-spec.js";
import type { HttpRequestDescriptor } from "./types.js";

export interface RequestBodyInput {
  contentType: string;
  data: unknown;
}

export interface BuildHttpRequestInput {
  operation: Operation;
  /** Origin + optional path prefix, e.g. "https://api.example.com/v1" — a
   * trailing slash on baseUrl or a missing leading slash on
   * operation.path is tolerated (see joinUrl below), so callers don't need
   * to pre-clean whatever the user typed into a "Base URL" field. */
  baseUrl: string;
  /** Values for `operation.path`'s `{name}` placeholders. A placeholder with
   * no entry (or an empty value) is substituted with an empty string rather
   * than left as a literal `{name}` in the URL — callers that need to block
   * that case do so via useTryItOut's existing required-field validation
   * before calling this function, not by this function guessing. */
  pathValues: Record<string, string>;
  /** Skipped (not appended to the query string) when empty — an empty
   * string, or an empty array. Non-empty arrays are serialized as repeated
   * `key=value` pairs (OpenAPI's default `style: form, explode: true`);
   * empty strings inside an array are skipped individually rather than
   * sent as bare `key=`. */
  queryValues: Record<string, string | string[]>;
  /** Skipped when empty, same policy as queryValues. */
  headerValues: Record<string, string>;
  body?: RequestBodyInput;
}

const PATH_PARAM_PATTERN = /\{([^}]+)\}/g;

function substitutePathParams(
  path: string,
  values: Record<string, string>,
): string {
  return path.replace(PATH_PARAM_PATTERN, (_match, name: string) =>
    encodeURIComponent(values[name] ?? ""),
  );
}

// Deliberately unsupported: OpenAPI `servers[].variables` templating (e.g.
// `https://{region}.api.example.com` with a variables map of defaults).
// normalize-static.ts only ever captures a server's literal `.url` string,
// so a templated one arrives here with its `{region}`-style placeholder
// still in it — this function does no variable substitution, and baseUrl is
// joined to the path exactly as given. That's a known, deliberate scope
// boundary for this milestone (Try It Out's Base URL field is fully
// editable specifically so a user can hand-fix a templated URL), not an
// oversight — building real `servers[].variables` resolution is separate,
// out-of-scope work.
function joinUrl(baseUrl: string, path: string): string {
  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${trimmedBase}${normalizedPath}`;
}

function appendQueryParams(
  url: string,
  queryValues: Record<string, string | string[]>,
): string {
  const params: Array<[string, string]> = [];

  for (const [name, value] of Object.entries(queryValues)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item.trim().length > 0) params.push([name, item]);
      }
    } else if (value.trim().length > 0) {
      params.push([name, value]);
    }
  }

  if (params.length === 0) return url;

  const search = params
    .map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
    .join("&");
  return `${url}?${search}`;
}

function hasHeaderCaseInsensitive(
  headers: Record<string, string>,
  name: string,
): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === lower);
}

export function buildHttpRequest(
  input: BuildHttpRequestInput,
): HttpRequestDescriptor {
  const { operation, baseUrl, pathValues, queryValues, headerValues, body } =
    input;

  const substitutedPath = substitutePathParams(operation.path, pathValues);
  const url = appendQueryParams(joinUrl(baseUrl, substitutedPath), queryValues);

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(headerValues)) {
    if (value.trim().length > 0) headers[name] = value;
  }
  // Only set Content-Type from the body's declared media type when the
  // caller hasn't already supplied one explicitly (e.g. via a header
  // parameter) — this should be rare in practice, but a silent overwrite of
  // an explicit value would be a surprising thing for this function to do.
  if (body && !hasHeaderCaseInsensitive(headers, "content-type")) {
    headers["Content-Type"] = body.contentType;
  }

  return {
    method: operation.method,
    url,
    headers,
    ...(body ? { body: body.data } : {}),
  };
}
