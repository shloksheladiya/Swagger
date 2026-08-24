export type {
  AuthCredentialDescriptor,
  AuthCredentialInjection,
  AuthStrategy,
  Plugin,
  PluginContext,
} from "./types.js";
export { installPlugin } from "./context.js";
export {
  createAuthStrategyRegistry,
  createRequestInterceptorRegistry,
} from "./registry.js";
export type { AuthStrategyRegistry, RequestInterceptorRegistry } from "./registry.js";
