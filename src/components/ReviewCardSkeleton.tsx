import { cn } from "@/lib/utils";

interface Props {
  /** Number of skeleton cards to render (default 4). */
  count?: number;
  /**
   * Visual style — "card" matches homepage testimonial cards (glass + stars),
   * "compact" matches the simpler list used inside detail pages.
   */
  variant?: "card" | "compact";
  className?: string;
}

/**
 * Skeleton placeholder for customer review items.
 * Mirrors the loaded markup's spacing so the swap is layout-stable.
 */
const ReviewCardSkeleton = ({ count = 4, variant = "card", className }: Props) => {
  if (variant === "compact") {
    return (
      <div className={cn("mt-4 space-y-4", className)} aria-hidden="true">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg glass-card p-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded skeleton-shimmer bg-muted/50" />
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <div key={s} className="h-3.5 w-3.5 rounded-sm skeleton-shimmer bg-muted/50" />
                ))}
              </div>
            </div>
            <div className="mt-2 space-y-2">
              <div className="h-3 w-full rounded skeleton-shimmer bg-muted/50" />
              <div className="h-3 w-[88%] rounded skeleton-shimmer bg-muted/50" />
              <div className="h-3 w-[60%] rounded skeleton-shimmer bg-muted/40" />
            </div>
            <div className="mt-2 h-3 w-24 rounded skeleton-shimmer bg-muted/40" />
            <span className="sr-only">রিভিউ লোড হচ্ছে…</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("glass-card rounded-xl p-5 h-full", className)}
          aria-hidden="true"
        >
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, s) => (
              <div key={s} className="h-4 w-4 rounded-sm skeleton-shimmer bg-muted/50" />
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-3 w-full rounded skeleton-shimmer bg-muted/50" />
            <div className="h-3 w-[92%] rounded skeleton-shimmer bg-muted/50" />
            <div className="h-3 w-[78%] rounded skeleton-shimmer bg-muted/50" />
          </div>
          <div className="mt-4 border-t border-border/50 pt-3 space-y-2">
            <div className="h-3.5 w-32 rounded skeleton-shimmer bg-muted/50" />
            <div className="h-3 w-24 rounded skeleton-shimmer bg-muted/40" />
          </div>
          <span className="sr-only">রিভিউ লোড হচ্ছে…</span>
        </div>
      ))}
    </>
  );
};

export default ReviewCardSkeleton;