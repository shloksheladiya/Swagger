// @docs-platform/react-renderer
// UI components, hooks, and stores. Depends on core + theme — never the reverse (ADR §6).

import { CORE_PACKAGE_READY } from "@docs-platform/core";
import { THEME_PACKAGE_READY } from "@docs-platform/theme";

export { useConfigStore } from "./store/config-store.js";
export { useSpecStore } from "./store/spec-store.js";
export type { SpecEntry } from "./store/spec-store.js";
export { useUiStore } from "./store/ui-store.js";
export { useThemeStore } from "./store/theme-store.js";
export { useComponentRegistryStore, registerSlotComponent } from "./store/component-registry-store.js";
export { selectOperationsByTag, getCanonicalTagName, UNTAGGED } from "./store/selectors.js";
export { ThemeProvider } from "./components/theme/ThemeProvider.js";
export type { ThemeProviderProps } from "./components/theme/ThemeProvider.js";
export { AppShell } from "./components/layout/AppShell.js";
export type { AppShellProps } from "./components/layout/AppShell.js";
export { Sidebar } from "./components/sidebar/Sidebar.js";
export type { SidebarProps } from "./components/sidebar/Sidebar.js";
export { TagGroupHeader } from "./components/sidebar/TagGroupHeader.js";
export type { TagGroupHeaderProps } from "./components/sidebar/TagGroupHeader.js";
export { buildSidebarRows } from "./components/sidebar/build-sidebar-rows.js";
export type { SidebarRow } from "./components/sidebar/build-sidebar-rows.js";
export { buildFilteredSidebarRows } from "./components/sidebar/build-filtered-sidebar-rows.js";
export { EndpointListItem } from "./components/sidebar/EndpointListItem.js";
export type { EndpointListItemProps } from "./components/sidebar/EndpointListItem.js";
export { SearchBar } from "./components/sidebar/SearchBar.js";
export { OperationHeader } from "./components/operation/OperationHeader.js";
export type { OperationHeaderProps } from "./components/operation/OperationHeader.js";
export { ParametersTable } from "./components/operation/ParametersTable.js";
export type { ParametersTableProps } from "./components/operation/ParametersTable.js";
export { MarkdownRenderer } from "./components/shared/MarkdownRenderer.js";
export type { MarkdownRendererProps } from "./components/shared/MarkdownRenderer.js";
export { CodeBlock } from "./components/shared/CodeBlock.js";
export type { CodeBlockProps } from "./components/shared/CodeBlock.js";
export { describeSecurityScheme } from "./components/auth/describe-security-scheme.js";
export { resolveSecurityRequirement } from "./components/auth/resolve-security-requirement.js";
export { OperationView } from "./components/operation/OperationView.js";
export type { OperationViewProps } from "./components/operation/OperationView.js";
export { ResponseViewer } from "./components/operation/ResponseViewer.js";
export type { ResponseViewerProps } from "./components/operation/ResponseViewer.js";
export { RequestBodyViewer } from "./components/operation/RequestBodyViewer.js";
export type { RequestBodyViewerProps } from "./components/operation/RequestBodyViewer.js";
export { SchemaField } from "./components/schema/SchemaField.js";
export type { SchemaFieldProps } from "./components/schema/SchemaField.js";
export { SchemaViewer, SCHEMA_VIEWER_SLOT } from "./components/schema/SchemaViewer.js";
export type { SchemaViewerProps } from "./components/schema/SchemaViewer.js";
export { useTryItOut } from "./hooks/use-try-it-out.js";
export type {
  ParameterValue,
  SetParameterValue,
  TryItOutParameterValues,
  TryItOutValues,
  UseTryItOutResult,
} from "./hooks/use-try-it-out.js";
export { groupParametersByLocation } from "./components/try-it-out/group-parameters-by-location.js";
export type { GroupedParameters } from "./components/try-it-out/group-parameters-by-location.js";
export { createInitialBodyValue } from "./components/try-it-out/schema-to-body-value.js";
export type { BodyPrimitiveValue, TryItOutBodyValue } from "./components/try-it-out/schema-to-body-value.js";
export {
  addBodyArrayItem,
  collectBodyErrors,
  removeBodyArrayItem,
  setPrimitiveBodyValue,
} from "./components/try-it-out/body-value-tree.js";
export type { BodyFieldPath } from "./components/try-it-out/body-value-tree.js";
export { ParameterField } from "./components/try-it-out/ParameterField.js";
export type { ParameterFieldProps } from "./components/try-it-out/ParameterField.js";
export { BodyFieldEditor } from "./components/try-it-out/BodyFieldEditor.js";
export type { BodyFieldEditorProps } from "./components/try-it-out/BodyFieldEditor.js";
export { RequestBuilder } from "./components/try-it-out/RequestBuilder.js";
export type { RequestBuilderProps } from "./components/try-it-out/RequestBuilder.js";
export { TryItOutPanel } from "./components/try-it-out/TryItOutPanel.js";
export type { TryItOutPanelProps } from "./components/try-it-out/TryItOutPanel.js";
export { serializeBodyValue } from "./components/try-it-out/serialize-body-value.js";
export { resolveAuthCredentialAlternatives } from "./components/try-it-out/resolve-auth-credential-fields.js";
export type {
  AuthAlternative,
  AuthCredentialField,
} from "./components/try-it-out/resolve-auth-credential-fields.js";
export { applyAuthCredentials } from "./components/try-it-out/apply-auth-credentials.js";
export type { InjectedAuthValues } from "./components/try-it-out/apply-auth-credentials.js";
export { ResponsePanel } from "./components/try-it-out/ResponsePanel.js";
export type { ResponsePanelProps } from "./components/try-it-out/ResponsePanel.js";
export { useTryItOutExecution } from "./hooks/use-try-it-out-execution.js";
export type {
  TryItOutExecutionStatus,
  UseTryItOutExecutionResult,
} from "./hooks/use-try-it-out-execution.js";
export { cn } from "./lib/cn.js";

// Milestone 20 — Plugin System Foundation. `Plugin`/`PluginContext` are
// core's generic shapes, re-exported here at their react-renderer
// (ComponentType<any>) instantiation via installPlugin — a host app never
// constructs a PluginContext itself.
export { installPlugin, getRegisteredAuthStrategy, getRegisteredRequestInterceptors } from "./plugins/plugin-registry.js";
export type { AuthStrategy, AuthCredentialDescriptor, AuthCredentialInjection, Plugin, PluginContext } from "@docs-platform/core";

export const REACT_RENDERER_PACKAGE_READY =
  CORE_PACKAGE_READY && THEME_PACKAGE_READY;
