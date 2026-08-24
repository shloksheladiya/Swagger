// MarkdownRenderer: pure presentation, no store access, no "use client"
// needed — same shape as OperationHeader/ParametersTable.
//
// Security-critical default, verified empirically rather than assumed
// (ADR §14): spec descriptions are untrusted input — they may come from a
// third-party API a company doesn't fully control — so raw HTML must never
// render. react-markdown v10 escapes raw HTML by default with NO extra
// configuration; this component deliberately does not add rehype-raw or any
// other plugin that would change that. If richer formatting is ever needed,
// add a strict allowlist sanitizer (e.g. rehype-sanitize) — never plain
// unsanitized raw HTML (ADR §14's explicit Decision Record on this).

import ReactMarkdown from "react-markdown";

export interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="text-sm text-text-muted">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
