import { type Page, expect } from "@playwright/test";

export class StudentApplicationPage {
  constructor(public readonly page: Page) {}

  async gotoNew(cycleId = "demo-cycle-2026") {
    await this.page.goto(`/applications/new?cycleId=${cycleId}`);
    await expect(
      this.page.getByRole("heading", { name: /Hostel Allocation Application/i }),
    ).toBeVisible();
  }

  async gotoEligibility(applicationId: string) {
    await this.page.goto(`/applications/${applicationId}/eligibility`);
    await expect(
      this.page.getByRole("heading", { name: /Eligibility Verification Results/i }),
    ).toBeVisible();
  }

  async expectEligibilityFailure(reasonSubstring: string) {
    const errorCard = this.page.locator(".border-rose-500\\/30");
    await expect(errorCard).toBeVisible();
    await expect(errorCard).toContainText(new RegExp(reasonSubstring, "i"));
  }

  async clickHowToFix() {
    const howToFixBtn = this.page.getByRole("button", { name: /how to fix/i });
    await expect(howToFixBtn).toBeVisible();
    await howToFixBtn.click();
  }

  async fillProfile(data: {
    fullName: string;
    email: string;
    phone: string;
    pincode: string;
    city: string;
    state: string;
    address: string;
  }) {
    await this.page.locator('input[placeholder*="Aarav Sharma"]').fill(data.fullName);
    await this.page.locator('input[placeholder*="aarav@nit.edu"]').fill(data.email);
    await this.page.locator('input[placeholder*="9876543210"]').fill(data.phone);
    await this.page.locator('input[placeholder*="110001"]').fill(data.pincode);
    await this.page.locator('input[placeholder*="New Delhi"]').fill(data.city);
    await this.page.locator('input[placeholder*="Delhi"]').fill(data.state);
    await this.page.locator('textarea[placeholder*="Hostel Avenue"]').fill(data.address);
  }

  async nextStep() {
    await this.page.getByRole("button", { name: /next step/i }).click();
  }

  async prevStep() {
    await this.page.getByRole("button", { name: /previous step/i }).click();
  }

  async submitApplication() {
    const submitBtn = this.page.getByRole("button", { name: /submit application/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
  }

  async expectSubmissionReceipt() {
    await expect(this.page.getByText(/Application Submitted!/i)).toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText(/Reference Number:/i)).toBeVisible();
  }
}
