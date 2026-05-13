import { ReactNode, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  /** Tailwind classes applied on sm+ to switch to grid layout */
  desktopGridClass?: string;
  /** Accessible label for the carousel region (e.g. "ফিচার্ড কোর্স") */
  label?: string;
  children: ReactNode;
}

/**
 * Mobile-first horizontal snap carousel that becomes a grid on sm+.
 * Adds a swipe hint and pagination dots on mobile only.
 */
const MobileCarousel = ({ count, desktopGridClass = "sm:grid-cols-2 lg:grid-cols-3", label = "কারোসেল", children }: Props) => {
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

  const handleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (count <= 1) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goto(Math.min(count - 1, active + 1));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goto(Math.max(0, active - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      goto(0);
    } else if (e.key === "End") {
      e.preventDefault();
      goto(count - 1);
    }
  };

  return (
    <div className="relative" role="region" aria-roledescription="কারোসেল" aria-label={label}>
      <div
        ref={ref}
        tabIndex={0}
        onKeyDown={handleKey}
        aria-label={`${label} — ${count} টি আইটেম, তীর কী দিয়ে নেভিগেট করুন`}
        aria-live="polite"
        className={cn(
          "mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto -mx-4 px-4 pb-2 scroll-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md sm:mt-8 sm:grid sm:gap-6 sm:overflow-visible sm:mx-0 sm:px-0 sm:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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
        <div className="mt-3 flex justify-center gap-1.5 sm:hidden" role="tablist" aria-label={`${label} পেজিনেশন`}>
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active === i}
              aria-label={`স্লাইড ${i + 1} এর ${count}`}
              aria-current={active === i ? "true" : undefined}
              tabIndex={active === i ? 0 : -1}
              onClick={() => goto(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
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
