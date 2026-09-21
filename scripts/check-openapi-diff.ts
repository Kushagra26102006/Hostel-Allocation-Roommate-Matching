#!/usr/bin/env tsx
/**
 * OpenAPI Contract & Diff Checker
 *
 * Compares the in-memory generated OpenAPI spec from route handlers against
 * the committed snapshot in docs/openapi.json. Fails CI if uncommitted schema
 * deviations or breaking endpoint modifications exist.
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { generateOpenApiDocument } from "../apps/web/src/lib/api/openapi.js";

const SPEC_PATH = resolve(process.cwd(), "docs/openapi.json");
const shouldUpdate = process.argv.includes("--update");

console.log("Generating current OpenAPI 3.1.0 specification...");
const currentSpec = generateOpenApiDocument();
const currentJson = JSON.stringify(currentSpec, null, 2);

if (!existsSync(SPEC_PATH) || shouldUpdate) {
  writeFileSync(SPEC_PATH, currentJson + "\n", "utf-8");
  console.log(`OpenAPI specification written to ${SPEC_PATH}`);
  process.exit(0);
}

const committedJson = readFileSync(SPEC_PATH, "utf-8").trim();

if (committedJson !== currentJson.trim()) {
  console.error("❌ OpenAPI Schema Diff Detected!");
  console.error(
    "The committed API specification in docs/openapi.json is out of sync with route definitions.",
  );
  console.error("Run `pnpm openapi:update` to sync the OpenAPI specification snapshot.");
  process.exit(1);
}

console.log("✅ OpenAPI specification matches committed contract. No diff detected.");
process.exit(0);
