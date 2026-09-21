import { type Page, expect } from "@playwright/test";

export class WaitlistPromotionPage {
  constructor(public readonly page: Page) {}

  async gotoWaitlist() {
    await this.page.goto("/staff/warden/waitlist");
    await expect(
      this.page.getByRole("heading", { name: /Waitlist Operations & Dynamic Promotions/i }),
    ).toBeVisible();
  }

  async openVacateBedModal() {
    const vacateBtn = this.page.getByRole("button", { name: /Mark Bed Vacated/i });
    await expect(vacateBtn).toBeVisible();
    await vacateBtn.click();
  }

  async submitVacate(bedId: string, reason: string) {
    const bedSelect = this.page.locator("#vacate-bed");
    if (await bedSelect.isVisible()) {
      await bedSelect.fill(bedId);
    }
    const reasonInput = this.page.locator("#vacate-reason");
    if (await reasonInput.isVisible()) {
      await reasonInput.fill(reason);
    }
    const confirmBtn = this.page.getByRole("button", { name: /Vacate & Promote/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
  }

  async expectPromotionSuccess() {
    await expect(this.page.getByText(/Bed vacated: student promoted automatically/i)).toBeVisible({
      timeout: 10000,
    });
  }

  async expectOccupancyReconciled() {
    await expect(this.page.getByText(/Active Queue Candidates/i)).toBeVisible();
  }
}
