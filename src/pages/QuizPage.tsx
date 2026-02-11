import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  negative_marking: boolean;
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
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    supabase.from("quizzes").select("*").eq("is_published", true).then(({ data }) => {
      setQuizzes((data as Quiz[]) || []);
    });
  }, []);

  const startQuiz = async (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setAnswers({});
    setSubmitted(false);
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quiz.id).order("sort_order");
    setQuestions((data as Question[]) || []);
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) correct++;
    });
    const finalScore = correct;
    setScore(finalScore);
    setSubmitted(true);

    if (user) {
      await supabase.from("quiz_attempts").insert({
        quiz_id: selectedQuiz!.id,
        user_id: user.id,
        score: finalScore,
        total_questions: questions.length,
        answers,
      });
    }
  };

  if (selectedQuiz && questions.length > 0) {
    return (
      <div className="py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <Button variant="ghost" onClick={() => { setSelectedQuiz(null); setSubmitted(false); }} className="mb-4">← Back to Quizzes</Button>
          <h1 className="text-3xl font-bold text-foreground">{selectedQuiz.title}</h1>

          <div className="mt-8 space-y-6">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-xl border border-border bg-card p-6">
                <p className="font-medium text-foreground">
                  <span className="mr-2 text-primary font-bold">Q{i + 1}.</span>{q.question}
                </p>
                <div className="mt-4 space-y-2">
                  {["a", "b", "c", "d"].map((opt) => {
                    const isCorrect = q.correct_option === opt;
                    const isSelected = answers[q.id] === opt;
                    let borderClass = "border-border";
                    if (submitted) {
                      if (isCorrect) borderClass = "border-success bg-success/5";
                      else if (isSelected && !isCorrect) borderClass = "border-destructive bg-destructive/5";
                    } else if (isSelected) {
                      borderClass = "border-primary bg-primary/5";
                    }

                    return (
                      <label key={opt} className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${borderClass} ${submitted ? "pointer-events-none" : "hover:border-primary/30"}`}>
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={isSelected}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          className="accent-primary"
                          disabled={submitted}
                        />
                        <span className="text-sm text-foreground">{(q as any)[`option_${opt}`]}</span>
                        {submitted && isCorrect && <CheckCircle className="ml-auto h-4 w-4 text-success" />}
                        {submitted && isSelected && !isCorrect && <XCircle className="ml-auto h-4 w-4 text-destructive" />}
                      </label>
                    );
                  })}
                </div>
                {submitted && q.explanation && (
                  <div className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-primary">
                    💡 {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!submitted ? (
            <Button onClick={handleSubmit} size="lg" className="mt-8 w-full" disabled={Object.keys(answers).length === 0}>
              Submit Quiz
            </Button>
          ) : (
            <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
              <h2 className="text-2xl font-bold text-foreground">Your Score: {score}/{questions.length}</h2>
              <p className="mt-2 text-muted-foreground">
                {score === questions.length ? "🎉 Perfect score!" : score >= questions.length / 2 ? "👍 Good job!" : "📚 Keep practicing!"}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold text-foreground">Quizzes</h1>
        <p className="mt-2 text-muted-foreground">আপনার জ্ঞান পরীক্ষা করুন</p>

        {quizzes.length === 0 ? (
          <p className="mt-10 text-center text-muted-foreground">No quizzes available right now.</p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div key={quiz.id} className="rounded-xl border border-border bg-card p-6">
                <h3 className="font-display text-lg font-semibold text-foreground">{quiz.title}</h3>
                {quiz.description && <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>}
                {quiz.negative_marking && <p className="mt-1 text-xs text-destructive">⚠ Negative marking enabled</p>}
                <Button onClick={() => startQuiz(quiz)} className="mt-4 w-full">Start Quiz</Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizPage;
