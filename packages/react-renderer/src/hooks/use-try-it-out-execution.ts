"use client";
// useTryItOutExecution: local, ephemeral state for actually SENDING the
// request Part A/B already built — Milestone 15's addition alongside
// useTryItOut, not a replacement for it. Deliberately a separate hook
// (rather than folded into useTryItOut) because its state has different
// lifetimes:
//
//   - baseUrl and credentialValues are NOT reset when the selected operation
//     changes (unlike every piece of useTryItOut's state). A base URL and an
//     auth token are properties of "the API you're talking to" / "who you
//     are", not of one specific operation — wiping them every time the user
//     clicks a different endpoint in the sidebar would mean re-typing a
//     bearer token per click, which is a worse experience than the one
//     known rough edge this causes (switching to an operation on a
//     different spec keeps a stale baseUrl/credentials until the user edits
//     them — acceptable for this milestone's scope; revisit only if it
//     becomes a real problem).
//   - status/result (the actual response) ARE reset on operation change —
//     showing operation A's response while operation B is now selected
//     would be actively misleading, not just stale.
//   - selectedAlternativeIndex (which OR-alternative of operation.security
//     the user is filling in — see resolve-auth-credential-fields.ts) IS
//     reset on operation change too, alongside status/result: a different
//     operation gets a freshly derived set of alternatives, and an index
//     left over from the previous operation has no guaranteed meaning
//     against them.
//
// Never persisted anywhere (no Zustand store, no localStorage) — credential
// values live only in this component tree's React state for the lifetime of
// the page.
//
// Orchestration (turning UI-shaped values into a real request and calling
// the core HTTP client) lives here, not in RequestBuilder — RequestBuilder's
// job stays "render the form + call send()", the same thin-caller shape it
// already has for useTryItOut's setters.

import { useEffect, useState } from "react";
import type { HttpResult, Operation, SecurityScheme } from "@docs-platform/core";
import { buildHttpRequest, sendHttpRequest } from "@docs-platform/core";
import type { TryItOutValues } from "./use-try-it-out.js";
import {
  applyAuthCredentials,
} from "../components/try-it-out/apply-auth-credentials.js";
import {
  resolveAuthCredentialAlternatives,
  type AuthAlternative,
} from "../components/try-it-out/resolve-auth-credential-fields.js";
import { serializeBodyValue } from "../components/try-it-out/serialize-body-value.js";
import { getRegisteredRequestInterceptors } from "../plugins/plugin-registry.js";

export type TryItOutExecutionStatus = "idle" | "loading" | "done";

export interface UseTryItOutExecutionResult {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  /** The OR-alternatives (each an AND-group of credential fields) Try It
   * Out's Authorization UI should offer — recomputed whenever the operation
   * or the spec's security schemes change (unlike baseUrl/credentialValues/
   * selectedAlternativeIndex, this isn't state, it's derived). Empty when
   * the operation requires no authentication. */
  authAlternatives: AuthAlternative[];
  /** Which alternative (an index into authAlternatives / operation.security)
   * the user is currently filling in — only this alternative's credentials
   * get injected into the request at send time, even if a stale value
   * exists for a scheme belonging to a different, unselected alternative.
   * Defaults to 0 (the first alternative). */
  selectedAlternativeIndex: number;
  setSelectedAlternativeIndex: (index: number) => void;
  /** Keyed by security scheme name. Never written to a store or persisted —
   * see module comment. */
  credentialValues: Record<string, string>;
  setCredentialValue: (schemeName: string, value: string) => void;
  status: TryItOutExecutionStatus;
  result: HttpResult | null;
  /** No-op while a request is already in flight — guards against a
   * double-click firing two overlapping requests. */
  send: (values: TryItOutValues) => void;
}

export function useTryItOutExecution(
  operation: Operation,
  securitySchemes: Record<string, SecurityScheme>,
  servers: string[],
): UseTryItOutExecutionResult {
  // Seeded once from the spec's first declared server, then left entirely
  // to the user — this is Try It Out's editable-override field, not a
  // read-only mirror of servers[0].
  const [baseUrl, setBaseUrl] = useState(() => servers[0] ?? "");
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState(0);
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<TryItOutExecutionStatus>("idle");
  const [result, setResult] = useState<HttpResult | null>(null);

  const authAlternatives = resolveAuthCredentialAlternatives(operation.security, securitySchemes);

  // Only the OUTCOME of a previous send, and which auth alternative is
  // selected, are operation-scoped — see module comment for why
  // baseUrl/credentialValues are deliberately excluded here.
  useEffect(() => {
    setStatus("idle");
    setResult(null);
    setSelectedAlternativeIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // keyed on operationId only, same convention useTryItOut itself uses.
  }, [operation.operationId]);

  function setCredentialValue(schemeName: string, value: string): void {
    setCredentialValues((prev) => ({ ...prev, [schemeName]: value }));
  }

  function send(values: TryItOutValues): void {
    if (status === "loading") return;

    const injected = applyAuthCredentials(authAlternatives, selectedAlternativeIndex, credentialValues);
    const body = values.body
      ? { contentType: "application/json", data: serializeBodyValue(values.body) }
      : undefined;

    // values.cookie is intentionally never read here. Part A collects it
    // (an operation may document cookie parameters), but a browser will not
    // let JavaScript set a Cookie header on an outgoing request — forwarding
    // it into headerValues would silently fail to do what the UI implies.
    // See resolve-auth-credential-fields.ts for the same reasoning applied
    // to apiKey-in-cookie security schemes.
    const request = buildHttpRequest({
      operation,
      baseUrl,
      pathValues: values.path,
      queryValues: { ...values.query, ...injected.query },
      headerValues: { ...values.header, ...injected.headers },
      body,
    });

    setStatus("loading");
    // Milestone 20: any plugin-registered request interceptors run here —
    // the one real caller of sendHttpRequest's `interceptors` option
    // (Milestone 15 built the option itself but nothing supplied it until
    // now). Deliberately omits the `options` argument entirely rather than
    // passing `{ interceptors: [] }` when nothing is registered, so the
    // call shape stays exactly what it was before this milestone for the
    // (still by far the most common) no-plugins-installed case.
    const interceptors = getRegisteredRequestInterceptors();
    const pendingResult =
      interceptors.length > 0
        ? sendHttpRequest(request, { interceptors: [...interceptors] })
        : sendHttpRequest(request);
    void pendingResult.then((httpResult) => {
      setResult(httpResult);
      setStatus("done");
    });
  }

  return {
    baseUrl,
    setBaseUrl,
    authAlternatives,
    selectedAlternativeIndex,
    setSelectedAlternativeIndex,
    credentialValues,
    setCredentialValue,
    status,
    result,
    send,
  };
}
