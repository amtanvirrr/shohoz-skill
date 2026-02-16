import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, PlayCircle, Users, Video, FileText, HelpCircle, ChevronDown, Star, Send, Smartphone } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { usePixel } from "@/components/MetaPixelProvider";
import OrderSuccessDialog from "@/components/OrderSuccessDialog";

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

interface MfsMethod {
  id: string;
  provider: string;
  display_name: string;
  phone_number: string;
  qr_code_url: string | null;
  mfs_type: string;
  payment_instruction: string;
  process_message: string;
}

const CourseDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = usePixel();
  const [course, setCourse] = useState<DbCourse | null>(null);
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<Record<string, DbResource[]>>({});
  const [quizzes, setQuizzes] = useState<DbQuiz[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("bkash");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviews, setReviews] = useState<DbReview[]>([]);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [successDialog, setSuccessDialog] = useState<{ open: boolean; orderId: string; message?: string; isFree?: boolean } | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [mfsMethods, setMfsMethods] = useState<MfsMethod[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("lessons").select("*").eq("course_id", id).order("sort_order"),
      supabase.from("reviews").select("id, reviewer_name, rating, comment, created_at").eq("course_id", id).eq("is_active", true).order("created_at", { ascending: false }),
      supabase.from("payment_methods").select("*").eq("is_active", true).order("sort_order"),
    ]).then(async ([courseRes, lessonsRes, reviewsRes, mfsRes]) => {
      const c = courseRes.data as DbCourse | null;
      setCourse(c);
      if (c) {
        trackEvent("ViewContent", {
          content_name: c.title,
          content_type: "course",
          content_ids: [c.id],
          value: c.price,
          currency: "BDT",
        });
      }
      const lessonData = (lessonsRes.data as DbLesson[]) || [];
      setLessons(lessonData);
      setReviews((reviewsRes.data as DbReview[]) || []);
      const mfsData = (mfsRes.data as MfsMethod[]) || [];
      setMfsMethods(mfsData);
      if (mfsData.length > 0) setPaymentMethod(mfsData[0].provider);

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

  // Check if user has purchased this course
  useEffect(() => {
    if (!user || !id) return;
    supabase.from("orders")
      .select("status")
      .eq("user_id", user.id)
      .eq("product_id", id)
      .eq("product_type", "course")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setOrderStatus(data[0].status);
        }
      });
  }, [user, id]);

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
    if (!transactionId.trim()) {
      toast({ title: "Transaction ID দিন", description: "পেমেন্ট করার পর Transaction ID লিখুন", variant: "destructive" });
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
      transaction_id: transactionId.trim(),
    }).select("order_id").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    } else {
      // Send admin notification email (fire-and-forget)
      supabase.functions.invoke("notify-order", {
        body: {
          orderId: data.order_id,
          orderData: {
            order_id: data.order_id,
            customer_name: user.user_metadata?.full_name || "User",
            customer_phone: user.user_metadata?.phone || "",
            customer_email: user.email,
            customer_address: null,
            product_title: course.title,
            product_type: "course",
            price: course.price,
            payment_method: paymentMethod,
            transaction_id: transactionId.trim(),
            notes: null,
          },
        },
      }).catch(() => {});

      trackEvent("Purchase", {
        content_name: course.title,
        content_type: "course",
        content_ids: [course.id],
        value: course.price,
        currency: "BDT",
        order_id: data.order_id,
      }, { em: user.email || undefined });
      setSuccessDialog({ open: true, orderId: data.order_id, message: "পেমেন্ট ভেরিফিকেশনের পর কোর্স অ্যাক্সেস পাবেন।" });
      setTransactionId("");
      setOrderStatus("pending");
    }
  };

  const handleSubmitReview = async () => {
    if (!user || !id) return;
    if (!reviewForm.comment.trim()) {
      toast({ title: "Please write a comment", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const { error } = await supabase.from("reviews").insert({
      course_id: id,
      user_id: user.id,
      reviewer_name: profile?.full_name || user.user_metadata?.full_name || "User",
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    });
    setSubmittingReview(false);
    if (error) {
      toast({ title: "Failed to submit review", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted! 🎉" });
      setReviewForm({ rating: 5, comment: "" });
      // Refresh reviews
      const { data } = await supabase.from("reviews").select("id, reviewer_name, rating, comment, created_at").eq("course_id", id).eq("is_active", true).order("created_at", { ascending: false });
      setReviews((data as DbReview[]) || []);
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
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{course.category}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">🎓 অনলাইন কোর্স</span>
            </div>
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

            {/* Reviews Section */}
            <div className="mt-10">
              <h2 className="text-2xl font-bold text-foreground">রিভিউ ({reviews.length})</h2>

              {/* Review Form for purchased users */}
              {orderStatus && ["confirmed", "delivered"].includes(orderStatus) && (
                <div className="mt-4 rounded-xl border border-border bg-card p-5">
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
                    <Send className="mr-2 h-4 w-4" /> {submittingReview ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">এখনো কোনো রিভিউ নেই।</p>
              ) : (
                <div className="mt-4 space-y-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-card p-4">
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
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 rounded-xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-baseline gap-2">
                {course.price === 0 ? (
                  <span className="text-3xl font-bold text-green-600">ফ্রি</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">৳{course.price.toLocaleString()}</span>
                    {course.original_price && <span className="text-lg text-muted-foreground line-through">৳{course.original_price.toLocaleString()}</span>}
                  </>
                )}
              </div>
              {course.original_price && course.price > 0 && (
                <p className="mt-1 text-sm text-success font-medium">
                  {Math.round(((course.original_price - course.price) / course.original_price) * 100)}% off
                </p>
              )}

              {orderStatus && ["confirmed", "delivered"].includes(orderStatus) ? (
                <Button size="lg" className="mt-6 w-full" asChild>
                  <Link to={`/enrolled/${course.id}`}>কোর্সে যান →</Link>
                </Button>
              ) : orderStatus === "pending" ? (
                <div className="mt-6">
                  <div className="rounded-lg bg-yellow-500/10 p-4 text-center">
                    <Clock className="mx-auto h-6 w-6 text-yellow-500" />
                    <p className="mt-2 text-sm font-medium text-foreground">পেমেন্ট যাচাই অপেক্ষমাণ</p>
                    <p className="mt-1 text-xs text-muted-foreground">অ্যাডমিন পেমেন্ট যাচাই করার পর আপনি কোর্সটি অ্যাক্সেস করতে পারবেন।</p>
                  </div>
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
                      toast({ title: "Failed", description: error.message, variant: "destructive" });
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
                  {submitting ? "Processing..." : "ফ্রিতে এনরোল করুন"}
                </Button>
              ) : (
                <>
                  <div className="mt-6">
                    <p className="text-sm font-medium text-foreground">Payment Method</p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      {mfsMethods.length > 0 ? mfsMethods.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setPaymentMethod(m.provider)}
                          className={`rounded-lg border-2 px-4 py-3 text-center text-sm font-semibold transition-colors ${
                            paymentMethod === m.provider ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {m.display_name || m.provider}
                        </button>
                      )) : (["bkash", "nagad"] as const).map((method) => (
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

                    {/* Show selected MFS payment details */}
                    {(() => {
                      const selected = mfsMethods.find(m => m.provider === paymentMethod);
                      if (!selected) return null;
                      return (
                        <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <Smartphone className="h-4 w-4 text-primary" />
                            <span className="font-medium text-foreground">{selected.phone_number}</span>
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">{selected.mfs_type}</span>
                          </div>
                          {selected.qr_code_url && (
                            <img src={selected.qr_code_url} alt="QR Code" className="mx-auto h-32 w-32 rounded-lg border border-border object-contain" />
                          )}
                          {selected.payment_instruction && (
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{selected.payment_instruction}</p>
                          )}
                          {selected.process_message && (
                            <div className="rounded-md bg-primary/5 p-3 text-xs text-foreground whitespace-pre-line">{selected.process_message}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Transaction ID field */}
                  <div className="mt-4">
                    <Label htmlFor="courseTxnId" className="text-sm font-medium">Transaction ID *</Label>
                    <Input id="courseTxnId" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} className="mt-1" placeholder="যেমন: TXN1234ABCD" />
                  </div>

                  <Button onClick={handlePurchase} size="lg" className="mt-4 w-full" disabled={submitting}>
                    {submitting ? "Processing..." : "Purchase Course"}
                  </Button>
                </>
              )}
              <ul className="mt-6 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2"><PlayCircle className="h-3.5 w-3.5 text-primary" /> Lifetime access</li>
                <li className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-primary" /> {lessons.length} lessons</li>
                <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-primary" /> {course.duration} of content</li>
              </ul>
            </div>
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
        />
      )}
    </div>
  );
};

export default CourseDetail;
