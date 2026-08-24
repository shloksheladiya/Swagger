// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthRequirementBadge } from "./AuthRequirementBadge.js";

describe("AuthRequirementBadge", () => {
  it("shows that no authentication is required", () => {
    render(<AuthRequirementBadge auth={{ kind: "none" }} />);

    expect(screen.getByText("No authentication required")).toBeInTheDocument();
  });

  it("shows a single authentication alternative", () => {
    render(
      <AuthRequirementBadge
        auth={{
          kind: "required",
          alternatives: [["Bearer Token (JWT)"]],
        }}
      />,
    );

    expect(screen.getByText("Bearer Token (JWT)")).toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
    expect(screen.queryByText("and")).not.toBeInTheDocument();
  });

  it("shows OR between multiple authentication alternatives", () => {
    render(
      <AuthRequirementBadge
        auth={{
          kind: "required",
          alternatives: [["API Key (header: X-Api-Key)"], ["Bearer Token"]],
        }}
      />,
    );

    expect(screen.getByText("API Key (header: X-Api-Key)")).toBeInTheDocument();
    expect(screen.getByText("Bearer Token")).toBeInTheDocument();
    expect(screen.getByText("or")).toBeInTheDocument();
  });

  it("shows AND between schemes within one alternative", () => {
    render(
      <AuthRequirementBadge
        auth={{
          kind: "required",
          alternatives: [["API Key (header: X-Api-Key)", "OAuth 2.0 (scopes: read)"]],
        }}
      />,
    );

    expect(screen.getByText("API Key (header: X-Api-Key)")).toBeInTheDocument();
    expect(screen.getByText("OAuth 2.0 (scopes: read)")).toBeInTheDocument();
    expect(screen.getByText("and")).toBeInTheDocument();
    expect(screen.queryByText("or")).not.toBeInTheDocument();
  });

  it("renders OAuth scopes as part of the visible scheme label", () => {
    render(
      <AuthRequirementBadge
        auth={{
          kind: "required",
          alternatives: [["OAuth 2.0 (scopes: read, write)"]],
        }}
      />,
    );

    expect(screen.getByText("OAuth 2.0 (scopes: read, write)")).toBeInTheDocument();
  });

  // Regression test only — see resolve-operation-auth.test.ts's own test for
  // the same shape ("returns an empty AND-group when a requirement
  // references only unknown schemes"). This is the documented Milestone 13
  // edge case: a security requirement that references only undeclared
  // scheme names resolves to `alternatives: [[]]`. The known, intentionally
  // NOT-fixed behavior here is that the badge renders an empty group (no
  // visible scheme text, no "or"/"and" separators) rather than a crash or a
  // misleading label. This test exists only to catch a future regression
  // (e.g. a crash) — it is NOT approval to change this rendering; see the
  // Milestone 13 completion notes for why this was left as a separate,
  // future design decision.
  it("renders an empty group without crashing for the known 'unknown security scheme' edge case (alternatives: [[]])", () => {
    const { container } = render(
      <AuthRequirementBadge auth={{ kind: "required", alternatives: [[]] }} />,
    );

    expect(screen.queryByText("or")).not.toBeInTheDocument();
    expect(screen.queryByText("and")).not.toBeInTheDocument();
    expect(container.textContent).toBe("");
  });
});
