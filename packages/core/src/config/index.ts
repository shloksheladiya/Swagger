export type {
  Branding,
  DocsConfig,
  Features,
  Layout,
  SpecSource,
} from "./schema.js";
export { parseConfig } from "./parse-config.js";
export type { ConfigValidationError } from "./parse-config.js";
export { resolveConfig, defaultLayout, defaultFeatures } from "./resolve-config.js";
