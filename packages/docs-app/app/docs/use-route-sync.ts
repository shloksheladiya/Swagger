"use client";
// Milestone 19 — the ONLY place `next/navigation` is imported anywhere in
// the codebase. react-renderer stays framework-agnostic (ADR §6): it knows
// how to compute the one tag an operation "canonically" belongs to
// (`getCanonicalTagName`, Milestone 19) but has no idea a `/docs/[tag]/[id]`
// URL scheme exists — that's docs-app's own route layout, and only docs-app
// should know its shape. These two hooks are intentionally the full extent
// of the "business logic" here: read params, call the existing uiStore
// actions; read uiStore, call the router. Nothing about *which* operation
// is selected or *which* tag it belongs to is decided in this file.

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Operation } from "@docs-platform/core";
import { getCanonicalTagName, useUiStore } from "@docs-platform/react-renderer";

/** URL -> uiStore. Runs whenever the route's `[tag]`/`[operationId]` segments
 * change (including on first mount, i.e. a direct/deep-link load) and makes
 * uiStore reflect them:
 *  - `selectOperation(operationId)` unconditionally, even if no operation
 *    with that id exists in the currently-loaded set. This deliberately
 *    does NOT validate the id — OperationView (Milestone 9) already renders
 *    a "Select an endpoint" fallback for a `selectedOperationId` that
 *    matches nothing, the exact same fallback it already uses for a stale
 *    selection after a spec reload. Reusing that existing behavior here
 *    means an unknown operationId in the URL degrades the same way an
 *    unknown id from any other source already does, rather than this hook
 *    inventing its own "not found" handling.
 *  - expands the URL's tag group in the sidebar, but only if it isn't
 *    already expanded — `toggleTagExpanded` toggles, so calling it
 *    unconditionally on every param change could collapse a group the user
 *    had already opened themselves.
 */
export function useSyncRouteParamsToStore(params: {
  tag: string | undefined;
  operationId: string | undefined;
}): void {
  const { tag, operationId } = params;

  useEffect(() => {
    if (!operationId) return;
    const { selectOperation, toggleTagExpanded, expandedTagNames } = useUiStore.getState();
    selectOperation(operationId);
    if (tag && !expandedTagNames.has(tag)) {
      toggleTagExpanded(tag);
    }
  }, [tag, operationId]);
}

/** uiStore -> URL. Runs whenever `selectedOperationId` changes (e.g. a
 * sidebar click via the existing EndpointListItem) and navigates to that
 * operation's canonical `/docs/[tag]/[operationId]` URL — making the
 * current selection a real, shareable link.
 *
 * `router.replace` (not `push`): selecting endpoints while browsing is a
 * high-frequency action, and pushing a history entry per click would make
 * the browser Back button step through every operation the user glanced at
 * rather than leaving the docs app. `replace` still produces a real,
 * shareable, bookmarkable URL — it just doesn't spam history for it.
 *
 * Only navigates if the computed canonical URL differs from the current
 * one, which also makes this the self-correcting half of the sync: loading
 * a deep link with a stale/non-canonical tag segment (e.g. an operation's
 * tags were reordered) selects the operation via the hook above, which
 * changes `selectedOperationId`, which lands here and corrects the URL to
 * the canonical tag — without this effect needing any special-case code for
 * "wrong tag" versus "no tag" versus "right tag".
 *
 * An unresolvable `selectedOperationId` (not found in `operations`) is
 * left alone here too, for the same reason the hook above doesn't validate
 * it: there's no canonical URL to compute for an operation that doesn't
 * exist, so this simply does nothing rather than guessing.
 */
export function useSyncStoreToRouteParams(operations: Operation[]): void {
  const router = useRouter();
  const pathname = usePathname();
  const selectedOperationId = useUiStore((state) => state.selectedOperationId);

  useEffect(() => {
    if (!selectedOperationId) return;
    const operation = operations.find((op) => op.operationId === selectedOperationId);
    if (!operation) return;

    const tag = getCanonicalTagName(operation);
    const canonicalPath = `/docs/${encodeURIComponent(tag)}/${encodeURIComponent(operation.operationId)}`;
    if (canonicalPath !== pathname) {
      router.replace(canonicalPath);
    }
  }, [selectedOperationId, operations, pathname, router]);
}
