import { test, expect } from "@playwright/test";

test("smoke — home page loads and shows HostelHub heading", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/HostelHub/i);
  await expect(page.getByRole("heading", { name: /HostelHub/i })).toBeVisible();
});
