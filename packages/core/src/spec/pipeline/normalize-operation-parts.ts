// Normalizes the parameter/requestBody/response pieces of a raw OpenAPI
// operation object. Kept separate from normalize-operations.ts (which owns
// the paths/methods loop and parameter inheritance) so each file has one job.

import type {
  MediaType,
  Parameter,
  ParameterLocation,
  RequestBody,
  Response,
} from "../operation-parts.js";
import { normalizeSchema } from "./normalize-schema.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const VALID_LOCATIONS: ReadonlySet<string> = new Set([
  "path",
  "query",
  "header",
  "cookie",
]);

export function normalizeParameter(raw: unknown): Parameter | null {
  if (!isRecord(raw) || typeof raw.name !== "string") return null;
  if (typeof raw.in !== "string" || !VALID_LOCATIONS.has(raw.in)) return null;

  const location = raw.in as ParameterLocation;
  // Per the OpenAPI spec, path parameters are ALWAYS required, even if the
  // source document omits (or incorrectly sets false on) `required`.
  const required = location === "path" ? true : raw.required === true;

  const parameter: Parameter = {
    name: raw.name,
    in: location,
    required,
    schema: normalizeSchema(raw.schema),
  };
  if (typeof raw.description === "string") {
    parameter.description = raw.description;
  }
  return parameter;
}

/** Merges a path's shared parameters with one operation's own. Per the
 * OpenAPI spec, path-level parameters apply to every method under that path
 * unless an operation redeclares the same (name, location) pair — in which
 * case the operation-level one wins. */
export function mergeParameters(
  pathLevel: Parameter[],
  operationLevel: Parameter[],
): Parameter[] {
  const merged = new Map<string, Parameter>();
  for (const p of pathLevel) merged.set(`${p.in}:${p.name}`, p);
  for (const p of operationLevel) merged.set(`${p.in}:${p.name}`, p);
  return Array.from(merged.values());
}

function normalizeContentMap(raw: unknown): Record<string, MediaType> {
  if (!isRecord(raw)) return {};
  const content: Record<string, MediaType> = {};
  for (const [mediaType, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const entry: MediaType = { schema: normalizeSchema(value.schema) };
    if ("example" in value) entry.example = value.example;
    content[mediaType] = entry;
  }
  return content;
}

export function normalizeRequestBody(raw: unknown): RequestBody | undefined {
  if (!isRecord(raw)) return undefined;
  const requestBody: RequestBody = {
    required: raw.required === true,
    content: normalizeContentMap(raw.content),
  };
  if (typeof raw.description === "string") {
    requestBody.description = raw.description;
  }
  return requestBody;
}

export function normalizeResponses(raw: unknown): Response[] {
  if (!isRecord(raw)) return [];
  const responses: Response[] = [];
  for (const [statusCode, value] of Object.entries(raw)) {
    if (!isRecord(value)) continue;
    const description =
      typeof value.description === "string" ? value.description : "";
    const response: Response = { statusCode, description };
    if (value.content !== undefined) {
      response.content = normalizeContentMap(value.content);
    }
    responses.push(response);
  }
  return responses;
}
