import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Clock, CheckCircle } from "lucide-react";

interface DbCourse {
  id: string;
  title: string;
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

  useEffect(() => {
    supabase.from("courses").select("*, lessons(id)").eq("is_published", true).order("created_at", { ascending: false }).then(({ data }) => {
      const mapped = (data || []).map((c: any) => ({
        id: c.id, title: c.title, instructor: c.instructor, price: c.price,
        original_price: c.original_price, image_url: c.image_url, category: c.category,
        duration: c.duration, lesson_count: c.lessons?.length || 0,
      }));
      setCourses(mapped);
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
        <h1 className="text-4xl font-bold text-foreground">All Courses</h1>
        <p className="mt-2 text-muted-foreground">আমাদের সকল কোর্স ব্রাউজ করুন</p>

        {courses.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">No courses available yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => {
              const status = orderMap[course.id];
              return (
                <Link key={course.id} to={`/course/${(course as any).slug || course.id}`} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md">
                  {status && (
                    <div className={`absolute top-3 right-3 z-10 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      ["confirmed", "delivered"].includes(status)
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}>
                      {["confirmed", "delivered"].includes(status) ? (
                        <><CheckCircle className="h-3 w-3" /> কেনা হয়েছে</>
                      ) : (
                        <><Clock className="h-3 w-3" /> পেন্ডিং</>
                      )}
                    </div>
                  )}
                  {course.image_url && <div className="aspect-video overflow-hidden"><img src={course.image_url} alt={course.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /></div>}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">🎓 অনলাইন কোর্স</span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-card-foreground line-clamp-2">{course.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{course.instructor}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {course.lesson_count} টি লেসন</span>
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {course.duration}</span>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      {course.price === 0 ? (
                        <>
                          <span className="text-lg font-bold text-green-600">ফ্রি</span>
                          {course.original_price && course.original_price > 0 && (
                            <span className="text-sm text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>
                          )}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursesPage;