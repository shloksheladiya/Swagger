"use client";
// Milestone 18: gains "use client" here because it now uses framer-motion's
// AnimatePresence/motion.div directly, which rely on client-side React APIs
// — same reasoning ResponseViewer/RequestBodyViewer already document for
// gaining it in Milestone 17 (verified via `next build`, not just `tsc`).
// It happens to already only ever render inside RequestBuilder's existing
// "use client" boundary today, so this isn't required for the current build
// to succeed, but ResponsePanel is also part of this package's public barrel
// export — marking the boundary explicitly here, rather than relying on
// transitive inclusion, keeps it correct if it's ever imported on its own.
//
// ResponsePanel: renders the outcome of an ACTUAL Try It Out execution —
// status/headers/body/timing for a real response, or a distinct message for
// a request that never got one. Deliberately NOT ResponseViewer (Milestone
// 11): that component renders the spec's *documented* responses (status
// codes, schemas, examples) as static reference material, and keeps doing
// exactly that regardless of whether Try It Out has ever been used. This
// component only ever shows what actually happened on the wire for the most
// recent send() — the two are shown side by side in OperationView, not
// merged, so a "real 404 you just got" is never confused with "the 404 this
// operation documents".
//
// Pure presentation: status/result are supplied by the caller (ultimately
// useTryItOutExecution) — same "no state of its own" shape as the rest of
// Try It Out's leaf components.
//
// Milestone 18: the idle/loading/done-response/done-network-error states
// each render as a distinct keyed `motion.div` inside one `AnimatePresence`,
// so switching between them (e.g. loading -> done when a real response
// comes back) crossfades instead of popping instantly. This stays entirely
// inside ResponsePanel — its external contract (always safe to render
// unconditionally; renders nothing for "idle") is unchanged, so
// RequestBuilder, which already renders `<ResponsePanel .../>`
// unconditionally, needs no changes at all.

import { AnimatePresence, motion } from "framer-motion";
import type { HttpResult } from "@docs-platform/core";
import type { TryItOutExecutionStatus } from "../../hooks/use-try-it-out-execution.js";
import { CodeBlock } from "../shared/CodeBlock.js";
import { fadeSlide, MOTION_TRANSITION } from "../../lib/motion.js";

export interface ResponsePanelProps {
  status: TryItOutExecutionStatus;
  result: HttpResult | null;
}

function formatResponseBody(body: unknown): string {
  if (typeof body === "string") return body;
  if (body === undefined) return "";
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    // A body that can't be JSON-stringified (e.g. contains a circular
    // structure or a BigInt) still shouldn't crash the panel — fall back to
    // its string coercion rather than losing the rest of the response.
    return String(body);
  }
}

const cardStyle = {
  background: "var(--component-card-background)",
  border: "1px solid var(--component-card-border)",
  borderRadius: "var(--component-card-radius)",
  padding: "var(--component-card-padding)",
} as const;

function LoadingState() {
  return (
    <motion.div
      key="loading"
      initial={fadeSlide.initial}
      animate={fadeSlide.animate}
      exit={fadeSlide.exit}
      transition={MOTION_TRANSITION}
      className="flex flex-col gap-xs py-xs"
      role="status"
    >
      <span className="text-sm text-text-muted">Sending request…</span>
    </motion.div>
  );
}

function NetworkErrorState({ result }: { result: Extract<HttpResult, { kind: "network-error" }> }) {
  return (
    <motion.div
      key="network-error"
      initial={fadeSlide.initial}
      animate={fadeSlide.animate}
      exit={fadeSlide.exit}
      transition={MOTION_TRANSITION}
      className="flex flex-col gap-xs py-xs"
      style={cardStyle}
    >
      <span className="text-sm font-semibold text-danger">Network error</span>
      <p className="text-sm text-text-muted">{result.message}</p>
      <p className="text-xs text-text-muted">{result.durationMs} ms</p>
    </motion.div>
  );
}

function ResponseState({ result }: { result: Extract<HttpResult, { kind: "response" }> }) {
  const headerEntries = Object.entries(result.headers);
  const bodyText = formatResponseBody(result.body);

  return (
    <motion.div
      key="response"
      initial={fadeSlide.initial}
      animate={fadeSlide.animate}
      exit={fadeSlide.exit}
      transition={MOTION_TRANSITION}
      className="flex flex-col gap-md py-xs"
      style={cardStyle}
    >
      <div className="flex flex-wrap items-baseline gap-sm">
        <span className="font-mono text-sm font-semibold text-text">
          {result.status} {result.statusText}
        </span>
        <span className="text-xs text-text-muted">{result.durationMs} ms</span>
      </div>

      {headerEntries.length > 0 && (
        <div className="flex flex-col gap-xs">
          <span className="text-xs font-semibold uppercase text-text-muted">Headers</span>
          <dl className="flex flex-col gap-xs font-mono text-xs text-text">
            {headerEntries.map(([name, value]) => (
              <div key={name} className="flex gap-xs">
                <dt className="text-text-muted">{name}:</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {bodyText.length > 0 && (
        <div className="flex flex-col gap-xs">
          <span className="text-xs font-semibold uppercase text-text-muted">Body</span>
          <CodeBlock code={bodyText} />
        </div>
      )}
    </motion.div>
  );
}

export function ResponsePanel({ status, result }: ResponsePanelProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "loading" && <LoadingState />}
      {/* status === "done" with no result shouldn't be reachable (send()
       * always sets both together), but rendering nothing — same as
       * "idle" — is the safer failure mode if it ever is, same as before. */}
      {status === "done" && result?.kind === "network-error" && <NetworkErrorState result={result} />}
      {status === "done" && result?.kind === "response" && <ResponseState result={result} />}
    </AnimatePresence>
  );
}
