"use client";
// RequestBuilder: the component that actually calls useTryItOut and renders
// the editable form — TryItOutPanel (its caller) is just a thin section
// wrapper and doesn't touch the hook itself. Groups parameters via the
// existing groupParametersByLocation helper (Part A) rather than
// recreating grouping logic, and renders the body tree via BodyFieldEditor
// (which itself renders Part B's TryItOutBodyValue tree without re-deriving
// any schema/validation logic of its own).
//
// Milestone 15 addition: also calls useTryItOutExecution (a second, separate
// hook — see its own header comment for why it isn't folded into
// useTryItOut) and renders the Base URL field, the Authorization section,
// the Send button, and the ResponsePanel showing what actually came back.
// RequestBuilder's own job stays orchestration + rendering — request
// serialization, auth injection, and the HTTP call itself all live in
// useTryItOutExecution and the pure helpers it calls, not here.

import type { Operation, ParameterLocation, SecurityScheme } from "@docs-platform/core";
import { useTryItOut } from "../../hooks/use-try-it-out.js";
import { useTryItOutExecution } from "../../hooks/use-try-it-out-execution.js";
import { groupParametersByLocation } from "./group-parameters-by-location.js";
import { ParameterField } from "./ParameterField.js";
import { BodyFieldEditor } from "./BodyFieldEditor.js";
import { ResponsePanel } from "./ResponsePanel.js";

export interface RequestBuilderProps {
  operation: Operation;
  /** Defaults to `{}` — a RequestBuilder rendered without a real spec's
   * security schemes (e.g. in isolation) simply shows no Authorization
   * section, the same graceful-degradation shape OperationView already uses
   * for AuthRequirementBadge. */
  securitySchemes?: Record<string, SecurityScheme>;
  /** Defaults to `[]` — with no declared servers, the Base URL field starts
   * empty rather than guessing at one. */
  servers?: string[];
}

const PARAMETER_SECTIONS: ReadonlyArray<{ location: ParameterLocation; label: string }> = [
  { location: "path", label: "Path" },
  { location: "query", label: "Query" },
  { location: "header", label: "Headers" },
  { location: "cookie", label: "Cookies" },
];

const inputClassName =
  "w-full rounded-md border border-border bg-background px-md py-sm text-sm text-text";

