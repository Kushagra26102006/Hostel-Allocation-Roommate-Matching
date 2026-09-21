import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * WCAG 2.2 AA Accessibility Audit across Themes and Reduced-Motion Settings
 * Requirements:
 * - Visit pages in both themes (light & dark)
 * - Visit pages in both reduced-motion settings (reduce & no-preference)
 * - Zero critical violations allowed
 */

const TEST_ROUTES = [
  { name: "Home Landing", path: "/" },
  { name: "Student Application Draft", path: "/applications/new" },
  { name: "Hostel Preference Ranking", path: "/preferences" },
  { name: "Allocation Result", path: "/student/result" },
  { name: "Warden Bed Allocation Map", path: "/warden/allocation" },
  { name: "Admin What-If Simulator", path: "/admin/simulator" },
  { name: "PWA Offline Page", path: "/offline" },
];

const THEMES: Array<"light" | "dark"> = ["light", "dark"];
const MOTION_SETTINGS: Array<"no-preference" | "reduce"> = ["no-preference", "reduce"];

test.describe("WCAG 2.2 AA Accessibility Audits (Axe-Core)", () => {
  for (const route of TEST_ROUTES) {
    for (const theme of THEMES) {
      for (const motion of MOTION_SETTINGS) {
        test(`${route.name} (${route.path}) — theme: ${theme}, motion: ${motion}`, async ({
          page,
        }) => {
          // 1. Emulate colorScheme and reducedMotion at browser media level
          await page.emulateMedia({
            colorScheme: theme,
            reducedMotion: motion,
          });

          // 2. Set theme in localStorage before navigating
          await page.addInitScript((val) => {
            window.localStorage.setItem("theme", val);
          }, theme);

          // 3. Navigate to route
          const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
          expect(response?.status()).toBeLessThan(500);

          // 4. Force theme class on document element for complete fidelity
          await page.evaluate((val) => {
            if (val === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }, theme);

          // Wait a tick for styles and hydration
          await page.waitForTimeout(300);

          // 5. Run Axe Analysis with WCAG 2.2 AA tags
          const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
            // Exclude third-party canvas or animations if any
            .exclude("iframe")
            .analyze();

          // 6. Assert zero critical violations allowed
          const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === "critical",
          );

          if (criticalViolations.length > 0) {
            console.error(
              `Critical a11y violations on ${route.path} (${theme}/${motion}):`,
              JSON.stringify(criticalViolations, null, 2),
            );
          }

          expect(criticalViolations).toEqual([]);
        });
      }
    }
  }
});
