import { describe, it, expect } from "vitest";
import { nowIso, assertDefined } from "../index.js";

describe("@hostelhub/shared", () => {
  it("nowIso returns a valid ISO 8601 string", () => {
    const ts = nowIso();
    expect(() => new Date(ts)).not.toThrow();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("assertDefined throws for null", () => {
    expect(() => assertDefined(null, "must be defined")).toThrow(
      "must be defined",
    );
  });

  it("assertDefined does not throw for a defined value", () => {
    expect(() => assertDefined("hello", "must be defined")).not.toThrow();
  });
});
