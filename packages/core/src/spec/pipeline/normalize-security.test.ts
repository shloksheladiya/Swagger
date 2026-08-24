import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import SwaggerParser from "@apidevtools/swagger-parser";
import { normalizeSecurity, resolveEffectiveSecurity } from "./normalize-security.js";

const fixture = (name: string) =>
  fileURLToPath(new URL(`../../../test-fixtures/${name}`, import.meta.url));

describe("normalizeSecurity", () => {
  it("returns undefined (not []) when the field is absent — the inherit-global signal", () => {
    expect(normalizeSecurity(undefined)).toBeUndefined();
  });

  it("returns [] (not undefined) when explicitly set to an empty array — the no-auth signal", () => {
    const result = normalizeSecurity([]);
    expect(result).toEqual([]);
    expect(result).not.toBeUndefined();
  });

  it("normalizes a real requirement with scopes", () => {
    const result = normalizeSecurity([{ itemAuth: ["write"] }]);
    expect(result).toEqual([{ itemAuth: ["write"] }]);
  });
});

describe("resolveEffectiveSecurity", () => {
  it("falls back to global security only when the operation field is truly absent", () => {
    const global = [{ globalAuth: [] }];
    expect(resolveEffectiveSecurity(undefined, global)).toEqual(global);
  });

  it("does NOT fall back when the operation explicitly sets an empty array", () => {
    const global = [{ globalAuth: [] }];
    expect(resolveEffectiveSecurity([], global)).toEqual([]);
  });

  it("against the real fixture: GET inherits global, DELETE overrides to no-auth, PUT overrides to itemAuth", async () => {
    const doc = (await SwaggerParser.validate(
      fixture("operation-edge-cases.yaml"),
    )) as any;

    const globalSecurity = normalizeSecurity(doc.security) ?? [];
    expect(globalSecurity).toEqual([{ globalAuth: [] }]);

    const pathItem = doc.paths["/items/{id}"];

    const getSecurity = resolveEffectiveSecurity(pathItem.get.security, globalSecurity);
    expect(getSecurity).toEqual([{ globalAuth: [] }]); // inherited, not overridden

    const deleteSecurity = resolveEffectiveSecurity(
      pathItem.delete.security,
      globalSecurity,
    );
    expect(deleteSecurity).toEqual([]); // explicitly public

    const putSecurity = resolveEffectiveSecurity(pathItem.put.security, globalSecurity);
    expect(putSecurity).toEqual([{ itemAuth: ["write"] }]); // overridden to a different scheme
  });
});
