import { Link } from "react-router-dom";
import { Star, Search, ArrowRight, BookOpen, GraduationCap, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import HeroBanner from "@/components/HeroBanner";

interface DbBook {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
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

const Index = () => {
  const { toast } = useToast();
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [dbBooks, setDbBooks] = useState<DbBook[]>([]);
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);
  const [dbReviews, setDbReviews] = useState<(DbReview & { course_title?: string })[]>([]);
  useEffect(() => {
    supabase.from("books").select("id, title, author, price, original_price, image_url, category").eq("is_published", true).limit(3).then(({ data }) => setDbBooks(data || []));
    supabase.from("courses").select("id, title, instructor, price, original_price, image_url, category, duration").eq("is_published", true).limit(3).then(({ data }) => setDbCourses(data || []));
    // Fetch active reviews with course title
    supabase.from("reviews").select("id, reviewer_name, rating, comment, course_id, courses(title)").eq("is_active", true).order("created_at", { ascending: false }).limit(8).then(({ data }) => {
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        reviewer_name: r.reviewer_name,
        rating: r.rating,
        comment: r.comment,
        course_id: r.course_id,
        course_title: r.courses?.title || "",
      }));
      setDbReviews(mapped);
    });
  }, []);

  const handleTrack = async () => {
    if (!trackOrderId && !trackPhone) {
      toast({ title: "অর্ডার আইডি অথবা ফোন নাম্বার দিন", variant: "destructive" });
      return;
    }

    let query = supabase
      .from("orders")
      .select("order_id, status, product_title, created_at, customer_phone");

    if (trackOrderId && trackPhone) {
      query = query.eq("order_id", trackOrderId).eq("customer_phone", trackPhone);
    } else if (trackOrderId) {
      query = query.eq("order_id", trackOrderId);
    } else {
      query = query.eq("customer_phone", trackPhone);
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(5);

    if (error || !data || data.length === 0) {
      setTrackResult(null);
      toast({ title: "অর্ডার পাওয়া যায়নি", description: "অর্ডার আইডি অথবা ফোন নাম্বার চেক করুন।", variant: "destructive" });
    } else {
      setTrackResult(data);
    }
  };

  const statusLabels: Record<string, string> = {
    pending: "⏳ Pending",
    confirmed: "✅ Confirmed",
    shipped: "🚚 Shipped",
    delivered: "📦 Delivered",
    cancelled: "❌ Cancelled",
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
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Courses</h2>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">ক্যারিয়ার গড়তে সেরা কোর্সগুলো</p>
            </div>
            <Link to="/courses" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {dbCourses.length > 0 ? (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:mt-8">
              {dbCourses.map((course) => (
                <Link key={course.id} to={`/course/${course.id}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  {course.image_url && <div className="aspect-video overflow-hidden"><img src={course.image_url} alt={course.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                  <div className="p-5">
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
                    <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground line-clamp-2">{course.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">৳{course.price.toLocaleString()}</span>
                      {course.original_price && <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">No courses available yet. Check back soon!</p>
          )}
          <Link to="/courses" className="mt-4 flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline sm:hidden">
            View All Courses <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Featured Books */}
      <section className="bg-secondary/50 py-10 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Books</h2>
              <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">নিজেকে এক ধাপ এগিয়ে নিন</p>
            </div>
            <Link to="/books" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">View All <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {dbBooks.length > 0 ? (
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6 sm:mt-8">
              {dbBooks.map((book) => (
                <Link key={book.id} to={`/book/${book.id}`} className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  {book.image_url && <div className="aspect-[3/4] overflow-hidden"><img src={book.image_url} alt={book.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                  <div className="p-5">
                    <span className="inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">{book.category}</span>
                    <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground">{book.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-lg font-bold text-foreground">৳{book.price}</span>
                      {book.original_price && <span className="text-sm text-muted-foreground line-through">৳{book.original_price}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-center text-muted-foreground">No books available yet. Check back soon!</p>
          )}
        </div>
      </section>

      {/* Reviews */}
      {dbReviews.length > 0 && (
      <section className="py-10 sm:py-16 lg:py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">What Our Students Say</h2>
            <p className="mx-auto mt-2 text-center text-muted-foreground">আমাদের শিক্ষার্থীদের মতামত</p>
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
            <h2 className="mt-4 text-2xl font-bold text-foreground">Track Your Order</h2>
            <p className="mt-2 text-sm text-muted-foreground">আপনার অর্ডারের বর্তমান অবস্থা জানুন</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Input placeholder="অর্ডার আইডি" value={trackOrderId} onChange={(e) => setTrackOrderId(e.target.value)} />
              <Input placeholder="ফোন নাম্বার" value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} />
              <Button className="shrink-0" onClick={handleTrack}>Track</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">যেকোনো একটি দিলেই হবে</p>
            {trackResult && (
              <div className="mt-4 space-y-3">
                {trackResult.map((order: any, idx: number) => (
                  <div key={idx} className="rounded-lg border border-border bg-card p-4 text-left">
                    <p className="text-sm"><span className="font-medium">Order:</span> {order.order_id}</p>
                    <p className="text-sm"><span className="font-medium">Product:</span> {order.product_title}</p>
                    <p className="text-sm"><span className="font-medium">Status:</span> {statusLabels[order.status] || order.status}</p>
                    <p className="text-xs text-muted-foreground mt-1">Placed: {new Date(order.created_at).toLocaleDateString()}</p>
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
