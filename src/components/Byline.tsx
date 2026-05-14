import { BYLINE_LAYOUT_CLASS, bylineClass } from "@/lib/cardStyles";
import { cn } from "@/lib/utils";

interface BylineProps {
  /** Instructor / author / contributor value. Empty or whitespace renders the placeholder. */
  value?: string | null;
  /** Bengali fallback shown (italic, muted) when no value is present. */
  emptyText: string;
  /** Optional extra classes appended to the shared bylineClass output. */
  className?: string;
}

/**
 * Single source of truth for the instructor/author byline line on cards.
 * Guarantees identical font size, leading, margin, line-clamp and reserved
 * min-height across every page and the loading skeleton.
 */
const Byline = ({ value, emptyText, className }: BylineProps) => (
  <p
    data-testid="card-byline"
    className={cn(bylineClass(value), "animate-byline-in", className)}
  >
    {value?.trim() || emptyText}
  </p>
);

interface BylineSkeletonProps {
  /** Width utility for the shimmer block (default w-1/2). */
  widthClass?: string;
  /** Visual style: 'shimmer' (sliding sweep) or 'pulse' (animate-pulse). */
  variant?: "shimmer" | "pulse";
  className?: string;
}

/**
 * Loading placeholder that mirrors Byline exactly: identical responsive
 * min-height, margin and line-clamp from BYLINE_LAYOUT_CLASS, so swapping
 * skeleton -> Byline never shifts layout.
 */
const BylineSkeleton = ({
  widthClass = "w-1/2",
  variant = "shimmer",
  className,
}: BylineSkeletonProps) => (
  <div
    data-testid="card-byline"
    aria-hidden="true"
    className={cn(
      BYLINE_LAYOUT_CLASS,
      "rounded",
      variant === "shimmer"
        ? "skeleton-shimmer"
        : "animate-pulse bg-muted/40",
      widthClass,
      className,
    )}
  />
);

Byline.Skeleton = BylineSkeleton;

export { BylineSkeleton };
export default Byline;
