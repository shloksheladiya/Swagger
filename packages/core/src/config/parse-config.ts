// Validates a raw (already-complete) config object against docsConfigSchema.
// Returns a Result (ADR §10) rather than throwing, same pattern as the spec
// parsing pipeline — a bad config should be a handled, displayable error
// state, not an uncaught exception.
//
// This validates a COMPLETE config. Merging partial user overrides onto
// defaults before validation is a separate concern (next step) — keeping
// them separate means this function has exactly one job: "is this object a
// valid DocsConfig," which is easy to reason about and test on its own.

import { err, ok, type Result } from "../result.js";
import { docsConfigSchema, type DocsConfig } from "./schema.js";

export interface ConfigValidationError {
  message: string;
  issues: Array<{ path: string; message: string }>;
}

export function parseConfig(raw: unknown): Result<DocsConfig, ConfigValidationError> {
  const result = docsConfigSchema.safeParse(raw);

  if (!result.success) {
    return err({
      message: "Invalid configuration.",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return ok(result.data);
}
