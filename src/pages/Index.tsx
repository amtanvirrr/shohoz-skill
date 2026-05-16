import { Link, useNavigate } from "react-router-dom";
import { Star, Search, ArrowRight, BookOpen, GraduationCap, Clock, Users, CheckCircle, Package, Truck, Sparkles, Quote, ShieldCheck, Tag, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ScrollReveal } from "@/hooks/useScrollReveal";

import HeroBanner from "@/components/HeroBanner";
import MobileCarousel from "@/components/MobileCarousel";
import FeaturedCardSkeleton from "@/components/FeaturedCardSkeleton";
import EmptyState from "@/components/EmptyState";
import { statusPillClass } from "@/lib/cardStyles";
import CourseCard from "@/components/cards/CourseCard";
import BookCard from "@/components/cards/BookCard";

/** Strip HTML tags and decode common entities for a safe text-only preview. */
const htmlToPreview = (html?: string | null): string => {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
};


interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  book_type: string;
  description?: string | null;
}

interface DbCourse {
  id: string;
  title: string;
  instructor: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  duration: string;
  description?: string | null;
}

interface DbReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  course_id: string;
}

interface OrderInfo {
  total: number;
  pending: number;
  confirmed: number;
  shipped: number;
  delivered: number;
}

/**
 * Module-level cache for featured items. Survives route navigations within
 * the same session so returning to "/" shows previously-loaded cards
 * immediately (skeleton-then-empty flash is avoided).
 */
