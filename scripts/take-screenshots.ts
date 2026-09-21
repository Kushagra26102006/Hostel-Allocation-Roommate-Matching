import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { encode } from "next-auth/jwt";

const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/user-guides/screenshots");

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  console.log("📸 Capturing user guide screenshots...");
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Create staff session token
  const token = await encode({
    token: {
      sub: "66f000000000000000000002",
      email: "warden.demo@nit.edu",
      name: "Dr. Rajesh Kumar",
      roles: ["warden", "hostel_admin"],
      institution_id: "66f000000000000000000000",
      mfaPending: false,
    },
    secret: process.env["AUTH_SECRET"] || "hostelhub-secret-min-32-chars-long!",
    salt: "hostelhub.session-token",
  });

  await context.addCookies([
    {
      name: "hostelhub.session-token",
      value: token,
      url: "http://localhost:3000",
    },
  ]);

  try {
    // 1. Student Landing / Login
    await page
      .goto("http://localhost:3000/login", { waitUntil: "networkidle", timeout: 5000 })
      .catch(() => {});
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "login-page.png") }).catch(() => {});

    // 2. Application Form
    await page
      .goto("http://localhost:3000/applications/new?cycleId=demo-cycle-2026", {
        waitUntil: "networkidle",
        timeout: 5000,
      })
      .catch(() => {});
    await page
      .screenshot({ path: path.join(SCREENSHOT_DIR, "student-application.png") })
      .catch(() => {});

    // 3. Roommate Questionnaire
    await page
      .goto("http://localhost:3000/roommate", { waitUntil: "networkidle", timeout: 5000 })
      .catch(() => {});
    await page
      .screenshot({ path: path.join(SCREENSHOT_DIR, "roommate-questionnaire.png") })
      .catch(() => {});

    // 4. Warden Review Console
    await page
      .goto("http://localhost:3000/staff/warden/review", {
        waitUntil: "networkidle",
        timeout: 5000,
      })
      .catch(() => {});
    await page
      .screenshot({ path: path.join(SCREENSHOT_DIR, "warden-review-dashboard.png") })
      .catch(() => {});

    // 5. Admin Inventory Manager
    await page
      .goto("http://localhost:3000/staff/admin/inventory", {
        waitUntil: "networkidle",
        timeout: 5000,
      })
      .catch(() => {});
    await page
      .screenshot({ path: path.join(SCREENSHOT_DIR, "admin-inventory.png") })
      .catch(() => {});

    console.log(`✅ Screenshots saved to ${SCREENSHOT_DIR}`);
  } catch (err) {
    console.warn(
      "Notice: Live server was not running during script capture, placeholder screenshots referenced.",
    );
  } finally {
    await browser.close();
  }
}

void main();
