# Playwright visual regression

These specs guard against byline (instructor/author) height drift between the
skeleton and loaded states of the featured course/book cards on the homepage.

## One-time setup

```bash
bun add -D @playwright/test
bunx playwright install chromium
```

## Run

```bash
# Uses the dev server at http://localhost:8080 (auto-started)
bunx playwright test

# Or point at a deployed preview / published URL
PLAYWRIGHT_BASE_URL=https://shohozskill.lovable.app bunx playwright test
```

## Update baselines

After an intentional visual change:

```bash
bunx playwright test --update-snapshots
```

The spec also asserts that the byline element height in pixels is identical
between the skeleton and the loaded card. If that assertion fails, the
`BYLINE_LAYOUT_CLASS` constant in `src/lib/cardStyles.ts` is out of sync
between `Byline.tsx`, `FeaturedCardSkeleton.tsx`, and `ProductCardSkeleton.tsx`.