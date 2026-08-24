// specStore: one of three stores split by change-frequency (ADR §9). Set per
// spec load, which is more often than config but far less often than UI
// interactions.
//
// Shaped as a keyed collection (`specs: Record<id, SpecEntry>` +
// `activeSpecId`) from the start, even though today only one spec is ever
// loaded at a time. This is the specific decision the architecture review
// flagged: if this were just `spec: NormalizedSpec | null`, adding multi-spec
// or versioned-docs support later would mean rewriting every component that
// reads from this store. Costs one extra level of indirection now; avoids a
// breaking store-shape change later.

import { create } from "zustand";
import type { NormalizedSpec, SpecResolveError } from "@docs-platform/core";

export interface SpecEntry {
  status: "loading" | "ready" | "error";
  spec?: NormalizedSpec;
  error?: SpecResolveError;
}

interface SpecStoreState {
  specs: Record<string, SpecEntry>;
  activeSpecId: string | null;
  setActiveSpecId: (id: string) => void;
  setSpecLoading: (id: string) => void;
  setSpecReady: (id: string, spec: NormalizedSpec) => void;
  setSpecError: (id: string, error: SpecResolveError) => void;
}

export const useSpecStore = create<SpecStoreState>((set) => ({
  specs: {},
  activeSpecId: null,
  setActiveSpecId: (id) => set({ activeSpecId: id }),
  setSpecLoading: (id) =>
    set((state) => ({
      specs: { ...state.specs, [id]: { status: "loading" } },
    })),
  setSpecReady: (id, spec) =>
    set((state) => ({
      specs: { ...state.specs, [id]: { status: "ready", spec } },
    })),
  setSpecError: (id, error) =>
    set((state) => ({
      specs: { ...state.specs, [id]: { status: "error", error } },
    })),
}));
