import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

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

  const aspectClass = aspect === "portrait" ? "aspect-[3/4]" : "aspect-video";
  // Intrinsic size hints — same ratio, helps browser compute box pre-paint.
  const w = aspect === "portrait" ? 600 : 800;
  const h = aspect === "portrait" ? 800 : 450;

  const showPlaceholder = !src || errored;

  return (
    <div
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