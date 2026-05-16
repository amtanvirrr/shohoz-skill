import { test, expect, type Page } from "@playwright/test";

/**
 * Lightweight visual regression for layouts that pure class-string assertions
 * can't catch — e.g. a class that still typechecks but renders at the wrong
 * height, or a sibling component that pushes a row by a few pixels.
 *
 * Coverage:
 *  - Homepage featured sections (courses + books grids)
 *  - Course detail page hero card (skeleton + loaded)
 *  - Book detail page hero card (skeleton + loaded)
 *
 * Each runs once per device project (desktop / tablet / mobile) so snapshots
 * are responsive.
 */

// Mask elements that legitimately change between runs (counters, timestamps,
// auto-rotating media) so they don't generate noisy diffs.
const dynamicMasks = (page: Page) => [
  page.locator("[data-testid='view-count']"),
  page.locator("[data-testid='purchase-count']"),
  page.locator("video, [data-testid='hero-media']"),
];

const SCREENSHOT_OPTS = (page: Page) => ({
  animations: "disabled" as const,
  mask: dynamicMasks(page),
  // Tiny per-pixel tolerance absorbs anti-aliasing differences across OSes;
  // any structural shift (height/width/spacing) blows well past this.
  maxDiffPixelRatio: 0.02,
});

async function freezeAnimations(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}

test.describe("Homepage featured sections — visual regression", () => {
  for (const id of ["featured-courses", "featured-books"] as const) {
    test(`${id} grid matches baseline`, async ({ page }, testInfo) => {
      const device = testInfo.project.name;
      await page.goto("/", { waitUntil: "domcontentloaded" });
      // Prefer the stable test id; fall back to the id for backwards compat.
      const section = page.getByTestId(`${id}-section`);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      await page.waitForLoadState("networkidle");
      // Wait for any skeleton shimmer to detach.
      await section
        .locator(".shimmer, [aria-busy='true']")
        .first()
        .waitFor({ state: "detached", timeout: 15_000 })
        .catch(() => {});
      await freezeAnimations(page);

      await expect(section).toHaveScreenshot(
        `${id}-${device}.png`,
        SCREENSHOT_OPTS(page),
      );
    });
  }
});

test.describe("Product detail — visual regression", () => {
  for (const kind of [
    { name: "course", hrefSel: "a[href^='/course/']" },
    { name: "book", hrefSel: "a[href^='/book/']" },
  ] as const) {
    test(`${kind.name} detail page card layout (skeleton + loaded)`, async (
      { page },
      testInfo,
    ) => {
      const device = testInfo.project.name;

      // 1. Pick the first product link on the homepage to derive a real slug.
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      const href = await page.locator(kind.hrefSel).first().getAttribute("href");
      test.skip(!href, `no ${kind.name} product on homepage to navigate into`);

      // 2. Stall Supabase REST so the detail-page skeleton is what renders first.
      let release: () => void = () => {};
      const gate = new Promise<void>((r) => (release = r));
      await page.route(/\/rest\/v1\//, async (route) => {
        await gate;
        await route.continue();
      });

      await page.goto(href!, { waitUntil: "domcontentloaded" });
      const hero = page.getByTestId("product-hero");
      await expect(hero).toBeVisible();
      // The skeleton root carries aria-busy="true"; wait for it before snapping.
      await expect(hero).toHaveAttribute("aria-busy", "true", { timeout: 5_000 });
      await freezeAnimations(page);

      await expect(hero).toHaveScreenshot(
        `${kind.name}-detail-${device}-skeleton.png`,
        SCREENSHOT_OPTS(page),
      );

      // 3. Release the stall and wait for the real card to render.
      release();
      await page.waitForLoadState("networkidle");
      // Loaded state: the same product-hero node re-renders without aria-busy.
      const loadedHero = page.getByTestId("product-hero");
      await expect(loadedHero).not.toHaveAttribute("aria-busy", "true", { timeout: 15_000 });
      await page.locator("h1").first().waitFor({ timeout: 15_000 });
      await freezeAnimations(page);

      await expect(loadedHero).toHaveScreenshot(
        `${kind.name}-detail-${device}-loaded.png`,
        SCREENSHOT_OPTS(page),
      );
    });
  }
});