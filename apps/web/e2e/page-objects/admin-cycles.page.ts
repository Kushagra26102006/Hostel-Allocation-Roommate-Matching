import { type Page, expect } from "@playwright/test";

export class AdminCyclesPage {
  constructor(public readonly page: Page) {}

  async gotoInventory() {
    await this.page.goto("/staff/admin/inventory");
    await expect(
      this.page.getByRole("heading", { name: /Hostel & Room Inventory/i }),
    ).toBeVisible();
  }

  async openImportWizard() {
    const importBtn = this.page.getByRole("button", { name: /Import CSV/i });
    await expect(importBtn).toBeVisible();
    await importBtn.click();
  }

  async expectImportWizardOpen() {
    await expect(
      this.page.getByRole("heading", { name: /Bulk Inventory Importer/i }),
    ).toBeVisible();
  }

  async gotoCycles() {
    await this.page.goto("/staff/admin/cycles");
    await expect(this.page.getByRole("heading", { name: /Allocation Cycle Setup/i })).toBeVisible();
  }

  async fillCycleDetails(name: string, academicYear: string) {
    const nameInput = this.page.locator('input[placeholder*="Monsoon 2026"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill(name);
    }
    const yearInput = this.page.locator('input[placeholder*="2026-2027"]');
    if (await yearInput.isVisible()) {
      await yearInput.fill(academicYear);
    }
  }

  async expectLiveProgressVisible() {
    await expect(
      this.page.getByText(/Allocation Progress|Stage timeline|Running Allocation/i),
    ).toBeVisible();
  }
}
