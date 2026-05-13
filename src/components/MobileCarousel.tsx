import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  /** Tailwind classes applied on sm+ to switch to grid layout */
  desktopGridClass?: string;
  children: ReactNode;
}

/**
 * Mobile-first horizontal snap carousel that becomes a grid on sm+.
 * Adds a swipe hint and pagination dots on mobile only.
 */
const MobileCarousel = ({ count, desktopGridClass = "sm:grid-cols-2 lg:grid-cols-3", children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handle = () => {
      if (hint) setHint(false);
      const kids = Array.from(el.children) as HTMLElement[];
      const center = el.scrollLeft + el.clientWidth / 2;
      let nearest = 0;
      let min = Infinity;
      kids.forEach((c, i) => {
        const cc = c.offsetLeft + c.offsetWidth / 2;
        const d = Math.abs(cc - center);
        if (d < min) { min = d; nearest = i; }
      });
      setActive(nearest);
    };
    el.addEventListener("scroll", handle, { passive: true });
    const t = window.setTimeout(() => setHint(false), 4500);
    return () => { el.removeEventListener("scroll", handle); clearTimeout(t); };
  }, [hint]);

  const goto = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const kid = el.children[i] as HTMLElement | undefined;
    if (kid) el.scrollTo({ left: kid.offsetLeft - 16, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        className={cn(
          "mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto -mx-4 px-4 pb-2 scroll-smooth sm:mt-8 sm:grid sm:gap-6 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          desktopGridClass,
        )}
      >
        {children}
      </div>

      {count > 1 && hint && (
        <div className="pointer-events-none absolute right-3 top-[38%] flex items-center gap-1 rounded-full bg-foreground/75 px-2.5 py-1.5 text-[11px] font-medium text-background shadow-md backdrop-blur animate-fade-in sm:hidden">
          <span>সোয়াইপ করুন</span>
          <ChevronRight className="h-3.5 w-3.5 animate-pulse" />
        </div>
      )}

      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 sm:hidden" role="tablist" aria-label="Carousel pagination">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`স্লাইড ${i + 1}`}
              onClick={() => goto(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                active === i ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileCarousel;
