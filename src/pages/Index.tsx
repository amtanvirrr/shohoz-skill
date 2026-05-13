import { Link, useNavigate } from "react-router-dom";
import { Star, Search, ArrowRight, BookOpen, GraduationCap, Clock, Users, CheckCircle, Package, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { ScrollReveal } from "@/hooks/useScrollReveal";
import FeaturedImage from "@/components/FeaturedImage";

import HeroBanner from "@/components/HeroBanner";
import MobileCarousel from "@/components/MobileCarousel";
import FeaturedCardSkeleton from "@/components/FeaturedCardSkeleton";
import EmptyState from "@/components/EmptyState";

interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  book_type: string;
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
  const [trackQuery, setTrackQuery] = useState("");
  const [trackError, setTrackError] = useState<string | null>(null);
  const [dbBooks, setDbBooks] = useState<DbBook[]>(() => featuredCache.books ?? []);
  const [dbCourses, setDbCourses] = useState<DbCourse[]>(() => featuredCache.courses ?? []);
  // Only show skeleton on the very first fetch — keep cached cards visible
  // while the background refresh runs on subsequent visits.
  const [coursesLoading, setCoursesLoading] = useState(() => featuredCache.courses === null);
  const [booksLoading, setBooksLoading] = useState(() => featuredCache.books === null);
  const [dbReviews, setDbReviews] = useState<(DbReview & { course_title?: string })[]>(() => featuredCache.reviews ?? []);
  const [reviewsLoading, setReviewsLoading] = useState(() => featuredCache.reviews === null);
  const [bookOrderMap, setBookOrderMap] = useState<Record<string, OrderInfo>>({});
  const [courseOrderMap, setCourseOrderMap] = useState<Record<string, string>>({});

  // Fetch featured products based on settings
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
    };
    const applyBooks = (data: DbBook[]) => {
      featuredCache.books = data;
      setDbBooks(data);
      setBooksLoading(false);
    };

    // Courses
    if (featuredCourseIds.length > 0) {
      supabase.from("courses")
        .select("id, title, instructor, price, original_price, image_url, category, duration, slug")
        .eq("is_published", true)
        .in("id", featuredCourseIds)
        .then(({ data }) => applyCourses((data as DbCourse[]) || []));
    } else {
      supabase.from("courses")
        .select("id, title, instructor, price, original_price, image_url, category, duration, slug")
        .eq("is_published", true)
        .limit(3)
        .then(({ data }) => applyCourses((data as DbCourse[]) || []));
    }

    // Books
    if (featuredBookIds.length > 0) {
      supabase.from("books")
        .select("id, title, author, price, original_price, image_url, category, book_type, slug")
        .eq("is_published", true)
        .in("id", featuredBookIds)
        .then(({ data }) => applyBooks((data as DbBook[]) || []));
    } else {
      supabase.from("books")
        .select("id, title, author, price, original_price, image_url, category, book_type, slug")
        .eq("is_published", true)
        .limit(3)
        .then(({ data }) => applyBooks((data as DbBook[]) || []));
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
  }, [settings.featured_course_ids, settings.featured_book_ids]);

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
            {info.delivered > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-success dark:bg-success/30 dark:text-success"><CheckCircle className="h-2.5 w-2.5" /> {info.delivered} ডেলিভারি</span>}
            {info.shipped > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary dark:bg-primary/30 dark:text-primary"><Truck className="h-2.5 w-2.5" /> {info.shipped} শিপড</span>}
            {info.confirmed > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-success px-2 py-0.5 text-[10px] font-medium text-success dark:bg-success/30 dark:text-success"><CheckCircle className="h-2.5 w-2.5" /> {info.confirmed} কনফার্মড</span>}
            {info.pending > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-warning px-2 py-0.5 text-[10px] font-medium text-warning dark:bg-warning/30 dark:text-warning"><Clock className="h-2.5 w-2.5" /> {info.pending} পেন্ডিং</span>}
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

  const validateTrackQuery = (raw: string): { ok: true; field: "order_id" | "phone"; value: string } | { ok: false; message: string } => {
    const q = raw.trim();
    if (!q) return { ok: false, message: "অর্ডার আইডি অথবা ফোন নম্বর দিন।" };
    if (q.length < 4) return { ok: false, message: "ইনপুটটি অনেক ছোট — অন্তত ৪টি অক্ষর দিন।" };
    if (q.length > 64) return { ok: false, message: "ইনপুটটি অনেক বড় — সঠিক অর্ডার আইডি বা ফোন নম্বর দিন।" };

    const onlyDigits = /^[\d\s+\-()]+$/.test(q);
    if (onlyDigits) {
      const phone = normalizeBdPhone(q);
      if (!phone) {
        return { ok: false, message: "সঠিক বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)।" };
      }
      return { ok: true, field: "phone", value: phone };
    }

    // Treat as Order ID — allow letters, digits, dashes/underscores only
    if (!/^[A-Za-z0-9_-]+$/.test(q)) {
      return { ok: false, message: "অর্ডার আইডিতে শুধু অক্ষর, সংখ্যা ও '-' '_' ব্যবহার করুন।" };
    }
    return { ok: true, field: "order_id", value: q };
  };

  const handleTrack = () => {
    const result = validateTrackQuery(trackQuery);
    if (result.ok === false) {
      const msg = result.message;
      setTrackError(msg);
      toast({ title: "যাচাই ব্যর্থ", description: msg, variant: "destructive" });
      return;
    }
    setTrackError(null);
    const params = new URLSearchParams();
    params.set(result.field, result.value);
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
          ) : dbCourses.length > 0 ? (
            <MobileCarousel count={dbCourses.length} label="ফিচার্ড কোর্স" desktopGridClass="sm:grid-cols-2 lg:grid-cols-3">
              {dbCourses.map((course, idx) => (
                <ScrollReveal key={course.id} delay={idx * 100} className="snap-start shrink-0 w-[82%] sm:w-auto sm:shrink">
                  <Link to={`/course/${(course as any).slug || course.id}?ref=featured#order-form`} className="group relative block h-full overflow-hidden rounded-xl glass-card shimmer">
                    {renderCourseBadge(course.id)}
                    <FeaturedImage src={course.image_url} alt={course.title} aspect="video" />
                    <div className="flex flex-col p-4 sm:p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/30 dark:text-primary">🎓 অনলাইন কোর্স</span>
                      </div>
                      <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground line-clamp-2 transition-colors group-hover:text-primary">{course.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          {course.price === 0 ? (
                            <>
                              <span className="text-xl font-extrabold text-success sm:text-lg">ফ্রি</span>
                              {course.original_price && course.original_price > 0 && <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                            </>
                          ) : (
                            <>
                              <span className="text-xl font-extrabold text-primary sm:text-lg sm:text-foreground">৳{course.price.toLocaleString()}</span>
                              {course.original_price && <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                            </>
                          )}
                        </div>
                        {(() => {
                          const cta = getCourseCta(course);
                          return (
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-transform group-hover:scale-105 ${ctaToneClass(cta.tone)}`}>
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
          ) : dbBooks.length > 0 ? (
            <MobileCarousel count={dbBooks.length} label="ফিচার্ড বই" desktopGridClass="sm:grid-cols-2 lg:grid-cols-3">
              {dbBooks.map((book, idx) => (
                <ScrollReveal key={book.id} delay={idx * 100} className="snap-start shrink-0 w-[82%] sm:w-auto sm:shrink">
                  <Link to={`/book/${(book as any).slug || book.id}?ref=featured#order-form`} className="group relative block h-full overflow-hidden rounded-xl glass-card shimmer">
                    {renderBookBadge(book)}
                    <FeaturedImage src={book.image_url} alt={book.title} aspect="portrait" />
                    <div className="flex flex-col p-4 sm:p-5">
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                          book.book_type === "ebook"
                            ? "bg-primary/10 text-primary"
                            : "bg-accent/15 text-accent"
                        }`}>
                          {book.book_type === "ebook" ? "📱 ইবুক" : "📦 ফিজিক্যাল বই"}
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground transition-colors group-hover:text-primary">{book.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          {book.price === 0 ? (
                            <>
                              <span className="text-xl font-extrabold text-success sm:text-lg">ফ্রি</span>
                              {book.original_price && book.original_price > 0 && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
                            </>
                          ) : (
                            <>
                              <span className="text-xl font-extrabold text-primary sm:text-lg sm:text-foreground">৳{book.price}</span>
                              {book.original_price && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
                            </>
                          )}
                        </div>
                        {(() => {
                          const cta = getBookCta(book);
                          return (
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-transform group-hover:scale-105 ${ctaToneClass(cta.tone)}`}>
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
                  <div className="glass-card rounded-xl p-5 h-full">
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-card-foreground leading-relaxed">"{review.comment}"</p>
                    <div className="mt-4 border-t border-border/50 pt-3">
                      <p className="text-sm font-semibold text-foreground">{review.reviewer_name}</p>
                      {review.course_title && <p className="text-xs text-muted-foreground">{review.course_title}</p>}
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
        <div className="container relative mx-auto px-4">
          <ScrollReveal>
            <div className="mx-auto max-w-lg">
              <div className="glass-card rounded-2xl p-6 sm:p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Search className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{settings.homepage_track_title || "আপনার অর্ডার ট্র্যাক করুন"}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{settings.homepage_track_subtitle || "আপনার অর্ডারের বর্তমান অবস্থা জানুন"}</p>
                <div className="mt-6 flex gap-3">
                  <Input
                    className={`glass-input ${trackError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    placeholder="অর্ডার আইডি অথবা ফোন নম্বর"
                    value={trackQuery}
                    onChange={(e) => {
                      setTrackQuery(e.target.value);
                      if (trackError) setTrackError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                    aria-invalid={!!trackError}
                    aria-describedby={trackError ? "track-error" : undefined}
                  />
                  <Button className="shrink-0 glow-hover" onClick={handleTrack}>ট্র্যাক করুন</Button>
                </div>
                {trackError && (
                  <p id="track-error" role="alert" className="mt-2 text-left text-xs font-medium text-destructive">
                    {trackError}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  পরবর্তী পেজে অর্ডার আইডি ও ফোন নম্বর — দুটোই যাচাই হলে সম্পূর্ণ বিস্তারিত দেখানো হবে।
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};

export default Index;
