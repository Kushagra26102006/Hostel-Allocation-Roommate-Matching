import { type Page, expect } from "@playwright/test";

export class PreferencesGroupPage {
  constructor(public readonly page: Page) {}

  async gotoPreferences(applicationId: string) {
    await this.page.goto(`/applications/${applicationId}/preferences`);
    await expect(this.page.getByRole("tab", { name: /Rank Hostel Preferences/i })).toBeVisible();
  }

  async expectRankingsVisible() {
    await expect(
      this.page.getByRole("heading", { name: /Hostel Preference Ranking/i }),
    ).toBeVisible();
    await expect(this.page.getByText("Rabindranath Tagore Hostel")).toBeVisible();
  }

  async switchToGroupTab() {
    await this.page.getByRole("tab", { name: /Roommate Group Builder/i }).click();
    await expect(this.page.getByRole("heading", { name: /Roommate Group Builder/i })).toBeVisible();
  }

  async createGroup(name: string) {
    const input = this.page.locator('input[placeholder*="Roommate group name"]');
    await input.fill(name);
    await this.page.getByRole("button", { name: /create group/i }).click();
  }

  async gotoRoommate() {
    await this.page.goto("/roommate");
    await expect(
      this.page.getByRole("heading", { name: /Roommate Compatibility Portal/i }),
    ).toBeVisible();
  }

  async switchToSurveyTab() {
    await this.page.getByRole("button", { name: /Questionnaire/i }).click();
    await expect(
      this.page.getByRole("heading", { name: /Lifestyle Preferences Questionnaire/i }),
    ).toBeVisible();
  }

  async completeQuestionnaire() {
    // Answer questionnaire items by clicking first available option for each question
    for (let i = 0; i < 7; i++) {
      const optionButtons = this.page.locator(".grid button");
      if ((await optionButtons.count()) > 0) {
        await optionButtons.first().click();
        const nextBtn = this.page.getByRole("button", { name: /next/i });
        if (await nextBtn.isVisible()) {
          await nextBtn.click();
        }
      }
    }
  }

  async switchToPrivacyTab() {
    await this.page.getByRole("button", { name: /Privacy & Encryption/i }).click();
    await expect(
      this.page.getByRole("heading", { name: /Privacy & Consent Centre/i }),
    ).toBeVisible();
  }

  async deleteQuestionnaire() {
    const deleteBtn = this.page.getByRole("button", { name: /delete & revoke/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Confirm in dialog
    const confirmBtn = this.page.getByRole("button", { name: /confirm hard deletion/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();
  }

  async expectQuestionnaireDeleted() {
    await expect(
      this.page.getByText(/answers and cryptographic vectors permanently purged/i),
    ).toBeVisible();
  }
}
