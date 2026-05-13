import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, PlayCircle, Users, Video, FileText, HelpCircle, ChevronDown, Star, Send, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollReveal } from "@/hooks/useScrollReveal";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePixel } from "@/components/MetaPixelProvider";
import OrderSuccessDialog from "@/components/OrderSuccessDialog";
import PaymentSelector from "@/components/PaymentSelector";

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

interface DbReview {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

const CourseDetail = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = usePixel();
  const [course, setCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Record<string, DbResource[]>>({});
  const [quizzes, setQuizzes] = useState<DbQuiz[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    orderId: string;
    message?: string;
    isFree?: boolean;
    paymentMethod?: string;
  } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!slug) return;
    supabase.from("courses").select("*").eq("slug", slug).maybeSingle().then(async (courseRes) => {
      const c = courseRes.data as DbCourse | null;
      setCourse(c);
      if (!c) { setLoading(false); return; }
      trackEvent("ViewContent", {
        content_name: c.title,
        content_type: "course",
        content_ids: [c.id],
        value: c.price,
        currency: "BDT",
      });
      const [lessonsRes, reviewsRes] = await Promise.all([
        supabase.from("lessons").select("*").eq("course_id", c.id).order("sort_order"),
        supabase.from("reviews").select("id, reviewer_name, rating, comment, created_at").eq("course_id", c.id).eq("is_active", true).order("created_at", { ascending: false }),
      ]);
      const lessonData = (lessonsRes.data as DbLesson[]) || [];
      setLessons(lessonData);
      setReviews((reviewsRes.data as DbReview[]) || []);

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
  }, [slug]);

