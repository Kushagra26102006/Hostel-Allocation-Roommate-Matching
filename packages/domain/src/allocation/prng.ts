/**
 * @hostelhub/domain — allocation/prng.ts
 *
 * Deterministic PRNG (PCG32) and stable hash (FNV-1a 32-bit) utilities.
 * No I/O, no Date, no Math.random(). All outputs are pure functions of inputs.
 *
 * PCG32 reference: https://www.pcg-random.org/download.html
 * FNV-1a reference: http://www.isthe.com/chongo/tech/comp/fnv/
 */

// ─── FNV-1a 32-bit hash ────────────────────────────────────────────────────────

/** FNV-1a 32-bit offset basis. */
const FNV_OFFSET_32 = 0x811c9dc5;
/** FNV-1a 32-bit prime. */
const FNV_PRIME_32 = 0x01000193;

/**
 * Computes the FNV-1a 32-bit hash of a UTF-16 string.
 * The result is a non-negative 32-bit integer (via >>> 0).
 * Identical on all JS engines — no platform-specific behaviour.
 */
export function fnv1a32(str: string): number {
  let hash = FNV_OFFSET_32;
  for (let i = 0; i < str.length; i++) {
    // Process both bytes of the UTF-16 code unit for full coverage.
    const code = str.charCodeAt(i);
    hash = Math.imul(hash ^ (code & 0xff), FNV_PRIME_32) >>> 0;
    hash = Math.imul(hash ^ ((code >> 8) & 0xff), FNV_PRIME_32) >>> 0;
  }
  return hash;
}

// ─── PCG32 PRNG ────────────────────────────────────────────────────────────────

/**
 * PCG32 state: two 32-bit unsigned integers.
 * Using two JS numbers avoids BigInt and keeps arithmetic in SMI range.
 */
export interface PCGState {
  /** Low 32 bits of the 64-bit state. */
  stLo: number;
  /** High 32 bits of the 64-bit state. */
  stHi: number;
  /** Stream selector (odd number), kept constant per generator instance. */
  incLo: number;
  incHi: number;
}

/** Adds two 32-bit halves, returning [lo, hi] pair. */
function add64(aLo: number, aHi: number, bLo: number, bHi: number): [number, number] {
  const lo = (aLo + bLo) >>> 0;
  const hi = (aHi + bHi + (lo < aLo ? 1 : 0)) >>> 0;
  return [lo, hi];
}

/** Multiplies two 64-bit (split 32+32) values, returning low 64 bits only (mod 2^64). */
function mul64(aLo: number, aHi: number, bLo: number, bHi: number): [number, number] {
  // Split into 16-bit parts: a = a1:a0, b = b1:b0
  const a0 = aLo & 0xffff;
  const a1 = (aLo >>> 16) & 0xffff;
  const a2 = aHi & 0xffff;
  const a3 = (aHi >>> 16) & 0xffff;

  const b0 = bLo & 0xffff;
  const b1 = (bLo >>> 16) & 0xffff;
  const b2 = bHi & 0xffff;
  const b3 = (bHi >>> 16) & 0xffff;

  // We only need the low 64 bits.
  // lo32 = a0*b0 + (a1*b0 + a0*b1) << 16
  let lo = Math.imul(a0, b0) >>> 0;
  let c1 = ((Math.imul(a1, b0) + Math.imul(a0, b1)) & 0xffff) << 16;
  lo = (lo + c1) >>> 0;

  let hi =
    ((Math.imul(a1, b0) + Math.imul(a0, b1)) >>> 16) +
    Math.imul(a2, b0) +
    Math.imul(a1, b1) +
    Math.imul(a0, b2);

  hi += Math.imul(a3, b0) + Math.imul(a2, b1) + Math.imul(a1, b2) + Math.imul(a0, b3);

  // We need to account for the carry from the low part into hi.
  const carry = lo < c1 ? 1 : 0;
  hi = (hi + carry) >>> 0;

  return [lo >>> 0, hi >>> 0];
}

// PCG32 multiplier: 6364136223846793005 = 0x5851F42D4C957F2D (split)
const PCG_MULT_LO = 0x4c957f2d;
const PCG_MULT_HI = 0x5851f42d;

// Default increment (stream 1): 1442695040888963407 = 0x14057B7EF767814F (split) | 1
const PCG_INC_LO = 0xf767814f;
const PCG_INC_HI = 0x14057b7e;

/**
 * Advances PCG32 state by one step and returns the output value (0..2^32-1).
 * Pure function — returns the new state and output.
 */
export function pcg32Step(state: PCGState): { value: number; next: PCGState } {
  const { stLo, stHi, incLo, incHi } = state;

  // oldstate = state.state
  // state.state = oldstate * PCG_MULT + state.inc
  const [mulLo, mulHi] = mul64(stLo, stHi, PCG_MULT_LO, PCG_MULT_HI);
  const [newStLo, newStHi] = add64(mulLo, mulHi, incLo, incHi);

  // PCG output permutation (XSH-RR):
  // xorshifted = ((oldstate >> 18) ^ oldstate) >> 27
  const xsLo = (stHi >>> 18) | (stHi << 14); // shift right 18 using high bits
  const xsPart = (xsLo ^ stLo) >>> 27;
  // rot = oldstate >> 59
  const rot = (stHi >>> 27) & 0x1f;
  // output = xorshifted >> rot | xorshifted << ((-rot) & 31)
  const output = ((xsPart >>> rot) | (xsPart << (-rot & 31))) >>> 0;

  return {
    value: output,
    next: { stLo: newStLo, stHi: newStHi, incLo, incHi },
  };
}

/**
 * Creates a PCG32 initial state from a 32-bit seed integer.
 * Uses stream 1 (default increment) for reproducibility.
 */
export function makePCGState(seed: number): PCGState {
  // Initialize: state = 0 + inc, then advance once, then add seed.
  let state: PCGState = {
    stLo: 0,
    stHi: 0,
    incLo: (PCG_INC_LO | 1) >>> 0,
    incHi: PCG_INC_HI,
  };
  // First advance (state = (0 * mult) + inc)
  const { next: s1 } = pcg32Step(state);
  // Add seed to state
  const [sLo, sHi] = add64(s1.stLo, s1.stHi, seed >>> 0, 0);
  state = { ...s1, stLo: sLo, stHi: sHi };
  // Second advance to mix seed in
  const { next: s2 } = pcg32Step(state);
  return s2;
}

/** Mutable-style PRNG factory for ergonomic use in the engine. */
export function seededPrng(seed: number): {
  /** Returns a non-negative 32-bit integer. */
  next(): number;
  /** Returns a float in [0, 1). */
  nextFloat(): number;
} {
  let st = makePCGState(seed);
  return {
    next(): number {
      const { value, next } = pcg32Step(st);
      st = next;
      return value;
    },
    nextFloat(): number {
      const { value, next } = pcg32Step(st);
      st = next;
      return value / 0x1_0000_0000; // divide by 2^32
    },
  };
}

// ─── Deterministic sort key ────────────────────────────────────────────────────

/**
 * Derives a deterministic 32-bit sort key from (seed, ...ids).
 * Combines the seed and ids into a single string, hashes with FNV-1a.
 * Identical output on every machine for the same inputs.
 */
export function key(seed: number, ...ids: string[]): number {
  const combined = `${seed >>> 0}:${ids.join(":")}`;
  return fnv1a32(combined);
}
