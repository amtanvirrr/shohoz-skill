import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression: ensure the featured course/book cards keep an identical
 * byline (instructor / author) height in both the skeleton and the loaded
 * state. A drift here means BYLINE_LAYOUT_CLASS in src/lib/cardStyles.ts is
 * out of sync between the skeleton and card components and will cause CLS
 * during data load.
 *
 * Strategy:
 *   1. Stall every Supabase REST call so the page renders the skeleton.
 *      Screenshot + measure each section.
 *   2. Release the stall, wait for real cards, screenshot + measure again.
 *   3. Assert byline heights match between the two states.
 */

const SECTIONS = [
  { id: "featured-courses", bylineSelector: '[data-testid="card-byline"], p.line-clamp-2.break-words' },
  { id: "featured-books",   bylineSelector: '[data-testid="card-byline"], p.line-clamp-2.break-words' },
] as const;

async function firstBylineHeight(page: Page, sectionId: string): Promise<number> {
  return page.evaluate((id) => {
    const section = document.getElementById(id);
    if (!section) return -1;
    // Match the BYLINE_LAYOUT_CLASS signature (responsive min-h + line-clamp).
    const el = section.querySelector<HTMLElement>(
      "[data-testid='card-byline'], p.line-clamp-2.break-words, p.line-clamp-1.break-words"
    );
    return el ? Math.round(el.getBoundingClientRect().height) : -1;
  }, sectionId);
}

test.describe("Featured card byline height stability", () => {
  for (const { id } of SECTIONS) {
    test(`${id}: skeleton vs loaded byline height matches`, async ({ page }, testInfo) => {
      // 1. Stall Supabase REST so we render the skeleton state.
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

      const skeletonHeight = await firstBylineHeight(page, id);
      expect(skeletonHeight, "skeleton byline element must exist").toBeGreaterThan(0);
      await expect(section).toHaveScreenshot(`${id}-${testInfo.project.name}-skeleton.png`, {
        animations: "disabled",
      });

      // 2. Let real data through and wait for the loaded state.
      release();
      await page.waitForLoadState("networkidle");
      // Skeletons use `.shimmer`; loaded cards do not.
      await section.locator(".shimmer").first().waitFor({ state: "detached", timeout: 15_000 }).catch(() => {});

      const loadedHeight = await firstBylineHeight(page, id);
      expect(loadedHeight, "loaded byline element must exist").toBeGreaterThan(0);
      await expect(section).toHaveScreenshot(`${id}-${testInfo.project.name}-loaded.png`, {
        animations: "disabled",
      });

      // 3. Heights must match exactly — that is the whole point of
      //    BYLINE_LAYOUT_CLASS in src/lib/cardStyles.ts.
      expect(loadedHeight).toBe(skeletonHeight);
    });
  }
});