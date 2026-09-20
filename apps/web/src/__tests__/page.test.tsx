import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "../app/(public)/page.js";

describe("HomePage", () => {
  it("renders the HostelHub heading", () => {
    render(<HomePage />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toBeDefined();
    expect(heading.textContent).toContain("campus");
  });
});
