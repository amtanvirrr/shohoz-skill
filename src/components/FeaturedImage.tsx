import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchImage } from "@/lib/prefetch";

interface Props {
  src?: string | null;
  alt: string;
  /** "video" → 16:9 (courses), "portrait" → 3:4 (books) */
  aspect: "video" | "portrait";
  className?: string;
}

/**
 * Featured-card image wrapper that always reserves intrinsic space via
 * aspect-ratio + explicit width/height attributes, preventing CLS during
 * lazy loading. Renders a neutral placeholder when src is missing/errors,
 * and fades the image in on load for a smoother visual.
 */
const FeaturedImage = ({ src, alt, aspect, className }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const aspectClass = aspect === "portrait" ? "aspect-[3/4]" : "aspect-video";
  // Intrinsic size hints — same ratio, helps browser compute box pre-paint.
  const w = aspect === "portrait" ? 600 : 800;
  const h = aspect === "portrait" ? 800 : 450;

  const showPlaceholder = !src || errored;

  // Warm the HTTP cache as soon as the card approaches the viewport.
  // Larger rootMargin than the browser's lazy-load threshold so the request
  // fires earlier — by the time the user scrolls the card into view the
  // image is decoded and paints instantly. Same URL is reused on the
  // detail page, so navigation also feels instant.
  useEffect(() => {
    if (!src || errored) return;
    if (typeof IntersectionObserver === "undefined") {
      prefetchImage(src);
      return;
    }
    const node = wrapRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            prefetchImage(src);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "600px 0px", threshold: 0.01 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [src, errored]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative w-full overflow-hidden bg-muted/40",
        aspectClass,
        className,
      )}
    >
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
          <ImageOff className="h-8 w-8" aria-hidden="true" />
          <span className="sr-only">{alt}</span>
        </div>
      ) : (
        <>
          {!loaded && (
            <div className="absolute inset-0 skeleton-shimmer bg-muted/40" aria-hidden="true" />
          )}
          <img
            src={src!}
            alt={alt}
            width={w}
            height={h}
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setErrored(true)}
            className={cn(
              "h-full w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-110",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </>
      )}
    </div>
  );
};

export default FeaturedImage;