"use client";
// The shared page composition rendered by BOTH the index route (page.tsx)
// and the Milestone 19 deep-link route (docs/[tag]/[operationId]/page.tsx).
// This is not a new react-renderer component — it's a docs-app-internal
// wrapper around AppShell/Sidebar/OperationView, which those two route
// files would otherwise have to duplicate identically.
//
// Post-M20 real-OpenAPI-integration change: DocsShell no longer takes
// `tags`/`operationsByTag`/`operations` as props sourced from demo-data.ts.
// It now derives all three itself from specStore's active NormalizedSpec —
// the real core parsing pipeline's output, loaded by useLoadSpec() below —
// using the existing selectOperationsByTag selector (Milestone 5) exactly
// as it was already shaped for. Sidebar and OperationView's own prop
// contracts are UNCHANGED: they still take `tags`/`operationsByTag`/
// `operations` as props, same as before — only where DocsShell gets those
// values from has changed.

import { useEffect, useState } from "react";
import { resolveConfig } from "@docs-platform/core";
import {
  AppShell,
  Sidebar,
  OperationView,
  installPlugin,
  selectOperationsByTag,
  useConfigStore,
  useSpecStore,
  useThemeStore,
  useUiStore,
} from "@docs-platform/react-renderer";
import {
  acmeConfig,
  jsonPlaceholderConfig,
  stressTestConfig,
  sunnyLabsConfig,
} from "./example-docs-configs";
import { productionConfig } from "./production-config";
import { useSyncStoreToRouteParams } from "./docs/use-route-sync";
import { useLoadSpec, ACTIVE_SPEC_ID } from "./docs/use-load-spec";
import { requestLoggerPlugin } from "./plugins/request-logger-plugin";

// Milestone 20: installed once, at module load — not inside the DocsShell
// component body, which would re-run installPlugin (and so re-register a
// duplicate interceptor) on every render. This is the same "app bootstrap,
// not a component concern" spirit as Milestone 16/17's ThemeToggle/
// ConfigSwitcher demos just below, applied to plugin installation instead
// of store access. See request-logger-plugin.ts for what this plugin does
// and why it's the real Milestone 20 example.
installPlugin(requestLoggerPlugin);

// Company-configuration productization pass: the app now boots from the
// real production-config.ts (the one DocsConfig a deployment actually
// ships with — see that file for what it points at and why) instead of the
// example-only sunnyLabsConfig. sunnyLabsConfig/acmeConfig/stressTestConfig/
// jsonPlaceholderConfig remain fully intact below, still reachable through
// ConfigSwitcher — that component is now dev-only (see isDevBuild) rather
// than removed, since we still rely on them for regression testing.
//
// Bootstrap: load a real default config on module load, same pattern as
// installPlugin above. Without this, configStore starts `null` (M17's own
// completion note: "docs-app never actually loads a config") and
// useLoadSpec below would have no specSource to act on until a user
// manually clicked a ConfigSwitcher button — this app should show real
// operations from the very first render, not an empty shell. Guarded so it
// only seeds a config that isn't already there (e.g. across HMR reloads).
if (!useConfigStore.getState().config) {
  useConfigStore.getState().setConfigResult(resolveConfig(productionConfig));
}

// Clean dev-only condition (Next.js statically inlines `process.env.NODE_ENV`
// at build time, in both server and client bundles, so this branch — and
// ConfigSwitcher itself — is dead-code-eliminated from a real `next build`
// production bundle, not just hidden by a runtime check). Gates ONLY the
// demo/QA config-switching tools; it does not affect which config boots
// (see productionConfig above, loaded unconditionally) or anything else in
// this file (e.g. ThemeToggle stays available in every environment).
const isDevBuild = process.env.NODE_ENV !== "production";

// Manual verification only (Milestone 16): confirms ThemeProvider (wired in
// app/layout.tsx) actually swaps the whole UI at runtime, not just at build
// time. A real theme toggle surfaced in AppShell/config is later work.
function ThemeToggle() {
  const presetName = useThemeStore((state) => state.presetName);
  const setPreset = useThemeStore((state) => state.setPreset);

  return (
    <button
      type="button"
      className="rounded-md border border-border bg-surface px-md py-xs text-sm text-text"
      onClick={() => setPreset(presetName === "light" ? "dark" : "light")}
    >
      Switch to {presetName === "light" ? "dark" : "light"} theme
    </button>
  );
}

