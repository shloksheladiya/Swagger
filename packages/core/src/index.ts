// @docs-platform/core
// Framework-agnostic domain logic: spec parsing, config, search, plugins, auth strategies.
// This package must never depend on React or the DOM (ADR §6).

export * from "./spec/index.js";
export * from "./config/index.js";
export { scoreOperationMatch } from "./search/score-operation-match.js";
export { searchOperations } from "./search/search-operations.js";
export type { SearchResult } from "./search/search-operations.js";
export type { SearchProvider } from "./search/search-provider.js";
export { defaultSearchProvider } from "./search/search-provider.js";
export type { Result } from "./result.js";
export { ok, err } from "./result.js";
export * from "./http/index.js";
export * from "./renderer/index.js";
export * from "./plugins/index.js";

export const CORE_PACKAGE_READY = true;
