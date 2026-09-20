import { describe, it, expect } from "vitest";
import { getDbVersion, DB_VERSION } from "../index.js";

describe("@hostelhub/db", () => {
  it("getDbVersion returns the package version constant", () => {
    expect(getDbVersion()).toBe(DB_VERSION);
  });
});
