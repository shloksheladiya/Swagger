// Index route. Renders the shared DocsShell (AppShell + Sidebar +
// OperationView), which now loads its data from a real OpenAPI document via
// specStore (see DocsShell.tsx / docs/use-load-spec.ts) instead of the old
// demo-data.ts fixture. Selecting an operation from here also navigates to
// that operation's canonical /docs/[tag]/[operationId] URL (Milestone 19's
// store -> URL sync, wired inside DocsShell), so this index route mainly
// serves as the landing page before anything is selected.

import { DocsShell } from "./DocsShell";

export default function Home() {
  return <DocsShell />;
}
