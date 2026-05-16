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

## Exact viewport / device matrix

Baselines are captured under three Playwright **projects** defined in
`playwright.config.ts`. CI runs all three; locally you can target one with
`--project=<name>`. Every value below is normative — matching them is what
lets a local render reproduce the CI baseline byte-for-byte (within the
`maxDiffPixelRatio: 0.01` tolerance for font anti-aliasing).

| Project   | Base device preset | Viewport (CSS px) | DPR | Touch | Mobile UA | User-Agent source |
| --------- | ------------------ | ----------------- | --- | ----- | --------- | ----------------- |
| `desktop` | `Desktop Chrome`   | **1280 × 800** (overridden) | 1   | no    | no        | Chromium stable on Linux |
| `tablet`  | `iPad (gen 7)`     | 810 × 1080 (portrait) | 2   | yes   | yes       | Safari 16+ on iPadOS |
| `mobile`  | `iPhone 13`        | 390 × 844 (portrait)  | 3   | yes   | yes       | Safari 16+ on iOS |

All projects render through the bundled **Chromium** binary that ships with
the installed `@playwright/test` version (NOT system Chrome/Edge) — the
exact build is whatever `bunx playwright install chromium` pulled. Tablet
and mobile projects only spoof the UA, viewport, DPR, and touch flags; the
engine underneath is still Chromium, so do not expect WebKit-only quirks.

### Reproducing a baseline locally

```bash
# 1. Match the Playwright version CI uses (don't `bun update` it casually —
#    a Chromium bump can shift sub-pixel rendering).
bun add -D @playwright/test@$(node -p "require('./package.json').devDependencies['@playwright/test']")
bunx playwright install chromium

# 2. Run the same project CI ran. The project name is in the failing test
#    title in the HTML report, e.g. "[mobile] › visual-regression.spec.ts".
bunx playwright test --project=desktop e2e/visual-regression.spec.ts
bunx playwright test --project=tablet  e2e/visual-regression.spec.ts
bunx playwright test --project=mobile  e2e/visual-regression.spec.ts

# 3. Force CI=1 so any branch in the app that keys off `import.meta.env.MODE`
#    or `process.env.CI` (e.g. disabling animations) matches CI's render.
CI=1 bunx playwright test --project=mobile
```

### Why these specific projects

- **`desktop` is pinned to 1280 × 800** (not Playwright's default Desktop
  Chrome 1280 × 720) so the homepage hero + first row of featured cards fit
  in the viewport without the page scrolling. Scroll-position drift between
  runs is one of the easiest ways to taint a screenshot diff.
- **`iPad (gen 7)`** matches the most common tablet form factor in our
  analytics (810px portrait width) and exercises the 2-column featured grid.
- **`iPhone 13`** at 390 × 844 is the median modern phone width and
  exercises the single-column stack with the sticky bottom CTA.

If you genuinely need a new project (e.g. ultrawide, landscape phone), add
it to the `projects` array in `playwright.config.ts` — never override
viewport/DPR inside an individual spec, because that bypasses the snapshot
directory naming Playwright uses to keep baselines per-project.

### Things that silently change a render

These are the usual suspects when a local re-run can't reproduce a CI
baseline even after matching the project + viewport:

- **Host fonts.** CI installs only what the Playwright Docker image ships
  with plus our webfonts via the network. If you have local copies of
  `Hind Siliguri`, `Inter`, etc. installed at the OS level, the browser may
  prefer them and shift glyph metrics. Run inside a container or remove the
  conflicting system fonts.
- **Color management.** macOS applies a display color profile that ICC-tags
  PNG output; Linux CI does not. Always compare diff PNGs, not raw RGB.
- **Scrollbar reservation.** Linux Chromium reserves a 15px scrollbar gutter;
  macOS overlays scrollbars. Specs that screenshot the full page width can
  drift by exactly 15px between OSes — pin viewport-relative selectors.
- **Animations.** The app honours `prefers-reduced-motion: reduce`, and
  Playwright forces that media query on. Don't add `motion-safe:` overrides
  without also disabling them under `:where([data-testid])` in test mode.

## Visual regression specs

- `featured-cards-byline.spec.ts` — byline height parity (pixel assertions).
- `card-height-stability.spec.ts` — full-card height parity skeleton ↔ loaded.
- `visual-regression.spec.ts` — **screenshot baselines** for the homepage
  featured grids and the course/book detail hero cards (both skeleton and
  loaded states) at desktop, tablet, and mobile. Catches layout shifts that
  still typecheck — e.g. a wrong-but-valid Tailwind class that renders at the
  wrong height. Update with `bunx playwright test --update-snapshots` after an
  intentional design change.