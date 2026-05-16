import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Flame } from "lucide-react";
import type { ReactNode } from "react";
import Byline from "@/components/Byline";
import FeaturedImage from "@/components/FeaturedImage";
import {
  CARD_TITLE_CLASS,
  CARD_DESCRIPTION_CLASS,
  categoryPillClass,
  ctaToneClass,
  INSTRUCTOR_FALLBACK,
  type CtaTone,
} from "@/lib/cardStyles";

export interface CourseCardCourse {
  id: string;
  title: string;
  slug?: string | null;
  instructor: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  duration: string;
  description?: string | null;
  lesson_count?: number;
}

export interface CourseCardCta {
  text: string;
  tone: CtaTone;
}

interface CourseCardProps {
  course: CourseCardCourse;
  /**
   * "featured" matches the homepage (description preview, CTA pill, divider,
   * discount flame). "compact" matches the listing page (no description,
   * hover-only "বিস্তারিত →" chevron).
   */
  variant?: "featured" | "compact";
  /** Optional absolute-positioned badge (purchase status). */
  badge?: ReactNode;
  /** CTA pill — required for "featured", ignored for "compact". */
  cta?: CourseCardCta;
  /** Honoured by "featured" only — strips HTML and clamps the preview. */
  descriptionPreview?: string;
  /** Override the Link href; defaults to the slug-based detail route. */
  to?: string;
  /** Hint to <FeaturedImage> for LCP optimisation. */
  priority?: boolean;
  className?: string;
}

/**
 * Single source of truth for course cards across the app.
 * Uses BYLINE_LAYOUT_CLASS (via <Byline>) + CARD_TITLE_CLASS +
 * CARD_DESCRIPTION_CLASS so typography and spacing match the loading
 * skeleton byte-for-byte.
 */
const CourseCard = ({
  course,
  variant = "featured",
  badge,
  cta,
  descriptionPreview,
  to,
  priority,
  className,
}: CourseCardProps) => {
  const href = to ?? `/course/${course.slug || course.id}`;
  const hasDiscount =
    !!course.original_price && course.original_price > course.price && course.price > 0;

  if (variant === "compact") {
    return (
      <Link
        to={href}
        className={`group relative block overflow-hidden rounded-xl glass-card shimmer ${className ?? ""}`}
      >
        {badge}
        {course.image_url && (
          <div className="img-overlay relative aspect-video overflow-hidden">
            <img
              src={course.image_url}
              alt={course.title}
              loading="lazy"
              className="ken-burns h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <span className={categoryPillClass("primary")}>{course.category}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/30 dark:text-primary">🎓 অনলাইন কোর্স</span>
          </div>
          <h3 className={CARD_TITLE_CLASS}>{course.title}</h3>
          <Byline value={course.instructor} emptyText={INSTRUCTOR_FALLBACK} />
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            {typeof course.lesson_count === "number" && (
              <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lesson_count} টি লেসন</span>
            )}
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {course.price === 0 ? (
                <>
                  <span className="text-lg font-bold text-success">ফ্রি</span>
                  {course.original_price && course.original_price > 0 && (
                    <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="price-tag text-xl">৳{course.price.toLocaleString()}</span>
                  {course.original_price && <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                </>
              )}
            </div>
            <span className="text-xs font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
              বিস্তারিত →
            </span>
          </div>
        </div>
      </Link>
    );
  }

  // featured (homepage)
  return (
    <Link
      to={href}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl glass-card shimmer ring-1 ring-border/40 transition-all duration-300 hover:-translate-y-1 hover:ring-primary/40 hover:shadow-xl hover:shadow-primary/10 ${className ?? ""}`}
    >
      {badge}
      <div className="relative">
        <FeaturedImage src={course.image_url} alt={course.title} aspect="video" priority={priority} />
        {hasDiscount && (
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-md backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Flame className="h-3 w-3" /> {Math.round(((course.original_price! - course.price) / course.original_price!) * 100)}% ছাড়
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <span className={categoryPillClass("primary")}>{course.category}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary dark:bg-primary/30 dark:text-primary sm:px-2.5 sm:py-1 sm:text-xs">🎓 অনলাইন কোর্স</span>
        </div>
        <h3 className={CARD_TITLE_CLASS}>{course.title}</h3>
        <Byline value={course.instructor} emptyText={INSTRUCTOR_FALLBACK} />
        {descriptionPreview && (
          <p className={CARD_DESCRIPTION_CLASS}>{descriptionPreview}</p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground sm:mt-3">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
        </div>
        <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent sm:my-4" />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="flex items-baseline gap-1.5 min-w-0">
            {course.price === 0 ? (
              <>
                <span className="text-base font-extrabold text-success sm:text-lg">ফ্রি</span>
                {course.original_price && course.original_price > 0 && (
                  <span className="text-xs text-muted-foreground line-through sm:text-sm">৳{course.original_price.toLocaleString()}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-base font-extrabold text-primary sm:text-lg sm:text-foreground">৳{course.price.toLocaleString()}</span>
                {course.original_price && <span className="text-xs text-muted-foreground line-through sm:text-sm">৳{course.original_price.toLocaleString()}</span>}
              </>
            )}
          </div>
          {cta && (
            <span className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-transform group-hover:scale-105 sm:px-3 sm:py-1.5 sm:text-xs ${ctaToneClass(cta.tone)}`}>
              {cta.text} <ArrowRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;