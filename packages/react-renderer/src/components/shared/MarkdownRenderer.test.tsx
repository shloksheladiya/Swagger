// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "./MarkdownRenderer.js";

describe("MarkdownRenderer", () => {
  it("renders basic markdown formatting", () => {
    const { container } = render(
      <MarkdownRenderer content="Some **bold** text and a [link](https://example.com)." />,
    );

    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("a")).toHaveAttribute("href", "https://example.com");
  });

  it("renders lists correctly", () => {
    render(<MarkdownRenderer content={"- First item\n- Second item"} />);

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });

  it("renders nothing problematic for empty content", () => {
    expect(() => render(<MarkdownRenderer content="" />)).not.toThrow();
  });

  it(
    "NEVER renders raw HTML tags as real DOM elements — permanent regression test for " +
      "ADR §14 (spec descriptions are untrusted input; verified empirically before this " +
      "component was written that react-markdown escapes raw HTML by default)",
    () => {
      const malicious =
        'Some text <script>window.__xss = true;</script> and <img src=x onerror="window.__xss2 = true">';
      const { container } = render(<MarkdownRenderer content={malicious} />);

      expect(container.querySelector("script")).toBeNull();
      expect(container.querySelector("img")).toBeNull();
      // the tags should show up as literal, escaped, harmless text instead
      expect(container.textContent).toContain("<script>");
    },
  );
});
