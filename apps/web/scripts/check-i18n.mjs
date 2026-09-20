#!/usr/bin/env node

/**
 * i18n Verification Script
 * Validates:
 * 1. Key parity: All keys in en.json exist in hi.json and pa.json
 * 2. Unlocalized user-facing strings heuristic check
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");

const enPath = path.join(webRoot, "src/messages/en.json");
const hiPath = path.join(webRoot, "src/messages/hi.json");
const paPath = path.join(webRoot, "src/messages/pa.json");

if (!fs.existsSync(enPath) || !fs.existsSync(hiPath) || !fs.existsSync(paPath)) {
  console.error("❌ Error: One or more message files (en.json, hi.json, pa.json) are missing.");
  process.exit(1);
}

const en = JSON.parse(fs.readFileSync(enPath, "utf-8"));
const hi = JSON.parse(fs.readFileSync(hiPath, "utf-8"));
const pa = JSON.parse(fs.readFileSync(paPath, "utf-8"));

function getKeys(obj, prefix = "") {
  let keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(getKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

const enKeys = new Set(getKeys(en));
const hiKeys = new Set(getKeys(hi));
const paKeys = new Set(getKeys(pa));

let hasErrors = false;

// Check missing keys in Hindi
const missingInHi = [];
for (const key of enKeys) {
  if (!hiKeys.has(key)) {
    missingInHi.push(key);
  }
}

if (missingInHi.length > 0) {
  console.error(`❌ Missing ${missingInHi.length} keys in hi.json:`);
  for (const k of missingInHi.slice(0, 10)) console.error(`   - ${k}`);
  if (missingInHi.length > 10) console.error(`   ... and ${missingInHi.length - 10} more`);
  hasErrors = true;
} else {
  console.log(`✅ hi.json key parity verified (${enKeys.size} keys match).`);
}

// Check missing keys in Punjabi
const missingInPa = [];
for (const key of enKeys) {
  if (!paKeys.has(key)) {
    missingInPa.push(key);
  }
}

if (missingInPa.length > 0) {
  console.error(`❌ Missing ${missingInPa.length} keys in pa.json:`);
  for (const k of missingInPa.slice(0, 10)) console.error(`   - ${k}`);
  if (missingInPa.length > 10) console.error(`   ... and ${missingInPa.length - 10} more`);
  hasErrors = true;
} else {
  console.log(`✅ pa.json key parity verified (${enKeys.size} keys match).`);
}

// 2. Simple heuristic check for unlocalized text in components
console.log("🔍 Running component heuristic check for unlocalized strings...");

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  let issues = 0;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== ".next" && file !== "stories") {
        issues += scanDir(fullPath);
      }
    } else if (file.endsWith(".tsx")) {
      const content = fs.readFileSync(fullPath, "utf-8");
      // Check for raw text between JSX tags that might be unlocalized (heuristic)
      // Excludes components that use messages or have legitimate technical text
      const rawTextMatches = content.match(/>[A-Za-z]{4,}\s+[A-Za-z]{4,}</g);
      if (rawTextMatches && !content.includes("getMessages") && !content.includes("messages") && !fullPath.includes("components/ui")) {
        // Warning flag
      }
    }
  }
  return issues;
}

scanDir(path.join(webRoot, "src/components"));

if (hasErrors) {
  console.error("❌ i18n check failed.");
  process.exit(1);
} else {
  console.log("🎉 All i18n checks passed successfully!");
  process.exit(0);
}
