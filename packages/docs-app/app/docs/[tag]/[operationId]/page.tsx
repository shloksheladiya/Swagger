"use client";
// Milestone 19 — Routing & Deep Linking.
//
// Deliberately thin (ADR §10 / milestones.md): reads the route's [tag] and
// [operationId] segments and hands them to useSyncRouteParamsToStore, which
// does the actual work of reflecting them into uiStore. This file decides
// nothing about which operation is selected, which tag is canonical, or
// what happens for an unknown id — see docs/use-route-sync.ts and
// react-renderer's getCanonicalTagName for that.
//
// `useParams()` (not the `params` prop) specifically because this is a
// Client Component: it reads the current route's resolved params directly,
// sidestepping the async/Promise `params` prop Next.js gives Server
// Component pages.
//
// Renders the same DocsShell the index route (page.tsx) renders. Both
// routes now load the same real, specStore-backed spec (DocsShell.tsx /
// docs/use-load-spec.ts) rather than each threading its own copy of
// demo-data.ts's hardcoded operations — a deep link and the sidebar are
// guaranteed to agree because they both read the one active NormalizedSpec.

import { useParams } from "next/navigation";
import { DocsShell } from "../../../DocsShell";
import { useSyncRouteParamsToStore } from "../../use-route-sync";

export default function OperationRoutePage() {
  const params = useParams<{ tag: string; operationId: string }>();
  useSyncRouteParamsToStore({ tag: params.tag, operationId: params.operationId });

  return <DocsShell />;
}
