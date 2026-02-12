import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    supabase
      .from("site_settings")
      .select("key, value")
      .in("key", HERO_KEYS)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const merged = { ...defaults };
          data.forEach((row) => {
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
      .then(({ data }) => setSlides(data || []));
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
    <section className="relative overflow-hidden bg-primary" style={{ aspectRatio: "2.5 / 1" }}>
      <div className="absolute inset-0 flex h-full">
        {/* Left half - content */}
        <div className="flex w-1/2 flex-col justify-center px-6 sm:px-10 lg:px-16">
          <h1 className="text-xl font-bold text-primary-foreground sm:text-2xl lg:text-4xl xl:text-5xl leading-tight">
            {settings.hero_title}
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/80 sm:text-base lg:text-lg max-w-lg">
            {settings.hero_subtitle}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 sm:gap-3 lg:mt-6">
            <Button variant="accent" size="sm" asChild className="lg:text-base lg:px-6 lg:py-3">
              <Link to={settings.hero_btn1_link}>
                <GraduationCap className="mr-1.5 h-4 w-4" />
                {settings.hero_btn1_text}
              </Link>
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/30 lg:text-base lg:px-6 lg:py-3"
              asChild
            >
              <Link to={settings.hero_btn2_link}>
                <BookOpen className="mr-1.5 h-4 w-4" />
                {settings.hero_btn2_text}
              </Link>
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-primary-foreground/70 sm:text-sm lg:mt-8 lg:gap-6">
            {stats.map((stat, i) => {
              const Icon = statIcons[i];
              return (
                <div key={i} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  {stat.value} {stat.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right half - media slider */}
        <div className="relative w-1/2 overflow-hidden">
          {slides.length > 0 ? (
            <>
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{ opacity: idx === currentSlide ? 1 : 0 }}
                >
                  {slide.media_type === "video" ? (
                    <video
                      src={slide.media_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={slide.media_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              ))}
              {/* Dots */}
              {slides.length > 1 && (
                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`h-2 w-2 rounded-full transition-all ${
                        i === currentSlide
                          ? "bg-primary-foreground w-5"
                          : "bg-primary-foreground/40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-primary-foreground/5">
              <p className="text-primary-foreground/30 text-sm">No media added</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HeroBanner;
