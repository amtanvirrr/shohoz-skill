import { Link, useLocation, useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackCtaClick } from "@/lib/analytics";
import { preloadImage, prefetchImages } from "@/lib/prefetch";

interface HeroSettings {
  hero_title: string;
  hero_subtitle: string;
  hero_btn1_text: string;
  hero_btn1_link: string;
  hero_btn2_text: string;
  hero_btn2_link: string;
  hero_stat1_value: string;
  hero_stat1_label: string;
  hero_stat2_value: string;
  hero_stat2_label: string;
  hero_stat3_value: string;
  hero_stat3_label: string;
}

interface HeroSlide {
  id: string;
  media_url: string;
  media_type: string;
}

const HERO_KEYS: (keyof HeroSettings)[] = [
  "hero_title", "hero_subtitle",
  "hero_btn1_text", "hero_btn1_link", "hero_btn2_text", "hero_btn2_link",
  "hero_stat1_value", "hero_stat1_label",
  "hero_stat2_value", "hero_stat2_label",
  "hero_stat3_value", "hero_stat3_label",
];

/** Map admin-configured links to in-page anchors when we're on the homepage. */
const sectionAnchorFor = (link: string): string | null => {
  if (!link) return null;
  if (link.startsWith("#")) return link.slice(1);
  if (link === "/courses" || link === "/#featured-courses") return "featured-courses";
  if (link === "/books" || link === "/#featured-books") return "featured-books";
  return null;
};

const defaults: HeroSettings = {
  hero_title: "শেখার নতুন দিগন্ত — কোর্স ও বই এক জায়গায়",
  hero_subtitle: "প্রফেশনাল কোর্স, হ্যান্ডপিকড বই এবং কোয়ালিটি কন্টেন্ট দিয়ে আপনার স্কিল ডেভেলপ করুন।",
  hero_btn1_text: "Explore Courses",
  hero_btn1_link: "/courses",
  hero_btn2_text: "Browse Books",
  hero_btn2_link: "/books",
  hero_stat1_value: "5,000+",
  hero_stat1_label: "Students",
  hero_stat2_value: "50+",
  hero_stat2_label: "Books",
  hero_stat3_value: "30+",
  hero_stat3_label: "Courses",
};

const statIcons = [Users, BookOpen, GraduationCap];

