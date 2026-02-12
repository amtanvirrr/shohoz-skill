import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, BookOpen, Clock, Video, FileText, HelpCircle, CheckCircle, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface DbCourse {
  id: string;
  title: string;
  instructor: string;
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
  video_url: string | null;
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

const EnrolledCourse = () => {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [resources, setResources] = useState<Record<string, DbResource[]>>({});
  const [quizzes, setQuizzes] = useState<DbQuiz[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      const { data: orderData } = await supabase
        .from("orders")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", id)
        .eq("product_type", "course")
        .in("status", ["confirmed", "delivered"])
        .limit(1);

      if (!orderData || orderData.length === 0) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
      setHasAccess(true);

      const [courseRes, lessonsRes, progressRes] = await Promise.all([
        supabase.from("courses").select("*").eq("id", id).maybeSingle(),
        supabase.from("lessons").select("*").eq("course_id", id).order("sort_order"),
        supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("course_id", id),
      ]);

      setCourse(courseRes.data as DbCourse | null);
      const lessonData = (lessonsRes.data as DbLesson[]) || [];
      setLessons(lessonData);
      setCompletedLessons(new Set((progressRes.data || []).map((p: any) => p.lesson_id)));

      if (lessonData.length > 0) {
        setActiveLesson(lessonData[0].id);
      }

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
    };

    fetchData();
  }, [id, user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!hasAccess) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="mt-4 text-2xl font-bold text-foreground">অ্যাক্সেস নেই</h2>
          <p className="mt-2 text-muted-foreground">এই কোর্সে আপনার অ্যাক্সেস নেই। দয়া করে কোর্সটি কিনুন।</p>
          <div className="mt-4 flex gap-3 justify-center">
            <Button asChild variant="outline"><Link to="/dashboard">ড্যাশবোর্ড</Link></Button>
            <Button asChild><Link to={`/course/${id}`}>কোর্স দেখুন</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const currentLesson = lessons.find((l) => l.id === activeLesson);

  const getEmbedUrl = (url: string): string => {
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    const longMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
    if (longMatch) return `https://www.youtube.com/embed/${longMatch[1]}`;
    return url;
  };

  const toggleLessonComplete = async (lessonId: string) => {
    if (!user || !id) return;
    const isCompleted = completedLessons.has(lessonId);
    if (isCompleted) {
      const { error } = await supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId);
      if (!error) {
        setCompletedLessons((prev) => {
          const n = new Set(prev);
          n.delete(lessonId);
          return n;
        });
        toast.info("লেসন অসম্পূর্ণ হিসেবে মার্ক করা হয়েছে");
      }
    } else {
      const { error } = await supabase
        .from("lesson_progress")
        .insert({ user_id: user.id, lesson_id: lessonId, course_id: id });
      if (!error) {
        setCompletedLessons((prev) => new Set(prev).add(lessonId));
        toast.success("লেসন সম্পূর্ণ হিসেবে মার্ক করা হয়েছে ✅");
      }
    }
  };

  const progressPercent = lessons.length > 0 ? Math.round((completedLessons.size / lessons.length) * 100) : 0;

  return (
    <div className="py-6 lg:py-10">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> ড্যাশবোর্ডে ফিরুন
          </Link>
          <Badge variant="default" className="gap-1">
            <CheckCircle className="h-3 w-3" /> এনরোলড
          </Badge>
        </div>

        <h1 className="text-2xl font-bold text-foreground lg:text-3xl">{course.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.instructor} • {course.duration}</p>

        {/* Progress bar */}
        <div className="mt-4 flex items-center gap-3">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            {completedLessons.size}/{lessons.length} সম্পূর্ণ ({progressPercent}%)
          </span>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main content area */}
          <div className="lg:col-span-2">
            {currentLesson ? (
              <div>
                {/* Video player */}
                {currentLesson.lesson_type === "video" && currentLesson.video_url ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-black">
                    <div className="aspect-video">
                      <iframe
                        src={getEmbedUrl(currentLesson.video_url)}
                        className="h-full w-full border-0"
                        title={currentLesson.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted">
                    <BookOpen className="h-16 w-16 text-muted-foreground/30" />
                  </div>
                )}

                {/* Lesson info */}
                <div className="mt-6">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {currentLesson.lesson_type === "video" ? (
                        <Video className="h-5 w-5 text-primary" />
                      ) : (
                        <BookOpen className="h-5 w-5 text-primary" />
                      )}
                      <h2 className="text-xl font-bold text-foreground">{currentLesson.title}</h2>
                    </div>
                    <Button
                      size="sm"
                      variant={completedLessons.has(currentLesson.id) ? "default" : "outline"}
                      onClick={() => toggleLessonComplete(currentLesson.id)}
                      className="shrink-0 gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      {completedLessons.has(currentLesson.id) ? "সম্পূর্ণ" : "সম্পূর্ণ করুন"}
                    </Button>
                  </div>
                  {currentLesson.duration && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {currentLesson.duration}
                    </p>
                  )}

                  {currentLesson.content && (
                    <div className="mt-4 rounded-lg border border-border bg-card p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{currentLesson.content}</p>
                    </div>
                  )}

                  {/* Lesson Resources */}
                  {(resources[currentLesson.id] || []).length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">📁 রিসোর্স</h3>
                      <div className="space-y-2">
                        {resources[currentLesson.id].map((res) => (
                          <a
                            key={res.id}
                            href={res.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground transition-colors hover:bg-muted/50"
                          >
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="flex-1 truncate">{res.title}</span>
                            <span className="text-xs text-muted-foreground uppercase">{res.file_type}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lesson Quizzes */}
                  {quizzes.filter((q) => q.lesson_id === currentLesson.id).length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">❓ কুইজ</h3>
                      <div className="space-y-2">
                        {quizzes.filter((q) => q.lesson_id === currentLesson.id).map((quiz) => (
                          <Link
                            key={quiz.id}
                            to={`/quizzes?id=${quiz.id}`}
                            className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm text-foreground transition-colors hover:bg-muted/50"
                          >
                            <HelpCircle className="h-4 w-4 text-primary" />
                            <span className="flex-1">{quiz.title}</span>
                            <span className="text-xs text-primary">কুইজ দিন →</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-xl border border-border bg-muted">
                <p className="text-muted-foreground">একটি লেসন সিলেক্ট করুন</p>
              </div>
            )}
          </div>

          {/* Sidebar - lesson list */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card">
              <div className="border-b border-border p-4">
                <h3 className="font-semibold text-foreground">কারিকুলাম</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{lessons.length} টি লেসন • {completedLessons.size} সম্পূর্ণ</p>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {lessons.map((lesson, i) => {
                  const isActive = activeLesson === lesson.id;
                  const isCompleted = completedLessons.has(lesson.id);
                  const lessonResCount = (resources[lesson.id] || []).length;
                  const lessonQuizCount = quizzes.filter((q) => q.lesson_id === lesson.id).length;

                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson.id)}
                      className={`flex w-full items-start gap-3 border-b border-border p-3 text-left transition-colors last:border-b-0 ${
                        isActive ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isCompleted
                            ? "bg-green-500 text-white"
                            : isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium line-clamp-2 ${isCompleted ? "text-green-600 dark:text-green-400" : isActive ? "text-primary" : "text-foreground"}`}>
                          {lesson.title}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {lesson.lesson_type === "video" && <span>🎥 ভিডিও</span>}
                          {lesson.duration && <span>⏱ {lesson.duration}</span>}
                          {lessonResCount > 0 && <span>📁 {lessonResCount}</span>}
                          {lessonQuizCount > 0 && <span>❓ {lessonQuizCount}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnrolledCourse;
