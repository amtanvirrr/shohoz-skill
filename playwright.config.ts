import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for visual regression of featured card byline heights.
 * Run locally:
 *   bun add -D @playwright/test
 *   bunx playwright install chromium
 *   bunx playwright test
 * Update baselines: bunx playwright test --update-snapshots
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:8080",
        reuseExistingServer: true,
        timeout: 120_000,
      },
  expect: {
    // Allow a tiny diff for font anti-aliasing differences across machines.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "tablet",  use: { ...devices["iPad (gen 7)"] } },
    { name: "mobile",  use: { ...devices["iPhone 13"] } },
  ],
});