// Manual verification only (Milestone 17): confirms the real
// DocsConfig -> resolveConfig -> configStore -> UI path actually works
// end-to-end in the running app, not just in isolated component tests (see
// AppShell.test.tsx et al., which hand-build already-resolved config
// objects). Both example configs now carry the same real specSource (see
// example-docs-configs.ts), so switching between them also demonstrates a
// genuine specStore reload through useLoadSpec, not just a branding swap.
//
// Company-configuration productization pass: this whole component — every
// button below, not just the dashed-border "Dev" group — is now rendered
// only when isDevBuild is true (see the module-level check above). None of
// these are real product configuration; they exist so we can keep manually
// exercising sunnyLabsConfig/acmeConfig/stressTestConfig/jsonPlaceholderConfig
// for regression testing without a real deployment ever seeing them. Not
// deleted — see example-docs-configs.ts for why we still need them.
function ConfigSwitcher() {
  const activeTitle = useConfigStore((state) => state.config?.branding.title);

  function loadConfig(raw: unknown) {
    useConfigStore.getState().setConfigResult(resolveConfig(raw));
  }

  return (
    <div className="flex items-center gap-sm text-sm">
      <span className="text-text-muted">
        Config: {activeTitle ?? "(none loaded — showing defaults)"}
      </span>
      <button
        type="button"
        className="rounded-md border border-border bg-surface px-md py-xs text-sm text-text"
        onClick={() => loadConfig(sunnyLabsConfig)}
      >
        Load Sunny Labs config
      </button>
      <button
        type="button"
        className="rounded-md border border-border bg-surface px-md py-xs text-sm text-text"
        onClick={() => loadConfig(acmeConfig)}
      >
        Load Acme config
      </button>
      {/* QA/hardening-pass dev tool — deliberately styled to look distinct
          from the two customer-facing example buttons above (dashed border,
          warning color, "(dev)" wording) rather than sharing their styling,
          per the explicit requirement that this NOT read as part of the
          polished/customer-facing product experience. Loads the large
          synthetic stress-test document (stress-test-openapi-spec.ts /
          packages/core/test-fixtures/large-spec.json) for manual regression
          testing of Sidebar/Search/Routing/SchemaViewer/Try It Out against
          50+ operations. Not linked from anywhere a real customer would see. */}
      <div className="ml-sm flex items-center gap-sm border-l border-dashed border-border pl-sm">
        <span className="text-xs uppercase tracking-wide text-text-muted">Dev</span>
        <button
          type="button"
          className="rounded-md border border-dashed border-amber-500 bg-amber-50 px-md py-xs text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          onClick={() => loadConfig(stressTestConfig)}
          title="Loads the large synthetic stress-test spec for regression testing — not a customer-facing example"
        >
          Load Stress Test spec (dev)
        </button>
        <button
          type="button"
          className="rounded-md border border-dashed border-amber-500 bg-amber-50 px-md py-xs text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          onClick={() => loadConfig(jsonPlaceholderConfig)}
          title="Loads the real JSONPlaceholder OpenAPI spec (fetched live from GitHub) against the real https://jsonplaceholder.typicode.com API — not a customer-facing example"
        >
          Load JSONPlaceholder spec (dev)
        </button>
      </div>
    </div>
  );
}

