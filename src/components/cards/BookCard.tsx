import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import type { ReactNode } from "react";
import Byline from "@/components/Byline";
import FeaturedImage from "@/components/FeaturedImage";
import {
  CARD_TITLE_CLASS,
  CARD_DESCRIPTION_CLASS,
  categoryPillClass,
  ctaToneClass,
  AUTHOR_FALLBACK,
  type CtaTone,
} from "@/lib/cardStyles";

export interface BookCardBook {
  id: string;
  title: string;
  slug?: string | null;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  book_type: string;
  description?: string | null;
}

export interface BookCardCta {
  text: string;
  tone: CtaTone;
}

interface BookCardProps {
  book: BookCardBook;
  variant?: "featured" | "compact";
  badge?: ReactNode;
  cta?: BookCardCta;
  descriptionPreview?: string;
  to?: string;
  className?: string;
}

const typePillClass = (bookType: string) =>
  bookType === "ebook"
    ? "bg-primary/10 text-primary"
    : "bg-accent/15 text-accent";

const typeLabel = (bookType: string) =>
  bookType === "ebook" ? "📱 ইবুক" : "📦 ফিজিক্যাল বই";

/**
 * Single source of truth for book cards across the app.
 * Mirrors CourseCard's variant API so layouts, typography and the byline
 * placeholder all stay in sync with the skeleton.
 */
const BookCard = ({
  book,
  variant = "featured",
  badge,
  cta,
  descriptionPreview,
  to,
  className,
}: BookCardProps) => {
  const href = to ?? `/book/${book.slug || book.id}`;
  const hasDiscount =
    !!book.original_price && book.original_price > book.price && book.price > 0;

  if (variant === "compact") {
    return (
      <Link
        to={href}
        className={`group relative block overflow-hidden rounded-xl glass-card shimmer ${className ?? ""}`}
      >
        {badge}
        {book.image_url && (
          <div className="img-overlay relative aspect-[3/4] overflow-hidden">
            <img
              src={book.image_url}
              alt={book.title}
              loading="lazy"
              className="ken-burns h-full w-full object-cover"
            />
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap gap-2">
            <span className={categoryPillClass("accent")}>{book.category}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${typePillClass(book.book_type)}`}>
              {typeLabel(book.book_type)}
            </span>
          </div>
          <h3 className={CARD_TITLE_CLASS}>{book.title}</h3>
          <Byline value={book.author} emptyText={AUTHOR_FALLBACK} />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {book.price === 0 ? (
                <>
                  <span className="text-lg font-bold text-success">ফ্রি</span>
                  {book.original_price && book.original_price > 0 && (
                    <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>
                  )}
                </>
              ) : (
                <>
                  <span className="price-tag text-xl">৳{book.price}</span>
                  {book.original_price && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
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

  return (
    <Link
      to={href}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl glass-card shimmer ring-1 ring-border/40 transition-all duration-300 hover:-translate-y-1 hover:ring-accent/40 hover:shadow-xl hover:shadow-accent/10 ${className ?? ""}`}
    >
      {badge}
      <div className="relative">
        <FeaturedImage src={book.image_url} alt={book.title} aspect="portrait" />
        {hasDiscount && (
          <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-md backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <Flame className="h-3 w-3" /> {Math.round(((book.original_price! - book.price) / book.original_price!) * 100)}% ছাড়
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <span className={categoryPillClass("accent")}>{book.category}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:py-1 sm:text-xs ${typePillClass(book.book_type)}`}>
            {typeLabel(book.book_type)}
          </span>
        </div>
        <h3 className={CARD_TITLE_CLASS}>{book.title}</h3>
        <Byline value={book.author} emptyText={AUTHOR_FALLBACK} />
        {descriptionPreview && (
          <p className={CARD_DESCRIPTION_CLASS}>{descriptionPreview}</p>
        )}
        <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent sm:my-4" />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
          <div className="flex items-baseline gap-1.5 min-w-0">
            {book.price === 0 ? (
              <>
                <span className="text-base font-extrabold text-success sm:text-lg">ফ্রি</span>
                {book.original_price && book.original_price > 0 && (
                  <span className="text-xs text-muted-foreground line-through sm:text-sm">৳{book.original_price}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-base font-extrabold text-primary sm:text-lg sm:text-foreground">৳{book.price}</span>
                {book.original_price && <span className="text-xs text-muted-foreground line-through sm:text-sm">৳{book.original_price}</span>}
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

export default BookCard;