"use client";
// Uses useState/useEffect for Shiki's async highlighting — needs the client
// boundary (Shiki's highlighting can't run synchronously during render;
// ADR flagged this async loading model as a real gotcha, verified directly
// via a probe script before writing this component, not assumed).
//
// Security, verified empirically (same discipline as MarkdownRenderer):
// Shiki HTML-escapes the content it highlights (`<` becomes `&#x3C;`), so
// dangerouslySetInnerHTML below is safe even for untrusted code content
// (e.g. a spec's `example` field, which may originate from a third-party
// API) — confirmed with a real payload before trusting this, not assumed
// because "it's a reputable library."
//
// Race-condition safety: highlighting is async, so if `code` changes while
// a previous highlight call is still in flight, that OLDER call finishing
// LATER must not be allowed to overwrite a NEWER call's result. The
// `cancelled` flag in the effect cleanup handles this — a standard React
// pattern for async effects, not custom cleverness.
//
// Theme note (Milestone 16): Shiki bakes literal per-token inline colors
// into its output HTML at highlight time — it doesn't emit CSS custom
// properties, so it can't just inherit our token-driven `var(--color-*)`
// cascade the way every other component does via Tailwind utility classes.
// The active preset (useThemeStore, same store ThemeProvider reads) picks
// between Shiki's two built-in complementary named themes below, so code
// blocks visibly follow light/dark switches like everything else. Building
// an actual custom Shiki theme generated FROM our own token values (rather
// than reusing Shiki's bundled github-light/github-dark) is real, separate
// work, deliberately left for later.

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { useThemeStore } from "../../store/theme-store.js";

export interface CodeBlockProps {
  code: string;
  language?: string;
}

const SHIKI_THEME_BY_PRESET = {
  light: "github-light",
  dark: "github-dark",
} as const;

export function CodeBlock({ code, language = "json" }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null);
  const presetName = useThemeStore((state) => state.presetName);
  const shikiTheme = SHIKI_THEME_BY_PRESET[presetName];

  useEffect(() => {
    let cancelled = false;

    setHtml(null); // show the plain fallback again immediately on a code/theme change
    codeToHtml(code, { lang: language, theme: shikiTheme }).then((result) => {
      if (!cancelled) setHtml(result);
    });

    return () => {
      cancelled = true;
    };
  }, [code, language, shikiTheme]);

  if (!html) {
    // Plain, unhighlighted fallback — shown before the first highlight
    // resolves, and briefly on every subsequent code change.
    return (
      <pre className="overflow-x-auto rounded-md bg-surface p-md font-mono text-sm text-text">
        <code>{code}</code>
      </pre>
    );
  }

  return (
    // eslint-disable-next-line react/no-danger -- verified safe: see the
    // security note above, and CodeBlock.test.tsx's permanent regression test.
    <div
      className="overflow-x-auto rounded-md text-sm [&_pre]:p-md"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