  // Check if user has purchased this course
  useEffect(() => {
    if (!user || !course) return;
    supabase.from("orders")
      .select("status")
      .eq("user_id", user.id)
      .eq("product_id", course.id)
      .eq("product_type", "course")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOrderStatus(data[0].status);
        }
      });
  }, [user, course]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!course) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">কোর্সটি পাওয়া যায়নি</h2>
          <Button className="mt-4" asChild><Link to="/courses">কোর্সের তালিকায় ফিরে যান</Link></Button>
        </div>
      </div>
    );
  }

  const handleMfsSubmit = async (provider: string, txnId: string) => {
    if (!user) {
      toast({ title: "প্রথমে লগইন করুন", description: "কোর্স কিনতে লগইন প্রয়োজন।", variant: "destructive" });
      return;
    }
    const fullName = (user.user_metadata?.full_name || "").trim();
    const phone = (user.user_metadata?.phone || "").trim();
    if (!fullName || !/^01[3-9]\d{8}$/.test(phone)) {
      toast({
        title: "প্রোফাইল অসম্পূর্ণ",
        description: "অর্ডার করার আগে আপনার নাম ও সঠিক বাংলাদেশী মোবাইল নম্বর প্রোফাইলে যোগ করুন।",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: fullName,
      customer_phone: phone,
      customer_email: user.email,
      product_type: "course" as any,
      product_id: course.id,
      product_title: course.title,
      price: course.price,
      payment_method: provider as any,
      user_id: user.id,
      transaction_id: txnId,
    }).select("order_id").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "ক্রয় ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
    } else {
      // Send admin notification email (fire-and-forget)
      supabase.functions.invoke("notify-order", {
        body: { orderId: data.order_id },
      }).catch(() => {});

      trackEvent("Purchase", {
        content_name: course.title,
        content_type: "course",
        content_ids: [course.id],
        value: course.price,
        currency: "BDT",
        order_id: data.order_id,
      }, { em: user.email || undefined });
      // Helper builds the right copy from paymentMethod+productType.
      setSuccessDialog({ open: true, orderId: data.order_id, paymentMethod: provider });
      setOrderStatus("pending");
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !course) return;
    if (!reviewForm.comment.trim()) {
      toast({ title: "মন্তব্য লিখুন", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const { error } = await supabase.from("reviews").insert({
      course_id: course.id,
      user_id: user.id,
      reviewer_name: profile?.full_name || user.user_metadata?.full_name || "User",
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    });
    setSubmittingReview(false);
    if (error) {
      toast({ title: "রিভিউ জমা দিতে ব্যর্থ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "রিভিউ জমা হয়েছে! 🎉" });
      setReviewForm({ rating: 5, comment: "" });
      // Refresh reviews
      const { data } = await supabase.from("reviews").select("id, reviewer_name, rating, comment, created_at").eq("course_id", course.id).eq("is_active", true).order("created_at", { ascending: false });
      setReviews((data as DbReview[]) || []);
    }
  };

  return (
    <div className="py-10 lg:py-16">
      <div className="container mx-auto px-4">
        <Link to="/courses" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> কোর্সের তালিকায় ফিরে যান
        </Link>

        <div className="mt-4 grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ScrollReveal>
              {course.image_url && (
                <div className="overflow-hidden rounded-xl glass-card">
                  <img src={course.image_url} alt={course.title} className="aspect-video w-full object-cover" />
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {course.category}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary dark:bg-primary/30 dark:text-primary">🎓 অনলাইন কোর্স</span>
              </div>
              <h1 className="mt-3 text-3xl font-bold text-foreground lg:text-4xl">{course.title}</h1>
              <p className="mt-2 text-muted-foreground">ইন্সট্রাক্টর: {course.instructor}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {course.duration}</span>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={100}>
              <div className="mt-8 glass-card rounded-xl p-6">
                <h2 className="text-2xl font-bold text-foreground">কোর্স বিবরণ</h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">{course.description}</p>
              </div>
            </ScrollReveal>

            {lessons.length > 0 && (
              <ScrollReveal delay={200}>
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
              </ScrollReveal>
            )}

            {/* Reviews Section */}
            <ScrollReveal delay={300}>
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-foreground">রিভিউ ({reviews.length})</h2>

              {/* Review Form for purchased users */}
              {orderStatus && ["confirmed", "delivered"].includes(orderStatus) && (
                <div className="mt-4 rounded-xl glass-card p-5">
                  <h3 className="text-sm font-semibold text-foreground">আপনার রিভিউ দিন</h3>
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => setReviewForm((f) => ({ ...f, rating: n }))} className="p-0.5">
                        <Star className={`h-5 w-5 ${n <= reviewForm.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    rows={3}
                    placeholder="আপনার মতামত লিখুন..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                    className="mt-3"
                  />
                  <Button onClick={handleSubmitReview} disabled={submittingReview} size="sm" className="mt-3">
                    <Send className="mr-2 h-4 w-4" /> {submittingReview ? "জমা হচ্ছে..." : "রিভিউ দিন"}
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">এখনো কোনো রিভিউ নেই।</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg glass-card p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{r.reviewer_name}</span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("bn-BD")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-1">
            <ScrollReveal direction="right" delay={150}>
            <div className="sticky top-20 rounded-xl glass-card p-6 glow-hover">
              <div className="flex items-baseline gap-2">
                {course.price === 0 ? (
                  <span className="text-3xl font-bold text-success">ফ্রি</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">৳{course.price.toLocaleString()}</span>
                    {course.original_price && <span className="text-lg text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                  </>
                )}
              </div>
              {course.original_price && course.price > 0 && (
                <p className="mt-1 text-sm text-success font-medium">
                  {Math.round(((course.original_price - course.price) / course.original_price) * 100)}% ছাড়
                </p>
              )}

              {orderStatus && ["confirmed", "delivered"].includes(orderStatus) ? (
                <div className="mt-6">
                  <div className="rounded-lg border border-success/30 bg-success/5 p-3 text-center">
                    <CheckCircle2 className="mx-auto h-5 w-5 text-success" />
                    <p className="mt-1 text-sm font-semibold text-foreground">এনরোলমেন্ট নিশ্চিত হয়েছে</p>
                    <p className="text-xs text-muted-foreground">আজীবন অ্যাক্সেস উপভোগ করুন।</p>
                  </div>
                  <Button size="lg" className="mt-3 w-full" asChild>
                    <Link to={`/enrolled/${course.id}`}>কোর্সে যান →</Link>
                  </Button>
                </div>
              ) : orderStatus === "pending" ? (
                <div className="mt-6">
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-center">
                    <Clock className="mx-auto h-6 w-6 text-warning" />
                    <p className="mt-2 text-sm font-semibold text-foreground">পেমেন্ট যাচাই অপেক্ষমাণ</p>
                    <p className="mt-1 text-xs text-muted-foreground">অ্যাডমিন পেমেন্ট যাচাই করার পর (সাধারণত ১-৩ ঘণ্টা) কোর্সটি অ্যাক্সেস করতে পারবেন।</p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="mt-3 w-full">
                    <Link to="/dashboard">আমার অর্ডার দেখুন</Link>
                  </Button>
                </div>
              ) : course.price === 0 ? (
                <Button
                  size="lg"
                  className="mt-6 w-full"
                  disabled={submitting}
                  onClick={async () => {
                    if (!user) {
                      toast({ title: "প্রথমে লগইন করুন", description: "ফ্রি কোর্সে এনরোল করতে লগইন প্রয়োজন।", variant: "destructive" });
                      return;
                    }
                    setSubmitting(true);
                    const { data, error } = await supabase.from("orders").insert({
                      customer_name: user.user_metadata?.full_name || "Free User",
                      customer_phone: user.user_metadata?.phone || "",
                      customer_email: user.email,
                      product_type: "course" as any,
                      product_id: course.id,
                      product_title: course.title,
                      price: 0,
                      payment_method: "cod" as any,
                      user_id: user.id,
                      status: "confirmed" as any,
                      payment_verified: true,
                      notes: "Free product - auto confirmed",
                    }).select("order_id").single();
                    setSubmitting(false);
                    if (error) {
                      toast({ title: "ব্যর্থ হয়েছে", description: error.message, variant: "destructive" });
                    } else {
                      trackEvent("Purchase", {
                        content_name: course.title,
                        content_type: "course",
                        content_ids: [course.id],
                        value: 0,
                        currency: "BDT",
                        order_id: data.order_id,
                      });
                      setSuccessDialog({ open: true, orderId: data.order_id, isFree: true, message: "আপনি এখন কোর্সটি অ্যাক্সেস করতে পারবেন।" });
                      setOrderStatus("confirmed");
                    }
                  }}
                >
                  {submitting ? "প্রসেস হচ্ছে..." : "ফ্রিতে এনরোল করুন"}
                </Button>
              ) : (
                <div className="mt-6">
                  {!user && (
                    <div className="mb-3 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                      <span>অর্ডার করতে প্রথমে <Link to="/login" className="font-semibold text-primary underline">লগইন করুন</Link>। প্রোফাইলে আপনার নাম ও মোবাইল নম্বর যোগ থাকা প্রয়োজন।</span>
                    </div>
                  )}
                  <PaymentSelector
                    productType="course"
                    productId={course.id}
                    productTitle={course.title}
                    price={course.price}
                    onMfsSubmit={handleMfsSubmit}
                    submitting={submitting}
                  />
                </div>
              )}
              <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><PlayCircle className="h-3.5 w-3.5 text-primary" /> আজীবন অ্যাক্সেস</li>
                <li className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-primary" /> {lessons.length} টি লেসন</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> {course.duration} কন্টেন্ট</li>
              </ul>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
      {successDialog && course && (
        <OrderSuccessDialog
          open={successDialog.open}
          onClose={() => setSuccessDialog(null)}
          orderId={successDialog.orderId}
          productTitle={course.title}
          message={successDialog.message}
          isFree={successDialog.isFree}
          paymentMethod={successDialog.paymentMethod}
          productType="course"
        />
      )}
    </div>
  );
};

export default CourseDetail;
