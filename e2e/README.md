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

## Visual regression specs

- `featured-cards-byline.spec.ts` — byline height parity (pixel assertions).
- `card-height-stability.spec.ts` — full-card height parity skeleton ↔ loaded.
- `visual-regression.spec.ts` — **screenshot baselines** for the homepage
  featured grids and the course/book detail hero cards (both skeleton and
  loaded states) at desktop, tablet, and mobile. Catches layout shifts that
  still typecheck — e.g. a wrong-but-valid Tailwind class that renders at the
  wrong height. Update with `bunx playwright test --update-snapshots` after an
  intentional design change.