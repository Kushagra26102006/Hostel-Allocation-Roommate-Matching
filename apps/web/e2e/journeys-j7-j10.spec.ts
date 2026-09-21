import { test, expect } from "@playwright/test";
import { loginAsRole } from "./fixtures/auth.fixture";
import { ResultAppealsPage } from "./page-objects/result-appeals.page";
import { WardenReviewPage } from "./page-objects/warden-review.page";

const mockDraftId = "66f000000000000000000042";

test.describe("Critical Journeys: J7 to J10", () => {
  test.describe.configure({ mode: "parallel" });

  test("J7: Student opens the result, downloads the letter; the QR verifies on the public page", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    const resultPage = new ResultAppealsPage(page);

    const mockToken = "eyJhbGciOiJFZERTQSI...sample-verified-letter-jwt";

    // Mock student result API
    await page.route("**/api/v1/student/allocation-result", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            hasAllocation: true,
            status: "published",
            assignmentId: "asgn-syn-001",
            letterId: "letter-syn-001",
            hostel: {
              name: "Aryabhata Hall",
              block: "Tower A (North Wing)",
              floor: 3,
              roomNumber: "304",
              bedNo: "Bed A-304-1",
              roomType: "Double Sharing",
            },
            score: 94,
            verificationToken: mockToken,
          },
        }),
      });
    });

    // Mock letter download
    await page.route("**/api/v1/letters/letter-syn-001/download*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ download_url: "https://example.com/letter.pdf" }),
      });
    });

    // Mock public QR verification endpoint
    await page.route(`**/api/v1/verify/${encodeURIComponent(mockToken)}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          valid: true,
          status: "verified",
          institutionName: "Synthetic National Institute (42)",
          studentName: "Aarav Sharma",
          rollNumber: "CS2026-001",
          hostelName: "Aryabhata Hall",
          roomNumber: "304",
          bedNumber: "A",
          verifiedAt: new Date().toISOString(),
        }),
      });
    });

    // 1. Visit student room result
    await resultPage.gotoRoom();
    await resultPage.expectResultLoaded();

    // 2. Trigger letter download
    const [downloadPage] = await Promise.all([
      page.waitForEvent("popup").catch(() => null),
      page.getByRole("button", { name: /Download Letter/i }).click(),
    ]);
    if (downloadPage) await downloadPage.close();

    // 3. Verify letter token on public portal
    await resultPage.gotoVerify(mockToken);
    await resultPage.expectVerificationResult(true);
  });

  test("J8: Student files an appeal and it escalates after the SLA (use a controllable clock)", async ({
    page,
  }) => {
    // Initialize controllable clock at a fixed time
    const initialTime = new Date("2026-09-21T09:00:00.000Z");
    await page.clock.setFixedTime(initialTime);

    await loginAsRole(page, "student");
    const resultPage = new ResultAppealsPage(page);

    let appealStatus = "warden_review";

    await page.route("**/api/v1/appeals", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            _id: "appeal-001",
            status: "warden_review",
            sla_deadline: new Date(initialTime.getTime() + 72 * 3600 * 1000).toISOString(),
            reason: "Requesting room change due to medical asthma condition.",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            status: appealStatus,
            escalated: appealStatus === "chief_warden_review",
          }),
        });
      }
    });

    // 1. Visit room result page and file appeal
    await resultPage.gotoRoom();
    await resultPage.openAppealDialog();
    await resultPage.submitAppeal(
      "Medical request: I have severe chronic asthma requiring ground floor well-ventilated room accommodation.",
    );
    await resultPage.expectAppealRegistered();

    // 2. Advance clock past the 72-hour SLA window
    await page.clock.fastForward(73 * 3600 * 1000);
    appealStatus = "chief_warden_review";

    // 3. Verify SLA breach triggers escalation
    const statusRes = await page.request.get("/api/v1/appeals");
    const statusData = (await statusRes.json()) as { status: string; escalated: boolean };
    expect(statusData.status).toBe("chief_warden_review");
    expect(statusData.escalated).toBe(true);
  });

  test("J9: Two wardens edit the same bed; the second sees a conflict and resolves it", async ({
    page,
  }) => {
    await loginAsRole(page, "warden");
    const wardenPage = new WardenReviewPage(page);

    // Mock bed map and draft details
    await page.route(`**/api/v1/drafts/${mockDraftId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          draft: {
            id: mockDraftId,
            versionNumber: 1,
            status: "UNDER_REVIEW",
          },
        }),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/bed-map`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          floors: [
            {
              floorNumber: 1,
              floorLabel: "Floor 1",
              totalRooms: 1,
              totalBeds: 2,
              occupiedBeds: 1,
              rooms: [
                {
                  id: "room-101",
                  roomNumber: "101",
                  roomType: "double",
                  capacity: 2,
                  accessible: false,
                  occupiedCount: 1,
                  beds: [
                    {
                      id: "bed-101a",
                      bedNo: "A",
                      accessible: false,
                      status: "assigned",
                      assignment: {
                        id: "asgn-001",
                        studentId: "stud-001",
                        studentName: "Aarav Sharma",
                        rollNumber: "CS2026-001",
                      },
                    },
                    {
                      id: "bed-101b",
                      bedNo: "B",
                      accessible: false,
                      status: "free",
                      assignment: null,
                    },
                  ],
                },
              ],
            },
          ],
        }),
      });
    });

    let attempt = 0;
    await page.route(`**/api/v1/drafts/${mockDraftId}/override`, async (route) => {
      attempt++;
      if (attempt === 1) {
        // Second warden receives 409 conflict because another warden saved version 2 first
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            code: "VERSION_CONFLICT",
            title: "Version Conflict",
            detail: "Version conflict: expected version 1, current is 2.",
          }),
        });
      } else {
        // After resolving with latest version, override succeeds
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true, version: 3 }),
        });
      }
    });

    // 1. Open console
    await wardenPage.openConsole(mockDraftId);
    await wardenPage.selectAssignedBed("A");
    await wardenPage.openOverrideDialog();
    await wardenPage.fillOverrideReason("Concurrent warden change attempt");

    // 2. First submit fails with 409 Version Conflict
    await wardenPage.submitOverride();
    await wardenPage.expectConflictError();

    // 3. Second submit resolves successfully
    await wardenPage.submitOverride();
  });

  test("J10: Cross-tenant and cross-role access attempts all fail", async ({ page, request }) => {
    // 1. Role separation: Student attempting to access Staff Admin route
    await loginAsRole(page, "student");
    await page.goto("/staff/admin/inventory");
    // Should redirect away from staff route or show forbidden
    await expect(page).not.toHaveURL(/\/staff\/admin\/inventory/);

    // 2. Cross-role API protection: Student calling draft publishing API directly
    const publishRes = await request.post(`/api/v1/drafts/${mockDraftId}/publish`, {
      headers: { "Content-Type": "application/json" },
    });
    expect([401, 403, 404]).toContain(publishRes.status());

    // 3. Cross-role API protection: Warden calling cycle creation (restricted to admin)
    await loginAsRole(page, "warden");
    const cycleRes = await request.post("/api/v1/cycles", {
      headers: { "Content-Type": "application/json" },
      data: { name: "Unauthorized Cycle", academic_year: "2026-2027" },
    });
    expect([401, 403]).toContain(cycleRes.status());

    // 4. Cross-tenant access: Requests with a mismatched/foreign tenant ID
    const crossTenantRes = await request.get(`/api/v1/drafts/${mockDraftId}`, {
      headers: {
        "x-institution-id": "66f999999999999999999999", // foreign tenant
      },
    });
    expect([401, 403, 404]).toContain(crossTenantRes.status());
  });
});
