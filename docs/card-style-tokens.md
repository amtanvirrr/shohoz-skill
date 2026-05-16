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
  regression on the homepage.