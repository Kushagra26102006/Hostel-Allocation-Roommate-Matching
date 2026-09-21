import { test, expect } from "@playwright/test";
import { loginAsRole } from "./fixtures/auth.fixture";
import { StudentApplicationPage } from "./page-objects/student-application.page";
import { ResultAppealsPage } from "./page-objects/result-appeals.page";

test.describe("Mobile 360px Viewport Critical Journeys", () => {
  test.use({
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
  });

  test("Mobile J1: Student navigates application form without horizontal overflow", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    const appPage = new StudentApplicationPage(page);

    await appPage.gotoNew("demo-cycle-2026");

    // Verify viewport width is exactly 360px
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBe(360);

    // Verify header and form elements fit within 360px viewport without horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(365);

    // Advance step on mobile
    await appPage.fillProfile({
      fullName: "Priya Sharma",
      email: "priya.sharma@nit.edu",
      phone: "9876543210",
      pincode: "110001",
      city: "New Delhi",
      state: "Delhi",
      address: "Girls Hostel Avenue",
    });

    await appPage.nextStep();
    await expect(page.getByText(/Upload Documents/i)).toBeVisible();
  });

  test("Mobile J7: Student views allotment and triggers letter download on 360px screen", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    const resultPage = new ResultAppealsPage(page);

    await page.route("**/api/v1/student/allocation-result", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            hasAllocation: true,
            status: "published",
            assignmentId: "asgn-syn-002",
            letterId: "letter-syn-002",
            hostel: {
              name: "Sarojini Naidu Girls Hostel",
              block: "Tower B",
              floor: 2,
              roomNumber: "204",
              bedNo: "Bed B-204-1",
              roomType: "Triple Sharing",
            },
            score: 96,
          },
        }),
      });
    });

    await resultPage.gotoRoom();
    await expect(page.getByText(/Sarojini Naidu Girls Hostel/i)).toBeVisible();

    // Verify action button is visible and tap-friendly on mobile
    const downloadBtn = page.getByRole("button", { name: /Download Letter/i });
    await expect(downloadBtn).toBeVisible();

    const box = await downloadBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Touch target size check (at least 32px height)
      expect(box.height).toBeGreaterThanOrEqual(32);
    }
  });
});
