"use client";
// Milestone 17 makes this component override-aware via useSlotComponent,
// which subscribes to componentRegistryStore — same client-boundary
// reasoning as every other store-consuming component in this package.
// (Previously this file needed no "use client" at all — pure presentation,
// no store access.)
//
// ResponseViewer: same shape as OperationHeader/ParametersTable. The first
// real consumer of SchemaViewer (Milestone 10) — everything that component
// was built and tested for now actually gets used. Also now the first real
// consumer of CodeBlock (Milestone 12), for the `example` value.
//
// A response's `content` is a map keyed by media type (e.g.
// "application/json") — usually exactly one entry, but the type allows
// more, so this renders all of them rather than assuming JSON is the only
// one. A response with no `content` at all (e.g. a 204) simply shows its
// status code and description, with no schema section — that's correct,
// not a missing feature (Milestone 2/3 already modeled this: `content` is
// optional on Response specifically to represent "no body").
//
// `example` (parsed and typed since Milestone 2, but unused anywhere until
// now) is shown as pretty-printed, syntax-highlighted JSON when present —
// most responses won't have one, and that's the common case, not an edge
// case: no CodeBlock renders at all when `example` is undefined.

import type { Response } from "@docs-platform/core";
import { SchemaViewer, SCHEMA_VIEWER_SLOT } from "../schema/SchemaViewer.js";
import { CodeBlock } from "../shared/CodeBlock.js";
import { useSlotComponent } from "../../hooks/use-slot-component.js";

export interface ResponseViewerProps {
  responses: Response[];
}

export function ResponseViewer({ responses }: ResponseViewerProps) {
  const ActiveSchemaViewer = useSlotComponent(SCHEMA_VIEWER_SLOT, SchemaViewer);

  if (responses.length === 0) return null;

  return (
    <div>
      {responses.map((response) => (
        <div key={response.statusCode} className="border-b border-border py-md">
          <div className="flex items-baseline gap-sm">
            <span className="font-mono text-sm font-semibold text-text">
              {response.statusCode}
            </span>
            <span className="text-sm text-text-muted">{response.description}</span>
          </div>
          {response.content &&
            Object.entries(response.content).map(([mediaType, media]) => (
              <div key={mediaType} className="mt-sm">
                <div className="font-mono text-xs text-text-muted">{mediaType}</div>
                <ActiveSchemaViewer schema={media.schema} />
                {media.example !== undefined && (
                  <div className="mt-sm">
                    <div className="text-xs text-text-muted">Example</div>
                    <CodeBlock code={JSON.stringify(media.example, null, 2)} />
                  </div>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}
