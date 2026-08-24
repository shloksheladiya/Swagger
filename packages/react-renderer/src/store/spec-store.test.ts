import { beforeEach, describe, expect, it } from "vitest";
import type { NormalizedSpec } from "@docs-platform/core";
import { useSpecStore } from "./spec-store.js";

const fakeSpec: NormalizedSpec = {
  id: "spec-a",
  version: "1.0.0",
  title: "Spec A",
  tags: [],
  operations: [],
  schemas: {},
  securitySchemes: {},
  servers: [],
};

beforeEach(() => {
  useSpecStore.setState({ specs: {}, activeSpecId: null });
});

describe("useSpecStore", () => {
  it("starts empty with no active spec", () => {
    const state = useSpecStore.getState();
    expect(state.specs).toEqual({});
    expect(state.activeSpecId).toBeNull();
  });

  it("transitions a spec through loading -> ready", () => {
    useSpecStore.getState().setSpecLoading("spec-a");
    expect(useSpecStore.getState().specs["spec-a"]?.status).toBe("loading");

    useSpecStore.getState().setSpecReady("spec-a", fakeSpec);
    const entry = useSpecStore.getState().specs["spec-a"];
    expect(entry?.status).toBe("ready");
    expect(entry?.spec?.title).toBe("Spec A");
  });

  it("transitions a spec through loading -> error, without clobbering an unrelated spec", () => {
    useSpecStore.getState().setSpecLoading("spec-a");
    useSpecStore.getState().setSpecReady("spec-b", { ...fakeSpec, id: "spec-b" });

    useSpecStore
      .getState()
      .setSpecError("spec-a", { stage: "validate", message: "boom", cause: undefined });

    const state = useSpecStore.getState();
    expect(state.specs["spec-a"]?.status).toBe("error");
    // the OTHER spec must be untouched — this is the actual point of the
    // keyed-collection shape (ADR §9): specs don't interfere with each other
    expect(state.specs["spec-b"]?.status).toBe("ready");
  });

  it("keeps multiple specs independently addressable at once", () => {
    useSpecStore.getState().setSpecReady("spec-a", fakeSpec);
    useSpecStore.getState().setSpecReady("spec-b", { ...fakeSpec, id: "spec-b", title: "Spec B" });

    const state = useSpecStore.getState();
    expect(Object.keys(state.specs)).toHaveLength(2);
    expect(state.specs["spec-a"]?.spec?.title).toBe("Spec A");
    expect(state.specs["spec-b"]?.spec?.title).toBe("Spec B");
  });

  it("tracks which spec is active independently of which specs are loaded", () => {
    useSpecStore.getState().setSpecReady("spec-a", fakeSpec);
    useSpecStore.getState().setActiveSpecId("spec-a");

    expect(useSpecStore.getState().activeSpecId).toBe("spec-a");

    useSpecStore.getState().setActiveSpecId("spec-b"); // not even loaded yet
    expect(useSpecStore.getState().activeSpecId).toBe("spec-b");
  });
});
