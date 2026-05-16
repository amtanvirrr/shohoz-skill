# Card style token contract

This document explains the shared className helpers in
[`src/lib/cardStyles.ts`](../src/lib/cardStyles.ts) that power every product
card in the app (homepage featured cards, `/courses`, `/books`, related
blocks) and their loading skeletons.

The single rule:

> **A card and its skeleton must reserve the same height at every breakpoint.**

If that rule is broken, users see a layout shift (CLS) the moment data
arrives. The tokens below — and the tests that guard them — exist to make
that rule impossible to violate accidentally.

---

## Tokens

| Token                       | What it styles                                       | Reserved height (base → sm → md/lg)         | Wrapping                       |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------ |
| `BYLINE_LAYOUT_CLASS`       | Instructor / author line                             | **2.50rem → 2.75rem → 1.50rem** (md=1-line) | `line-clamp-2`, `md:line-clamp-1` |
| `bylineClass(value)`        | `BYLINE_LAYOUT_CLASS` + muted/italic tone fallback   | same as above                               | same as above                  |
| `CARD_TITLE_CLASS`          | Card `<h3>` title                                    | **2.50rem → 3.25rem**                       | `line-clamp-2`                 |
| `CARD_DESCRIPTION_CLASS`    | Optional preview paragraph under the title           | **2.00rem → 2.25rem**                       | `line-clamp-2`                 |
| `categoryPillClass(tone)`   | Category pill in the card header                     | natural — pill height is fixed by padding   | n/a                            |
| `statusPillClass(tone)`     | Order-status pill (purchase counter row)             | natural                                     | n/a                            |
| `ctaToneClass(tone)`        | CTA pill at the bottom-right of featured cards       | natural                                     | n/a                            |
| `INSTRUCTOR_FALLBACK`       | Bengali text shown when course `instructor` is empty | n/a                                         | n/a                            |
| `AUTHOR_FALLBACK`           | Bengali text shown when book `author` is empty       | n/a                                         | n/a                            |

The price row is **not** a shared token (the markup is bespoke per card type)
but skeletons reserve **`h-6 w-20`** to match the natural line-height of the
`<span>৳…</span>` price element in `CourseCard`/`BookCard`.

<!-- Per-token anchors used by scripts/card-layout-summary.mjs to deep-link
     PR check annotations. Renaming these breaks the CI summary links. -->
<a id="byline-layout-class"></a>
<a id="card-title-class"></a>
<a id="card-description-class"></a>
<a id="price-row"></a>

---

## Who consumes each token

```
BYLINE_LAYOUT_CLASS / bylineClass
├── src/components/Byline.tsx            (loaded state)
├── src/components/Byline.tsx → Skeleton (loading state, via BYLINE_LAYOUT_CLASS)
├── src/components/cards/CourseCard.tsx
└── src/components/cards/BookCard.tsx

CARD_TITLE_CLASS
├── src/components/cards/CourseCard.tsx
└── src/components/cards/BookCard.tsx
   (skeleton title bar: `h-5 w-4/5` in FeaturedCardSkeleton / ProductCardSkeleton)

CARD_DESCRIPTION_CLASS
├── src/components/cards/CourseCard.tsx (variant="featured", when descriptionPreview)
└── src/components/cards/BookCard.tsx   (variant="featured", when descriptionPreview)

Price row skeleton (`h-6 w-20`)
├── src/components/FeaturedCardSkeleton.tsx
└── src/components/ProductCardSkeleton.tsx
```

---

## Safe-change checklist

Before editing **any** `*_CLASS` constant, verify all of:

1. [ ] Every consumer in the list above still renders the new tokens
       (cards AND skeletons).
2. [ ] If you change wrapping (`line-clamp-*`) at a breakpoint, you also
       change the matching `min-h-[…]` at that same breakpoint.
3. [ ] If you add a new breakpoint (e.g. `lg:text-xl`), you add a matching
       `lg:min-h-[…]` so the height is reserved at that breakpoint too.
