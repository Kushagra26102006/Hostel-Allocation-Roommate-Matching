import { test, expect } from "@playwright/test";
import { loginAsRole } from "./fixtures/auth.fixture";
import { SYNTHETIC_SEED } from "./fixtures/synthetic.fixture";
import { StudentApplicationPage } from "./page-objects/student-application.page";
import { PreferencesGroupPage } from "./page-objects/preferences-group.page";
import { AdminCyclesPage } from "./page-objects/admin-cycles.page";

test.describe("Critical Journeys: J1 to J3", () => {
  test.describe.configure({ mode: "parallel" });

  test("J1: Student applies, fails eligibility with readable reason, corrects and resubmits", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    const appPage = new StudentApplicationPage(page);

    const mockAppId = "app-syn-001";

    // 1. Visit eligibility page where student initially fails with a readable reason
    await appPage.gotoEligibility(mockAppId);
    await appPage.expectEligibilityFailure(
      "Your fee category or income document is not yet verified",
    );

    // 2. Click "How to fix" to navigate to the application correction flow
    await appPage.clickHowToFix();
    await expect(page).toHaveURL(new RegExp("/applications/new\\?step=1"));

    // 3. Complete application form steps
    // Step 0: Profile
    await page.goto("/applications/new?cycleId=demo-cycle-2026");

    // Mock application create/submit endpoints
    await page.route("**/api/v1/applications", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ _id: mockAppId, version: 1 }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/v1/applications/${mockAppId}/submit`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Application submitted successfully",
          reference_number: "APP-2026-NIT-0042",
          submitted_at: new Date().toISOString(),
          status: "submitted",
        }),
      });
    });

    await appPage.fillProfile({
      fullName: "Aarav Sharma",
      email: "aarav.sharma@nit.edu",
      phone: "9876543210",
      pincode: "110001",
      city: "New Delhi",
      state: "Delhi",
      address: "123 Campus Residency, Sector 4",
    });

    // Advance through steps
    await appPage.nextStep(); // to Documents (Step 1)
    await appPage.nextStep(); // to Preferences (Step 2)
    await appPage.nextStep(); // to Questionnaire (Step 3)
    await appPage.nextStep(); // to Review & Submit (Step 4)

    // 4. Submit application and verify receipt
    await appPage.submitApplication();
    await appPage.expectSubmissionReceipt();
  });

  test("J2: Student ranks preferences, forms a group, completes and later deletes the questionnaire", async ({
    page,
  }) => {
    await loginAsRole(page, "student");
    const prefPage = new PreferencesGroupPage(page);

    const mockAppId = "app-syn-002";

    // Mock preference save and group endpoints
    await page.route(`**/api/v1/applications/${mockAppId}/preferences`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, count: 4 }),
      });
    });

    await page.route("**/api/v1/groups", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            _id: "grp-001",
            group_name: "Turing House Coders",
            invite_code: "TUR-42",
            status: "draft",
            members: [{ student_id: "usr_student", status: "accepted", role: "leader" }],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ groups: [] }),
        });
      }
    });

    await page.route("**/api/v1/me/questionnaire", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ hasSubmitted: true, answers: { sleep: 2, study: 1 } }),
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Questionnaire data permanently deleted.",
          }),
        });
      } else {
        await route.continue();
      }
    });

    // 1. Visit Preferences and Ranking
    await prefPage.gotoPreferences(mockAppId);
    await prefPage.expectRankingsVisible();

    // 2. Form a roommate group
    await prefPage.switchToGroupTab();
    await prefPage.createGroup("Turing House Coders");

    // 3. Visit Roommate questionnaire & complete
    await prefPage.gotoRoommate();
    await prefPage.switchToSurveyTab();
    await prefPage.completeQuestionnaire();

    // 4. Delete questionnaire from Privacy Centre
    await prefPage.switchToPrivacyTab();
    await prefPage.deleteQuestionnaire();
    await prefPage.expectQuestionnaireDeleted();
  });

  test("J3: Administrator imports inventory, configures a cycle, runs allocation and watches live progress", async ({
    page,
  }) => {
    await loginAsRole(page, "hostel_admin");
    const adminPage = new AdminCyclesPage(page);

    const mockRunId = "run-syn-42";

    // Mock runs events SSE stream
    await page.route(`**/api/v1/runs/${mockRunId}/events`, async (route) => {
      const ssePayload = [
        `data: ${JSON.stringify({
          runId: mockRunId,
          stageCode: "matching",
          stageLabel: "Optimization & Matching",
          percent: 65,
          message: "Computing Gale-Shapley stable matching with seed " + SYNTHETIC_SEED,
          completed: false,
          timestamp: new Date().toISOString(),
        })}\n\n`,
        `data: ${JSON.stringify({
          runId: mockRunId,
          stageCode: "completed",
          stageLabel: "Allocation Completed",
          percent: 100,
          message: "120 beds allocated successfully.",
          completed: true,
          timestamp: new Date().toISOString(),
        })}\n\n`,
      ].join("");

      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body: ssePayload,
      });
    });

    // 1. Inventory page & Import wizard
    await adminPage.gotoInventory();
    await adminPage.openImportWizard();
    await adminPage.expectImportWizardOpen();

    // 2. Cycle configuration wizard
    await adminPage.gotoCycles();
    await adminPage.fillCycleDetails("Monsoon 2026 UG Allocation", "2026-2027");

    // 3. Review live progress component
    await page.goto("/staff/warden/review");
    await adminPage.expectLiveProgressVisible();
  });
});
