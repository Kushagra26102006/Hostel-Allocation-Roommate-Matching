/**
 * @hostelhub/domain — allocation/sha256.ts
 *
 * Pure TypeScript standard FIPS 180-4 SHA-256 implementation.
 * Zero external dependencies, zero Node runtime imports.
 * Completely portable across Browser, Node.js, Cloudflare Workers, and Edge.
 */

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

// Initial hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19)
const H_INIT = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

// Round constants (first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/**
 * Encodes a string to a UTF-8 byte array without relying on Node Buffer or browser TextEncoder.
 */
function toUtf8Bytes(str: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i);
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code >= 0xd800 && code <= 0xdbff) {
      i++;
      const next = str.charCodeAt(i);
      const surrogate = 0x10000 + (((code & 0x3ff) << 10) | (next & 0x3ff));
      bytes.push(
        0xf0 | (surrogate >> 18),
        0x80 | ((surrogate >> 12) & 0x3f),
        0x80 | ((surrogate >> 6) & 0x3f),
        0x80 | (surrogate & 0x3f),
      );
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return new Uint8Array(bytes);
}

/**
 * Computes standard SHA-256 hex digest of any string.
 */
export function sha256(input: string): string {
  const bytes = toUtf8Bytes(input);
  const bitLength = bytes.length * 8;

  // Pre-processing: padding
  const paddingLength =
    bytes.length % 64 < 56 ? 56 - (bytes.length % 64) : 120 - (bytes.length % 64);

  const totalLength = bytes.length + paddingLength + 8;
  const padded = new Uint8Array(totalLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  // Append length in bits as big-endian 64-bit integer
  const view = new DataView(padded.buffer);
  // High 32 bits (for sizes < 2^32 bits = 512MB, this is 0)
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(totalLength - 4, bitLength >>> 0, false);

  // Hash values
  let [h0, h1, h2, h3, h4, h5, h6, h7] = H_INIT;
  const w = new Uint32Array(64);

  // Process each 512-bit (64-byte) chunk
  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15]!, 7) ^ rightRotate(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rightRotate(w[i - 2]!, 17) ^ rightRotate(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = [h0!, h1!, h2!, h3!, h4!, h5!, h6!, h7!];

    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0! + a) >>> 0;
    h1 = (h1! + b) >>> 0;
    h2 = (h2! + c) >>> 0;
    h3 = (h3! + d) >>> 0;
    h4 = (h4! + e) >>> 0;
    h5 = (h5! + f) >>> 0;
    h6 = (h6! + g) >>> 0;
    h7 = (h7! + h) >>> 0;
  }

  const toHex = (n: number) => n.toString(16).padStart(8, "0");
  return `${toHex(h0!)}${toHex(h1!)}${toHex(h2!)}${toHex(h3!)}${toHex(h4!)}${toHex(h5!)}${toHex(h6!)}${toHex(h7!)}`;
}
