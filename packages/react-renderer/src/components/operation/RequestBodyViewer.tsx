"use client";
// Milestone 17 makes this component override-aware via useSlotComponent,
// which subscribes to componentRegistryStore — same client-boundary
// reasoning as every other store-consuming component in this package.
// (Previously this file needed no "use client" at all — pure presentation,
// no store access.)
//
// RequestBodyViewer: second real consumer of SchemaViewer (Milestone 10)
// and CodeBlock (Milestone 12), same shape as ResponseViewer.
//
// Unlike ResponseViewer (a list — an operation can have many responses), an
// operation has AT MOST ONE request body, so `requestBody` is optional here,
// not an array. `undefined` is the COMMON case, not an edge case — every
// GET (and many other operations) simply has no body at all, and this
// renders nothing for that, correctly, without any special-casing needed.
//
// `example` is shown as pretty-printed, syntax-highlighted JSON when
// present — most request bodies won't have one, and that's the common
// case: no CodeBlock renders at all when `example` is undefined.

import type { RequestBody } from "@docs-platform/core";
import { SchemaViewer, SCHEMA_VIEWER_SLOT } from "../schema/SchemaViewer.js";
import { CodeBlock } from "../shared/CodeBlock.js";
import { useSlotComponent } from "../../hooks/use-slot-component.js";

export interface RequestBodyViewerProps {
  requestBody?: RequestBody;
}

export function RequestBodyViewer({ requestBody }: RequestBodyViewerProps) {
  const ActiveSchemaViewer = useSlotComponent(SCHEMA_VIEWER_SLOT, SchemaViewer);

  if (!requestBody) return null;

  return (
    <div>
      <div className="flex items-baseline gap-sm">
        <span className="text-sm font-semibold text-text">Request Body</span>
        {requestBody.required && <span className="text-xs text-danger">required</span>}
      </div>
      {requestBody.description && (
        <p className="mt-xs text-xs text-text-muted">{requestBody.description}</p>
      )}
      {Object.entries(requestBody.content).map(([mediaType, media]) => (
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
  );
}
