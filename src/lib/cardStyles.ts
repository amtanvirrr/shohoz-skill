/**
 * =============================================================================
 *  CARD STYLE TOKEN CONTRACT
 * =============================================================================
 *
 * Single source of truth for product / featured card typography & spacing.
 * Course cards, book cards, and their loading skeletons MUST use these exact
 * tokens — that is what guarantees zero layout shift when data swaps in.
 *
 * Contract (DO NOT BREAK):
 *   1. Every text row that can wrap (title, description, byline) MUST own a
 *      reserved min-height at EACH breakpoint it changes line-clamp at.
 *   2. The matching skeleton block (in Byline.Skeleton / FeaturedCardSkeleton
 *      / ProductCardSkeleton) MUST consume the SAME token — never re-derive
 *      the height inline.
 *   3. If you add a new breakpoint (e.g. lg:) that changes font-size or
 *      line-clamp, you MUST also add a matching `lg:min-h-[…]`.
 *   4. Any change to a *_CLASS below is a CLS-risk change — the assertions in
 *      src/components/__tests__/cardLayoutStability.test.tsx will fail if the
 *      contract drifts. Update tests AND skeletons in the same PR.
 *
 * Reserved heights at each breakpoint (keep in sync with the test file):
 *   token                     base        sm           md/lg
 *   BYLINE_LAYOUT_CLASS       2.50rem     2.75rem      1.50rem (md drops to 1 line)
 *   CARD_TITLE_CLASS          2.50rem     3.25rem      —
 *   CARD_DESCRIPTION_CLASS    2.00rem     2.25rem      —
 *   Price row (skeleton)      h-6 w-20    —            —     (CourseCard/BookCard
 *                                                             render `<span>৳…</span>`
 *                                                             with text-base/lg; the
 *                                                             h-6 skeleton block matches
 *                                                             that natural line-height)
 *
 * If you need a richer style for one specific page, compose ON TOP of the
 * shared class — do not fork it. Example:
 *   <h3 className={`${CARD_TITLE_CLASS} text-balance`}>{title}</h3>
 */

/** Instructor/author "byline" line — layout-only (font size, leading, margin, min-h, line-clamp). */
export const BYLINE_LAYOUT_CLASS =
  "mt-1 text-xs leading-5 line-clamp-2 break-words min-h-[2.5rem] sm:mt-1.5 sm:text-sm sm:leading-[1.375rem] sm:min-h-[2.75rem] md:mt-2 md:leading-6 md:line-clamp-1 md:min-h-[1.5rem]";

/** Apply byline layout + tone (muted italic when value is empty). */
export const bylineClass = (value?: string | null): string =>
  `${BYLINE_LAYOUT_CLASS} ${
    value?.trim() ? "text-muted-foreground" : "text-muted-foreground/60 italic"
  }`;

/** Card title (h3) — responsive size, line-clamp, reserved height. */
export const CARD_TITLE_CLASS =
  "mt-2 font-display text-sm font-semibold leading-snug text-card-foreground line-clamp-2 min-h-[2.5rem] transition-colors group-hover:text-primary sm:mt-3 sm:min-h-[3.25rem] sm:text-lg";

/** Description preview under the title — responsive 2-line clamp with reserved height. */
export const CARD_DESCRIPTION_CLASS =
  "mt-1.5 text-xs leading-relaxed text-muted-foreground/90 line-clamp-2 min-h-[2rem] sm:mt-2 sm:min-h-[2.25rem]";

/** Category pill in card header — responsive padding/text. */
type PillTone = "primary" | "accent";
export const categoryPillClass = (tone: PillTone = "primary"): string =>
  `inline-block rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs ${
    tone === "accent" ? "bg-accent/15 text-accent" : "bg-primary/10 text-primary"
  }`;

/** Order-status pill (purchase counter row) — small icon + label. */
type StatusTone = "success" | "primary" | "warning";
export const statusPillClass = (tone: StatusTone): string => {
  const colour =
    tone === "primary"
      ? "bg-primary text-primary dark:bg-primary/30 dark:text-primary"
      : tone === "warning"
      ? "bg-warning text-warning dark:bg-warning/30 dark:text-warning"
      : "bg-success text-success dark:bg-success/30 dark:text-success";
  return `inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${colour}`;
};

/** CTA pill tone (action button at bottom-right of featured cards). */
export type CtaTone = "primary" | "success" | "warning";
export const ctaToneClass = (tone: CtaTone): string => {
  if (tone === "success") return "bg-success text-success-foreground sm:bg-success/15 sm:text-success sm:shadow-none";
  if (tone === "warning") return "bg-warning text-warning-foreground sm:bg-warning/15 sm:text-warning sm:shadow-none";
  return "bg-primary text-primary-foreground sm:bg-primary/10 sm:text-primary sm:shadow-none";
};

/**
 * Single source of truth for the Bengali fallback strings shown when a
 * course has no instructor / a book has no author. Used by CourseCard and
 * BookCard everywhere — do NOT inline these strings in new call sites.
 */
export const INSTRUCTOR_FALLBACK = "ইন্সট্রাক্টর শীঘ্রই জানানো হবে";
export const AUTHOR_FALLBACK = "লেখক উল্লেখ করা হয়নি";