4. [ ] Update token references in
       `src/components/__tests__/cardLayoutStability.test.tsx`
       (`MIN_H_TOKENS`, `TITLE_MIN_H_TOKENS`, `DESC_MIN_H_TOKENS`, etc.)
       so the test reflects the new contract.
5. [ ] Run `bunx vitest run src/components/__tests__/cardLayoutStability.test.tsx`
       — all tests must pass.
6. [ ] Run the Playwright visual regression once: `bunx playwright test`.
       Update snapshots with `--update-snapshots` only after manually
       confirming the new shape is correct.

---

## Adding a new card variant

1. Build the new card inside `src/components/cards/` and consume the existing
   tokens — **do not** re-derive heights inline.
2. If a new skeleton is needed, use `<Byline.Skeleton />` for the byline and
   reuse `FeaturedCardSkeleton` / `ProductCardSkeleton` where possible; copy
   any new placeholder block from those files so widths/heights match.
3. Add an assertion in `cardLayoutStability.test.tsx` that the new component
   contains `MIN_H_TOKENS` / `TITLE_MIN_H_TOKENS` etc.
4. Add a Storybook story under `src/stories/` rendering the card AND its
   skeleton side-by-side with short, very-long, and empty values for the
   byline (see existing `Byline.stories.tsx` for the pattern).

---

## Related files

- [`src/lib/cardStyles.ts`](../src/lib/cardStyles.ts) — the tokens (and the
  contract banner at the top of that file).
- [`src/components/Byline.tsx`](../src/components/Byline.tsx) — single source
  of truth for the byline line (loaded + skeleton).
- [`src/components/__tests__/cardLayoutStability.test.tsx`](../src/components/__tests__/cardLayoutStability.test.tsx)
  — assertions that lock the contract.
- [`e2e/card-height-stability.spec.ts`](../e2e/card-height-stability.spec.ts)
  — responsive (desktop / tablet / mobile) skeleton-↔-loaded visual

---

## Contributing: updating the token contract

The card-style token contract is locked by a JSON snapshot at
`src/components/__tests__/__snapshots__/cardStyleTokens.json`. Any time you
touch `cardStyles.ts` (or the skeleton placeholders) the snapshot must be
regenerated in the **same PR** as the source change — otherwise CI fails on
`cardLayoutStability.test.tsx`.

### Standard flow (token change only)

1. **Edit the tokens** in [`src/lib/cardStyles.ts`](../src/lib/cardStyles.ts).
   The locked contract now covers **six** layout-affecting utility groups:
   | Group       | Utilities tracked                                  | Why it's locked                                  |
   | ----------- | -------------------------------------------------- | ------------------------------------------------ |
   | `minHeight` | `min-h-…`                                          | Reserves vertical space (CLS guard).             |
   | `leading`   | `leading-…`                                        | Line-box height; changes effective row height.   |
   | `clamp`     | `line-clamp-…`                                     | Number of visible lines → required min-height.   |
   | `fontSize`  | `text-xs`…`text-9xl`, `text-[…]` (NOT colors)      | Natural line-height → skeleton sizing.           |
   | `padding`   | `p-`, `px-`, `py-`, `pt-`, `pr-`, `pb-`, `pl-`     | Card content box dimensions.                     |
   | `tracking`  | `tracking-…`                                       | Letter-spacing → horizontal text fit / width.    |

   Color, hover, transition, font-family, border, and background utilities
   are intentionally **excluded** — they don't shift layout, so churning the
   snapshot on a color tweak would add noise without catching real bugs.

   **Breakpoint cascade rule (enforced):** if you add a `sm:` / `md:` /
   `lg:` / `xl:` / `2xl:` variant of a `minHeight` / `leading` / `clamp` /
   `fontSize` token, you **must** keep an unprefixed base token of the same
   group. Tailwind's responsive prefixes are min-width — without a base,
   the smallest viewport renders with **no reserved layout** and the card
   visibly jumps on data load. `update-card-style-snapshots.mjs` fails fast
   with a `path:line` annotation if this rule is violated.
