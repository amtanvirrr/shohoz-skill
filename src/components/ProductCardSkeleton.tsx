import { cn } from "@/lib/utils";
import { BYLINE_LAYOUT_CLASS } from "@/lib/cardStyles";

interface Props {
  aspect?: "video" | "portrait";
  count?: number;
}

const ProductCardSkeleton = ({ aspect = "video", count = 6 }: Props) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div
            className={`skeleton-shimmer w-full ${
              aspect === "portrait" ? "aspect-[3/4]" : "aspect-video"
            }`}
          />
          <div className="space-y-3 p-5">
            <div className="flex gap-2">
              <div className="skeleton-shimmer h-5 w-16 rounded-full" />
              <div className="skeleton-shimmer h-5 w-24 rounded-full" />
            </div>
            <div className="skeleton-shimmer h-5 w-4/5 rounded" />
            <div data-testid="card-byline" className={cn("skeleton-shimmer w-1/2 rounded", BYLINE_LAYOUT_CLASS)} />
            <div className="flex items-center justify-between pt-2">
              <div className="skeleton-shimmer h-6 w-20 rounded" />
              <div className="skeleton-shimmer h-4 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default ProductCardSkeleton;
