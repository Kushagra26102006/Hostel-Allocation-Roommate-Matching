import { type Page, expect } from "@playwright/test";

export class ResultAppealsPage {
  constructor(public readonly page: Page) {}

  async gotoRoom() {
    await this.page.goto("/room");
    await expect(this.page.getByRole("heading", { name: /Room & Bed Allotment/i })).toBeVisible();
  }

  async expectResultLoaded() {
    await expect(this.page.getByText(/Allocation Results Live/i)).toBeVisible();
    await expect(this.page.getByText(/Aryabhata Hall/i)).toBeVisible();
  }

  async openAppealDialog() {
    const appealBtn = this.page.getByRole("button", { name: /File an Appeal/i });
    await expect(appealBtn).toBeVisible();
    await appealBtn.click();
  }

  async submitAppeal(description: string) {
    const textarea = this.page.locator('textarea[placeholder*="grounds for appeal"]');
    await expect(textarea).toBeVisible();
    await textarea.fill(description);

    const submitBtn = this.page.getByRole("button", { name: /Submit Grievance to Committee/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
  }

  async expectAppealRegistered() {
    await expect(this.page.getByText(/Appeal Registered/i)).toBeVisible({ timeout: 10000 });
  }

  async gotoVerify(token: string) {
    await this.page.goto(`/verify/${token}`);
    await expect(
      this.page.getByRole("heading", { name: /Hostel Allocation Verification/i }),
    ).toBeVisible();
  }

  async expectVerificationResult(valid: boolean) {
    if (valid) {
      await expect(this.page.getByText(/Digitally Verified/i)).toBeVisible({ timeout: 10000 });
    } else {
      await expect(this.page.getByText(/Verification Failed|Invalid/i)).toBeVisible({
        timeout: 10000,
      });
    }
  }
}
