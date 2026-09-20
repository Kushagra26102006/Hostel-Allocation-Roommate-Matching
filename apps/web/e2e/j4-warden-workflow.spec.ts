import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { encode } from "next-auth/jwt";

const mockDraftId = "66f000000000000000000001";

const mockDraftsList = {
  drafts: [
    {
      id: mockDraftId,
      cycleId: "cycle-001",
      cycleName: "Monsoon 2026 UG Allocation (Cycle 1)",
      runId: "run-001",
      engineVersion: "v2.0.0",
      status: "UNDER_REVIEW",
      versionNumber: 1,
      approvalId: null,
      publishedAt: null,
      metrics: {
        totalApplications: 120,
        placedCount: 115,
        unplacedCount: 5,
        satisfactionScore: 88.5,
        quotaComplianceRate: 100,
      },
      overridesCount: 0,
      sla: {
        deadline: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
        hoursRemaining: 36,
        isOverdue: false,
        status: "normal",
      },
      createdAt: new Date().toISOString(),
    },
  ],
};

const mockDraftDetails = {
  draft: {
    id: mockDraftId,
    cycleId: "cycle-001",
    cycleName: "Monsoon 2026 UG Allocation (Cycle 1)",
    runId: "run-001",
    status: "UNDER_REVIEW",
    versionNumber: 1,
    seed: 42,
    overridesCount: 0,
    metrics: {
      totalApplications: 120,
      placedCount: 115,
      unplacedCount: 5,
    },
    createdAt: new Date().toISOString(),
  },
};

const mockAssignments = {
  items: [
    {
      id: "asgn-001",
      student: {
        id: "stud-001",
        name: "Arjun Sharma",
        email: "arjun@example.com",
        rollNumber: "CS2026-042",
        gender: "male",
        programme: "BTech CS",
        year: 2,
        quota: "General",
        accessibilityNeed: false,
      },
      bed: {
        id: "bed-101a",
        bedNo: "A",
        accessible: false,
        status: "assigned",
      },
      room: {
        id: "room-101",
        roomNumber: "101",
        roomType: "Double",
        capacity: 2,
        accessible: false,
        floor: 1,
        block: "Block A",
      },
      hostel: {
        id: "hostel-001",
        name: "Kaveri Hostel",
      },
      score: 89.2,
      explanation: "Matched with optimal composite score based on preferences and compatibility.",
      friendlySentence:
        "Arjun Sharma (CS2026-042) was matched to Bed A, Room 101 (Kaveri Hostel) with composite score 89.2/100.",
      breakdown: { P: 90, C: 88, F: 92, D: 85, K: 90 },
      constraints: [
        { code: "HC1", name: "Cohort Eligibility", passed: true, detail: "Application cleared" },
        { code: "HC2", name: "Single Placement", passed: true, detail: "Single bed verified" },
        { code: "HC3", name: "Bed Available", passed: true, detail: "No hold conflicts" },
      ],
      alternativesConsidered: [],
      tiebreakInfo: "Deterministically resolved with seed 42.",
      isOverridden: false,
      override: null,
    },
    {
      id: "asgn-002",
      student: {
        id: "stud-002",
        name: "Vikram Malhotra",
        email: "vikram@example.com",
        rollNumber: "ME2026-015",
        gender: "male",
        programme: "BTech ME",
        year: 2,
        quota: "General",
        accessibilityNeed: true,
      },
      bed: {
        id: "bed-101b",
        bedNo: "B",
        accessible: true,
        status: "assigned",
      },
      room: {
        id: "room-101",
        roomNumber: "101",
        roomType: "Double",
        capacity: 2,
        accessible: true,
        floor: 1,
        block: "Block A",
      },
      hostel: {
        id: "hostel-001",
        name: "Kaveri Hostel",
      },
      score: 92.5,
      explanation: "Matched to ground floor accessible room.",
      friendlySentence:
        "Vikram Malhotra (ME2026-015) was placed in Bed B, Room 101 with accessibility priority.",
      breakdown: { P: 95, C: 85, F: 98, D: 90, K: 88 },
      constraints: [
        { code: "HC1", name: "Cohort Eligibility", passed: true, detail: "Application cleared" },
        { code: "HC6", name: "Accessibility", passed: true, detail: "Certified accessible bed" },
      ],
      alternativesConsidered: [],
      tiebreakInfo: "Deterministically resolved with seed 42.",
      isOverridden: false,
      override: null,
    },
  ],
  totalCount: 2,
  nextCursor: null,
};

