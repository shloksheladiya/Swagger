// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CodeBlock } from "./CodeBlock.js";
import { useThemeStore } from "../../store/theme-store.js";

beforeEach(() => {
  useThemeStore.setState({ presetName: "light" });
});

describe("CodeBlock", () => {
  it("shows a plain, unhighlighted fallback immediately, before highlighting resolves", () => {
    const { container } = render(<CodeBlock code='{"id": 1}' />);

    // synchronous — no waitFor — checking the FIRST render, before the
    // async codeToHtml call has had any chance to resolve
    const pre = container.querySelector("pre");
    expect(pre).toBeInTheDocument();
    expect(pre?.textContent).toBe('{"id": 1}');
  });

  it("renders real Shiki-highlighted output once the async call resolves", async () => {
    const { container } = render(<CodeBlock code='{"id": 1}' />);

    await waitFor(() => {
      // real Shiki output includes its own generated class + inline
      // per-token color styles — not just the plain fallback <pre><code>
      expect(container.querySelector(".shiki")).toBeInTheDocument();
    });

    // the actual content must still be recoverable from the highlighted markup
    expect(container.textContent).toContain('"id"');
  });

  it("does not let a stale, slower-resolving highlight call overwrite a newer one (race-condition safety)", async () => {
    const { container, rerender } = render(<CodeBlock code='{"first": true}' />);
    rerender(<CodeBlock code='{"second": true}' />); // change immediately, before the first call resolves

    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeInTheDocument();
    });

    // final rendered content must reflect the LAST code prop, not the first
    expect(container.textContent).toContain("second");
    expect(container.textContent).not.toContain("first");
  });

  it(
    "NEVER renders a raw <script> element even for malicious code content — permanent regression " +
      "test (verified empirically before this component was written that Shiki HTML-escapes content)",
    async () => {
      const malicious = '{"note": "<script>window.__xss = true;<\\/script>"}';
      const { container } = render(<CodeBlock code={malicious} />);

      await waitFor(() => {
        expect(container.querySelector(".shiki")).toBeInTheDocument();
      });

      expect(container.querySelector("script")).toBeNull();
    },
  );

  it("highlights with Shiki's light theme when the light preset is active (the store default)", async () => {
    const { container } = render(<CodeBlock code='{"id": 1}' />);

    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeInTheDocument();
    });

    expect(container.querySelector(".shiki.github-light")).toBeInTheDocument();
    expect(container.querySelector(".shiki.github-dark")).toBeNull();
  });

  it("highlights with Shiki's dark theme when the dark preset is active", async () => {
    useThemeStore.getState().setPreset("dark");
    const { container } = render(<CodeBlock code='{"id": 1}' />);

    await waitFor(() => {
      expect(container.querySelector(".shiki")).toBeInTheDocument();
    });

    expect(container.querySelector(".shiki.github-dark")).toBeInTheDocument();
    expect(container.querySelector(".shiki.github-light")).toBeNull();
  });

  it("re-highlights with the new Shiki theme when the active preset changes after mount", async () => {
    const { container, rerender } = render(<CodeBlock code='{"id": 1}' />);
    await waitFor(() => {
      expect(container.querySelector(".shiki.github-light")).toBeInTheDocument();
    });

    useThemeStore.getState().setPreset("dark");
    rerender(<CodeBlock code='{"id": 1}' />);

    await waitFor(() => {
      expect(container.querySelector(".shiki.github-dark")).toBeInTheDocument();
    });
  });
});