// Production UX audit (Milestone 21, "responsive mobile sidebar"): ephemeral
// UI-only state (is the mobile drawer open), same "local, not a store"
// reasoning the Milestone 14 roadmap note already applies to Try It Out's
// form state — this has nothing to do with the spec/config/selection data
// uiStore/specStore/configStore exist to hold, and every consumer of it
// lives in this one component tree, so a plain useState here is the
// smallest correct tool. No new store, no new context provider.
export function DocsShell() {
  // Triggers (and re-triggers, if config.specSource's content changes)
  // loading the active spec into specStore. See use-load-spec.ts.
  useLoadSpec();

  const specEntry = useSpecStore((state) => state.specs[ACTIVE_SPEC_ID]);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const selectedOperationId = useUiStore((state) => state.selectedOperationId);

  // Selecting an operation from the mobile drawer should close it — this
  // fires for ANY selection change (desktop click, mobile click, deep-link
  // sync), which is fine: closing an already-closed drawer is a no-op, and
  // there is exactly one place selection changes (uiStore.selectOperation),
  // so watching its result here is simpler than threading a callback through
  // Sidebar/EndpointListItem, which this pass deliberately leaves untouched.
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [selectedOperationId]);

  // Escape closes the drawer, matching standard dialog/drawer behavior.
  // Only registered while the drawer is actually open.
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsMobileSidebarOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileSidebarOpen]);

  // Milestone 19: keeps the URL in sync whenever the selected operation
  // changes, regardless of which route rendered this shell. Uses the real
  // spec's operations now instead of a props-threaded demo-data list — an
  // empty array before the spec is ready is fine, the effect just has
  // nothing to sync yet.
  useSyncStoreToRouteParams(specEntry?.spec?.operations ?? []);

  // QA/hardening-pass fix: both branches below now render through the real
  // AppShell (no `sidebar` prop — there's nothing to show one for yet)
  // instead of a bare unstyled `<div>`, so a slow/failed spec load still
  // shows branded/themed chrome (ThemeProvider-driven surface/border/text
  // tokens) instead of flashing an unstyled page. No new loading framework
  // and no duplicated layout markup — this is the same AppShell every other
  // state below already uses.
  if (!specEntry || specEntry.status === "loading") {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center gap-sm text-text-muted">
          {/* Production UX audit (Milestone 21, "loading spinner"): a plain
              CSS spin via Tailwind's built-in `animate-spin` — no new
              dependency, no new loading framework, just visible activity
              where there was previously only static text. Themed with the
              same border/text tokens as everything else here so it matches
              light/dark mode automatically. */}
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-text"
            role="status"
            aria-label="Loading"
          />
          <p>Loading API documentation…</p>
        </div>
      </AppShell>
    );
  }

  if (specEntry.status === "error") {
    return (
      <AppShell>
        <div className="flex h-full flex-col items-center justify-center gap-sm p-xl text-center text-text-muted">
          {/* Production UX audit (Milestone 21, "user-facing spec-load
              error"): the primary message is now short and non-technical —
              raw parser dumps (YAML line/column pointers, "Failed to
              fetch", the underlying library's own "...is not a valid
              Openapi API definition" typo) no longer render as the main
              UI. The real diagnostic is still available, just tucked behind
              a collapsed <details> for whoever configured the deployment,
              not shown by default to an end user. */}
          <p className="text-text">Unable to load API documentation.</p>
          <p className="text-sm">
            Check that the configured OpenAPI document is reachable and valid, then reload the
            page.
          </p>
          {specEntry.error?.message && (
            <details className="mt-sm w-full max-w-lg text-left text-xs">
              <summary className="cursor-pointer select-none text-text-muted">
                Technical details
              </summary>
              <pre className="mt-xs overflow-x-auto whitespace-pre-wrap break-words rounded-sm bg-surface p-sm text-text-muted">
                {specEntry.error.message}
              </pre>
            </details>
          )}
        </div>
      </AppShell>
    );
  }

  const spec = specEntry.spec;
  if (!spec) {
    // Unreachable in practice (status "ready" always carries `spec`, per
    // SpecEntry's own shape) — kept only so TypeScript doesn't need a
    // non-null assertion below, no new state to reason about.
    return null;
  }

  const tags = spec.tags;
  const operationsByTag = selectOperationsByTag(spec);
  const operations = spec.operations;

  return (
    <AppShell
      sidebar={
        <>
          {/* Mobile-only backdrop: clicking it is the "click outside the
              drawer closes it" behavior. Only rendered while the drawer is
              open, and only visible below the `md` breakpoint (`md:hidden`)
              — at `md` and up the sidebar is back to its normal static
              two-pane column, so there is no overlay to dismiss. */}
          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              aria-hidden="true"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}
          <div
            className={
              "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-background shadow-lg transition-transform duration-200 ease-out " +
              (isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full") +
              " md:static md:z-auto md:w-64 md:translate-x-0 md:shadow-none"
            }
          >
            <Sidebar tags={tags} operationsByTag={operationsByTag} />
          </div>
        </>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-sm border-b border-border p-md">
        <div className="flex items-center gap-sm">
          {/* Production UX audit (Milestone 21, "responsive mobile
              sidebar"): the sidebar is now a fixed 256px column only at
              `md` and up (see the drawer wrapper above); below that it's an
              off-canvas drawer, and this is its one open affordance.
              Closing happens via the backdrop, Escape, or selecting an
              operation (see the effects below) — deliberately not
              duplicated on this same button, so it doesn't need to change
              icon/label between two states. */}
          <button
            type="button"
            className="rounded-md border border-border bg-surface px-md py-xs text-sm text-text md:hidden"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            ☰ Menu
          </button>
          <ThemeToggle />
        </div>
        {isDevBuild && <ConfigSwitcher />}
      </div>
      <OperationView operations={operations} />
    </AppShell>
  );
}
