import { describe, expect, it } from "vitest";
import { CORE_PACKAGE_READY } from "./index.js";

describe("core package entry point", () => {
  it("exports a truthy readiness flag", () => {
    expect(CORE_PACKAGE_READY).toBe(true);
  });
});