const featuredCache: {
  courses: DbCourse[] | null;
  books: DbBook[] | null;
  coursesKey: string;
  booksKey: string;
  reviews: (DbReview & { course_title?: string })[] | null;
} = { courses: null, books: null, coursesKey: "", booksKey: "", reviews: null };

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackErrors, setTrackErrors] = useState<{ orderId?: string; phone?: string; form?: string }>({});
  const [dbBooks, setDbBooks] = useState<DbBook[]>(() => featuredCache.books ?? []);
  const [dbCourses, setDbCourses] = useState<DbCourse[]>(() => featuredCache.courses ?? []);
  // Only show skeleton on the very first fetch — keep cached cards visible
  // while the background refresh runs on subsequent visits.
  const [coursesLoading, setCoursesLoading] = useState(() => featuredCache.courses === null);
  const [booksLoading, setBooksLoading] = useState(() => featuredCache.books === null);
  const [coursesError, setCoursesError] = useState<string | null>(null);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [dbReviews, setDbReviews] = useState<(DbReview & { course_title?: string })[]>(() => featuredCache.reviews ?? []);
  const [reviewsLoading, setReviewsLoading] = useState(() => featuredCache.reviews === null);
  const [bookOrderMap, setBookOrderMap] = useState<Record<string, OrderInfo>>({});
  const [courseOrderMap, setCourseOrderMap] = useState<Record<string, string>>({});

  // Fetch featured products based on settings (re-run when retry counter bumps)
  const [retryTick, setRetryTick] = useState(0);
  useEffect(() => {
    const featuredCourseIds = settings.featured_course_ids ? settings.featured_course_ids.split(",").filter(Boolean) : [];
    const featuredBookIds = settings.featured_book_ids ? settings.featured_book_ids.split(",").filter(Boolean) : [];
    const coursesKey = featuredCourseIds.join(",") || "__all__";
    const booksKey = featuredBookIds.join(",") || "__all__";
    // If the featured selection changed since last visit, drop cached cards
    // and show a skeleton during the new fetch (no stale flash).
    if (featuredCache.coursesKey && featuredCache.coursesKey !== coursesKey) {
      setCoursesLoading(true);
    }
    if (featuredCache.booksKey && featuredCache.booksKey !== booksKey) {
      setBooksLoading(true);
    }
    featuredCache.coursesKey = coursesKey;
    featuredCache.booksKey = booksKey;

    const applyCourses = (data: DbCourse[]) => {
      featuredCache.courses = data;
      setDbCourses(data);
      setCoursesLoading(false);
      setCoursesError(null);
    };
    const applyBooks = (data: DbBook[]) => {
      featuredCache.books = data;
      setDbBooks(data);
      setBooksLoading(false);
      setBooksError(null);
    };
    const failCourses = () => {
      setCoursesLoading(false);
      setCoursesError("ফিচার্ড কোর্স লোড করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
    };
    const failBooks = () => {
      setBooksLoading(false);
      setBooksError("ফিচার্ড বই লোড করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।");
    };
    setCoursesError(null);
    setBooksError(null);

    // Courses
    if (featuredCourseIds.length > 0) {
      supabase.from("courses")
        .select("id, title, instructor, price, original_price, image_url, category, duration, slug, description")
        .eq("is_published", true)
        .in("id", featuredCourseIds)
        .then(({ data, error }) => (error ? failCourses() : applyCourses((data as DbCourse[]) || [])));
    } else {
      supabase.from("courses")
        .select("id, title, instructor, price, original_price, image_url, category, duration, slug, description")
        .eq("is_published", true)
        .limit(3)
        .then(({ data, error }) => (error ? failCourses() : applyCourses((data as DbCourse[]) || [])));
    }

    // Books
    if (featuredBookIds.length > 0) {
      supabase.from("books")
        .select("id, title, author, price, original_price, image_url, category, book_type, slug, description")
        .eq("is_published", true)
        .in("id", featuredBookIds)
        .then(({ data, error }) => (error ? failBooks() : applyBooks((data as DbBook[]) || [])));
    } else {
      supabase.from("books")
        .select("id, title, author, price, original_price, image_url, category, book_type, slug, description")
        .eq("is_published", true)
        .limit(3)
        .then(({ data, error }) => (error ? failBooks() : applyBooks((data as DbBook[]) || [])));
    }

    // Reviews (always latest)
    supabase.from("reviews").select("id, reviewer_name, rating, comment, course_id, courses(title)").eq("is_active", true).order("created_at", { ascending: false }).limit(8).then(({ data }) => {
      const mapped = (data || []).map((r: any) => ({
        id: r.id, reviewer_name: r.reviewer_name, rating: r.rating, comment: r.comment,
        course_id: r.course_id, course_title: r.courses?.title || "",
      }));
      featuredCache.reviews = mapped;
      setDbReviews(mapped);
      setReviewsLoading(false);
    });
  }, [settings.featured_course_ids, settings.featured_book_ids, retryTick]);

  const retryFeatured = () => {
    setCoursesLoading(true);
    setBooksLoading(true);
    setRetryTick((n) => n + 1);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("orders").select("product_id, status, product_type")
      .eq("user_id", user.id).not("status", "eq", "cancelled")
      .then(({ data }) => {
        const bMap: Record<string, OrderInfo> = {};
        const cMap: Record<string, string> = {};
        (data || []).forEach((o: any) => {
          if (o.product_type === "book") {
            if (!bMap[o.product_id]) bMap[o.product_id] = { total: 0, pending: 0, confirmed: 0, shipped: 0, delivered: 0 };
            bMap[o.product_id].total++;
            if (o.status === "pending") bMap[o.product_id].pending++;
            else if (o.status === "confirmed") bMap[o.product_id].confirmed++;
            else if (o.status === "shipped") bMap[o.product_id].shipped++;
            else if (o.status === "delivered") bMap[o.product_id].delivered++;
          } else if (o.product_type === "course") {
            if (!cMap[o.product_id] || ["confirmed", "delivered"].includes(o.status)) {
              cMap[o.product_id] = o.status;
            }
          }
        });
        setBookOrderMap(bMap);
        setCourseOrderMap(cMap);
      });
  }, [user]);

  const renderBookBadge = (book: DbBook) => {
    const info = bookOrderMap[book.id];
    if (!info) return null;
    const isDigital = book.book_type === "ebook";
    if (isDigital) {
      const hasConfirmed = info.confirmed > 0 || info.delivered > 0;
      return (
        <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
          hasConfirmed ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
        }`}>
          {hasConfirmed ? <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</> : <><Clock className="h-3 w-3" /> পেন্ডিং</>}
        </div>
      );
    }
    return (
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="rounded-lg bg-card/95 backdrop-blur-sm border border-border px-3 py-2 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Package className="h-3.5 w-3.5 text-primary" />
            <span>{info.total} বার কেনা হয়েছে</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {info.delivered > 0 && <span className={statusPillClass("success")}><CheckCircle className="h-2.5 w-2.5" /> {info.delivered} ডেলিভারি</span>}
            {info.shipped > 0 && <span className={statusPillClass("primary")}><Truck className="h-2.5 w-2.5" /> {info.shipped} শিপড</span>}
            {info.confirmed > 0 && <span className={statusPillClass("success")}><CheckCircle className="h-2.5 w-2.5" /> {info.confirmed} কনফার্মড</span>}
            {info.pending > 0 && <span className={statusPillClass("warning")}><Clock className="h-2.5 w-2.5" /> {info.pending} পেন্ডিং</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderCourseBadge = (courseId: string) => {
    const status = courseOrderMap[courseId];
    if (!status) return null;
    return (
      <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        ["confirmed", "delivered"].includes(status)
          ? "bg-success/15 text-success"
          : "bg-warning/15 text-warning"
      }`}>
        {["confirmed", "delivered"].includes(status) ? <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</> : <><Clock className="h-3 w-3" /> পেন্ডিং</>}
      </div>
    );
  };

  // Compute CTA copy based on course state
  const getCourseCta = (course: DbCourse) => {
    const status = courseOrderMap[course.id];
    if (status && ["confirmed", "delivered"].includes(status)) {
      return { text: "শিখতে যান", tone: "success" as const };
    }
    if (status === "pending") {
      return { text: "যাচাইয়ের অপেক্ষায়", tone: "warning" as const };
    }
    if (course.price === 0) {
      return { text: "ফ্রি এনরোল করুন", tone: "primary" as const };
    }
    return { text: "এখনই কিনুন", tone: "primary" as const };
  };

  // Compute CTA copy based on book type & purchase state
  const getBookCta = (book: DbBook) => {
    const info = bookOrderMap[book.id];
    const isDigital = book.book_type === "ebook";
    if (info) {
      if (isDigital) {
        if (info.confirmed > 0 || info.delivered > 0) return { text: "পড়তে যান", tone: "success" as const };
        if (info.pending > 0) return { text: "যাচাইয়ের অপেক্ষায়", tone: "warning" as const };
      } else {
        if (info.delivered > 0) return { text: "আবার অর্ডার করুন", tone: "primary" as const };
        if (info.shipped > 0) return { text: "ট্র্যাক করুন", tone: "success" as const };
        if (info.confirmed > 0) return { text: "প্রস্তুত হচ্ছে", tone: "success" as const };
        if (info.pending > 0) return { text: "যাচাইয়ের অপেক্ষায়", tone: "warning" as const };
      }
    }
    if (book.price === 0) return { text: isDigital ? "ফ্রি পড়ুন" : "ফ্রি অর্ডার", tone: "primary" as const };
    return { text: isDigital ? "এখনই কিনুন" : "অর্ডার করুন", tone: "primary" as const };
  };

  const ctaToneClass = (tone: "primary" | "success" | "warning") => {
    if (tone === "success") return "bg-success text-success-foreground sm:bg-success/15 sm:text-success sm:shadow-none";
    if (tone === "warning") return "bg-warning text-warning-foreground sm:bg-warning/15 sm:text-warning sm:shadow-none";
    return "bg-primary text-primary-foreground sm:bg-primary/10 sm:text-primary sm:shadow-none";
  };

  /**
   * Homepage track handler — sends the user to the dedicated /track-order
   * page with the typed value pre-filled into the matching field
   * (Order ID vs Phone). Full order details require BOTH fields verified
   * on the next page.
   */
  /**
   * Detects whether the query is a Bangladeshi mobile number.
   * Accepts: 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX (with optional spaces/dashes).
   * Returns the normalized 11-digit form, or null if it isn't phone-shaped.
   */
  const normalizeBdPhone = (raw: string): string | null => {
    const digits = raw.replace(/[\s\-()]/g, "");
    let m = digits.match(/^(?:\+?880)?(1\d{9})$/);
    if (!m) return null;
    return `0${m[1]}`;
  };

  const handleTrack = () => {
    const id = trackOrderId.trim();
    const phoneRaw = trackPhone.trim();
    const errs: { orderId?: string; phone?: string; form?: string } = {};

    if (!id && !phoneRaw) {
      errs.form = "অর্ডার আইডি ও ফোন নম্বর — দুটোই দিন।";
    } else {
      if (!id) errs.orderId = "অর্ডার আইডি দিন।";
      else if (id.length < 4 || id.length > 64) errs.orderId = "অর্ডার আইডির দৈর্ঘ্য ৪–৬৪ অক্ষর হতে হবে।";
      else if (!/^[A-Za-z0-9_-]+$/.test(id)) errs.orderId = "শুধু অক্ষর, সংখ্যা ও '-' '_' ব্যবহার করুন।";

      if (!phoneRaw) errs.phone = "ফোন নম্বর দিন।";
      else if (!normalizeBdPhone(phoneRaw)) errs.phone = "সঠিক বাংলাদেশী মোবাইল নম্বর দিন (01XXXXXXXXX)।";
    }

    if (errs.orderId || errs.phone || errs.form) {
      setTrackErrors(errs);
      toast({ title: "যাচাই ব্যর্থ", description: errs.form || errs.orderId || errs.phone, variant: "destructive" });
      return;
    }
    setTrackErrors({});
    const params = new URLSearchParams();
    params.set("order_id", id);
    params.set("phone", normalizeBdPhone(phoneRaw)!);
    navigate(`/track-order?${params.toString()}`);
  };

  const statusLabels: Record<string, string> = {
    pending: "⏳ পেন্ডিং",
    confirmed: "✅ কনফার্মড",
    shipped: "🚚 শিপড",
    delivered: "📦 ডেলিভারড",
    cancelled: "❌ বাতিল",
  };

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <HeroBanner />

      {/* Featured Courses */}
      <section id="featured-courses" className="relative scroll-mt-24 py-10 sm:py-16 lg:py-20">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background pointer-events-none" />
        <div className="container relative mx-auto px-4">
          <ScrollReveal>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <GraduationCap className="h-3.5 w-3.5" />
                  কোর্স
                </div>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{settings.homepage_courses_title || "ফিচার্ড কোর্স"}</h2>
                <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">{settings.homepage_courses_subtitle || "ক্যারিয়ার গড়তে সেরা কোর্সগুলো"}</p>
              </div>
              <Link to="/courses" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex group">
                সব দেখুন <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </ScrollReveal>
          {coursesLoading ? (
            <MobileCarousel count={3} label="ফিচার্ড আইটেম" desktopGridClass="sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <FeaturedCardSkeleton key={i} aspect="video" />
              ))}
            </MobileCarousel>
          ) : coursesError ? (
            <div className="mt-8">
              <EmptyState
                icon={AlertTriangle}
                title="লোড করা যায়নি"
                description={coursesError}
                action={
                  <Button variant="outline" size="sm" onClick={retryFeatured}>
                    <RefreshCw className="mr-1 h-4 w-4" /> আবার চেষ্টা করুন
                  </Button>
                }
              />
            </div>
          ) : dbCourses.length > 0 ? (
            <MobileCarousel count={dbCourses.length} label="ফিচার্ড কোর্স" desktopGridClass="sm:grid-cols-2 lg:grid-cols-3">
              {dbCourses.map((course, idx) => (
                <ScrollReveal key={course.id} delay={idx * 100} className="snap-start shrink-0 w-[62%] max-w-[260px] sm:w-auto sm:max-w-none sm:shrink h-full">
                  <CourseCard
                    course={course}
                    variant="featured"
                    to={`/course/${(course as any).slug || course.id}?ref=featured#order-form`}
                    badge={renderCourseBadge(course.id)}
                    cta={getCourseCta(course)}
                    descriptionPreview={htmlToPreview(course.description)}
                    priority={idx === 0}
                  />
                </ScrollReveal>
              ))}
            </MobileCarousel>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={GraduationCap}
                title="এখনো কোনো ফিচার্ড কোর্স নেই"
                description="নতুন কোর্স খুব শীঘ্রই যুক্ত হচ্ছে। ততক্ষণে আমাদের সম্পূর্ণ কোর্স ক্যাটালগ ঘুরে দেখুন।"
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/courses">সব কোর্স দেখুন <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                }
              />
            </div>
          )}
          <Link to="/courses" className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline sm:hidden">
            সব কোর্স দেখুন <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Featured Books */}
      <section id="featured-books" className="relative scroll-mt-24 py-10 sm:py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-primary/[0.03] to-secondary/60 pointer-events-none" />
        <div className="container relative mx-auto px-4">
          <ScrollReveal>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                  <BookOpen className="h-3.5 w-3.5" />
                  বই
                </div>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{settings.homepage_books_title || "ফিচার্ড বই"}</h2>
                <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">{settings.homepage_books_subtitle || "নিজেকে এক ধাপ এগিয়ে নিন"}</p>
              </div>
              <Link to="/books" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex group">
                সব দেখুন <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </ScrollReveal>
          {booksLoading ? (
            <MobileCarousel count={3} label="ফিচার্ড আইটেম" desktopGridClass="sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <FeaturedCardSkeleton key={i} aspect="portrait" />
              ))}
            </MobileCarousel>
          ) : booksError ? (
            <div className="mt-8">
              <EmptyState
                icon={AlertTriangle}
                title="লোড করা যায়নি"
                description={booksError}
                action={
                  <Button variant="outline" size="sm" onClick={retryFeatured}>
                    <RefreshCw className="mr-1 h-4 w-4" /> আবার চেষ্টা করুন
                  </Button>
                }
              />
            </div>
          ) : dbBooks.length > 0 ? (
            <MobileCarousel count={dbBooks.length} label="ফিচার্ড বই" desktopGridClass="sm:grid-cols-2 lg:grid-cols-3">
              {dbBooks.map((book, idx) => (
                <ScrollReveal key={book.id} delay={idx * 100} className="snap-start shrink-0 w-[62%] max-w-[260px] sm:w-auto sm:max-w-none sm:shrink h-full">
                  <Link to={`/book/${(book as any).slug || book.id}?ref=featured#order-form`} className="group relative flex h-full flex-col overflow-hidden rounded-2xl glass-card shimmer ring-1 ring-border/40 transition-all duration-300 hover:-translate-y-1 hover:ring-accent/40 hover:shadow-xl hover:shadow-accent/10">
                    {renderBookBadge(book)}
                    <div className="relative">
                      <FeaturedImage src={book.image_url} alt={book.title} aspect="portrait" />
                      {book.original_price && book.original_price > book.price && book.price > 0 && (
                        <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-0.5 text-[10px] font-bold text-destructive-foreground shadow-md backdrop-blur-sm sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]">
                          <Flame className="h-3 w-3" /> {Math.round(((book.original_price - book.price) / book.original_price) * 100)}% ছাড়
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-3 sm:p-5">
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        <span className={categoryPillClass("accent")}>{book.category}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-2.5 sm:py-1 sm:text-xs ${
                          book.book_type === "ebook"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/15 text-accent"
                        }`}>
                          {book.book_type === "ebook" ? "📱 ইবুক" : "📦 ফিজিক্যাল বই"}
                        </span>
                      </div>
                      <h3 className={CARD_TITLE_CLASS}>{book.title}</h3>
                      <Byline value={book.author} emptyText="লেখক উল্লেখ করা হয়নি" />
                      {htmlToPreview(book.description) && (
                        <p className={CARD_DESCRIPTION_CLASS}>
                          {htmlToPreview(book.description)}
                        </p>
                      )}
                      <div className="my-3 h-px bg-gradient-to-r from-transparent via-border to-transparent sm:my-4" />
                      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                        <div className="flex items-baseline gap-1.5 min-w-0">
                          {book.price === 0 ? (
                            <>
                              <span className="text-base font-extrabold text-success sm:text-lg">ফ্রি</span>
                              {book.original_price && book.original_price > 0 && <span className="text-xs text-muted-foreground line-through sm:text-sm">৳{book.original_price}</span>}
                            </>
                          ) : (
                            <>
                              <span className="text-base font-extrabold text-primary sm:text-lg sm:text-foreground">৳{book.price}</span>
                              {book.original_price && <span className="text-xs text-muted-foreground line-through sm:text-sm">৳{book.original_price}</span>}
                            </>
                          )}
                        </div>
                        {(() => {
                          const cta = getBookCta(book);
                          return (
                            <span className={`inline-flex shrink-0 items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-transform group-hover:scale-105 sm:px-3 sm:py-1.5 sm:text-xs ${ctaToneClass(cta.tone)}`}>
                              {cta.text} <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </MobileCarousel>
          ) : (
            <div className="mt-8">
              <EmptyState
                icon={BookOpen}
                title="এখনো কোনো ফিচার্ড বই নেই"
                description="শীঘ্রই নতুন বই যুক্ত হচ্ছে। ততক্ষণে আমাদের সম্পূর্ণ বইয়ের তালিকা দেখুন।"
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link to="/books">সব বই দেখুন <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                }
              />
            </div>
          )}
        </div>
      </section>

      {/* Reviews */}
      {(reviewsLoading || dbReviews.length > 0) && (
      <section className="relative py-10 sm:py-16 lg:py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/[0.02] to-background pointer-events-none" />
          <div className="container relative mx-auto px-4">
            <ScrollReveal>
              <div className="text-center">
                <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                  <Star className="h-3.5 w-3.5 fill-accent" />
                  রিভিউ
                </div>
                <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{settings.homepage_reviews_title || "আমাদের শিক্ষার্থীরা যা বলেন"}</h2>
                <p className="mx-auto mt-2 text-muted-foreground max-w-md">{settings.homepage_reviews_subtitle || "আমাদের শিক্ষার্থীদের মতামত"}</p>
              </div>
            </ScrollReveal>
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:mt-10 sm:gap-6">
              {reviewsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="glass-card rounded-xl p-5 h-full" aria-hidden="true">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <div key={s} className="h-4 w-4 rounded-sm skeleton-shimmer bg-muted/50" />
                      ))}
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-3 w-full rounded skeleton-shimmer bg-muted/50" />
                      <div className="h-3 w-[92%] rounded skeleton-shimmer bg-muted/50" />
                      <div className="h-3 w-[78%] rounded skeleton-shimmer bg-muted/50" />
                    </div>
                    <div className="mt-4 border-t border-border/50 pt-3 space-y-2">
                      <div className="h-3.5 w-32 rounded skeleton-shimmer bg-muted/50" />
                      <div className="h-3 w-24 rounded skeleton-shimmer bg-muted/40" />
                    </div>
                    <span className="sr-only">রিভিউ লোড হচ্ছে…</span>
                  </div>
                ))
              ) : dbReviews.map((review, idx) => (
                <ScrollReveal key={review.id} delay={idx * 80}>
                  <div className="group relative glass-card rounded-2xl p-5 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 overflow-hidden">
                    <Quote className="absolute -top-2 -right-2 h-16 w-16 text-primary/5 group-hover:text-primary/10 transition-colors" aria-hidden="true" />
                    <div className="relative flex items-center gap-1 text-accent">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "fill-accent text-accent" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                    <p className="relative mt-3 text-sm text-card-foreground leading-relaxed line-clamp-5">"{review.comment}"</p>
                    <div className="relative mt-4 flex items-center gap-3 border-t border-border/50 pt-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-sm font-bold text-primary">
                        {review.reviewer_name?.trim()?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="truncate text-sm font-semibold text-foreground">{review.reviewer_name}</p>
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-label="ভেরিফাইড" />
                        </div>
                        {review.course_title && <p className="truncate text-xs text-muted-foreground">{review.course_title}</p>}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Track Order */}
      <section className="relative py-10 sm:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/60 via-primary/[0.04] to-secondary/60 pointer-events-none" />
        <div className="absolute -top-12 -left-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-48 w-48 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
        <div className="container relative mx-auto px-4">
          <ScrollReveal>
            <div className="mx-auto max-w-lg">
              <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Search className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{settings.homepage_track_title || "আপনার অর্ডার ট্র্যাক করুন"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{settings.homepage_track_subtitle || "আপনার অর্ডারের বর্তমান অবস্থা জানুন"}</p>
                <div className="mt-6 space-y-3 text-left">
                  <div>
                    <label htmlFor="track-order-id" className="mb-1 block text-xs font-medium text-foreground">
                      অর্ডার আইডি
                    </label>
                    <Input
                      id="track-order-id"
                      className={`glass-input ${trackErrors.orderId ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="যেমন: ORD-XXXXXX"
                      value={trackOrderId}
                      onChange={(e) => {
                        setTrackOrderId(e.target.value);
                        if (trackErrors.orderId || trackErrors.form) setTrackErrors((p) => ({ ...p, orderId: undefined, form: undefined }));
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                      aria-invalid={!!trackErrors.orderId}
                      aria-describedby={trackErrors.orderId ? "track-order-id-error" : undefined}
                    />
                    {trackErrors.orderId && (
                      <p id="track-order-id-error" role="alert" className="mt-1 text-xs font-medium text-destructive">
                        {trackErrors.orderId}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="track-phone" className="mb-1 block text-xs font-medium text-foreground">
                      ফোন নম্বর
                    </label>
                    <Input
                      id="track-phone"
                      type="tel"
                      inputMode="tel"
                      className={`glass-input ${trackErrors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      placeholder="01XXXXXXXXX"
                      value={trackPhone}
                      onChange={(e) => {
                        setTrackPhone(e.target.value);
                        if (trackErrors.phone || trackErrors.form) setTrackErrors((p) => ({ ...p, phone: undefined, form: undefined }));
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                      aria-invalid={!!trackErrors.phone}
                      aria-describedby={trackErrors.phone ? "track-phone-error" : undefined}
                    />
                    {trackErrors.phone && (
                      <p id="track-phone-error" role="alert" className="mt-1 text-xs font-medium text-destructive">
                        {trackErrors.phone}
                      </p>
                    )}
                  </div>
                  <Button className="w-full glow-hover" onClick={handleTrack}>
                    <Search className="mr-1 h-4 w-4" /> ট্র্যাক করুন
                  </Button>
                  {trackErrors.form && (
                    <p role="alert" className="text-xs font-medium text-destructive">
                      {trackErrors.form}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    নিরাপত্তার জন্য অর্ডার আইডি ও ফোন নম্বর — দুটোই যাচাই হলে সম্পূর্ণ বিস্তারিত দেখানো হবে।
                  </p>
                </div>
                {/* Status journey strip */}
                <div className="mt-6 flex items-center justify-between gap-1 border-t border-border/50 pt-5">
                  {[
                    { icon: CheckCircle, label: "পেন্ডিং", color: "text-warning bg-warning/10" },
                    { icon: Package, label: "কনফার্মড", color: "text-primary bg-primary/10" },
                    { icon: Truck, label: "শিপড", color: "text-accent bg-accent/15" },
                    { icon: Sparkles, label: "ডেলিভারড", color: "text-success bg-success/10" },
                  ].map((s, i, arr) => (
                    <div key={s.label} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${s.color}`}>
                          <s.icon className="h-4 w-4" />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">{s.label}</span>
                      </div>
                      {i < arr.length - 1 && (
                        <div className="mx-1 h-0.5 flex-1 bg-gradient-to-r from-border to-border/30" aria-hidden="true" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};

export default Index;
