"use client";
// Populates specStore from the active DocsConfig.specSource — the missing
// link between the real core parsing pipeline (already fully built and
// tested) and the running app (which, until now, never called it). This is
// docs-app's own client-side glue, same spirit as use-route-sync.ts being
// "the one place a Next.js-only concern lives" — here it's "the one place
// spec loading actually gets triggered," not core or react-renderer logic.
//
// Deliberately mirrors DocsShell's existing ConfigSwitcher pattern
// (`useConfigStore.getState().setConfigResult(resolveConfig(raw))`) —
// same idea, just running automatically off config.specSource instead of a
// manual button click: read config, call the real core function, reflect
// the Result into the real store. Nothing new is invented here.
//
// Runs entirely client-side. This is a real constraint, not an oversight:
// specStore (Zustand) is populated the same way configStore already is
// throughout this app, and @apidevtools/swagger-parser is documented to
// support both Node and browser environments for "url"/"inline" sources —
// but NOT "file" sources, which need Node's filesystem. See
// load-spec-from-source.ts for the corresponding deferral on the core side.

import { useEffect } from "react";
import { loadSpecFromSource, type SpecSource } from "@docs-platform/core";
import { useConfigStore, useSpecStore } from "@docs-platform/react-renderer";

/** Stable id for the one spec this app ever loads at a time. specStore's
 * keyed-by-id shape (Milestone 5) exists for a future multi-spec/versioned-
 * docs case — today there is exactly one active spec, so one constant id is
 * all that's needed; nothing here forecloses a real per-spec id scheme
 * later. */
export const ACTIVE_SPEC_ID = "active";

/** A cheap content key for effect-dependency purposes only (NOT the same as
 * parseOpenApiDocumentCached's own internal cache key, though it's built
 * the same way) — lets the effect below re-run when specSource's actual
 * content changes, without re-running on every unrelated configStore
 * update (e.g. a branding-only change would otherwise produce a new
 * `config` object reference every render). */
function specSourceKey(specSource: SpecSource | undefined): string | undefined {
  if (!specSource) return undefined;
  return `${specSource.type}::${specSource.value}`;
}

export function useLoadSpec(): void {
  const specSource = useConfigStore((state) => state.config?.specSource);
  const key = specSourceKey(specSource);

  useEffect(() => {
    if (!specSource) return;

    const { setSpecLoading, setSpecReady, setSpecError, setActiveSpecId } =
      useSpecStore.getState();

    let cancelled = false;

    setActiveSpecId(ACTIVE_SPEC_ID);
    setSpecLoading(ACTIVE_SPEC_ID);

    loadSpecFromSource(specSource, ACTIVE_SPEC_ID).then((result) => {
      if (cancelled) return; // specSource changed again before this resolved
      if (result.ok) {
        setSpecReady(ACTIVE_SPEC_ID, result.data);
      } else {
        setSpecError(ACTIVE_SPEC_ID, result.error);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is the
    // intentional dependency (content-based); `specSource` itself is read
    // fresh above rather than added here to avoid re-running on reference-
    // only changes.
  }, [key]);
}
