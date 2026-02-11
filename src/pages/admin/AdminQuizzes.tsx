import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  negative_marking: boolean;
  negative_mark_value: number;
  is_published: boolean;
}

interface Question {
  id: string;
  quiz_id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  explanation: string | null;
  sort_order: number;
}

const AdminQuizzes = () => {
  const { toast } = useToast();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [form, setForm] = useState({ title: "", description: "", negative_marking: false, negative_mark_value: "0.25", is_published: true });

  // Question management
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [qForm, setQForm] = useState({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "" });

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
    setQuizzes((data as Quiz[]) || []);
    setLoading(false);
  };

  const fetchQuestions = async (quizId: string) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    setQuestions((data as Question[]) || []);
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", negative_marking: false, negative_mark_value: "0.25", is_published: true });
    setEditing(null);
  };

  const openEdit = (quiz: Quiz) => {
    setEditing(quiz);
    setForm({ title: quiz.title, description: quiz.description || "", negative_marking: quiz.negative_marking, negative_mark_value: String(quiz.negative_mark_value), is_published: quiz.is_published });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    const payload = { title: form.title, description: form.description || null, negative_marking: form.negative_marking, negative_mark_value: parseFloat(form.negative_mark_value), is_published: form.is_published };

    if (editing) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Quiz updated" });
    } else {
      const { error } = await supabase.from("quizzes").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Quiz added" });
    }
    setDialogOpen(false);
    resetForm();
    fetchQuizzes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz and all its questions?")) return;
    await supabase.from("quizzes").delete().eq("id", id);
    toast({ title: "Quiz deleted" });
    if (selectedQuiz?.id === id) setSelectedQuiz(null);
    fetchQuizzes();
  };

  const openQuestions = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    fetchQuestions(quiz.id);
  };

  const resetQForm = () => {
    setQForm({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "" });
    setEditingQ(null);
  };

  const openEditQ = (q: Question) => {
    setEditingQ(q);
    setQForm({ question: q.question, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option, explanation: q.explanation || "" });
    setQDialogOpen(true);
  };

  const handleSaveQ = async () => {
    if (!qForm.question || !qForm.option_a || !qForm.option_b || !qForm.option_c || !qForm.option_d) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    const payload = { ...qForm, explanation: qForm.explanation || null, quiz_id: selectedQuiz!.id, sort_order: editingQ ? editingQ.sort_order : questions.length };

    if (editingQ) {
      const { error } = await supabase.from("quiz_questions").update(payload).eq("id", editingQ.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Question updated" });
    } else {
      const { error } = await supabase.from("quiz_questions").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Question added" });
    }
    setQDialogOpen(false);
    resetQForm();
    fetchQuestions(selectedQuiz!.id);
  };

  const deleteQ = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("quiz_questions").delete().eq("id", id);
    fetchQuestions(selectedQuiz!.id);
  };

  if (selectedQuiz) {
    return (
      <div>
        <Button variant="ghost" onClick={() => setSelectedQuiz(null)} className="mb-4">← Back to Quizzes</Button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{selectedQuiz.title} — Questions</h1>
          <Dialog open={qDialogOpen} onOpenChange={(open) => { setQDialogOpen(open); if (!open) resetQForm(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Question</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader><DialogTitle>{editingQ ? "Edit" : "Add"} Question</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <div><Label>Question *</Label><Textarea value={qForm.question} onChange={(e) => setQForm({ ...qForm, question: e.target.value })} className="mt-1" rows={3} /></div>
                <div><Label>Option A *</Label><Input value={qForm.option_a} onChange={(e) => setQForm({ ...qForm, option_a: e.target.value })} className="mt-1" /></div>
                <div><Label>Option B *</Label><Input value={qForm.option_b} onChange={(e) => setQForm({ ...qForm, option_b: e.target.value })} className="mt-1" /></div>
                <div><Label>Option C *</Label><Input value={qForm.option_c} onChange={(e) => setQForm({ ...qForm, option_c: e.target.value })} className="mt-1" /></div>
                <div><Label>Option D *</Label><Input value={qForm.option_d} onChange={(e) => setQForm({ ...qForm, option_d: e.target.value })} className="mt-1" /></div>
                <div>
                  <Label>Correct Answer</Label>
                  <select value={qForm.correct_option} onChange={(e) => setQForm({ ...qForm, correct_option: e.target.value })} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                    <option value="a">A</option><option value="b">B</option><option value="c">C</option><option value="d">D</option>
                  </select>
                </div>
                <div><Label>Explanation</Label><Textarea value={qForm.explanation} onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })} className="mt-1" rows={2} /></div>
                <Button onClick={handleSaveQ} className="w-full">{editingQ ? "Update" : "Add"} Question</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {questions.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No questions yet.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium text-foreground"><span className="mr-2 text-muted-foreground">Q{i + 1}.</span>{q.question}</p>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditQ(q)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteQ(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                  {["a", "b", "c", "d"].map((opt) => (
                    <div key={opt} className={`rounded px-2 py-1 ${q.correct_option === opt ? "bg-success/10 text-success font-medium" : "text-muted-foreground"}`}>
                      {opt.toUpperCase()}) {(q as any)[`option_${opt}`]}
                    </div>
                  ))}
                </div>
                {q.explanation && <p className="mt-2 text-xs text-muted-foreground italic">💡 {q.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Quiz</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Quiz</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" rows={3} /></div>
              <div className="flex items-center justify-between">
                <Label>Negative Marking</Label>
                <Switch checked={form.negative_marking} onCheckedChange={(v) => setForm({ ...form, negative_marking: v })} />
              </div>
              {form.negative_marking && (
                <div><Label>Negative Mark Value</Label><Input type="number" step="0.01" value={form.negative_mark_value} onChange={(e) => setForm({ ...form, negative_mark_value: e.target.value })} className="mt-1" /></div>
              )}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Quiz</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : quizzes.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No quizzes yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="cursor-pointer" onClick={() => openQuestions(quiz)}>
                <p className="font-medium text-foreground">{quiz.title}</p>
                <p className="text-xs text-muted-foreground">{quiz.description || "No description"}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs ${quiz.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {quiz.is_published ? "Published" : "Draft"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => openEdit(quiz)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(quiz.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQuizzes;
