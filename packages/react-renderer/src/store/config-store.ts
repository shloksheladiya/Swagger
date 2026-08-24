// configStore: one of three stores split by change-frequency (ADR §9).
// Config is set once at boot and essentially never changes afterward, so
// this store is intentionally the simplest of the three.

import { create } from "zustand";
import type {
  ConfigValidationError,
  DocsConfig,
  Result,
} from "@docs-platform/core";

interface ConfigStoreState {
  config: DocsConfig | null;
  error: ConfigValidationError | null;
  /** Takes the Result directly from core's resolveConfig() — the store
   * doesn't re-implement unwrapping logic, it just reflects whichever
   * branch core already decided. */
  setConfigResult: (result: Result<DocsConfig, ConfigValidationError>) => void;
}

export const useConfigStore = create<ConfigStoreState>((set) => ({
  config: null,
  error: null,
  setConfigResult: (result) => {
    if (result.ok) {
      set({ config: result.data, error: null });
    } else {
      set({ config: null, error: result.error });
    }
  },
}));
