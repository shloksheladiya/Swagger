// uiStore: the third and most frequently-changing of the three stores split
// by change-frequency (ADR §9). Every click and keystroke touches this store
// — nothing here should ever gate a re-render of spec- or config-consuming
// components, which is the whole reason this is a separate store rather than
// living alongside specStore.

import { create } from "zustand";

interface UiStoreState {
  selectedOperationId: string | null;
  expandedTagNames: Set<string>;
  searchQuery: string;
  selectOperation: (operationId: string | null) => void;
  toggleTagExpanded: (tagName: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  selectedOperationId: null,
  expandedTagNames: new Set(),
  searchQuery: "",
  selectOperation: (operationId) => set({ selectedOperationId: operationId }),
  toggleTagExpanded: (tagName) =>
    set((state) => {
      const next = new Set(state.expandedTagNames);
      if (next.has(tagName)) {
        next.delete(tagName);
      } else {
        next.add(tagName);
      }
      return { expandedTagNames: next };
    }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
