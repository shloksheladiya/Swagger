"use client";
// useTryItOut: local, ephemeral form state for an operation's
// path/query/header/cookie parameters (Part A) plus its request body
// (Part B). Deliberately plain React state (useState), NOT a Zustand store —
// this is per-operation, high-churn state (every keystroke touches it),
// which is exactly the kind of thing uiStore's own header comment argues
// should stay OUT of a shared store rather than gating re-renders of
// unrelated spec/config-consuming components.

import { useEffect, useMemo, useState } from "react";
import type { Operation, ParameterLocation } from "@docs-platform/core";
import { groupParametersByLocation } from "../components/try-it-out/group-parameters-by-location.js";
import { createInitialBodyValue, type TryItOutBodyValue, type BodyPrimitiveValue } from "../components/try-it-out/schema-to-body-value.js";
import {
  addBodyArrayItem as addItemToBodyArray,
  removeBodyArrayItem as removeItemFromBodyArray,
  setPrimitiveBodyValue,
  collectBodyErrors,
  type BodyFieldPath,
} from "../components/try-it-out/body-value-tree.js";

/** A single parameter's value. Query is the one location that can hold more
 * than one value (repeated `?tag=a&tag=b` for an array-typed query
 * parameter) — path/header/cookie are always single strings. */
export type ParameterValue = string | string[];

export interface TryItOutParameterValues {
  path: Record<string, string>;
  query: Record<string, ParameterValue>;
  header: Record<string, string>;
  cookie: Record<string, string>;
}

/** `body` is `null` when the operation has no editable request body — a
 * real, permanent state (not a Part-A-style temporary placeholder), since
 * Part B is the layer that actually owns request-body state. */
export interface TryItOutValues extends TryItOutParameterValues {
  body: TryItOutBodyValue | null;
}

/** Overloaded so path/header/cookie (single-valued locations) can only be
 * set to a string, and only "query" accepts the string[] case — a caller
 * passing an array for e.g. "path" is a compile error, not a value silently
 * coerced at runtime. */
export interface SetParameterValue {
  (location: "query", name: string, value: ParameterValue): void;
  (location: Exclude<ParameterLocation, "query">, name: string, value: string): void;
}

export interface UseTryItOutResult {
  values: TryItOutValues;
  setParameterValue: SetParameterValue;
  /** No-op if `values.body` is currently null or `path` doesn't resolve to a
   * primitive field. */
  setBodyValue: (path: BodyFieldPath, value: BodyPrimitiveValue) => void;
  /** No-op if `values.body` is currently null or `path` doesn't resolve to
   * an array field. */
  addBodyArrayItem: (path: BodyFieldPath) => void;
  /** No-op if `values.body` is currently null or `path` doesn't resolve to
   * an array field. */
  removeBodyArrayItem: (path: BodyFieldPath, index: number) => void;
  /** Parameter errors keyed `${location}:${name}` (mergeParameters' own (in,
   * name) identity convention) merged with body errors keyed
   * `body:<field-path>` — the two namespaces can never collide. Currently
   * populated only for required-and-empty fields (this milestone's "basic"
   * validation). */
  errors: Record<string, string>;
}

function emptyValueFor(schemaType: string | undefined): ParameterValue {
  return schemaType === "array" ? [] : "";
}

/** Picks which request-body media type Try It Out builds an editable form
 * for. The roadmap/design review didn't specify a selection rule for
 * operations with multiple request-body content types, so this makes one
 * explicit rather than leaving it implicit: "application/json" if present,
 * otherwise no editable body (other media types — multipart, url-encoded,
 * etc. — are out of this milestone's schema-support scope regardless). This
 * matches the only media type actually exercised anywhere in this
 * repository's existing fixtures and tests. */
function selectBodySchema(operation: Operation) {
  return operation.requestBody?.content["application/json"]?.schema;
}

function buildInitialValues(operation: Operation): TryItOutValues {
  const grouped = groupParametersByLocation(operation.parameters);
  const bodySchema = selectBodySchema(operation);

  return {
    path: Object.fromEntries(grouped.path.map((p) => [p.name, ""])),
    query: Object.fromEntries(
      grouped.query.map((p) => [p.name, emptyValueFor(p.schema.type)]),
    ),
    header: Object.fromEntries(grouped.header.map((p) => [p.name, ""])),
    cookie: Object.fromEntries(grouped.cookie.map((p) => [p.name, ""])),
    body: bodySchema ? createInitialBodyValue(bodySchema) : null,
  };
}

function isEmptyValue(value: ParameterValue): boolean {
  return Array.isArray(value) ? value.length === 0 : value.trim().length === 0;
}

export function useTryItOut(operation: Operation): UseTryItOutResult {
  const [values, setValues] = useState<TryItOutValues>(() => buildInitialValues(operation));

  // Reset whenever the selected operation changes, so values left over from
  // a previous endpoint (e.g. a "userId" path param) can never leak into a
  // different operation that happens to share a parameter name. Keyed on
  // operationId specifically, not the `operation` object reference — every
  // other identity check in this codebase (EndpointListItem, uiStore,
  // build-filtered-sidebar-rows) already treats operationId as THE identity
  // for an operation, and relying on reference equality here would silently
  // diverge from that if `operation` is ever rebuilt with a new identity for
  // the same logical endpoint (e.g. a future spec-store recompute).
  useEffect(() => {
    setValues(buildInitialValues(operation));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // keyed on operationId, not the operation object itself; see comment above.
  }, [operation.operationId]);

  function setParameterValue(location: "query", name: string, value: ParameterValue): void;
  function setParameterValue(
    location: Exclude<ParameterLocation, "query">,
    name: string,
    value: string,
  ): void;
  function setParameterValue(
    location: ParameterLocation,
    name: string,
    value: ParameterValue,
  ): void {
    if (location === "query") {
      setValues((prev) => ({ ...prev, query: { ...prev.query, [name]: value } }));
      return;
    }
    // Implementation signature only — the overloads above guarantee callers
    // never reach this branch with an array value for a single-valued location.
    setValues((prev) => ({ ...prev, [location]: { ...prev[location], [name]: value as string } }));
  }

  const setBodyValue = (path: BodyFieldPath, value: BodyPrimitiveValue) => {
    setValues((prev) => (prev.body ? { ...prev, body: setPrimitiveBodyValue(prev.body, path, value) } : prev));
  };

  const addBodyArrayItem = (path: BodyFieldPath) => {
    setValues((prev) => (prev.body ? { ...prev, body: addItemToBodyArray(prev.body, path) } : prev));
  };

  const removeBodyArrayItem = (path: BodyFieldPath, index: number) => {
    setValues((prev) => (prev.body ? { ...prev, body: removeItemFromBodyArray(prev.body, path, index) } : prev));
  };

  const errors = useMemo(() => {
    const result: Record<string, string> = {};
    for (const parameter of operation.parameters) {
      if (!parameter.required) continue;
      const value = values[parameter.in][parameter.name];
      if (value === undefined || isEmptyValue(value)) {
        result[`${parameter.in}:${parameter.name}`] = `${parameter.name} is required`;
      }
    }
    return { ...result, ...collectBodyErrors(values.body) };
  }, [operation, values]);

  return { values, setParameterValue, setBodyValue, addBodyArrayItem, removeBodyArrayItem, errors };
}
