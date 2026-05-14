import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Clock, CheckCircle, GraduationCap } from "lucide-react";
import { ScrollReveal } from "@/hooks/useScrollReveal";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import EmptyState from "@/components/EmptyState";
import Byline from "@/components/Byline";

interface DbCourse {
  id: string;
  title: string;
  slug: string;
  instructor: string;
  price: number;
  original_price: number | null;
  image_url: string;
  category: string;
  duration: string;
  lesson_count?: number;
}

const CoursesPage = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<DbCourse[]>([]);
  const [orderMap, setOrderMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("courses").select("*, lessons(id)").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => {
      const mapped = (data || []).map((c: any) => ({
        id: c.id, title: c.title, slug: c.slug, instructor: c.instructor, price: c.price,
        original_price: c.original_price, image_url: c.image_url, category: c.category,
        duration: c.duration, lesson_count: c.lessons?.length || 0,
      }));
      setCourses(mapped);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("orders")
      .select("product_id, status")
      .eq("user_id", user.id)
      .eq("product_type", "course")
      .not("status", "eq", "cancelled")
      .then(({ data }) => {
        const map: Record<string, string> = {};
        (data || []).forEach((o: any) => {
          if (!map[o.product_id] || ["confirmed", "delivered"].includes(o.status)) {
            map[o.product_id] = o.status;
          }
        });
        setOrderMap(map);
      });
  }, [user]);

  return (
    <div className="py-16 lg:py-20">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <div className="section-kicker mb-3">
            <GraduationCap className="h-3.5 w-3.5" />
            কোর্স
          </div>
          <h1 className="text-4xl font-bold text-foreground sm:text-5xl">সকল কোর্স</h1>
          <p className="mt-2 text-muted-foreground">
            আমাদের সকল কোর্স ব্রাউজ করুন{" "}
            {!loading && courses.length > 0 && (
              <span className="ml-1 font-medium text-foreground">({courses.length} টি)</span>
            )}
          </p>
        </ScrollReveal>

        {loading ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <ProductCardSkeleton aspect="video" count={6} />
          </div>
        ) : courses.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              icon={GraduationCap}
              title="এখনো কোন কোর্স নেই"
              description="শীঘ্রই নতুন কোর্স যোগ করা হবে। ফিরে এসে আবার দেখুন।"
            />
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course, idx) => {
              const status = orderMap[course.id];
              return (
                <ScrollReveal key={course.id} delay={idx * 80}>
                  <Link to={`/course/${course.slug}`} className="group relative block overflow-hidden rounded-xl glass-card shimmer">
                    {status && (
                      <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ["confirmed", "delivered"].includes(status)
                          ? "bg-success/15 text-success"
                          : "bg-warning/15 text-warning"
                      }`}>
                        {["confirmed", "delivered"].includes(status) ? (
                          <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</>
                        ) : (
                          <><Clock className="h-3 w-3" /> পেন্ডিং</>
                        )}
                      </div>
                    )}
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
                        <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/30 dark:text-primary">🎓 অনলাইন কোর্স</span>
                      </div>
                      <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground line-clamp-2 transition-colors group-hover:text-primary">{course.title}</h3>
                      <Byline value={course.instructor} emptyText="ইন্সট্রাক্টর শীঘ্রই জানানো হবে" />
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lesson_count} টি লেসন</span>
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
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;
