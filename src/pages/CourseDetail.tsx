import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Clock, PlayCircle, Users, Video, FileText, HelpCircle, ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";

interface DbCourse {
  id: string;
  title: string;
  instructor: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string;
  category: string;
  duration: string;
}

interface DbLesson {
  id: string;
  title: string;
  duration: string;
  sort_order: number;
  lesson_type: string;
  content: string | null;
  video_url: string;
}

interface DbResource {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string;
}

interface DbQuiz {
  id: string;
  title: string;
  lesson_id: string | null;
}

const CourseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [course, setCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Record<string, DbResource[]>>({});
  const [quizzes, setQuizzes] = useState<DbQuiz[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("*").eq("course_id", id).order("sort_order"),
    ]).then(async ([courseRes, lessonsRes]) => {
      setCourse(courseRes.data as DbCourse | null);
      const lessonData = (lessonsRes.data as DbLesson[]) || [];
      setLessons(lessonData);

      const lessonIds = lessonData.map((l) => l.id);
      if (lessonIds.length > 0) {
        const [resRes, quizRes] = await Promise.all([
          supabase.from("lesson_resources").select("id, lesson_id, title, file_url, file_type").in("lesson_id", lessonIds).order("sort_order"),
          supabase.from("quizzes").select("id, title, lesson_id").not("lesson_id", "is", null),
        ]);
        const grouped: Record<string, DbResource[]> = {};
        ((resRes.data as DbResource[]) || []).forEach((r) => {
          if (!grouped[r.lesson_id]) grouped[r.lesson_id] = [];
          grouped[r.lesson_id].push(r);
        });
        setResources(grouped);
        setQuizzes(((quizRes.data as DbQuiz[]) || []).filter((q) => q.lesson_id && lessonIds.includes(q.lesson_id)));
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!course) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">Course not found</h2>
          <Button className="mt-4" asChild><Link to="/courses">Back to Courses</Link></Button>
        </div>
      </div>
    );
  }

  const handlePurchase = async () => {
    if (!user) {
      toast({ title: "Please login first", description: "You need to be logged in to purchase courses.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: user.user_metadata?.full_name || "User",
      customer_phone: user.user_metadata?.phone || "",
      customer_email: user.email,
      product_type: "course" as any,
      product_id: course.id,
      product_title: course.title,
      price: course.price,
      payment_method: paymentMethod as any,
      user_id: user.id,
    }).select("order_id").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Purchase Initiated! 🎉", description: `Order ID: ${data.order_id}. Complete payment via ${paymentMethod === "bkash" ? "bKash" : "Nagad"}.` });
    }
  };

  return (
    <div className="py-10 lg:py-16">
      <div className="container mx-auto px-4">
        <Link to="/courses" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Courses
        </Link>

        <div className="mt-4 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {course.image_url && (
              <div className="overflow-hidden rounded-xl border border-border">
                <img src={course.image_url} alt={course.title} className="aspect-video w-full object-cover" />
              </div>
            )}
            <span className="mt-6 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
            <h1 className="mt-3 text-3xl font-bold text-foreground lg:text-4xl">{course.title}</h1>
            <p className="mt-2 text-muted-foreground">Instructor: {course.instructor}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration}</span>
              <span className="flex items-center gap-1"><Users className="h-4 w-4" /> 500+ Students</span>
            </div>
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-foreground">Course Overview</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">{course.description}</p>
            </div>

            {lessons.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">কারিকুলাম</h2>
                  <span className="text-sm text-muted-foreground">{lessons.length} টি লেসন</span>
                </div>
                <Accordion type="multiple" className="mt-4 space-y-2">
                  {lessons.map((lesson, i) => {
                    const lessonResources = resources[lesson.id] || [];
                    const lessonQuizzes = quizzes.filter((q) => q.lesson_id === lesson.id);

                    return (
                      <AccordionItem key={lesson.id} value={lesson.id} className="rounded-lg border border-border bg-card">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex w-full items-center gap-3 text-left">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {i + 1}
                            </span>
                            {lesson.lesson_type === "video" ? (
                              <Video className="h-4 w-4 shrink-0 text-primary" />
                            ) : (
                              <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-card-foreground">{lesson.title}</p>
                              <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                {lesson.lesson_type === "video" && <span>🎥 ভিডিও</span>}
                                {lesson.duration && <span>⏱ {lesson.duration}</span>}
                                {lessonResources.length > 0 && <span>📁 {lessonResources.length} রিসোর্স</span>}
                                {lessonQuizzes.length > 0 && <span>❓ {lessonQuizzes.length} কুইজ</span>}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          {lesson.content && (
                            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                              {lesson.content}
                            </p>
                          )}

                          {lessonResources.length > 0 && (
                            <div className="mb-3">
                              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">📁 রিসোর্স</h4>
                              <div className="space-y-1">
                                {lessonResources.map((res) => (
                                  <a
                                    key={res.id}
                                    href={res.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 rounded-md border border-border p-2 text-sm text-foreground transition-colors hover:bg-muted/50"
                                  >
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <span className="flex-1 truncate">{res.title}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {lessonQuizzes.length > 0 && (
                            <div>
                              <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">❓ কুইজ</h4>
                              <div className="space-y-1">
                                {lessonQuizzes.map((quiz) => (
                                  <div key={quiz.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                                    <HelpCircle className="h-4 w-4 text-primary" />
                                    <span className="text-foreground">{quiz.title}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {!lesson.content && lessonResources.length === 0 && lessonQuizzes.length === 0 && (
                            <p className="text-xs text-muted-foreground">এই লেসনের বিস্তারিত কোর্সে এনরোল করলে দেখা যাবে।</p>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">৳{course.price.toLocaleString()}</span>
                {course.original_price && <span className="text-lg text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
              </div>
              {course.original_price && (
                <p className="mt-1 text-sm text-success font-medium">
                  {Math.round(((course.original_price - course.price) / course.original_price) * 100)}% off
                </p>
              )}
              <div className="mt-6">
                <p className="text-sm font-medium text-foreground">Payment Method</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {(["bkash", "nagad"] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-lg border-2 px-4 py-3 text-center text-sm font-semibold transition-colors ${
                        paymentMethod === method ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {method === "bkash" ? "bKash" : "Nagad"}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handlePurchase} size="lg" className="mt-6 w-full" disabled={submitting}>
                {submitting ? "Processing..." : "Purchase Course"}
              </Button>
              <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><PlayCircle className="h-3.5 w-3.5 text-primary" /> Lifetime access</li>
                <li className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-primary" /> {lessons.length} lessons</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> {course.duration} of content</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
