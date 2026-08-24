// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Operation } from "@docs-platform/core";
import { EndpointListItem } from "./EndpointListItem.js";
import { useUiStore } from "../../store/ui-store.js";

const listUsers: Operation = {
  operationId: "listUsers",
  path: "/users",
  method: "get",
  summary: "List all users",
  tagNames: ["Users"],
  parameters: [],
  responses: [],
  security: [],
};

beforeEach(() => {
  useUiStore.setState({
    selectedOperationId: null,
    expandedTagNames: new Set(),
    searchQuery: "",
  });
});

describe("EndpointListItem", () => {
  it("renders the method and summary", () => {
    render(<EndpointListItem operation={listUsers} />);
    expect(screen.getByText("get")).toBeInTheDocument();
    expect(screen.getByText("List all users")).toBeInTheDocument();
  });

  it("falls back to the path when there's no summary", () => {
    render(<EndpointListItem operation={{ ...listUsers, summary: undefined }} />);
    expect(screen.getByText("/users")).toBeInTheDocument();
  });

  it("calls selectOperation with this operation's id when clicked", () => {
    render(<EndpointListItem operation={listUsers} />);

    fireEvent.click(screen.getByRole("button"));

    expect(useUiStore.getState().selectedOperationId).toBe("listUsers");
  });

  it("reflects selection via aria-current, for accessible + testable selected-state signaling", () => {
    useUiStore.setState({ selectedOperationId: "listUsers" });
    render(<EndpointListItem operation={listUsers} />);

    expect(screen.getByRole("button")).toHaveAttribute("aria-current", "true");
  });

  it("does not mark an unselected operation as current", () => {
    useUiStore.setState({ selectedOperationId: "someOtherOperation" });
    render(<EndpointListItem operation={listUsers} />);

    expect(screen.getByRole("button")).not.toHaveAttribute("aria-current");
  });
});
