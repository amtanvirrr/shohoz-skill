/**
 * Shared layout classes for the instructor/author "byline" line on featured cards.
 * Keeps font size, leading, margin, and reserved min-height in sync between loaded
 * cards and skeleton placeholders so there is zero layout shift on data load.
 */
export const BYLINE_LAYOUT_CLASS =
  "mt-1 text-xs leading-5 line-clamp-2 break-words min-h-[2.5rem] sm:mt-1.5 sm:text-sm sm:leading-[1.375rem] sm:min-h-[2.75rem] md:mt-2 md:leading-6 md:line-clamp-1 md:min-h-[1.5rem]";

/** Apply byline layout + tone (muted italic when value is empty). */
export const bylineClass = (value?: string | null): string =>
  `${BYLINE_LAYOUT_CLASS} ${
    value?.trim() ? "text-muted-foreground" : "text-muted-foreground/60 italic"
  }`;
