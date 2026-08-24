// Defaults + deep-merge for config (ADR §4). Only `layout` and `features`
// get defaults — `branding` and `specSource` are real content a person must
// provide, so there's no sensible placeholder for either.
//
// The merge itself is a plain per-section spread, not a generic deep-merge
// utility. That's a deliberate choice, not an oversight: our config is only
// two levels deep and neither `layout` nor `features` nests further, so a
// spread IS a correct deep merge for this shape. A real recursive deep-merge
// utility would be solving a problem this schema doesn't have yet — add one
// if a future field genuinely needs it, not speculatively.

import type { Result } from "../result.js";
import { parseConfig, type ConfigValidationError } from "./parse-config.js";
import type { DocsConfig, Features, Layout } from "./schema.js";

export const defaultLayout: Layout = {
  sidebarPosition: "left",
  mode: "two-pane",
};

export const defaultFeatures: Features = {
  search: true,
  tryItOut: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The real public entry point: takes RAW (untyped, possibly partial,
 * possibly hand-edited-and-wrong) input, fills in defaults for optional
 * sections, and validates the result. `parseConfig` (previous step) remains
 * available separately for validating an already-complete object. */
export function resolveConfig(raw: unknown): Result<DocsConfig, ConfigValidationError> {
  if (!isRecord(raw)) {
    // let parseConfig produce the standard "not a valid config" error, so
    // there's exactly one place that error message is defined
    return parseConfig(raw);
  }

  const merged = {
    branding: raw.branding,
    specSource: raw.specSource,
    layout: { ...defaultLayout, ...(isRecord(raw.layout) ? raw.layout : {}) },
    features: { ...defaultFeatures, ...(isRecord(raw.features) ? raw.features : {}) },
  };

  return parseConfig(merged);
}