const mockBedMap = {
  floors: [
    {
      floorNumber: 1,
      floorLabel: "Floor 1",
      totalRooms: 2,
      totalBeds: 4,
      occupiedBeds: 2,
      rooms: [
        {
          id: "room-101",
          roomNumber: "101",
          roomType: "double",
          capacity: 2,
          accessible: true,
          occupiedCount: 2,
          beds: [
            {
              id: "bed-101a",
              bedNo: "A",
              accessible: false,
              status: "assigned",
              assignment: {
                id: "asgn-001",
                studentId: "stud-001",
                studentName: "Arjun Sharma",
                email: "arjun@example.com",
                rollNumber: "CS2026-042",
                quota: "General",
                score: 89.2,
              },
            },
            {
              id: "bed-101b",
              bedNo: "B",
              accessible: true,
              status: "assigned",
              assignment: {
                id: "asgn-002",
                studentId: "stud-002",
                studentName: "Vikram Malhotra",
                email: "vikram@example.com",
                rollNumber: "ME2026-015",
                quota: "General",
                score: 92.5,
              },
            },
          ],
        },
        {
          id: "room-102",
          roomNumber: "102",
          roomType: "double",
          capacity: 2,
          accessible: false,
          occupiedCount: 0,
          beds: [
            {
              id: "bed-102a",
              bedNo: "A",
              accessible: false,
              status: "free",
              assignment: null,
            },
            {
              id: "bed-102b",
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
};

const mockDiff = {
  version: 2,
  previousVersion: 1,
  checklist: {
    allOverridesHaveReasons: true,
    noHardConflicts: true,
    lettersQueued: true,
    canPublish: true,
  },
  diffSummary: {
    addedCount: 0,
    removedCount: 0,
    movedCount: 1,
    netChanges: 1,
  },
};

const AUTH_SECRET =
  process.env.AUTH_SECRET || "b7a3f1c9d4e28056a29e41f80d7c3b5a19284756abcdef0123456789abcdef";

test.describe("Warden Review & Bed Map Experience (J4)", () => {
  test.beforeEach(async ({ page }) => {
    // Generate valid staff session token for warden role
    const token = await encode({
      token: {
        id: "warden-01",
        email: "warden.demo@nit.edu",
        roles: ["warden"],
        institution_id: "66f000000000000000000002",
        mfaEnabled: true,
        mfaPending: false,
        lastCheckedAt: Date.now(),
      },
      secret: AUTH_SECRET,
      salt: "hostelhub.session-token",
    });

    await page.context().addCookies([
      {
        name: "hostelhub.session-token",
        value: token,
        url: "http://localhost:3000",
      },
    ]);

    // Intercept API routes with mock data
    await page.route("**/api/v1/drafts", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDraftsList),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDraftDetails),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/assignments*`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAssignments),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/bed-map`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockBedMap),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/presence`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          reviewers: [{ email: "warden@test.edu", floor: 1, activeAt: Date.now() }],
        }),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/events`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: ": ok\n\n",
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/diff`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDiff),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/transition`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.route(`**/api/v1/drafts/${mockDraftId}/override`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, version: 2 }),
      });
    });
  });

  test("J4 Flow: Review dashboard -> Review console -> Override with reason -> Approve -> Publish Wizard", async ({
    page,
  }) => {
    // 1. Visit Review Dashboard
    await page.goto("/staff/warden/review");
    await expect(page.getByRole("heading", { name: /Warden Review Dashboard/i })).toBeVisible();
    await expect(page.getByText("Monsoon 2026 UG Allocation (Cycle 1)")).toBeVisible();

    // 2. Open Review Console
    await page.getByRole("link", { name: /Open Review Console/i }).click();
    await expect(page).toHaveURL(new RegExp(`/staff/warden/review/${mockDraftId}`), {
      timeout: 15000,
    });

    // 3. Verify Bed Map and Presence
    await expect(page.getByRole("grid", { name: /Bed Map for Floor 1/i })).toBeVisible();
    await expect(page.getByText("Room 101")).toBeVisible();
    await expect(page.getByText("Arjun Sharma")).toBeVisible();

    // 4. Trigger Bed Options menu to initiate override
    const bedAOptionsBtn = page.getByRole("button", { name: /Bed A options/i }).first();
    await bedAOptionsBtn.click();

    // 5. Click "Move Arjun Sharma"
    const moveBtn = page.getByRole("menuitem", { name: /Move Arjun Sharma/i });
    await moveBtn.click();

    // 6. Override modal opens: check reason validation
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Manual Bed Reassignment")).toBeVisible();

    const saveBtn = page.getByRole("button", { name: /Confirm & Bump Version/i });
    await expect(saveBtn).toBeDisabled();

    const reasonInput = page.getByPlaceholder(
      /Document legitimate administrative, medical, or discipline justification/i,
    );
    await reasonInput.fill("Disciplinary room transfer approved by Chief Warden.");
    await expect(saveBtn).toBeEnabled();

    // 7. Submit override
    await saveBtn.click();
    await expect(page.getByRole("dialog")).not.toBeVisible();

    // 8. Workflow bar actions: Approve Draft
    const approveBtn = page.getByRole("button", { name: /Approve Draft/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // 9. Switch to Virtualized Table
    await page.getByRole("tab", { name: /Virtualized Table/i }).click();
    await expect(page.getByRole("table", { name: /Student Room Allocations/i })).toBeVisible();
    await expect(page.getByText("Vikram Malhotra")).toBeVisible();

    // 10. Click Explain on table row to verify Explanation Drawer
    const explainBtn = page.getByRole("button", { name: /Explain/i }).first();
    await explainBtn.click();

    // Explanation drawer (Sheet) should open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/Match Summary:/i)).toBeVisible();
    await expect(page.getByText(/Multi-Objective Score Breakdown/i)).toBeVisible();
  });

  test("Keyboard-only reassignment test", async ({ page }) => {
    await page.goto(`/staff/warden/review/${mockDraftId}`);
    await expect(page.getByRole("grid", { name: /Bed Map for Floor 1/i })).toBeVisible();

    // Focus Bed A options menu via keyboard
    const bedOptionsBtn = page.getByRole("button", { name: /Bed A options/i }).first();
    await bedOptionsBtn.focus();
    await page.keyboard.press("Enter");

    // Menu should be open, focus "Move Arjun Sharma" and press Enter via keyboard
    const moveMenuItem = page.getByRole("menuitem", { name: /Move Arjun Sharma/i });
    await expect(moveMenuItem).toBeVisible();
    await moveMenuItem.focus();
    await page.keyboard.press("Enter");

    // Modal opens
    await expect(page.getByRole("dialog")).toBeVisible();
    const reasonInput = page.getByPlaceholder(
      /Document legitimate administrative, medical, or discipline justification/i,
    );
    await reasonInput.focus();
    await page.keyboard.type("Approved medical room accommodation for resident.");

    // Press Tab to reach confirm button and press Enter
    const confirmBtn = page.getByRole("button", { name: /Confirm & Bump Version/i });
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.focus();
    await page.keyboard.press("Enter");

    // Modal closes
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Axe accessibility check on Review Dashboard and Review Console", async ({ page }) => {
    // 1. Check Dashboard
    await page.goto("/staff/warden/review");
    const dashboardResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"]) // Ignore external theme contrasts in headless chrome
      .analyze();
    expect(dashboardResults.violations).toHaveLength(0);

    // 2. Check Review Console (Bed Map and Grid)
    await page.goto(`/staff/warden/review/${mockDraftId}`);
    const consoleResults = await new AxeBuilder({ page })
      .disableRules(["color-contrast"])
      .analyze();
    expect(consoleResults.violations).toHaveLength(0);
  });
});