const HeroBanner = () => {
  const [settings, setSettings] = useState<HeroSettings>(defaults);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesReady, setSlidesReady] = useState(false);
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const [rating, setRating] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });

  useEffect(() => {
    supabase
      .from("reviews")
      .select("rating", { count: "exact" })
      .eq("is_active", true)
      .then(({ data, count }) => {
        if (!data || data.length === 0) return;
        const total = data.reduce((s: number, r: any) => s + (r.rating || 0), 0);
        setRating({ avg: total / data.length, count: count ?? data.length });
      });
  }, []);

  const toBnNum = (n: number | string) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  const formatCount = (n: number) => {
    if (n >= 1000) return `${toBnNum((n / 1000).toFixed(n >= 10000 ? 0 : 1))}হাজার+`;
    if (n >= 100) return `${toBnNum(Math.floor(n / 10) * 10)}+`;
    return toBnNum(n);
  };

  const handleCtaClick = (link: string, label: string, slot: "primary" | "secondary") => (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Fire-and-forget tracking — never blocks navigation
    trackCtaClick({
      event_name: "hero_cta_click",
      section: `hero_btn_${slot}`,
      label,
      target_url: link,
    });
    const anchor = sectionAnchorFor(link);
    if (!anchor) return; // let <Link> handle normal navigation
    e.preventDefault();
    const scrollToAnchor = () => {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    if (location.pathname !== "/") {
      navigate(`/#${anchor}`);
      // wait for home page mount, then scroll
      setTimeout(scrollToAnchor, 350);
    } else {
      scrollToAnchor();
      // reflect anchor in URL without full reload
      window.history.replaceState(null, "", `/#${anchor}`);
    }
  };

  useEffect(() => {
    (supabase as any)
      .from("public_site_settings")
      .select("key, value")
      .in("key", HERO_KEYS)
      .then(({ data }: any) => {
        if (data && data.length > 0) {
          const merged = { ...defaults };
          data.forEach((row: any) => {
            if (row.key in merged && row.value) {
              (merged as any)[row.key] = row.value;
            }
          });
          setSettings(merged);
        }
      });

    supabase
      .from("hero_slides")
      .select("id, media_url, media_type")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        const list = data || [];
        setSlides(list);
        setSlidesReady(true);
        // Preload the first image with high priority so the LCP element paints fast.
        const first = list.find((s) => s.media_type !== "video");
        if (first) preloadImage(first.media_url);
        // Warm cache for the rest at low priority.
        prefetchImages(
          list
            .filter((s) => s.media_type !== "video" && s.id !== first?.id)
            .map((s) => s.media_url),
        );
      });
  }, []);

  // Auto-slide
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const stats = [
    { value: settings.hero_stat1_value, label: settings.hero_stat1_label },
    { value: settings.hero_stat2_value, label: settings.hero_stat2_label },
    { value: settings.hero_stat3_value, label: settings.hero_stat3_label },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-hero">
      {/* Animated mesh blobs */}
      <div className="hero-mesh" aria-hidden="true" />
      {/* Subtle grain */}
      <div className="grain-overlay" aria-hidden="true" />
      {/* Soft top/bottom fades for depth */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent" aria-hidden="true" />

      <div className="flex flex-col md:flex-row md:items-stretch">
        <div className="hidden md:block absolute inset-0 pointer-events-none" style={{ aspectRatio: "2.5 / 1" }} />

        {/* Left — content */}
        <div className="relative z-10 flex w-full flex-col justify-center px-5 py-10 sm:px-8 sm:py-14 md:w-1/2 md:py-0 lg:px-16">
          <h1 className="font-display text-3xl font-bold leading-[1.15] text-primary-foreground sm:text-4xl lg:text-5xl xl:text-6xl">
            {settings.hero_title.split(" ").map((word, i) => (
              <span
                key={i}
                className="inline-block opacity-0"
                style={{
                  animation: `word-reveal 0.6s var(--ease-spring) ${0.15 + i * 0.06}s forwards`,
                  marginRight: "0.25em",
                }}
              >
                {word}
              </span>
            ))}
          </h1>

          <p
            className="mt-4 max-w-lg text-sm text-primary-foreground/80 sm:text-base lg:text-lg opacity-0"
            style={{ animation: "word-reveal 0.7s var(--ease-spring) 0.5s forwards" }}
          >
            {settings.hero_subtitle}
          </p>

          <div
            className="mt-6 flex flex-col gap-3 opacity-0 sm:flex-row sm:flex-wrap"
            style={{ animation: "word-reveal 0.7s var(--ease-spring) 0.65s forwards" }}
          >
            <Button variant="premium-accent" size="lg" asChild className="h-12 w-full text-base shadow-lg shadow-accent/20 sm:h-11 sm:w-auto sm:text-base">
              <Link to={settings.hero_btn1_link} onClick={handleCtaClick(settings.hero_btn1_link, settings.hero_btn1_text, "primary")}>
                <GraduationCap className="mr-1.5 h-5 w-5 sm:h-4 sm:w-4" />
                {settings.hero_btn1_text}
              </Link>
            </Button>
            <Button variant="glass" size="lg" asChild className="h-12 w-full text-base sm:h-11 sm:w-auto sm:text-base">
              <Link to={settings.hero_btn2_link} onClick={handleCtaClick(settings.hero_btn2_link, settings.hero_btn2_text, "secondary")}>
                <BookOpen className="mr-1.5 h-5 w-5 sm:h-4 sm:w-4" />
                {settings.hero_btn2_text}
              </Link>
            </Button>
          </div>

          <div
            className="mt-6 flex flex-wrap gap-2 opacity-0 sm:mt-8 sm:gap-4"
            style={{ animation: "word-reveal 0.7s var(--ease-spring) 0.8s forwards" }}
          >
            {stats.map((stat, i) => {
              const Icon = statIcons[i];
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-2 backdrop-blur-md"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                    <Icon className="h-3.5 w-3.5 text-accent" />
                  </span>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-bold text-primary-foreground sm:text-base">{stat.value}</span>
                    <span className="text-[10px] text-primary-foreground/70 sm:text-xs">{stat.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right half - media slider */}
        <div className="relative w-full overflow-hidden md:w-1/2" style={{ minHeight: "180px" }}>
          <div className="aspect-[16/10] md:aspect-auto md:absolute md:inset-0">
            {!slidesReady ? (
              <div
                className="absolute inset-0 overflow-hidden bg-primary-foreground/5"
                aria-hidden="true"
              >
                <div className="hero-skeleton h-full w-full" />
              </div>
            ) : slides.length > 0 ? (
              <>
                {slides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="absolute inset-0 transition-opacity duration-700"
                    style={{ opacity: idx === currentSlide ? 1 : 0 }}
                  >
                    {!loadedIds.has(slide.id) && (
                      <div className="absolute inset-0 hero-skeleton" aria-hidden="true" />
                    )}
                    {slide.media_type === "video" ? (
                      <video
                        src={slide.media_url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload={idx === 0 ? "auto" : "metadata"}
                        onLoadedData={() =>
                          setLoadedIds((prev) => {
                            if (prev.has(slide.id)) return prev;
                            const next = new Set(prev);
                            next.add(slide.id);
                            return next;
                          })
                        }
                        className={`h-full w-full object-cover transition-opacity duration-500 ${
                          loadedIds.has(slide.id) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    ) : (
                      <img
                        src={slide.media_url}
                        alt=""
                        decoding="async"
                        loading={idx === 0 ? "eager" : "lazy"}
                        {...(idx === 0 ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
                        onLoad={() =>
                          setLoadedIds((prev) => {
                            if (prev.has(slide.id)) return prev;
                            const next = new Set(prev);
                            next.add(slide.id);
                            return next;
                          })
                        }
                        className={`h-full w-full object-cover transition-opacity duration-500 ${
                          loadedIds.has(slide.id) ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    )}
                    {/* Gradient scrim for legibility on mobile stacked layout */}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent md:bg-gradient-to-l md:from-transparent md:to-primary/30 pointer-events-none" />
                  </div>
                ))}
                {/* Dots */}
                {slides.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 z-10">
                    {slides.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`h-2 w-2 rounded-full transition-all ${
                          i === currentSlide
                            ? "bg-primary-foreground w-5"
                            : "bg-primary-foreground/40"
                        }`}
                        aria-label={`স্লাইড ${i + 1}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[260px] items-center justify-center bg-primary-foreground/5">
                <p className="text-primary-foreground/30 text-sm">কোনো মিডিয়া নেই</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop aspect ratio overlay */}
      <style>{`
        @media (min-width: 768px) {
          section.bg-gradient-hero > div.flex.flex-col.md\\:flex-row {
            aspect-ratio: 2.5 / 1;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroBanner;
