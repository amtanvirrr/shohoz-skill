import { Link } from "react-router-dom";
import { Star, Search, ArrowRight, BookOpen, GraduationCap, Clock, Users, CheckCircle, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings } from "@/hooks/useSiteSettings";

import HeroBanner from "@/components/HeroBanner";

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

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSiteSettings();
  const [trackQuery, setTrackQuery] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [dbBooks, setDbBooks] = useState<DbBook[]>([]);
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbReviews, setDbReviews] = useState<(DbReview & { course_title?: string })[]>([]);
  const [bookOrderMap, setBookOrderMap] = useState<Record<string, OrderInfo>>({});
  const [courseOrderMap, setCourseOrderMap] = useState<Record<string, string>>({});

  // Fetch featured products based on settings
  useEffect(() => {
    const featuredCourseIds = settings.featured_course_ids ? settings.featured_course_ids.split(",").filter(Boolean) : [];
    const featuredBookIds = settings.featured_book_ids ? settings.featured_book_ids.split(",").filter(Boolean) : [];

    // Courses
    if (featuredCourseIds.length > 0) {
      supabase.from("courses")
        .select("id, title, instructor, price, original_price, image_url, category, duration, slug")
        .eq("is_published", true)
        .in("id", featuredCourseIds)
        .then(({ data }) => setDbCourses(data || []));
    } else {
      supabase.from("courses")
        .select("id, title, instructor, price, original_price, image_url, category, duration, slug")
        .eq("is_published", true)
        .limit(3)
        .then(({ data }) => setDbCourses(data || []));
    }

    // Books
    if (featuredBookIds.length > 0) {
      supabase.from("books")
        .select("id, title, author, price, original_price, image_url, category, book_type, slug")
        .eq("is_published", true)
        .in("id", featuredBookIds)
        .then(({ data }) => setDbBooks(data || []));
    } else {
      supabase.from("books")
        .select("id, title, author, price, original_price, image_url, category, book_type, slug")
        .eq("is_published", true)
        .limit(3)
        .then(({ data }) => setDbBooks(data || []));
    }

    // Reviews (always latest)
    supabase.from("reviews").select("id, reviewer_name, rating, comment, course_id, courses(title)").eq("is_active", true).order("created_at", { ascending: false }).limit(8).then(({ data }) => {
      const mapped = (data || []).map((r: any) => ({
        id: r.id, reviewer_name: r.reviewer_name, rating: r.rating, comment: r.comment,
        course_id: r.course_id, course_title: r.courses?.title || "",
      }));
      setDbReviews(mapped);
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
          hasConfirmed ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
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
            {info.delivered > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-2.5 w-2.5" /> {info.delivered} ডেলিভারি</span>}
            {info.shipped > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Truck className="h-2.5 w-2.5" /> {info.shipped} শিপড</span>}
            {info.confirmed > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="h-2.5 w-2.5" /> {info.confirmed} কনফার্মড</span>}
            {info.pending > 0 && <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="h-2.5 w-2.5" /> {info.pending} পেন্ডিং</span>}
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
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      }`}>
        {["confirmed", "delivered"].includes(status) ? <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</> : <><Clock className="h-3 w-3" /> পেন্ডিং</>}
      </div>
    );
  };

  const handleTrack = async () => {
    const q = trackQuery.trim();
    if (!q) {
      toast({ title: "তথ্য দিন", description: "অর্ডার আইডি, ফোন, নাম, ইমেইল বা ট্রানজেকশন আইডি দিন।", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("order_id, status, product_title, created_at, customer_phone")
      .or(`order_id.ilike.%${q}%,customer_phone.ilike.%${q}%,customer_name.ilike.%${q}%,customer_email.ilike.%${q}%,transaction_id.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      setTrackResult(null);
      toast({ title: "অর্ডার পাওয়া যায়নি", description: "সঠিক তথ্য দিয়ে আবার চেষ্টা করুন।", variant: "destructive" });
    } else {
      setTrackResult(data);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "⏳ পেন্ডিং",
    confirmed: "✅ কনফার্মড",
    shipped: "🚚 শিপড",
    delivered: "📦 ডেলিভারড",
    cancelled: "❌ বাতিল",
  };

  return (
    <div>
      {/* Hero */}
      <HeroBanner />

      {/* Featured Courses */}
      <section className="py-10 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{settings.homepage_courses_title || "ফিচার্ড কোর্স"}</h2>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">{settings.homepage_courses_subtitle || "ক্যারিয়ার গড়তে সেরা কোর্সগুলো"}</p>
            </div>
            <Link to="/courses" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
              সব দেখুন <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {dbCourses.length > 0 ? (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:mt-8">
              {dbCourses.map((course) => (
                <Link key={course.id} to={`/course/${(course as any).slug || course.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  {renderCourseBadge(course.id)}
                  {course.image_url && <div className="aspect-video overflow-hidden"><img src={course.image_url} alt={course.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">🎓 অনলাইন কোর্স</span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground line-clamp-2">{course.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {course.price === 0 ? (
                        <>
                          <span className="text-lg font-bold text-green-600">ফ্রি</span>
                          {course.original_price && course.original_price > 0 && <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-foreground">৳{course.price.toLocaleString()}</span>
                          {course.original_price && <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">এখনো কোন কোর্স নেই। শীঘ্রই আসছে!</p>
          )}
          <Link to="/courses" className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline sm:hidden">
            সব কোর্স দেখুন <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Featured Books */}
      <section className="bg-secondary/50 py-10 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{settings.homepage_books_title || "ফিচার্ড বই"}</h2>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">{settings.homepage_books_subtitle || "নিজেকে এক ধাপ এগিয়ে নিন"}</p>
            </div>
            <Link to="/books" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">সব দেখুন <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {dbBooks.length > 0 ? (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:mt-8">
              {dbBooks.map((book) => (
                <Link key={book.id} to={`/book/${(book as any).slug || book.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  {renderBookBadge(book)}
                  {book.image_url && <div className="aspect-[3/4] overflow-hidden"><img src={book.image_url} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                        book.book_type === "ebook"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}>
                        {book.book_type === "ebook" ? "📱 ইবুক" : "📦 ফিজিক্যাল বই"}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground">{book.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                    <div className="mt-3 flex items-center gap-2">
                      {book.price === 0 ? (
                        <>
                          <span className="text-lg font-bold text-green-600">ফ্রি</span>
                          {book.original_price && book.original_price > 0 && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
                        </>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-foreground">৳{book.price}</span>
                          {book.original_price && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">এখনো কোন বই নেই। শীঘ্রই আসছে!</p>
          )}
        </div>
      </section>

      {/* Reviews */}
      {dbReviews.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">{settings.homepage_reviews_title || "আমাদের শিক্ষার্থীরা যা বলেন"}</h2>
            <p className="mx-auto mt-2 text-center text-muted-foreground">{settings.homepage_reviews_subtitle || "আমাদের শিক্ষার্থীদের মতামত"}</p>
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 sm:mt-10 sm:gap-6">
              {dbReviews.map((review) => (
                <div key={review.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex gap-0.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-card-foreground leading-relaxed">"{review.comment}"</p>
                  <div className="mt-4 border-t border-border pt-3">
                    <p className="text-sm font-semibold text-foreground">{review.reviewer_name}</p>
                    {review.course_title && <p className="text-xs text-muted-foreground">{review.course_title}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Track Order */}
      <section className="bg-secondary/50 py-10 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-lg text-center">
            <Search className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-foreground">{settings.homepage_track_title || "আপনার অর্ডার ট্র্যাক করুন"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{settings.homepage_track_subtitle || "আপনার অর্ডারের বর্তমান অবস্থা জানুন"}</p>
            <div className="mt-6 flex gap-3">
              <Input placeholder="অর্ডার আইডি, ফোন, নাম, ইমেইল বা ট্রানজেকশন আইডি" value={trackQuery} onChange={(e) => setTrackQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTrack()} />
              <Button className="shrink-0" onClick={handleTrack}>ট্র্যাক করুন</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">যেকোনো তথ্য দিয়ে অর্ডার খুঁজুন</p>
            {trackResult && (
              <div className="mt-4 space-y-3">
                {trackResult.map((order: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-4 text-left">
                    <p className="text-sm"><span className="font-medium">অর্ডার:</span> {order.order_id}</p>
                    <p className="text-sm"><span className="font-medium">প্রোডাক্ট:</span> {order.product_title}</p>
                    <p className="text-sm"><span className="font-medium">স্ট্যাটাস:</span> {statusLabels[order.status] || order.status}</p>
                    <p className="text-xs text-muted-foreground mt-1">অর্ডারের তারিখ: {new Date(order.created_at).toLocaleDateString("bn-BD")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