export function RequestBuilder({ operation, securitySchemes = {}, servers = [] }: RequestBuilderProps) {
  const { values, setParameterValue, setBodyValue, addBodyArrayItem, removeBodyArrayItem, errors } =
    useTryItOut(operation);
  const {
    baseUrl,
    setBaseUrl,
    authAlternatives,
    selectedAlternativeIndex,
    setSelectedAlternativeIndex,
    credentialValues,
    setCredentialValue,
    status,
    result,
    send,
  } = useTryItOutExecution(operation, securitySchemes, servers);
  // `noUncheckedIndexedAccess` — authAlternatives is derived fresh from
  // operation.security every render, and selectedAlternativeIndex is reset
  // to 0 whenever it changes, so this is always defined in practice; `?? []`
  // just keeps that guarantee from leaking into a runtime crash if it's ever
  // violated.
  const selectedAlternativeFields =
    authAlternatives.find((alt) => alt.index === selectedAlternativeIndex)?.fields ?? [];

  const grouped = groupParametersByLocation(operation.parameters);
  const hasAnyParameters = operation.parameters.length > 0;
  const hasBody = values.body !== null;

  const canSend = Object.keys(errors).length === 0 && baseUrl.trim().length > 0 && status !== "loading";

  // Unlike Milestone 14 (which had nothing else to show and could return
  // early here), a parameter-less, body-less operation is still a real,
  // sendable request — e.g. a bare `GET /health`. The "no editable request
  // inputs" message now marks just the empty parameters/body area, it no
  // longer replaces the whole component.
  const hasNoRequestInputs = !hasAnyParameters && !hasBody;

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <label htmlFor="try-it-out-base-url" className="text-sm font-semibold text-text">
          Base URL
        </label>
        <input
          id="try-it-out-base-url"
          type="text"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder="https://api.example.com"
          className={inputClassName}
        />
      </div>

      {authAlternatives.length > 0 && (
        <div className="flex flex-col gap-md">
          <span className="text-sm font-semibold text-text">Authorization</span>

          {authAlternatives.length > 1 && (
            // Only rendered when operation.security has more than one
            // requirement — i.e. an OR of alternatives. Picking one here is
            // what makes "only this alternative's credentials get sent"
            // (see useTryItOutExecution/applyAuthCredentials) match the
            // user's actual intent, instead of guessing.
            <div className="flex flex-col gap-xs" role="radiogroup" aria-label="Authentication method">
              {authAlternatives.map((alternative) => {
                // "Use " prefix is deliberate, not decorative: without it,
                // a single-scheme alternative's radio-option text is
                // byte-for-byte identical to that scheme's own credential
                // field label just below, which makes them indistinguishable
                // by accessible name (getByLabelText/getByText) — both to a
                // screen reader and in this file's own tests.
                const optionLabel = alternative.fields.length
                  ? `Use ${alternative.fields.map((field) => field.label).join(" and ")}`
                  : `Alternative ${alternative.index + 1}`;
                const optionId = `try-it-out-auth-alt-${alternative.index}`;
                return (
                  <label key={alternative.index} htmlFor={optionId} className="flex items-center gap-sm text-sm text-text">
                    <input
                      type="radio"
                      id={optionId}
                      name="try-it-out-auth-alternative"
                      checked={selectedAlternativeIndex === alternative.index}
                      onChange={() => setSelectedAlternativeIndex(alternative.index)}
                    />
                    {optionLabel}
                  </label>
                );
              })}
            </div>
          )}

          {selectedAlternativeFields.map((field) => {
            const fieldId = `try-it-out-auth-${field.schemeName}`;
            return (
              <div key={field.schemeName} className="flex flex-col gap-xs">
                <label htmlFor={fieldId} className="flex flex-wrap items-baseline gap-sm">
                  <code className="font-mono text-sm text-text">{field.label}</code>
                </label>
                {field.kind === "unsupported" ? (
                  <p className="text-xs italic text-text-muted">Not usable in this version ({field.reason})</p>
                ) : (
                  <input
                    id={fieldId}
                    type="text"
                    value={credentialValues[field.schemeName] ?? ""}
                    onChange={(event) => setCredentialValue(field.schemeName, event.target.value)}
                    className={inputClassName}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasAnyParameters && (
        <div className="flex flex-col gap-md">
          <span className="text-sm font-semibold text-text">Parameters</span>
          {PARAMETER_SECTIONS.map(({ location, label }) => {
            const parameters = grouped[location];
            if (parameters.length === 0) return null;

            return (
              <div key={location} className="flex flex-col gap-xs">
                <span className="text-xs font-semibold uppercase text-text-muted">{label}</span>
                {location === "cookie" && (
                  // Browsers don't let JavaScript set a Cookie header on an
                  // outgoing request — these fields stay editable/documented
                  // (unchanged from Milestone 14) but are never actually
                  // sent by send() below. Same limitation, same reasoning,
                  // as apiKey-in-cookie security schemes (see
                  // resolve-auth-credential-fields.ts).
                  <p className="text-xs italic text-text-muted">
                    Cookies can&apos;t be sent from the browser due to security restrictions — shown for
                    reference only.
                  </p>
                )}
                {parameters.map((parameter) => (
                  <ParameterField
                    key={`${parameter.in}-${parameter.name}`}
                    parameter={parameter}
                    // `noUncheckedIndexedAccess` means this indexed lookup is
                    // typed as possibly undefined even though useTryItOut
                    // always seeds an entry for every current parameter —
                    // "" is the same default the hook itself uses.
                    value={values[parameter.in][parameter.name] ?? ""}
                    error={errors[`${parameter.in}:${parameter.name}`]}
                    onChange={(value) => {
                      if (parameter.in === "query") {
                        setParameterValue("query", parameter.name, value);
                      } else {
                        // ParameterField only ever emits a string for
                        // non-query locations (array-typed non-query
                        // parameters render as "not editable", never call
                        // onChange) — this matches useTryItOut's own
                        // "implementation signature only" reasoning for
                        // narrowing a value that's already guaranteed safe
                        // by construction.
                        setParameterValue(parameter.in, parameter.name, value as string);
                      }
                    }}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {hasBody && values.body && (
        <div className="flex flex-col gap-xs">
          <span className="text-sm font-semibold text-text">Body</span>
          <BodyFieldEditor
            value={values.body}
            path={[]}
            dotPath=""
            errors={errors}
            setBodyValue={setBodyValue}
            addBodyArrayItem={addBodyArrayItem}
            removeBodyArrayItem={removeBodyArrayItem}
          />
        </div>
      )}

      {hasNoRequestInputs && (
        <p className="text-sm text-text-muted">This operation has no editable request inputs.</p>
      )}

      <div className="flex flex-col gap-xs">
        <button
          type="button"
          disabled={!canSend}
          onClick={() => send(values)}
          className="self-start rounded-sm px-md py-sm text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "var(--component-button-background)",
            color: "var(--component-button-text)",
            borderRadius: "var(--component-button-radius)",
          }}
        >
          {status === "loading" ? "Sending…" : "Send"}
        </button>
        {baseUrl.trim().length === 0 && (
          <p className="text-xs text-text-muted">Enter a base URL to send a request.</p>
        )}
      </div>

      <ResponsePanel status={status} result={result} />
    </div>
  );
}
