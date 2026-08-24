// Registered globally (see root vitest.config.ts's setupFiles) so every
// component test gets automatic DOM cleanup between tests — without this,
// RTL's render() output from one test persists into the next (unlike Jest,
// where RTL auto-detects the test framework's globals and wires this up for
// you; under Vitest it has to be done explicitly).
//
// This file runs for EVERY test in the monorepo, including core/theme's
// plain Node-environment tests that have no `document` at all — hence the
// guard. Lives inside react-renderer (not at the repo root) specifically so
// `@testing-library/react` resolves correctly: it's a real dependency here,
// and pnpm's strict node_modules would fail to resolve it from a root-level
// file that never declared the dependency itself.

import { afterEach } from "vitest";

// Registers jest-dom's matchers (toBeInTheDocument, toHaveAttribute, etc.)
// globally, once, for every test file — rather than requiring each
// component test file to remember `import "@testing-library/jest-dom/vitest"`
// itself. Safe to import unconditionally here even for node-environment
// tests (core/theme): it only extends `expect`, it doesn't touch the DOM.
import "@testing-library/jest-dom/vitest";

afterEach(async () => {
  if (typeof document === "undefined") return; // node-environment tests (core, theme) — nothing to clean up
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
