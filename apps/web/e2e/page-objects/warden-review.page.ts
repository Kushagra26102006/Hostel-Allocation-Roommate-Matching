import { type Page, expect } from "@playwright/test";

export class WardenReviewPage {
  constructor(public readonly page: Page) {}

  async gotoDashboard() {
    await this.page.goto("/staff/warden/review");
    await expect(
      this.page.getByRole("heading", { name: /Warden Review Dashboard/i }),
    ).toBeVisible();
  }

  async openConsole(draftId: string) {
    await this.page.goto(`/staff/warden/review/${draftId}`);
    await expect(this.page.getByText(/Interactive Bed Map/i)).toBeVisible();
  }

  async selectAssignedBed(bedNo = "A") {
    const bed = this.page.getByRole("button", { name: new RegExp(`Bed ${bedNo}`, "i") });
    await expect(bed).toBeVisible();
    await bed.click();
  }

  async openOverrideDialog() {
    const overrideBtn = this.page.getByRole("button", { name: /Manual Override/i });
    await expect(overrideBtn).toBeVisible();
    await overrideBtn.click();
  }

  async fillOverrideReason(reason: string) {
    const textarea = this.page.locator('textarea[placeholder*="Reason"]');
    await expect(textarea).toBeVisible();
    await textarea.fill(reason);
  }

  async submitOverride() {
    const applyBtn = this.page.getByRole("button", { name: /Apply Override/i });
    await expect(applyBtn).toBeVisible();
    await applyBtn.click();
  }

  async expectConflictError() {
    await expect(this.page.locator("text=/Version conflict/i")).toBeVisible();
  }

  async submitForApproval() {
    const submitBtn = this.page.getByRole("button", { name: /Submit for Approval/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();
  }

  async approveDraft() {
    const approveBtn = this.page.getByRole("button", { name: /Approve Draft/i });
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();
  }

  async openPublishModal() {
    const publishBtn = this.page.getByRole("button", { name: /Publish Allocation/i });
    await expect(publishBtn).toBeVisible();
    await publishBtn.click();
  }

  async expectPublishDisabledOrHidden() {
    const publishBtn = this.page.getByRole("button", { name: /Publish Allocation/i });
    if (await publishBtn.isVisible()) {
      await expect(publishBtn).toBeDisabled();
    } else {
      expect(await publishBtn.isVisible()).toBeFalsy();
    }
  }
}
