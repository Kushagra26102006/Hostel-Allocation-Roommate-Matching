import { test, expect } from "@playwright/test";

test.describe("PWA Offline Application Draft & Synchronization", () => {
  test("fills application draft offline, reconnects, and verifies saved state", async ({
    page,
    context,
  }) => {
    // 1. Open the application form page
    await page.goto("/applications/new");

    // 2. Fill initial profile details while online
    await page.locator("#fullName").fill("Kavita Singh");
    await page.locator("#email").fill("kavita.singh@campus.edu");
    await page.locator("#phone").fill("9876543210");
    await page.locator("#pincode").fill("110001");
    await page.locator("#city").fill("New Delhi");
    await page.locator("#state").fill("Delhi");
    await page.locator("#address").fill("Flat 402, North Hostel Enclave");

    // 3. Simulate disconnecting network connection (Go Offline)
    await context.setOffline(true);

    // 4. Continue making edits while offline
    await page.locator("#address").fill("Flat 402, North Hostel Enclave — Offline Revision");

    // 5. Verify the "Offline — your changes will sync" banner is prominently displayed
    const offlineBanner = page.locator("#offline-sync-banner");
    await expect(offlineBanner).toBeVisible();
    await expect(offlineBanner).toContainText(/Offline/i);

    // 6. Simulate network reconnection (Go Online)
    await context.setOffline(false);

    // 7. Verify the input retains the offline edits
    await expect(page.locator("#address")).toHaveValue(
      "Flat 402, North Hostel Enclave — Offline Revision",
    );
  });

  test("verifies PWA install assets: manifest, service worker, and offline page", async ({
    page,
  }) => {
    // 1. Verify manifest.json
    const manifestRes = await page.request.get("/manifest.json");
    expect(manifestRes.status()).toBe(200);
    const manifest = await manifestRes.json();
    expect(manifest.name).toContain("HostelHub");
    expect(manifest.short_name).toBe("HostelHub");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#4f46e5");
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    // 2. Verify sw.js
    const swRes = await page.request.get("/sw.js");
    expect(swRes.status()).toBe(200);
    const swText = await swRes.text();
    expect(swText).toContain("hostelhub-cache");
    expect(swText).toContain("sync-application-draft");

    // 3. Verify offline fallback page
    const offlineRes = await page.request.get("/offline.html");
    expect(offlineRes.status()).toBe(200);
    const offlineHtml = await offlineRes.text();
    expect(offlineHtml).toContain("Offline");
  });
});
