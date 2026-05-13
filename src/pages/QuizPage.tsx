import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, ArrowLeft, AlertTriangle, History, Trophy, Medal, Lock, Smartphone, Eye, ChevronLeft, ChevronRight, Info, Lightbulb, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import OrderSuccessDialog from "@/components/OrderSuccessDialog";
import PaymentSelector from "@/components/PaymentSelector";
import { ScrollReveal } from "@/hooks/useScrollReveal";

interface QuizAttempt {
  id: string;
  score: number;
  total_questions: number;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  best_score: number;
  attempts_count: number;
  last_attempt_at: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  negative_marking: boolean;
  negative_mark_value: number;
  duration_minutes: number;
  price: number;
  original_price: number | null;
}

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option?: string;
  explanation?: string | null;
  section_id: string | null;
}

interface QuizSection {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
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

const QuizPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const directQuizId = searchParams.get("id");
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizSections, setQuizSections] = useState<QuizSection[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt[]>>({});
  const [leaderboard, setLeaderboard] = useState<Record<string, LeaderboardEntry[]>>({});
  const [sectionCounts, setSectionCounts] = useState<Record<string, number>>({});
  const [showLeaderboard, setShowLeaderboard] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [directQuizStarted, setDirectQuizStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPalette, setShowPalette] = useState(false);

  // Purchase state
  const [quizOrderStatus, setQuizOrderStatus] = useState<Record<string, string>>({});
  const [purchasingQuiz, setPurchasingQuiz] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successDialog, setSuccessDialog] = useState<{
    open: boolean;
    orderId: string;
    message?: string;
    isFree?: boolean;
    paymentMethod?: string;
  } | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [previewSections, setPreviewSections] = useState<QuizSection[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (quiz: Quiz) => {
    setPreviewQuiz(quiz);
    setPreviewLoading(true);
    const [qRes, secRes] = await Promise.all([
      supabase.rpc("get_quiz_questions", { _quiz_id: quiz.id }),
      supabase.from("quiz_sections").select("*").eq("quiz_id", quiz.id).order("sort_order"),
    ]);
    setPreviewQuestions(((qRes.data as Question[]) || []).slice(0, 3));
    setPreviewSections((secRes.data as QuizSection[]) || []);
    setPreviewLoading(false);
  };

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (directQuizId && !directQuizStarted) {
        const { data } = await supabase.from("quizzes").select("*").eq("id", directQuizId).eq("is_published", true).single();
        if (data) {
          const quiz = data as Quiz;
          setDirectQuizStarted(true);
          startQuiz(quiz);
        }
        return;
      }

      const [{ data }, { data: counts }] = await Promise.all([
        supabase.from("quizzes").select("*, quiz_sections(id)").eq("is_published", true).is("lesson_id", null),
        supabase.rpc("get_quiz_question_counts"),
      ]);
      const countMap: Record<string, number> = {};
      (counts as any[] | null)?.forEach((c) => { countMap[c.quiz_id] = Number(c.question_count) || 0; });
      if (data) {
        const qCounts: Record<string, number> = {};
        const secCounts: Record<string, number> = {};
        const mapped = data.map((q: any) => {
          qCounts[q.id] = countMap[q.id] || 0;
          secCounts[q.id] = q.quiz_sections?.length || 0;
          const { quiz_sections, ...rest } = q;
          return rest as Quiz;
        });
        setQuestionCounts(qCounts);
        setSectionCounts(secCounts);
        setQuizzes(mapped);
      }
    };
    fetchQuizzes();
  }, [directQuizId]);

  useEffect(() => {
    if (!user || quizzes.length === 0) return;
    const paidQuizIds = quizzes.filter(q => q.price > 0).map(q => q.id);
    if (paidQuizIds.length === 0) return;

    supabase.from("orders")
      .select("product_id, status")
      .eq("user_id", user.id)
      .eq("product_type", "quiz" as any)
      .in("product_id", paidQuizIds)
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const statusMap: Record<string, string> = {};
          data.forEach((o: any) => {
            if (!statusMap[o.product_id]) statusMap[o.product_id] = o.status;
          });
          setQuizOrderStatus(statusMap);
        }
      });
  }, [user, quizzes]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("quiz_attempts")
      .select("id, score, total_questions, created_at, quiz_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          const grouped: Record<string, QuizAttempt[]> = {};
          data.forEach((a: any) => {
            if (!grouped[a.quiz_id]) grouped[a.quiz_id] = [];
            grouped[a.quiz_id].push(a);
          });
          setAttempts(grouped);
        }
      });
  }, [user, submitted]);

  const fetchLeaderboard = async (quizId: string) => {
    if (showLeaderboard === quizId) {
      setShowLeaderboard(null);
      return;
    }
    const { data } = await supabase.rpc("get_quiz_leaderboard", { _quiz_id: quizId, _limit: 10 });
    if (data) {
      setLeaderboard((prev) => ({ ...prev, [quizId]: data as LeaderboardEntry[] }));
    }
    setShowLeaderboard(quizId);
  };

  useEffect(() => {
    if (!selectedQuiz || submitted) return;
    if (timeLeft <= 0 && selectedQuiz) {
      setTimeExpired(true);
      toast({
        title: "⏰ সময় শেষ!",
        description: "উত্তর লক করা হয়েছে এবং কুইজ স্বয়ংক্রিয়ভাবে সাবমিট হচ্ছে।",
        variant: "destructive",
      });
      handleSubmit();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [selectedQuiz, submitted, timeLeft === 0]);

  const startQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    setSubmitted(false);
    setTimeExpired(false);
    setCurrentIndex(0);
    setTimeLeft(quiz.duration_minutes * 60);
    const [qRes, secRes] = await Promise.all([
      supabase.rpc("get_quiz_questions", { _quiz_id: quiz.id }),
      supabase.from("quiz_sections").select("*").eq("quiz_id", quiz.id).order("sort_order"),
    ]);
    setQuestions((qRes.data as Question[]) || []);
    setQuizSections((secRes.data as QuizSection[]) || []);
  };

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
  }, [submitted]);

  const [serverResult, setServerResult] = useState<{ score: number; correct: number; wrong: number; skipped: number; total: number } | null>(null);

  useEffect(() => {
    if (!submitted || !selectedQuiz || questions.length === 0 || !user) return;
    setQuizSubmitting(true);
    const submit = async () => {
      const { data, error } = await supabase.rpc("submit_quiz_attempt", {
        _quiz_id: selectedQuiz.id,
        _answers: answers,
      });
      if (error || !data) {
        console.error("Failed to submit quiz attempt:", error);
        toast({
          title: "সাবমিট ব্যর্থ হয়েছে",
          description: "আবার চেষ্টা করুন বা কিছুক্ষণ পরে আসুন।",
          variant: "destructive",
        });
        setQuizSubmitting(false);
        return;
      }
      const result = data as any;
      const correctMap: Record<string, string> = result.correct_map || {};
      const explanations: Record<string, string> = result.explanations || {};
      setQuestions((prev) => prev.map((q) => ({
        ...q,
        correct_option: correctMap[q.id],
        explanation: explanations[q.id] ?? null,
      })));
      setServerResult({
        score: Number(result.score) || 0,
        correct: Number(result.correct) || 0,
        wrong: Number(result.wrong) || 0,
        skipped: Number(result.skipped) || 0,
        total: Number(result.total) || 0,
      });
      const { data: lbData } = await supabase.rpc("get_quiz_leaderboard", { _quiz_id: selectedQuiz.id, _limit: 10 });
      if (lbData) {
        setLeaderboard((prev) => ({ ...prev, [selectedQuiz.id]: lbData as LeaderboardEntry[] }));
      }
      setQuizSubmitting(false);
      toast({
        title: "✅ সফলভাবে জমা হয়েছে",
        description: `স্কোর: ${Number(result.score) || 0} • সঠিক: ${Number(result.correct) || 0} / ${Number(result.total) || 0}`,
      });
    };
    submit();
  }, [submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getResults = () => {
    if (serverResult) return serverResult;
    return { correct: 0, wrong: 0, skipped: 0, score: 0 };
  };

  const handlePurchaseQuiz = async (quiz: Quiz) => {
    if (!user) {
      toast({ title: "লগইন করুন", description: "কুইজ কিনতে আগে লগইন করুন।", variant: "destructive" });
      return;
    }

    if (quiz.price === 0) {
      const { data, error } = await supabase.from("orders").insert({
        customer_name: user.user_metadata?.full_name || "User",
        customer_phone: user.user_metadata?.phone || "",
        customer_email: user.email,
        product_type: "quiz" as any,
        product_id: quiz.id,
        product_title: quiz.title,
        price: 0,
        payment_method: "cod" as any,
        user_id: user.id,
        status: "confirmed" as any,
      }).select("order_id").single();
      if (!error && data) {
        setQuizOrderStatus(prev => ({ ...prev, [quiz.id]: "confirmed" }));
        startQuiz(quiz);
      }
      return;
    }

    setPurchasingQuiz(quiz.id);
  };

  const submitPurchase = async (quiz: Quiz, provider: string, txnId: string) => {
    if (!user) return;
    setSubmitting(true);
    const { data, error } = await supabase.from("orders").insert({
      customer_name: user.user_metadata?.full_name || "User",
      customer_phone: user.user_metadata?.phone || "",
      customer_email: user.email,
      product_type: "quiz" as any,
      product_id: quiz.id,
      product_title: quiz.title,
      price: quiz.price,
      payment_method: provider as any,
      user_id: user.id,
      transaction_id: txnId,
    }).select("order_id").single();
    setSubmitting(false);

    if (error) {
      toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    } else if (data) {
      setQuizOrderStatus(prev => ({ ...prev, [quiz.id]: "pending" }));
      setPurchasingQuiz(null);
      setSuccessDialog({ open: true, orderId: data.order_id, paymentMethod: provider });

      supabase.functions.invoke("notify-order", {
        body: { orderId: data.order_id },
      }).catch(() => {});
    }
  };

  const canAccessQuiz = (quiz: Quiz): boolean => {
    if (quiz.price === 0) return true;
    const status = quizOrderStatus[quiz.id];
    return status === "confirmed" || status === "delivered";
  };

  const getQuizStatusBadge = (quiz: Quiz) => {
    if (quiz.price === 0) return null;
    const status = quizOrderStatus[quiz.id];
    if (status === "confirmed" || status === "delivered") {
      return <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">✅ কেনা হয়েছে</span>;
    }
    if (status === "pending") {
      return <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">⏳ যাচাই অপেক্ষমাণ</span>;
    }
    return null;
  };

  const renderQuestion = (q: Question, i: number) => {
    const userAnswer = answers[q.id];
    const isCorrect = userAnswer === q.correct_option;
    return (
      <div key={q.id} className={`rounded-xl glass-card p-5 sm:p-6 ${submitted ? (userAnswer ? (isCorrect ? "border-success/30" : "border-destructive/30") : "") : ""}`}>
        <p className="font-medium text-foreground">
          <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
          <span dangerouslySetInnerHTML={{ __html: q.question }} />
        </p>
        <div className="mt-4 space-y-2">
          {["a", "b", "c", "d"].map((opt) => {
            const isThisCorrect = q.correct_option === opt;
            const isSelected = userAnswer === opt;
            let classes = "border-border hover:border-primary/40";
            if (submitted) {
              if (isThisCorrect) classes = "border-success bg-success/5";
              else if (isSelected && !isThisCorrect) classes = "border-destructive bg-destructive/5";
              else classes = "border-border opacity-60";
            } else if (isSelected) {
              classes = "border-primary bg-primary/5";
            }
            return (
              <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all duration-200 ${classes} ${submitted ? "pointer-events-none" : ""}`}>
                <input type="radio" name={q.id} value={opt} checked={isSelected} onChange={() => setAnswers({ ...answers, [q.id]: opt })} className="accent-primary" disabled={submitted} />
                <span className="mr-1 text-xs font-bold text-muted-foreground">{opt.toUpperCase()})</span>
                <span className="flex-1 text-sm text-foreground">{(q as any)[`option_${opt}`]}</span>
                {submitted && isThisCorrect && <CheckCircle className="h-5 w-5 shrink-0 text-success" />}
                {submitted && isSelected && !isThisCorrect && <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
              </label>
            );
          })}
        </div>
        {submitted && q.explanation && (
          <div className="mt-4 rounded-lg bg-primary/5 p-4 text-sm text-primary">
            <span className="font-semibold">ব্যাখ্যা:</span> <span dangerouslySetInnerHTML={{ __html: q.explanation }} />
          </div>
        )}
      </div>
    );
  };

  // ── Quiz taking view ──
  if (selectedQuiz && questions.length > 0) {
    const results = submitted ? getResults() : null;
    const timePercent = selectedQuiz.duration_minutes > 0 ? (timeLeft / (selectedQuiz.duration_minutes * 60)) * 100 : 0;
    const isLowTime = timeLeft < 60 && timeLeft > 0;
    const answeredCount = Object.keys(answers).filter((k) => answers[k]).length;
    const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;
    const safeIndex = Math.min(currentIndex, questions.length - 1);
    const currentQ = !submitted ? questions[safeIndex] : null;

    return (
      <div className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setSelectedQuiz(null); setSubmitted(false); if (timerRef.current) clearInterval(timerRef.current); }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> ফিরে যান
            </Button>
            {!submitted && (
              <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${isLowTime ? "border-destructive bg-destructive/10 text-destructive animate-pulse" : "border-border glass-card text-foreground"}`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{selectedQuiz.title}</h1>

          {!submitted && (
            <>
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>প্রশ্ন {safeIndex + 1} / {questions.length}</span>
                    <span>{answeredCount} টি উত্তর দেওয়া হয়েছে</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> সময়</span>
                    <span>{formatTime(timeLeft)} বাকি</span>
                  </div>
                  <Progress value={timePercent} className={`h-1.5 ${isLowTime ? "[&>div]:bg-destructive" : ""}`} />
                </div>
              </div>

              {selectedQuiz.negative_marking && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  <div>
                    <p className="font-semibold">নেগেটিভ মার্কিং সক্রিয়</p>
                    <p className="text-muted-foreground mt-0.5">
                      প্রতিটি ভুল উত্তরের জন্য <strong className="text-destructive">-{selectedQuiz.negative_mark_value}</strong> মার্ক কাটা হবে। অনুমান করার আগে ভাবুন — উত্তর না দিলে কোনো মার্ক কাটা যাবে না।
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Time-up / auto-submit lock banner */}
          {timeExpired && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground animate-fade-in"
            >
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-semibold text-destructive">সময় শেষ — উত্তর লক করা হয়েছে</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  আপনি আর কোনো উত্তর পরিবর্তন করতে পারবেন না। ফলাফল প্রস্তুত হচ্ছে…
                </p>
              </div>
            </div>
          )}

          {/* Result summary */}
          {submitted && results && (
            <div className="mt-6 rounded-xl glass-card p-6">
              <h2 className="text-center text-2xl font-bold text-foreground">
                আপনার স্কোর: {results.score.toFixed(results.score % 1 !== 0 ? 2 : 0)}/{questions.length}
              </h2>
              <p className="mt-2 text-center text-muted-foreground">
                {results.score >= questions.length * 0.8 ? "🎉 অসাধারণ!" : results.score >= questions.length * 0.5 ? "👍 ভালো হয়েছে!" : "📚 আরও চেষ্টা করুন!"}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-success/10 p-3">
                  <p className="text-2xl font-bold text-success">{results.correct}</p>
                  <p className="text-xs text-success">সঠিক</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-3">
                  <p className="text-2xl font-bold text-destructive">{results.wrong}</p>
                  <p className="text-xs text-destructive">ভুল</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-muted-foreground">{results.skipped}</p>
                  <p className="text-xs text-muted-foreground">এড়িয়ে গেছেন</p>
                </div>
              </div>
              {selectedQuiz.negative_marking && results.wrong > 0 && (
                <p className="mt-3 flex items-center justify-center gap-1 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" /> নেগেটিভ মার্কিং: -{(results.wrong * selectedQuiz.negative_mark_value).toFixed(2)}
                </p>
              )}

              {/* Comparison with previous attempts */}
              {user && selectedQuiz && attempts[selectedQuiz.id] && attempts[selectedQuiz.id].length > 0 && (() => {
                const prev = attempts[selectedQuiz.id];
                const lastAttempt = prev[0];
                const bestScore = Math.max(...prev.map(a => a.score));
                const avgScore = prev.reduce((s, a) => s + a.score, 0) / prev.length;
                const diff = results.score - lastAttempt.score;

                return (
                  <div className="mt-4 rounded-xl glass-card p-5">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <History className="h-4 w-4" /> পূর্ববর্তী অ্যাটেম্পটের সাথে তুলনা
                    </h3>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold text-foreground">{lastAttempt.score}/{lastAttempt.total_questions}</p>
                        <p className="text-[11px] text-muted-foreground">সর্বশেষ স্কোর</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold text-foreground">{bestScore}/{questions.length}</p>
                        <p className="text-[11px] text-muted-foreground">সর্বোচ্চ স্কোর</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-lg font-bold text-foreground">{avgScore.toFixed(1)}</p>
                        <p className="text-[11px] text-muted-foreground">গড় স্কোর</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                      {diff > 0 ? (
                        <span className="flex items-center gap-1 font-semibold text-success">📈 +{diff.toFixed(diff % 1 !== 0 ? 2 : 0)} উন্নতি হয়েছে!</span>
                      ) : diff < 0 ? (
                        <span className="flex items-center gap-1 font-semibold text-destructive">📉 {diff.toFixed(diff % 1 !== 0 ? 2 : 0)} কমেছে</span>
                      ) : (
                        <span className="text-muted-foreground">আগের বারের সমান স্কোর</span>
                      )}
                    </div>
                    <p className="mt-2 text-center text-[11px] text-muted-foreground">মোট {prev.length} বার অ্যাটেম্পট করেছেন</p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Questions: single-question mode while taking, full review after submit */}
          {!submitted && currentQ ? (
            <div className="mt-6">
              {(() => {
                const sec = quizSections.find((s) => s.id === currentQ.section_id);
                return sec ? (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                    📖 {sec.title}
                  </div>
                ) : null;
              })()}
              <div key={currentQ.id} className="animate-fade-in">
                {renderQuestion(currentQ, safeIndex)}
              </div>

              {/* Nav controls */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={safeIndex === 0}
                  className="flex-1 sm:flex-none"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> পেছনে
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPalette((v) => !v)}
                  className="text-xs"
                >
                  সব প্রশ্ন
                </Button>
                {safeIndex < questions.length - 1 ? (
                  <Button
                    onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
                    className="flex-1 sm:flex-none"
                  >
                    পরবর্তী <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 sm:flex-none"
                    disabled={answeredCount === 0}
                  >
                    জমা দিন <CheckCircle className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Question palette (jump) */}
              {showPalette && (
                <div className="mt-4 rounded-xl glass-card p-4 animate-fade-in">
                  <p className="mb-3 text-xs text-muted-foreground">যেকোনো প্রশ্নে যান:</p>
                  <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
                    {questions.map((q, qi) => {
                      const isAnswered = !!answers[q.id];
                      const isCurrent = qi === safeIndex;
                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => { setCurrentIndex(qi); setShowPalette(false); }}
                          className={`h-9 w-9 rounded-md border text-xs font-semibold transition-all ${
                            isCurrent
                              ? "border-primary bg-primary text-primary-foreground"
                              : isAnswered
                              ? "border-success/40 bg-success/10 text-success"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {qi + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-primary inline-block" /> বর্তমান</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-success/40 inline-block" /> উত্তরিত</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-border inline-block" /> বাকি</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
          <div className="mt-8 space-y-6">
            {submitted && selectedQuiz.negative_marking && (
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p>
                  <span className="font-semibold">স্কোরিং:</span> প্রতিটি সঠিক উত্তরে <strong className="text-success">+1</strong>, প্রতিটি ভুল উত্তরে <strong className="text-destructive">-{selectedQuiz.negative_mark_value}</strong>। উত্তর না দিলে কোনো মার্ক যোগ বা বিয়োগ হয় না।
                </p>
              </div>
            )}
            {quizSections.length > 0 ? (
              <>
                {quizSections.map((sec) => {
                  const secQuestions = questions.filter(q => q.section_id === sec.id);
                  if (secQuestions.length === 0) return null;
                  return (
                    <div key={sec.id}>
                      <div className="mb-4 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                          📖 {sec.title}
                        </h2>
                        {sec.description && <p className="text-sm text-muted-foreground mt-1">{sec.description}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{secQuestions.length} টি প্রশ্ন</p>
                      </div>
                      <div className="space-y-6">
                        {secQuestions.map((q) => renderQuestion(q, questions.indexOf(q)))}
                      </div>
                    </div>
                  );
                })}
                {(() => {
                  const unsectioned = questions.filter(q => !q.section_id);
                  if (unsectioned.length === 0) return null;
                  return (
                    <div>
                      <div className="mb-4 rounded-lg bg-muted/50 border border-border px-4 py-3">
                        <h2 className="text-lg font-bold text-foreground">📋 অন্যান্য প্রশ্ন</h2>
                        <p className="text-xs text-muted-foreground mt-1">{unsectioned.length} টি প্রশ্ন</p>
                      </div>
                      <div className="space-y-6">
                        {unsectioned.map((q) => renderQuestion(q, questions.indexOf(q)))}
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              questions.map((q, i) => renderQuestion(q, i))
            )}
          </div>
          )}

          {submitted && (
            <Button onClick={() => {
              if (directQuizId) {
                navigate(-1);
              } else {
                setSelectedQuiz(null);
                setSubmitted(false);
              }
            }} size="lg" className="mt-8 w-full" variant="default">
              <CheckCircle className="mr-2 h-5 w-5" /> কুইজ সম্পন্ন — ফিরে যান
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz list view ──
  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <ScrollReveal>
          <h1 className="text-4xl font-bold text-foreground">কুইজ</h1>
          <p className="mt-2 text-muted-foreground">আপনার জ্ঞান পরীক্ষা করুন</p>
        </ScrollReveal>

        {quizzes.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">এখন কোনো কুইজ পাওয়া যাচ্ছে না।</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz, idx) => {
              const isPaid = quiz.price > 0;
              const hasAccess = canAccessQuiz(quiz);
              const statusBadge = getQuizStatusBadge(quiz);
              const orderSt = quizOrderStatus[quiz.id];

              return (
                <ScrollReveal key={quiz.id} delay={idx * 80}>
                  <div className="rounded-xl glass-card shimmer p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">{quiz.title}</h3>
                      {statusBadge}
                    </div>
                    {quiz.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {quiz.duration_minutes} মিনিট</span>
                      <span>{questionCounts[quiz.id] || 0} টি প্রশ্ন</span>
                      {(sectionCounts[quiz.id] || 0) > 0 && (
                        <span className="flex items-center gap-1">📖 {sectionCounts[quiz.id]} টি টপিক</span>
                      )}
                    </div>

                    {/* Pricing */}
                    <div className="mt-3">
                      {isPaid ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-primary">৳{quiz.price}</span>
                          {quiz.original_price && quiz.original_price > quiz.price && (
                            <span className="text-sm text-muted-foreground line-through">৳{quiz.original_price}</span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-block rounded-full bg-success/10 px-3 py-1 text-sm font-semibold text-success">ফ্রি</span>
                      )}
                    </div>

                    {quiz.negative_marking && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                        <AlertTriangle className="h-3.5 w-3.5" /> নেগেটিভ মার্কিং ({quiz.negative_mark_value})
                      </p>
                    )}

                    {/* Action area */}
                    <div className="mt-4 space-y-2">
                      <Button variant="outline" className="w-full" onClick={() => openPreview(quiz)}>
                        <Eye className="mr-2 h-4 w-4" /> প্রিভিউ দেখুন
                      </Button>
                      {hasAccess ? (
                        <div className="flex gap-2">
                          <Button onClick={() => startQuiz(quiz)} className="flex-1">কুইজ শুরু করুন</Button>
                          <Button variant="outline" size="icon" onClick={() => fetchLeaderboard(quiz.id)} title="লিডারবোর্ড">
                            <Trophy className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : orderSt === "pending" ? (
                        <Button disabled className="w-full" variant="outline">
                          ⏳ পেমেন্ট যাচাই অপেক্ষমাণ
                        </Button>
                      ) : purchasingQuiz === quiz.id ? (
                        <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-background/50 backdrop-blur-sm">
                          <PaymentSelector
                            productType="quiz"
                            productId={quiz.id}
                            productTitle={quiz.title}
                            price={quiz.price}
                            onMfsSubmit={(provider, txnId) => submitPurchase(quiz, provider, txnId)}
                            submitting={submitting}
                            compact
                          />
                          <Button size="sm" variant="ghost" onClick={() => setPurchasingQuiz(null)} className="w-full text-xs">
                            বাতিল
                          </Button>
                        </div>
                      ) : (
                        <Button onClick={() => handlePurchaseQuiz(quiz)} className="w-full">
                          <Lock className="mr-2 h-4 w-4" /> ৳{quiz.price} দিয়ে কিনুন
                        </Button>
                      )}
                    </div>

                    {/* Leaderboard */}
                    {showLeaderboard === quiz.id && leaderboard[quiz.id] && (
                      <div className="mt-4 border-t border-border/50 pt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <Trophy className="h-3.5 w-3.5 text-primary" /> টপ স্কোরার
                        </p>
                        {leaderboard[quiz.id].length === 0 ? (
                          <p className="text-xs text-muted-foreground">এখনো কেউ অ্যাটেম্পট করেনি।</p>
                        ) : (
                          <div className="space-y-1.5">
                            {leaderboard[quiz.id].map((entry, idx) => (
                              <div key={entry.user_id} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${idx < 3 ? "bg-primary/5" : "bg-muted/50"}`}>
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                                </span>
                                <span className="flex-1 truncate font-medium text-foreground">
                                  {entry.full_name}
                                  {user && entry.user_id === user.id && <span className="ml-1 text-primary">(আপনি)</span>}
                                </span>
                                <span className="font-bold text-primary">{entry.best_score}</span>
                                <span className="text-muted-foreground">({entry.attempts_count}×)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attempt History */}
                    {user && attempts[quiz.id] && attempts[quiz.id].length > 0 && (
                      <div className="mt-4 border-t border-border/50 pt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <History className="h-3.5 w-3.5" /> আগের অ্যাটেম্পট ({attempts[quiz.id].length})
                        </p>
                        <div className="max-h-32 space-y-1.5 overflow-y-auto">
                          {attempts[quiz.id].slice(0, 5).map((att, idx) => (
                            <div key={att.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5 text-xs">
                              <span className="text-muted-foreground">
                                #{attempts[quiz.id].length - idx} · {format(new Date(att.created_at), "dd MMM yyyy, hh:mm a")}
                              </span>
                              <span className={`font-bold ${att.score >= att.total_questions * 0.5 ? "text-success" : "text-destructive"}`}>
                                {att.score}/{att.total_questions}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>

      {/* Quiz Preview Dialog */}
      <Dialog open={!!previewQuiz} onOpenChange={(open) => { if (!open) { setPreviewQuiz(null); setPreviewQuestions([]); setPreviewSections([]); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl p-0">
          <div className="p-6 pb-4 border-b border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{previewQuiz?.title}</DialogTitle>
            </DialogHeader>
          </div>
          {previewQuiz && (
            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  <Clock className="h-3.5 w-3.5" /> {previewQuiz.duration_minutes} মিনিট
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground">
                  {questionCounts[previewQuiz.id] || 0} টি প্রশ্ন
                </span>
                {previewQuiz.negative_marking && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> নেগেটিভ মার্কিং ({previewQuiz.negative_mark_value})
                  </span>
                )}
              </div>

              <div className="rounded-xl glass-card p-4">
                {previewQuiz.price > 0 ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-primary">৳{previewQuiz.price}</span>
                    {previewQuiz.original_price && previewQuiz.original_price > previewQuiz.price && (
                      <>
                        <span className="text-base text-muted-foreground line-through">৳{previewQuiz.original_price}</span>
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
                          {Math.round(((previewQuiz.original_price - previewQuiz.price) / previewQuiz.original_price) * 100)}% ছাড়
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <span className="inline-block rounded-full bg-success/10 px-4 py-1.5 text-sm font-semibold text-success">🎉 সম্পূর্ণ ফ্রি</span>
                )}
              </div>

              {previewQuiz.description && (
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-2">বিবরণ</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: previewQuiz.description }} />
                </div>
              )}

              <div>
                <h3 className="text-base font-semibold text-foreground mb-3">কুইজের বৈশিষ্ট্য</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 rounded-lg glass-card p-3">
                    <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">সময়সীমা</p>
                      <p className="text-xs text-muted-foreground">{previewQuiz.duration_minutes} মিনিট</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg glass-card p-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">মোট প্রশ্ন</p>
                      <p className="text-xs text-muted-foreground">{questionCounts[previewQuiz.id] || 0} টি MCQ প্রশ্ন</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg glass-card p-3">
                    <AlertTriangle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">নেগেটিভ মার্কিং</p>
                      <p className="text-xs text-muted-foreground">{previewQuiz.negative_marking ? `হ্যাঁ (প্রতি ভুলে -${previewQuiz.negative_mark_value})` : "নেই"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg glass-card p-3">
                    <Trophy className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">লিডারবোর্ড</p>
                      <p className="text-xs text-muted-foreground">টপ স্কোরারদের তালিকা দেখুন</p>
                    </div>
                  </div>
                </div>
              </div>

              {previewSections.length > 0 && (
                <div>
                  <h3 className="text-base font-semibold text-foreground mb-3">📖 কুইজের টপিকসমূহ</h3>
                  <div className="space-y-2">
                    {previewSections.map((sec, idx) => (
                        <div key={sec.id} className="flex items-center gap-3 rounded-lg glass-card px-4 py-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{sec.title}</p>
                            {sec.description && <p className="text-xs text-muted-foreground truncate">{sec.description}</p>}
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                {canAccessQuiz(previewQuiz) ? (
                  <Button className="w-full" size="lg" onClick={() => { setPreviewQuiz(null); setPreviewQuestions([]); startQuiz(previewQuiz); }}>
                    কুইজ শুরু করুন
                  </Button>
                ) : previewQuiz.price > 0 ? (
                  <Button className="w-full" size="lg" onClick={() => { setPreviewQuiz(null); setPreviewQuestions([]); handlePurchaseQuiz(previewQuiz); }}>
                    <Lock className="mr-2 h-4 w-4" /> ৳{previewQuiz.price} দিয়ে কিনুন
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" onClick={() => { setPreviewQuiz(null); setPreviewQuestions([]); handlePurchaseQuiz(previewQuiz); }}>
                    কুইজ শুরু করুন
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {successDialog && (
        <OrderSuccessDialog
          open={successDialog.open}
          onClose={() => setSuccessDialog(null)}
          orderId={successDialog.orderId}
          productTitle="কুইজ"
          message={successDialog.message}
          isFree={successDialog.isFree}
          paymentMethod={successDialog.paymentMethod}
          productType="quiz"
        />
      )}
    </div>
  );
};

export default QuizPage;
