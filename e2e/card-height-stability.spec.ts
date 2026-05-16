import { test, expect, type Page } from "@playwright/test";

/**
 * Responsive card-height stability: the entire featured card (image + body)
 * must keep the same rendered height between the skeleton and the loaded
 * state at every breakpoint. Playwright's `projects` (desktop / tablet /
 * mobile) in playwright.config.ts run each test once per device, so the
 * `${testInfo.project.name}` snapshots give us full responsive coverage.
 *
 * If a height diverges, BYLINE_LAYOUT_CLASS / CARD_TITLE_CLASS /
 * CARD_DESCRIPTION_CLASS in src/lib/cardStyles.ts (or the matching skeleton)
 * has drifted and will cause CLS on data load at that breakpoint.
 */

const SECTIONS = [
  { id: "featured-courses", label: "courses" },
  { id: "featured-books", label: "books" },
] as const;

// Per-breakpoint tolerance: tablet/mobile renders sometimes round image
// dimensions by ±1px due to fractional layout; >2px means a real layout drift.
const HEIGHT_TOLERANCE_PX = 2;

async function firstCardHeight(page: Page, sectionId: string): Promise<number> {
  return page.evaluate((id) => {
    const section = document.getElementById(id);
    if (!section) return -1;
    // Skeleton wrappers and loaded <Link> cards both sit as direct children
    // of the section's grid/scroller. Measure the first real card-shaped
    // descendant — the one containing the byline.
    const byline = section.querySelector<HTMLElement>("[data-testid='card-byline']");
    if (!byline) return -1;
    const card = byline.closest<HTMLElement>(
      "a, [class*='glass-card'], [class*='rounded-xl'], [class*='rounded-2xl']",
    );
    return card ? Math.round(card.getBoundingClientRect().height) : -1;
  }, sectionId);
}

test.describe("Responsive card-height stability (skeleton ↔ loaded)", () => {
  for (const { id, label } of SECTIONS) {
    test(`${label}: card height matches between skeleton and loaded`, async (
      { page },
      testInfo,
    ) => {
      const device = testInfo.project.name; // desktop | tablet | mobile

      // 1. Stall Supabase REST so the skeleton is what renders first.
      let release: () => void = () => {};
      const gate = new Promise<void>((r) => (release = r));
      await page.route(/\/rest\/v1\//, async (route) => {
        await gate;
        await route.continue();
      });

      await page.goto("/", { waitUntil: "domcontentloaded" });
      const section = page.locator(`#${id}`);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();

      // Wait one frame so the skeleton lays out at this viewport.
      await page.waitForTimeout(50);
      const skeletonHeight = await firstCardHeight(page, id);
      expect(skeletonHeight, "skeleton card must render at this breakpoint").toBeGreaterThan(0);

      await expect(section).toHaveScreenshot(
        `${label}-${device}-skeleton.png`,
        { animations: "disabled" },
      );

      // 2. Release the stall and wait for real data.
      release();
      await page.waitForLoadState("networkidle");
      await section
        .locator(".shimmer")
        .first()
        .waitFor({ state: "detached", timeout: 15_000 })
        .catch(() => {});

      const loadedHeight = await firstCardHeight(page, id);
      expect(loadedHeight, "loaded card must render at this breakpoint").toBeGreaterThan(0);

      await expect(section).toHaveScreenshot(
        `${label}-${device}-loaded.png`,
        { animations: "disabled" },
      );

      // 3. The whole-card height must match across the swap.
      expect(
        Math.abs(loadedHeight - skeletonHeight),
        `[${device}] ${label}: card height drifted ${skeletonHeight}px → ${loadedHeight}px ` +
          "(check BYLINE_LAYOUT_CLASS / CARD_TITLE_CLASS in src/lib/cardStyles.ts)",
      ).toBeLessThanOrEqual(HEIGHT_TOLERANCE_PX);
    });
  }
});