import { Link } from "react-router-dom";
import { Star, Search, ArrowRight, BookOpen, GraduationCap, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { reviews } from "@/data/mock-data";
import heroBg from "@/assets/hero-bg.jpg";

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

const Index = () => {
  const { toast } = useToast();
  const [trackOrderId, setTrackOrderId] = useState("");
  const [trackPhone, setTrackPhone] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [dbBooks, setDbBooks] = useState<DbBook[]>([]);
  const [dbCourses, setDbCourses] = useState<DbCourse[]>([]);

  useEffect(() => {
    supabase.from("books").select("id, title, author, price, original_price, image_url, category").eq("is_published", true).limit(3).then(({ data }) => setDbBooks(data || []));
    supabase.from("courses").select("id, title, instructor, price, original_price, image_url, category, duration").eq("is_published", true).limit(3).then(({ data }) => setDbCourses(data || []));
  }, []);

  const handleTrack = async () => {
    if (!trackOrderId || !trackPhone) {
      toast({ title: "Please enter Order ID and Phone Number", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase
      .from("orders")
      .select("order_id, status, product_title, created_at, customer_phone")
      .eq("order_id", trackOrderId)
      .eq("customer_phone", trackPhone)
      .maybeSingle();

    if (error || !data) {
      setTrackResult(null);
      toast({ title: "Order not found", description: "Please check your Order ID and Phone Number.", variant: "destructive" });
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
      <section className="relative overflow-hidden bg-primary py-20 lg:py-28">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="container relative mx-auto px-4 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold text-primary-foreground lg:text-5xl xl:text-6xl">
            শেখার নতুন দিগন্ত — কোর্স ও বই এক জায়গায়
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-primary-foreground/80">
            প্রফেশনাল কোর্স, হ্যান্ডপিকড বই এবং কোয়ালিটি কন্টেন্ট দিয়ে আপনার স্কিল ডেভেলপ করুন।
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="accent" size="lg" asChild>
              <Link to="/courses"><GraduationCap className="mr-2 h-5 w-5" /> Explore Courses</Link>
            </Button>
            <Button variant="hero" className="bg-primary-foreground/15 hover:bg-primary-foreground/25 border border-primary-foreground/30" size="lg" asChild>
              <Link to="/books"><BookOpen className="mr-2 h-5 w-5" /> Browse Books</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-primary-foreground/70">
            <div className="flex items-center gap-2"><Users className="h-4 w-4" /> 5,000+ Students</div>
            <div className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> 50+ Books</div>
            <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> 30+ Courses</div>
          </div>
        </div>
      </section>

      {/* Featured Courses */}
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Featured Courses</h2>
              <p className="mt-2 text-muted-foreground">ক্যারিয়ার গড়তে সেরা কোর্সগুলো</p>
            </div>
            <Link to="/courses" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {dbCourses.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </section>

      {/* Featured Books */}
      <section className="bg-secondary/50 py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">Featured Books</h2>
              <p className="mt-2 text-muted-foreground">নিজেকে এক ধাপ এগিয়ে নিন</p>
            </div>
            <Link to="/books" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline md:flex">View All <ArrowRight className="h-4 w-4" /></Link>
          </div>
          {dbBooks.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
      <section className="py-16 lg:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-foreground">What Our Students Say</h2>
          <p className="mx-auto mt-2 text-center text-muted-foreground">আমাদের শিক্ষার্থীদের মতামত</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reviews.map((review) => (
              <div key={review.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex gap-0.5">
                  {Array.from({ length: review.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <p className="mt-3 text-sm text-card-foreground leading-relaxed">"{review.comment}"</p>
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-sm font-semibold text-foreground">{review.name}</p>
                  <p className="text-xs text-muted-foreground">{review.product}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Track Order */}
      <section className="bg-secondary/50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-lg text-center">
            <Search className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-foreground">Track Your Order</h2>
            <p className="mt-2 text-sm text-muted-foreground">আপনার অর্ডারের বর্তমান অবস্থা জানুন</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Input placeholder="Order ID" value={trackOrderId} onChange={(e) => setTrackOrderId(e.target.value)} />
              <Input placeholder="Phone Number" value={trackPhone} onChange={(e) => setTrackPhone(e.target.value)} />
              <Button className="shrink-0" onClick={handleTrack}>Track</Button>
            </div>
            {trackResult && (
              <div className="mt-4 rounded-lg border border-border bg-card p-4 text-left">
                <p className="text-sm"><span className="font-medium">Order:</span> {trackResult.order_id}</p>
                <p className="text-sm"><span className="font-medium">Product:</span> {trackResult.product_title}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {statusLabels[trackResult.status] || trackResult.status}</p>
                <p className="text-xs text-muted-foreground mt-1">Placed: {new Date(trackResult.created_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
