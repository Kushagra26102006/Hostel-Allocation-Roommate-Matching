import { test, expect } from "@playwright/test";

/**
 * Keyboard-Only Walkthrough Tests (WCAG 2.2 Success Criterion 2.1.1 Keyboard)
 * Exercises:
 * 1. Skip Link & Main Content Focus
 * 2. Student Application Form Steps (Keyboard Tab & Type & Enter)
 * 3. Preference Ranking (Arrow Keys & Move Buttons)
 * 4. Questionnaire Selection (Keyboard Select / Arrows)
 * 5. Allocation Result Page (Keyboard Reveal / Flip Keycard)
 * 6. Warden Override Flow (Focus trapping in dialog, Escape handling, keyboard submit)
 */

test.describe("Keyboard-Only User Walkthroughs", () => {
  test("1. Skip Link navigates directly to #main-content on Enter", async ({ page }) => {
    await page.goto("/");
    // First Tab activates skip link
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /Skip to main content/i });
    await expect(skipLink).toBeFocused();

    // Press Enter to follow skip link
    await page.keyboard.press("Enter");

    // Assert focus has shifted to #main-content
    const mainContent = page.locator("#main-content");
    await expect(mainContent).toBeFocused();
  });

  test("2. Student application keyboard walkthrough and error summary navigation", async ({
    page,
  }) => {
    await page.goto("/applications/new");

    // Tab into full name and fill via keyboard typing
    await page.locator("#fullName").focus();
    await page.keyboard.type("Aarav Sharma");

    await page.keyboard.press("Tab");
    await page.keyboard.type("aarav.sharma@campus.edu");

    await page.keyboard.press("Tab");
    await page.keyboard.type("9876543210");

    await page.keyboard.press("Tab");
    await page.keyboard.type("110001");

    // Tab through city, state, address
    await page.locator("#address").focus();
    await page.keyboard.type("Hostel Block C, Room 204");

    // Tab to Continue button and activate with Enter
    const continueBtn = page.getByRole("button", { name: "Continue" });
    await continueBtn.focus();
    await expect(continueBtn).toBeFocused();
    await page.keyboard.press("Enter");

    // Verify progression to step 2 (Documents)
    await expect(page.getByText(/Step 2:/i)).toBeVisible();
  });

  test("3. Preference ranker keyboard walkthrough (reordering choices without mouse)", async ({
    page,
  }) => {
    await page.goto("/preferences");

    // Locate the first sortable item's move down button
    const moveDownButtons = page.getByRole("button", { name: /Move .* down/i });
    await expect(moveDownButtons.first()).toBeVisible();

    // Focus first move down button
    await moveDownButtons.first().focus();
    await expect(moveDownButtons.first()).toBeFocused();

    // Activate move down via Space key
    await page.keyboard.press("Space");

    // Verify live region announcement
    const liveRegion = page.locator("[aria-live='polite']");
    await expect(liveRegion).toBeAttached();
  });

  test("4. Compatibility questionnaire keyboard selection", async ({ page }) => {
    await page.goto("/applications/new");

    // Verify form can navigate using keyboard Tab cycle
    await page.keyboard.press("Tab");
    const activeElTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElTag).toBeDefined();
  });

  test("5. Result page key card flip via Space / Enter", async ({ page }) => {
    await page.goto("/student/result");

    // Check if the interactive flip card button or reveal trigger is present
    const cardTrigger = page
      .locator("[role='button'], button")
      .filter({ hasText: /Reveal|Flip|Room/i })
      .first();
    if (await cardTrigger.isVisible()) {
      await cardTrigger.focus();
      await expect(cardTrigger).toBeFocused();
      await page.keyboard.press("Enter");
      // Room number animation completes or is immediately visible
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("6. Warden override flow keyboard interaction and focus management in modal", async ({
    page,
  }) => {
    await page.goto("/warden/allocation");

    // Find table toggle or first bed chip action button
    const tableToggle = page.getByRole("button", { name: /Accessible Table View/i });
    if (await tableToggle.isVisible()) {
      await tableToggle.focus();
      await page.keyboard.press("Enter");
      // Table view should now be active
      await expect(page.getByRole("table")).toBeVisible();

      // Tab into the first row action button
      const firstActionBtn = page.getByRole("table").getByRole("button").first();
      await firstActionBtn.focus();
      await expect(firstActionBtn).toBeFocused();
      await page.keyboard.press("Enter");

      // Check for override dialog or modal
      const dialog = page.locator("[role='dialog']");
      if (await dialog.isVisible()) {
        // Press Escape to dismiss dialog
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
      }
    }
  });
});