2. **Preview the diff** to confirm only the fields you meant to change moved:
   ```bash
   bun run scripts/update-card-style-snapshots.mjs
   ```
   Exits `1` with a colored diff when out of sync, `0` when in sync. The
   diff annotates every drifted field with the exact `src/lib/cardStyles.ts:line`
   where the offending token lives — click straight through to the source
   line instead of grepping. If a breakpoint cascade is violated the script
   exits `1` **before** showing the snapshot diff so you fix the cascade
   first.
3. **Accept the new contract** by rewriting the snapshot:
   ```bash
   bun run scripts/update-card-style-snapshots.mjs --write
   ```
   `--write` requires the explicit flag — typos or accidental script runs
   can never silently rewrite the contract. The skeleton placeholder widths
   are preserved from the previous snapshot unless you also pass
   `--write-skeleton` (see [Skeleton width change](#skeleton-width-change)).
4. **Run the unit tests** to confirm cards + skeletons still match the new
   contract:
   ```bash
   bunx vitest run src/components/__tests__/cardLayoutStability.test.tsx
   ```
   The test helpers tokenize on whitespace and require **exact whole-token
   matches**, so e.g. `sm:min-h-[2.5rem]` will never silently satisfy a
   contract that expects the unprefixed `min-h-[2.5rem]` base.
5. **Run the visual regression suite** (Playwright) to catch any pixel-level
   regressions the token change introduced:
   ```bash
   bun run test:e2e
   ```
   If a diff is intentional, regenerate baselines with
   `bun run test:e2e:update-snapshots` (see [`e2e/README.md`](../e2e/README.md)
   for the safe-regeneration checklist).
6. **Commit** the edited `cardStyles.ts`, the regenerated
   `cardStyleTokens.json`, and any updated Playwright PNG baselines together.

### Adding a new tracked group

If a future change requires locking another utility family (e.g. `gap-…`,
`rounded-…`), extend the contract in **three** places in the same PR:

1. **`scripts/update-card-style-snapshots.mjs`** — add a new extractor next
   to `tokensMatching` / `fontSizeTokens` / `paddingTokens`, include it in
   the `groups` object inside `tokenMap()`, and (if the group is
   CLS-sensitive) add it to the `CASCADE_GROUPS` array so the breakpoint
   cascade validator covers it too.
2. **`docs/card-style-tokens.md`** — add a row to the table above so
   reviewers know the group is locked.
3. **`src/components/__tests__/cardLayoutStability.test.tsx`** — pull the
   new group out of the snapshot (e.g.
   `const PADDING_TOKENS = snapshot.CARD_TITLE_CLASS.padding`) and assert
   it on the relevant component(s) via `expectAllTokens`.

Then run `--write` once to seed the new group into the snapshot JSON and
commit everything together.

### Skeleton width change

Skeleton placeholder widths (`titleBar`, `priceBar`) live in
[`src/components/ProductCardSkeleton.tsx`](../src/components/ProductCardSkeleton.tsx),
not in `cardStyles.ts`. To re-derive them into the snapshot:

1. Update both `ProductCardSkeleton.tsx` **and**
   [`FeaturedCardSkeleton.tsx`](../src/components/FeaturedCardSkeleton.tsx)
   so the two stay in lockstep.
2. Regenerate with the explicit opt-in flag:
   ```bash
   bun run scripts/update-card-style-snapshots.mjs --write --write-skeleton
   ```
3. Re-run the unit + visual tests from steps 4–5 above.

### CI check

CI runs the script in read-only mode:

```bash
bun run scripts/update-card-style-snapshots.mjs --check-only
```

It prints a compact `card-style-snapshot DRIFT: N field(s) …` summary and
exits non-zero if the snapshot doesn't match `cardStyles.ts`. Never bypass
this by hand-editing the snapshot JSON — always go through the script so the
`$schema` provenance banner stays accurate.
  regression on the homepage.