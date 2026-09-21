import { describe, it, expect } from "vitest";
import enMessages from "@/messages/en.json";
import hiMessages from "@/messages/hi.json";
import paMessages from "@/messages/pa.json";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/formatters";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(result, flattenKeys(value as Record<string, unknown>, fullPath));
    } else if (typeof value === "string") {
      result[fullPath] = value;
    }
  }
  return result;
}

const enFlat = flattenKeys(enMessages as Record<string, unknown>);
const hiFlat = flattenKeys(hiMessages as Record<string, unknown>);
const paFlat = flattenKeys(paMessages as Record<string, unknown>);

/**
 * Transforms an English string into pseudo-localized text with ~40% length expansion
 * e.g. "Hostel" -> "[!!! Ḧőśṫéĺ !!!]"
 */
function pseudoLocalize(str: string): string {
  const ACCENT_MAP: Record<string, string> = {
    a: "á",
    e: "é",
    i: "í",
    o: "ő",
    u: "ű",
    A: "Ǟ",
    E: "Ë",
    I: "Ï",
    O: "Ő",
    U: "Ű",
    c: "ć",
    d: "đ",
    h: "ḣ",
    l: "ĺ",
    n: "ñ",
    r: "ř",
    s: "ś",
    t: "ṫ",
    y: "ý",
    z: "ž",
  };

  let inToken = false;
  const transformed = str
    .split("")
    .map((char) => {
      if (char === "{") {
        inToken = true;
        return char;
      }
      if (char === "}") {
        inToken = false;
        return char;
      }
      if (inToken) return char;
      return ACCENT_MAP[char] || char;
    })
    .join("");

  return `[!!! ${transformed} !!!]`;
}

describe("i18n & Pseudo-Locale Verification", () => {
  describe("1. Key Parity Across All Locales", () => {
    it("has 100% of English keys present in Hindi", () => {
      const missingKeys = Object.keys(enFlat).filter((key) => !(key in hiFlat));
      expect(missingKeys).toEqual([]);
    });

    it("has 100% of English keys present in Punjabi", () => {
      const missingKeys = Object.keys(enFlat).filter((key) => !(key in paFlat));
      expect(missingKeys).toEqual([]);
    });

    it("has non-empty string values for all Hindi translations", () => {
      for (const [key, val] of Object.entries(hiFlat)) {
        expect(val.trim().length, `Empty translation for key: ${key}`).toBeGreaterThan(0);
      }
    });

    it("has non-empty string values for all Punjabi translations", () => {
      for (const [key, val] of Object.entries(paFlat)) {
        expect(val.trim().length, `Empty translation for key: ${key}`).toBeGreaterThan(0);
      }
    });
  });

  describe("2. Script-Specific Authenticity", () => {
    it("contains Devanagari characters in Hindi student application keys", () => {
      const devanagariRegex = /[\u0900-\u097F]/;
      expect(devanagariRegex.test(hiFlat["application.title"]!)).toBe(true);
      expect(devanagariRegex.test(hiFlat["application.offline.bannerOffline"]!)).toBe(true);
      expect(devanagariRegex.test(hiFlat["application.preferences.single"]!)).toBe(true);
    });

    it("contains Gurmukhi characters in Punjabi student application keys", () => {
      const gurmukhiRegex = /[\u0A00-\u0A7F]/;
      expect(gurmukhiRegex.test(paFlat["application.title"]!)).toBe(true);
      expect(gurmukhiRegex.test(paFlat["application.offline.bannerOffline"]!)).toBe(true);
      expect(gurmukhiRegex.test(paFlat["application.preferences.single"]!)).toBe(true);
    });
  });

  describe("3. Pseudo-Locale Expansion Simulation", () => {
    it("generates expanded strings that preserve parameter placeholders", () => {
      const template = "This destination is configured for {role}.";
      const pseudo = pseudoLocalize(template);
      expect(pseudo).toContain("{role}");
      expect(pseudo.length).toBeGreaterThan(template.length);
    });

    it("simulates layout expansion without breaking string structure", () => {
      const keysToTest = [
        "application.title",
        "application.offline.bannerOffline",
        "pwa.installDesc",
      ];
      for (const key of keysToTest) {
        const enVal = enFlat[key]!;
        const pseudo = pseudoLocalize(enVal);
        expect(pseudo.startsWith("[!!!")).toBe(true);
        expect(pseudo.endsWith("!!!]")).toBe(true);
      }
    });
  });

  describe("4. Locale-Aware Formatting Utilities", () => {
    const testDate = new Date("2026-09-21T12:00:00Z");

    it("formats dates across en, hi, and pa without error", () => {
      const enDate = formatDate(testDate, "en");
      const hiDate = formatDate(testDate, "hi");
      const paDate = formatDate(testDate, "pa");

      expect(enDate).toBeTruthy();
      expect(hiDate).toBeTruthy();
      expect(paDate).toBeTruthy();

      const enDateTime = formatDateTime(testDate, "en");
      const hiDateTime = formatDateTime(testDate, "hi");
      const paDateTime = formatDateTime(testDate, "pa");

      expect(enDateTime).toBeTruthy();
      expect(hiDateTime).toBeTruthy();
      expect(paDateTime).toBeTruthy();
    });

    it("formats currency with INR symbol across locales", () => {
      const amount = 45000;
      const enCurr = formatCurrency(amount, "en");
      const hiCurr = formatCurrency(amount, "hi");
      const paCurr = formatCurrency(amount, "pa");

      expect(enCurr).toContain("₹");
      expect(hiCurr).toContain("₹");
      expect(paCurr).toContain("₹");
    });

    it("formats numbers and percentages accurately", () => {
      expect(formatNumber(1520, "en")).toContain("1,520");
      expect(formatPercent(0.924, "en")).toContain("92.4%");
    });
  });
});
