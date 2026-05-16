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
      const section = page.getByTestId(`${id}-section`);
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      // Wait for explicit loaded-state signals instead of networkidle, which
      // is flaky on pages with long-lived connections (analytics, websockets,
      // image lazy-loading). The section is "ready" once:
      //   1. all skeleton/aria-busy nodes inside it have detached, and
      //   2. at least one real product link has rendered.
      const productHref = id === "featured-courses" ? "/course/" : "/book/";
      await expect
        .poll(
          async () =>
            (await section.locator("[aria-busy='true'], .shimmer").count()) === 0,
          { timeout: 15_000, message: `${id} skeletons never detached` },
        )
        .toBe(true);
      await section
        .locator(`a[href^='${productHref}']`)
        .first()
        .waitFor({ state: "visible", timeout: 15_000 });
      // Ensure any images inside the section have decoded so layout is final.
      await section.evaluate(async (el) => {
        const imgs = Array.from(el.querySelectorAll("img"));
        await Promise.all(
          imgs.map((img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true });
                  img.addEventListener("error", () => resolve(), { once: true });
                }),
          ),
        );
      });
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
      // Wait for a product link to actually render instead of networkidle.
      const firstLink = page.locator(kind.hrefSel).first();
      await firstLink.waitFor({ state: "attached", timeout: 15_000 }).catch(() => {});
      const href = await firstLink.getAttribute("href").catch(() => null);
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
      // Loaded state: the product-hero node re-renders without aria-busy and
      // its real content (h1 title + primary CTA) is mounted. We deliberately
      // avoid waitForLoadState("networkidle") — Supabase realtime and image
      // CDNs keep connections open and make it unreliable.
      const loadedHero = page.getByTestId("product-hero");
      await expect(loadedHero).not.toHaveAttribute("aria-busy", "true", {
        timeout: 15_000,
      });
      await loadedHero.locator("h1").first().waitFor({
        state: "visible",
        timeout: 15_000,
      });
      // Wait for hero images inside the loaded card to decode.
      await loadedHero.evaluate(async (el) => {
        const imgs = Array.from(el.querySelectorAll("img"));
        await Promise.all(
          imgs.map((img) =>
            img.complete && img.naturalWidth > 0
              ? Promise.resolve()
              : new Promise<void>((resolve) => {
                  img.addEventListener("load", () => resolve(), { once: true });
                  img.addEventListener("error", () => resolve(), { once: true });
                }),
          ),
        );
      });
      await freezeAnimations(page);

      await expect(loadedHero).toHaveScreenshot(
        `${kind.name}-detail-${device}-loaded.png`,
        SCREENSHOT_OPTS(page),
      );
    });
  }
});