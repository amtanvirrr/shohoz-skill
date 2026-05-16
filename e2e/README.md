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
bun run test:e2e

# Interactive UI mode for debugging a single spec
bun run test:e2e:ui

# Open the last HTML report (actual / expected / diff per failure)
bun run test:e2e:report

# Or point at a deployed preview / published URL
PLAYWRIGHT_BASE_URL=https://shohozskill.lovable.app bun run test:e2e
```

## Update snapshot baselines (safely)

Snapshot drift is the #1 source of false positives in visual regression. Only
regenerate baselines when the diff is **intentional and reviewed** — never as
a reflex to make CI green.

### Safe regeneration checklist

1. **Reproduce the failure locally first.**
   ```bash
   bun run test:e2e
   bun run test:e2e:report   # inspect actual vs expected vs diff
   ```
2. **Confirm the visual change is the one you intended.** If the diff shows
   unrelated movement (a sibling component shifted, a font swapped, an
   unrelated card grew), STOP — that is a real regression. Fix the source
   instead of accepting the snapshot.
3. **Regenerate only the affected spec(s)**, not the whole suite:
   ```bash
   bun run test:e2e:update-snapshots -- e2e/visual-regression.spec.ts
   # narrower still — single test by title:
   bun run test:e2e:update-snapshots -- e2e/visual-regression.spec.ts -g "featured-courses"
   ```
   Or, to regenerate everything in one go (rare):
   ```bash
   bun run test:e2e:update-snapshots
   ```
4. **Re-run the suite without `--update-snapshots`** to confirm the new
   baselines pass cleanly:
   ```bash
   bun run test:e2e
   ```
5. **Review the snapshot diff in your PR** the same way you'd review code —
   `git diff e2e/**/*.png` (or use GitHub's image diff toggle).
6. **Commit the new baselines** in the SAME PR as the source change that
   caused them, with a short note explaining the intentional change.

### Things that are NOT a reason to update snapshots

- "It only fails in CI." → CI is the source of truth. Match it by running the
  workflow's exact viewport / device project locally, not by accepting drift.
- "Just a 1px difference." → The Playwright config already allows tiny
  anti-aliasing diffs (`maxDiffPixelRatio: 0.01–0.02`). Anything that exceeds
  that is a real structural shift — investigate it.
- "The font rendered differently on my machine." → Run the spec in CI (or use
  the Linux container locally); never bake a host-specific render into the
  baseline.

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