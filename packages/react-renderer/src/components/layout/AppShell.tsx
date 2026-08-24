"use client";
// Required: AppShell reads from a Zustand store (useConfigStore), which
// relies on client-side React APIs (useSyncExternalStore) that don't exist
// in Next.js App Router's default Server Component environment. Establishing
// the "use client" boundary HERE — at the component that actually needs
// it — means any page importing AppShell (Server or Client Component) just
// works, without needing to remember this itself. This is the pattern every
// future component using store hooks in this package should follow.

// AppShell: the outermost layout wrapper. Reads branding directly from
// configStore via the Zustand hook — no Context Provider layer needed here,
// which is one of the actual practical payoffs of choosing Zustand over
// plain React Context (ADR §9): any component, anywhere, can read store
// state without being nested under a matching provider.

import type { ReactNode } from "react";
import { defaultLayout } from "@docs-platform/core";
import { cn } from "../../lib/cn.js";
import { useConfigStore } from "../../store/config-store.js";

export interface AppShellProps {
  children: ReactNode;
  /** Optional sidebar content. When provided, AppShell renders it alongside
   * `children` as a two-pane layout, ordered by
   * `config.layout.sidebarPosition` (Milestone 17) — "left" (the default)
   * puts it before `children`, "right" puts it after. Omitting it preserves
   * AppShell's original single-region behavior (`children` fill the body
   * directly), so existing consumers that don't need a sidebar are
   * unaffected. */
  sidebar?: ReactNode;
  className?: string;
}

const FALLBACK_TITLE = "API Docs";

export function AppShell({ children, sidebar, className }: AppShellProps) {
  const title = useConfigStore((state) => state.config?.branding.title) ?? FALLBACK_TITLE;
  const logoUrl = useConfigStore((state) => state.config?.branding.logoUrl);
  const sidebarPosition = useConfigStore(
    (state) => state.config?.layout.sidebarPosition ?? defaultLayout.sidebarPosition,
  );

  // Production UX audit (Milestone 21, "desktop content max-width"): on very
  // wide viewports the two-pane content column (everything rendered as
  // `children` here — the toolbar row, OperationView, Try It Out, etc.) used
  // to stretch to fill whatever width was left next to the sidebar, which on
  // a 1920px+ display meant e.g. Try It Out's inputs and ParametersTable
  // spreading out to ~1600px+. This wrapper caps that at a comfortable
  // reading/working width and centers it, without touching any of the
  // components rendered inside it (they keep their own padding/spacing) and
  // without affecting narrower viewports at all, since max-w-6xl (72rem /
  // 1152px) only ever constrains once the available width exceeds it. Only
  // applies to the two-pane (`sidebar` provided) branch — the single-region
  // fallback below is unaffected, matching the audit's finding, which was
  // specifically about the sidebar+content layout.
  const content = <div className="mx-auto w-full max-w-6xl">{children}</div>;

  return (
    <div className={cn("flex min-h-screen flex-col bg-background text-text", className)}>
      <header className="flex items-center gap-sm border-b border-border px-lg py-md">
        {logoUrl && <img src={logoUrl} alt={`${title} logo`} className="h-6 w-6 object-contain" />}
        <h1 className="font-sans text-lg font-semibold">{title}</h1>
      </header>
      <div className="flex flex-1">
        {sidebar ? (
          sidebarPosition === "right" ? (
            <>
              <main className="flex-1 overflow-y-auto">{content}</main>
              {sidebar}
            </>
          ) : (
            <>
              {sidebar}
              <main className="flex-1 overflow-y-auto">{content}</main>
            </>
          )
        ) : (
          children
        )}
      </div>
    </div>
  );
}
