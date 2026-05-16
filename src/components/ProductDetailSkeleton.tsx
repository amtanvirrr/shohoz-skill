import { cn } from "@/lib/utils";

interface Props {
  /**
   * "course" — wide aspect-video media + 2/3 + 1/3 grid (matches CourseDetail).
   * "book"   — 3/4 portrait media + 1/2 + 1/2 grid (matches BookDetail).
   */
  kind: "course" | "book";
  className?: string;
}

const Bar = ({ className }: { className?: string }) => (
  <div className={cn("skeleton-shimmer rounded bg-muted/50", className)} />
);

/**
 * Structural skeleton for the course/book detail page.
 * Reserves the same shape as the loaded layout — back link, hero media,
 * category pills, title, byline (instructor/author), price row, description
 * card, and the sticky order/summary panel — so users see no layout shift
 * once data arrives.
 */
const ProductDetailSkeleton = ({ kind, className }: Props) => {
  const isCourse = kind === "course";
  return (
    <div className={cn("py-10 lg:py-16", className)} aria-busy="true" aria-live="polite">
      <div className="container mx-auto px-4">
        {/* Back link */}
        <Bar className="mb-6 h-4 w-44" />

        <div
          className={cn(
            "mt-4 grid gap-10",
            isCourse ? "lg:grid-cols-3" : "lg:grid-cols-2",
          )}
        >
          {/* Main column */}
          <div className={isCourse ? "lg:col-span-2" : undefined}>
            {/* Hero media */}
            <div
              className={cn(
                "overflow-hidden rounded-xl glass-card",
                isCourse ? "aspect-video" : "aspect-[3/4] lg:max-h-[75vh]",
              )}
            >
              <div className="h-full w-full skeleton-shimmer bg-muted/40" />
            </div>

            {/* Category pills */}
            <div className="mt-6 flex flex-wrap gap-2">
              <Bar className="h-6 w-24 rounded-full" />
              <Bar className="h-6 w-28 rounded-full" />
            </div>

            {/* Title (2 lines) */}
            <div className="mt-3 space-y-2">
              <Bar className="h-7 w-[80%] sm:h-8 lg:h-9" />
              <Bar className="h-7 w-[55%] sm:h-8 lg:h-9" />
            </div>

            {/* Byline — instructor / author */}
            <Bar className="mt-3 h-4 w-48" />

            {/* Price row */}
            <div className="mt-4 flex items-baseline gap-3">
              <Bar className="h-8 w-24" />
              <Bar className="h-5 w-16 bg-muted/40" />
            </div>

            {/* Overview / description card */}
            <div className="mt-6 glass-card rounded-xl p-5 space-y-3">
              <Bar className="h-5 w-40" />
              <Bar className="h-3 w-full" />
              <Bar className="h-3 w-[94%]" />
              <Bar className="h-3 w-[88%]" />
              <Bar className="h-3 w-[72%]" />
              <Bar className="h-3 w-[60%] bg-muted/40" />
            </div>

            {/* Course-only: curriculum/lessons accordion */}
            {isCourse && (
              <div className="mt-8 rounded-xl glass-card p-5 space-y-3">
                <Bar className="h-5 w-36" />
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0"
                  >
                    <Bar className="h-4 w-[60%]" />
                    <Bar className="h-4 w-14 bg-muted/40" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side / order column */}
          <div className={isCourse ? "lg:col-span-1" : undefined}>
            <div className="sticky top-20 rounded-xl glass-card p-6 space-y-4">
              <Bar className="h-5 w-32" />
              <Bar className="h-4 w-full" />
              <Bar className="h-9 w-full bg-muted/40" />
              <Bar className="h-9 w-full bg-muted/40" />
              <Bar className="h-9 w-full bg-muted/40" />
              <Bar className="mt-2 h-11 w-full" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">লোড হচ্ছে…</span>
    </div>
  );
};

export default ProductDetailSkeleton;