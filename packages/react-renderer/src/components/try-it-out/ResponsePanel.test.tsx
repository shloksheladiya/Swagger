// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { HttpResult } from "@docs-platform/core";
import { ResponsePanel } from "./ResponsePanel.js";

describe("ResponsePanel", () => {
  it("renders nothing before a request has ever been sent", () => {
    const { container } = render(<ResponsePanel status="idle" result={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a sending indicator while loading", () => {
    render(<ResponsePanel status="loading" result={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/sending/i);
  });

  it("renders status, timing, and headers for a real response", () => {
    const result: HttpResult = {
      kind: "response",
      status: 200,
      statusText: "OK",
      headers: { "content-type": "application/json" },
      body: { id: 1 },
      durationMs: 42,
    };
    render(<ResponsePanel status="done" result={result} />);

    expect(screen.getByText(/200 OK/)).toBeInTheDocument();
    expect(screen.getByText(/42 ms/)).toBeInTheDocument();
    expect(screen.getByText("content-type:")).toBeInTheDocument();
    expect(screen.getByText("application/json")).toBeInTheDocument();
  });

  it("pretty-prints a JSON response body", () => {
    const result: HttpResult = {
      kind: "response",
      status: 201,
      statusText: "Created",
      headers: {},
      body: { name: "Rex" },
      durationMs: 3,
    };
    render(<ResponsePanel status="done" result={result} />);

    expect(screen.getByText(/"name"/)).toBeInTheDocument();
    expect(screen.getByText(/"Rex"/)).toBeInTheDocument();
  });

  it("renders a non-2xx status as a normal response, not an error", () => {
    const result: HttpResult = {
      kind: "response",
      status: 404,
      statusText: "Not Found",
      headers: {},
      body: { message: "not found" },
      durationMs: 10,
    };
    render(<ResponsePanel status="done" result={result} />);

    expect(screen.getByText(/404 Not Found/)).toBeInTheDocument();
    expect(screen.queryByText("Network error")).not.toBeInTheDocument();
  });

  it("renders a network error distinctly from a real response", () => {
    const result: HttpResult = {
      kind: "network-error",
      message: "Network Error",
      durationMs: 8,
    };
    render(<ResponsePanel status="done" result={result} />);

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Network Error")).toBeInTheDocument();
    expect(screen.queryByText(/^\d\d\d /)).not.toBeInTheDocument();
  });

  it("omits the headers section entirely when there are none", () => {
    const result: HttpResult = {
      kind: "response",
      status: 204,
      statusText: "No Content",
      headers: {},
      body: undefined,
      durationMs: 1,
    };
    render(<ResponsePanel status="done" result={result} />);

    expect(screen.queryByText("Headers")).not.toBeInTheDocument();
    expect(screen.queryByText("Body")).not.toBeInTheDocument();
  });

  // Milestone 18: proves the loading -> done transition still ends up
  // showing the right content (already the point of the tests above) even
  // now that it's mediated by AnimatePresence's mode="wait" — the loading
  // indicator must fully exit before the response content mounts, so this
  // needs `waitFor` rather than a synchronous assertion.
  it("transitions from the loading indicator to the real response when a result arrives", async () => {
    const result: HttpResult = {
      kind: "response",
      status: 200,
      statusText: "OK",
      headers: {},
      body: { ok: true },
      durationMs: 5,
    };
    const { rerender } = render(<ResponsePanel status="loading" result={null} />);
    expect(screen.getByRole("status")).toHaveTextContent(/sending/i);

    rerender(<ResponsePanel status="done" result={result} />);

    await waitFor(() => {
      expect(screen.getByText(/200 OK/)).toBeInTheDocument();
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
