// @vitest-environment jsdom
//
// Infra-verification test, not a real component test. Proves the RTL +
// jsdom + jest-dom matcher pipeline is correctly wired BEFORE any real
// component (AppShell, etc. — next step) is built on top of it. The
// component here is defined inline and used nowhere else on purpose — this
// file's only job is to prove the harness itself works.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

function Greeting({ name }: { name: string }) {
  return <p>Hello, {name}!</p>;
}

describe("React Testing Library setup", () => {
  it("renders a component into jsdom and queries it by rendered text", () => {
    render(<Greeting name="World" />);
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });
});
