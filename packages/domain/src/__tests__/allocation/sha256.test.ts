import { describe, it, expect } from "vitest";
import { sha256 } from "../../allocation/sha256.js";

describe("sha256 pure implementation", () => {
  it("produces standard hash for empty string", () => {
    expect(sha256("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("produces standard hash for 'abc'", () => {
    expect(sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("hashes multi-byte UTF-8 characters deterministically", () => {
    const hash = sha256("HostelHub — छात्र आवास (छात्रवास)");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(sha256("HostelHub — छात्र आवास (छात्रवास)"));
  });
});
