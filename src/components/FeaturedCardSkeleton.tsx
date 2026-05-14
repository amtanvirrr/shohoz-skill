import { cn } from "@/lib/utils";

interface Props {
  /** Aspect ratio of the image area: 'video' for courses, 'portrait' for books. */
  aspect?: "video" | "portrait";
  className?: string;
}

/**
 * Lightweight pulse skeleton matching FeaturedCourse / FeaturedBook card shape.
 * Prevents layout shift while data is loading.
 */
const FeaturedCardSkeleton = ({ aspect = "video", className }: Props) => {
  const aspectClass = aspect === "portrait" ? "aspect-[3/4]" : "aspect-video";
  return (
    <div
      className={cn(
        "snap-start shrink-0 w-[82%] sm:w-auto sm:shrink",
        className,
      )}
      aria-hidden="true"
    >
      <div className="skeleton-shimmer overflow-hidden rounded-xl glass-card">
        <div className={cn(aspectClass, "w-full animate-pulse bg-muted/60")} />
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          <div className="flex gap-2">
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted/60" />
            <div className="h-5 w-24 animate-pulse rounded-full bg-muted/40" />
          </div>
          <div className="h-5 w-4/5 animate-pulse rounded bg-muted/60" />
          <div className="h-4 w-2/5 animate-pulse rounded bg-muted/40 min-h-[1.25rem] sm:min-h-[1.375rem] md:min-h-[1.5rem]" />
          <div className="mt-2 flex items-center justify-between">
            <div className="h-6 w-20 animate-pulse rounded bg-muted/60" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-muted/40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturedCardSkeleton;
