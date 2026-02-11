import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, ArrowLeft, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  negative_marking: boolean;
  negative_mark_value: number;
  duration_minutes: number;
}

interface Question {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
}

const QuizPage = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.from("quizzes").select("*, quiz_questions(id)").eq("is_published", true).then(({ data }) => {
      if (data) {
        const counts: Record<string, number> = {};
        const mapped = data.map((q: any) => {
          counts[q.id] = q.quiz_questions?.length || 0;
          const { quiz_questions, ...rest } = q;
          return rest as Quiz;
        });
        setQuestionCounts(counts);
        setQuizzes(mapped);
      }
    });
  }, []);

  // Timer
  useEffect(() => {
    if (!selectedQuiz || submitted) return;
    if (timeLeft <= 0 && selectedQuiz) {
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
    setTimeLeft(quiz.duration_minutes * 60);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("sort_order");
    setQuestions((data as Question[]) || []);
  };

  const handleSubmit = useCallback(async () => {
    if (submitted) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
  }, [submitted]);

  // Save attempt after submission
  useEffect(() => {
    if (!submitted || !selectedQuiz || questions.length === 0) return;
    let correct = 0;
    let wrong = 0;
    questions.forEach((q) => {
      if (answers[q.id]) {
        if (answers[q.id] === q.correct_option) correct++;
        else wrong++;
      }
    });
    let finalScore = correct;
    if (selectedQuiz.negative_marking) {
      finalScore = correct - wrong * selectedQuiz.negative_mark_value;
    }

    if (user) {
      supabase.from("quiz_attempts").insert({
        quiz_id: selectedQuiz.id,
        user_id: user.id,
        score: finalScore,
        total_questions: questions.length,
        answers,
      });
    }
  }, [submitted]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const getResults = () => {
    let correct = 0, wrong = 0, skipped = 0;
    questions.forEach((q) => {
      if (!answers[q.id]) skipped++;
      else if (answers[q.id] === q.correct_option) correct++;
      else wrong++;
    });
    let score = correct;
    if (selectedQuiz?.negative_marking) {
      score = correct - wrong * (selectedQuiz?.negative_mark_value || 0);
    }
    return { correct, wrong, skipped, score };
  };

  // ── Quiz taking view ──
  if (selectedQuiz && questions.length > 0) {
    const results = submitted ? getResults() : null;
    const timePercent = selectedQuiz.duration_minutes > 0 ? (timeLeft / (selectedQuiz.duration_minutes * 60)) * 100 : 0;
    const isLowTime = timeLeft < 60 && timeLeft > 0;

    return (
      <div className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" onClick={() => { setSelectedQuiz(null); setSubmitted(false); if (timerRef.current) clearInterval(timerRef.current); }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> ফিরে যান
            </Button>
            {!submitted && (
              <div className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${isLowTime ? "border-destructive bg-destructive/10 text-destructive animate-pulse" : "border-border bg-card text-foreground"}`}>
                <Clock className="h-4 w-4" />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{selectedQuiz.title}</h1>

          {!submitted && (
            <div className="mt-3">
              <Progress value={timePercent} className="h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{Object.keys(answers).length}/{questions.length} উত্তর দেওয়া হয়েছে</span>
                <span>{formatTime(timeLeft)} বাকি</span>
              </div>
            </div>
          )}

          {/* Result summary */}
          {submitted && results && (
            <div className="mt-6 rounded-xl border border-border bg-card p-6">
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
            </div>
          )}

          {/* Questions */}
          <div className="mt-8 space-y-6">
            {questions.map((q, i) => {
              const userAnswer = answers[q.id];
              const isCorrect = userAnswer === q.correct_option;

              return (
                <div key={q.id} className={`rounded-xl border bg-card p-5 sm:p-6 ${submitted ? (userAnswer ? (isCorrect ? "border-success/30" : "border-destructive/30") : "border-border") : "border-border"}`}>
                  <p className="font-medium text-foreground">
                    <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
                    {q.question}
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
                        <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all ${classes} ${submitted ? "pointer-events-none" : ""}`}>
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
                      <span className="font-semibold">ব্যাখ্যা:</span> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted && (
            <Button onClick={handleSubmit} size="lg" className="mt-8 w-full" disabled={Object.keys(answers).length === 0}>
              কুইজ জমা দিন
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
        <h1 className="text-4xl font-bold text-foreground">কুইজ</h1>
        <p className="mt-2 text-muted-foreground">আপনার জ্ঞান পরীক্ষা করুন</p>

        {quizzes.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">এখন কোনো কুইজ পাওয়া যাচ্ছে না।</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
                <h3 className="font-display text-lg font-semibold text-foreground">{quiz.title}</h3>
                {quiz.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{quiz.description}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {quiz.duration_minutes} মিনিট</span>
                  <span>{questionCounts[quiz.id] || 0} টি প্রশ্ন</span>
                </div>
                {quiz.negative_marking && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> নেগেটিভ মার্কিং ({quiz.negative_mark_value})
                  </p>
                )}
                <Button onClick={() => startQuiz(quiz)} className="mt-4 w-full">কুইজ শুরু করুন</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
