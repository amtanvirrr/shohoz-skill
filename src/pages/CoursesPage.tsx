import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle, Clock, GraduationCap } from "lucide-react";
import { ScrollReveal } from "@/hooks/useScrollReveal";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import EmptyState from "@/components/EmptyState";
import CourseCard from "@/components/cards/CourseCard";

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
              const badge = status ? (
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
              ) : null;
              return (
                <ScrollReveal key={course.id} delay={idx * 80}>
                  <CourseCard course={course} variant="compact" badge={badge} />
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
