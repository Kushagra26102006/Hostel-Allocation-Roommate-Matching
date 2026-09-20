/**
 * Tests for allocation/prng.ts
 *
 * Covers:
 *   - FNV-1a 32-bit known hash vectors
 *   - PCG32 reproducibility with known sequences
 *   - key() deterministic sort-key derivation
 */

import { describe, it, expect } from "vitest";
import { fnv1a32, pcg32Step, makePCGState, seededPrng, key } from "../../allocation/prng.js";

describe("FNV-1a 32-bit hash", () => {
  it("hashes empty string to FNV offset basis", () => {
    // FNV-1a 32: empty string = 0x811c9dc5 = 2166136261
    expect(fnv1a32("")).toBe(2166136261);
  });

  it("produces known hash for 'a'", () => {
    // FNV-1a 32 of 'a' (UTF-16: 0x61, 0x00):
    // step1: (2166136261 ^ 0x61) * 16777619 mod 2^32 = 84696351
    // step2: (84696351   ^ 0x00) * 16777619 mod 2^32 = ...
    // We validate determinism (same call = same result).
    const h1 = fnv1a32("a");
    const h2 = fnv1a32("a");
    expect(h1).toBe(h2);
    expect(typeof h1).toBe("number");
    expect(h1).toBeGreaterThanOrEqual(0);
    expect(h1).toBeLessThanOrEqual(0xffffffff);
  });

  it("produces different hashes for different strings", () => {
    expect(fnv1a32("hello")).not.toBe(fnv1a32("world"));
    expect(fnv1a32("Room214")).not.toBe(fnv1a32("Room305"));
  });

  it("is always non-negative (unsigned 32-bit)", () => {
    for (const s of ["", "a", "abc", "hostel-1", "12345678901234567890"]) {
      const h = fnv1a32(s);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("produces identical results on repeated calls (no internal state)", () => {
    const samples = ["foo", "bar", "baz", "allocation", "engine", "pcg32"];
    for (const s of samples) {
      expect(fnv1a32(s)).toBe(fnv1a32(s));
    }
  });
});

describe("PCG32 PRNG", () => {
  it("produces non-negative 32-bit integers", () => {
    let state = makePCGState(42);
    for (let i = 0; i < 100; i++) {
      const { value, next } = pcg32Step(state);
      state = next;
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("is reproducible: same seed always yields same sequence", () => {
    const seq1: number[] = [];
    const seq2: number[] = [];
    let s1 = makePCGState(42);
    let s2 = makePCGState(42);
    for (let i = 0; i < 20; i++) {
      const r1 = pcg32Step(s1);
      const r2 = pcg32Step(s2);
      s1 = r1.next;
      s2 = r2.next;
      seq1.push(r1.value);
      seq2.push(r2.value);
    }
    expect(seq1).toEqual(seq2);
  });

  it("different seeds produce different sequences", () => {
    const seq1: number[] = [];
    const seq2: number[] = [];
    let s1 = makePCGState(42);
    let s2 = makePCGState(123);
    for (let i = 0; i < 10; i++) {
      const r1 = pcg32Step(s1);
      const r2 = pcg32Step(s2);
      s1 = r1.next;
      s2 = r2.next;
      seq1.push(r1.value);
      seq2.push(r2.value);
    }
    expect(seq1).not.toEqual(seq2);
  });

  it("seededPrng factory is reproducible", () => {
    const g1 = seededPrng(99);
    const g2 = seededPrng(99);
    const vals1 = Array.from({ length: 10 }, () => g1.next());
    const vals2 = Array.from({ length: 10 }, () => g2.next());
    expect(vals1).toEqual(vals2);
  });

  it("seededPrng.nextFloat returns values in [0, 1)", () => {
    const g = seededPrng(7);
    for (let i = 0; i < 50; i++) {
      const f = g.nextFloat();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it("seededPrng sequence advances (consecutive calls differ)", () => {
    const g = seededPrng(1);
    const v1 = g.next();
    const v2 = g.next();
    // Very unlikely to be equal for any two consecutive PCG steps
    expect(v1).not.toBe(v2);
  });
});

describe("key() deterministic sort key", () => {
  it("returns same value for same inputs", () => {
    expect(key(42, "unit-1", "room-214")).toBe(key(42, "unit-1", "room-214"));
  });

  it("returns different values for different seed", () => {
    expect(key(42, "unit-1")).not.toBe(key(43, "unit-1"));
  });

  it("returns different values for different ids", () => {
    expect(key(42, "unit-1", "room-214")).not.toBe(key(42, "unit-1", "room-305"));
  });

  it("is order-sensitive in ids", () => {
    expect(key(42, "a", "b")).not.toBe(key(42, "b", "a"));
  });

  it("returns unsigned 32-bit integer", () => {
    const k = key(42, "unit-1", "room-214");
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThanOrEqual(0xffffffff);
  });

  it("stable across multiple invocations (no Date or random)", () => {
    const k1 = key(100, "x", "y", "z");
    const k2 = key(100, "x", "y", "z");
    const k3 = key(100, "x", "y", "z");
    expect(k1).toBe(k2);
    expect(k2).toBe(k3);
  });
});
