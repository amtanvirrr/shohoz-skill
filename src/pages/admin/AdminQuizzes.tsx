import { useEffect, useState } from "react";
import { generateSlug } from "@/lib/slugify";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ArrowLeft, Clock, BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  negative_marking: boolean;
  negative_mark_value: number;
  is_published: boolean;
  duration_minutes: number;
  price: number;
  original_price: number | null;
}

interface Section {
  id: string;
  quiz_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface Question {
  id: string;
  quiz_id: string;
  section_id: string | null;
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
  const [form, setForm] = useState({ title: "", description: "", negative_marking: false, negative_mark_value: "0.25", is_published: true, duration_minutes: "10", price: "0", original_price: "", slug: "" });

  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});

  // Section dialog
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", description: "" });

  // Question dialog
  const [qDialogOpen, setQDialogOpen] = useState(false);
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [qForm, setQForm] = useState({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "" });
  const [qSectionId, setQSectionId] = useState<string | null>(null); // which section the question belongs to

  // Expanded sections tracking
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const fetchQuizzes = async () => {
    const { data } = await supabase.from("quizzes").select("*, quiz_questions(id)").order("created_at", { ascending: false });
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
    setLoading(false);
  };

  const fetchSectionsAndQuestions = async (quizId: string) => {
    const [secRes, qRes] = await Promise.all([
      supabase.from("quiz_sections").select("*").eq("quiz_id", quizId).order("sort_order"),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order"),
    ]);
    setSections((secRes.data as Section[]) || []);
    setQuestions((qRes.data as Question[]) || []);
    // Expand all sections by default
    if (secRes.data) {
      setExpandedSections(new Set(secRes.data.map((s: any) => s.id)));
    }
  };

  useEffect(() => { fetchQuizzes(); }, []);

  const resetForm = () => {
    setForm({ title: "", description: "", negative_marking: false, negative_mark_value: "0.25", is_published: true, duration_minutes: "10", price: "0", original_price: "", slug: "" });
    setEditing(null);
  };

  const openEdit = (quiz: Quiz) => {
    setEditing(quiz);
    setForm({ title: quiz.title, description: quiz.description || "", negative_marking: quiz.negative_marking, negative_mark_value: String(quiz.negative_mark_value), is_published: quiz.is_published, duration_minutes: String(quiz.duration_minutes), price: String(quiz.price), original_price: quiz.original_price ? String(quiz.original_price) : "", slug: (quiz as any).slug || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast({ title: "Title required", variant: "destructive" }); return; }
    const slugValue = form.slug || generateSlug(form.title);
    const payload = {
      title: form.title, description: form.description || null, negative_marking: form.negative_marking,
      negative_mark_value: parseFloat(form.negative_mark_value), is_published: form.is_published,
      duration_minutes: parseInt(form.duration_minutes) || 10, price: parseInt(form.price) || 0,
      original_price: form.original_price ? parseInt(form.original_price) : null, slug: slugValue,
    };
    if (editing) {
      const { error } = await supabase.from("quizzes").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Quiz updated" });
    } else {
      const { error } = await supabase.from("quizzes").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Quiz added" });
    }
    setDialogOpen(false); resetForm(); fetchQuizzes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quiz and all its sections/questions?")) return;
    await supabase.from("quiz_questions").delete().eq("quiz_id", id);
    await supabase.from("quiz_sections").delete().eq("quiz_id", id);
    await supabase.from("quizzes").delete().eq("id", id);
    toast({ title: "Quiz deleted" });
    if (selectedQuiz?.id === id) setSelectedQuiz(null);
    fetchQuizzes();
  };

  const openQuestions = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    fetchSectionsAndQuestions(quiz.id);
  };

  // ── Section CRUD ──
  const resetSectionForm = () => { setSectionForm({ title: "", description: "" }); setEditingSection(null); };

  const openEditSection = (sec: Section) => {
    setEditingSection(sec);
    setSectionForm({ title: sec.title, description: sec.description || "" });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title) { toast({ title: "সেকশনের নাম দিন", variant: "destructive" }); return; }
    const payload = { title: sectionForm.title, description: sectionForm.description || null, quiz_id: selectedQuiz!.id, sort_order: editingSection ? editingSection.sort_order : sections.length };
    if (editingSection) {
      const { error } = await supabase.from("quiz_sections").update(payload).eq("id", editingSection.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "সেকশন আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("quiz_sections").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "সেকশন যোগ হয়েছে" });
    }
    setSectionDialogOpen(false); resetSectionForm();
    fetchSectionsAndQuestions(selectedQuiz!.id);
  };

  const deleteSection = async (id: string) => {
    if (!confirm("এই সেকশন এবং এর সব প্রশ্ন ডিলিট হবে?")) return;
    await supabase.from("quiz_questions").delete().eq("section_id", id);
    await supabase.from("quiz_sections").delete().eq("id", id);
    toast({ title: "সেকশন ডিলিট হয়েছে" });
    fetchSectionsAndQuestions(selectedQuiz!.id);
  };

  // ── Question CRUD ──
  const resetQForm = () => { setQForm({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "" }); setEditingQ(null); setQSectionId(null); };

  const openAddQuestion = (sectionId: string | null) => {
    resetQForm();
    setQSectionId(sectionId);
    setQDialogOpen(true);
  };

  const openEditQ = (q: Question) => {
    setEditingQ(q);
    setQSectionId(q.section_id);
    setQForm({ question: q.question, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option, explanation: q.explanation || "" });
    setQDialogOpen(true);
  };

  const handleSaveQ = async () => {
    if (!qForm.question || !qForm.option_a || !qForm.option_b || !qForm.option_c || !qForm.option_d) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    const sectionQuestions = questions.filter(q => q.section_id === qSectionId);
    const payload = { ...qForm, explanation: qForm.explanation || null, quiz_id: selectedQuiz!.id, section_id: qSectionId, sort_order: editingQ ? editingQ.sort_order : sectionQuestions.length };

    if (editingQ) {
      const { error } = await supabase.from("quiz_questions").update(payload).eq("id", editingQ.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Question updated" });
    } else {
      const { error } = await supabase.from("quiz_questions").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Question added" });
    }
    setQDialogOpen(false); resetQForm();
    fetchSectionsAndQuestions(selectedQuiz!.id);
  };

  const deleteQ = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    await supabase.from("quiz_questions").delete().eq("id", id);
    fetchSectionsAndQuestions(selectedQuiz!.id);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getQuestionsForSection = (sectionId: string | null) => questions.filter(q => q.section_id === sectionId);

  // Render question list for a section
  const renderQuestionList = (sectionId: string | null, sectionQuestions: Question[]) => (
    <div className="space-y-3">
      {sectionQuestions.map((q, i) => (
        <div key={q.id} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between">
            <p className="font-medium text-foreground">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
              <span dangerouslySetInnerHTML={{ __html: q.question }} />
            </p>
            <div className="flex gap-1 shrink-0 ml-2">
              <Button variant="ghost" size="icon" onClick={() => openEditQ(q)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => deleteQ(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {["a", "b", "c", "d"].map((opt) => (
              <div key={opt} className={`rounded-lg px-3 py-2 ${q.correct_option === opt ? "bg-success/10 text-success font-medium border border-success/20" : "bg-muted/50 text-muted-foreground"}`}>
                <span className="mr-1 font-bold">{opt.toUpperCase()})</span> {(q as any)[`option_${opt}`]}
              </div>
            ))}
          </div>
          {q.explanation && <p className="mt-3 rounded-lg bg-primary/5 p-3 text-sm text-primary">💡 <span dangerouslySetInnerHTML={{ __html: q.explanation }} /></p>}
        </div>
      ))}
      <Button variant="outline" className="w-full" onClick={() => openAddQuestion(sectionId)}>
        <Plus className="mr-2 h-4 w-4" /> প্রশ্ন যোগ করুন
      </Button>
    </div>
  );

  // ── Question management view ──
  if (selectedQuiz) {
    const unsectionedQuestions = getQuestionsForSection(null);
    const hasSections = sections.length > 0;

    return (
      <div>
        <Button variant="ghost" onClick={() => { setSelectedQuiz(null); fetchQuizzes(); }} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Quizzes
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedQuiz.title}</h1>
            <p className="text-sm text-muted-foreground">
              {questions.length} টি প্রশ্ন • {sections.length} টি সেকশন • {selectedQuiz.duration_minutes} মিনিট
              {selectedQuiz.negative_marking && ` • নেগেটিভ মার্কিং (${selectedQuiz.negative_mark_value})`}
              {selectedQuiz.price > 0 ? ` • ৳${selectedQuiz.price}` : " • ফ্রি"}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={sectionDialogOpen} onOpenChange={(open) => { setSectionDialogOpen(open); if (!open) resetSectionForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline"><BookOpen className="mr-2 h-4 w-4" /> সেকশন যোগ করুন</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>{editingSection ? "সেকশন সম্পাদনা" : "নতুন সেকশন"}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <div><Label>সেকশনের নাম *</Label><Input value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} className="mt-1" placeholder="যেমন: Noun, Pronoun..." /></div>
                  <div><Label>বিবরণ (ঐচ্ছিক)</Label><Input value={sectionForm.description} onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })} className="mt-1" placeholder="সেকশনের সংক্ষিপ্ত বিবরণ" /></div>
                  <Button onClick={handleSaveSection} className="w-full">{editingSection ? "আপডেট" : "যোগ করুন"}</Button>
                </div>
              </DialogContent>
            </Dialog>
            {!hasSections && (
              <Button onClick={() => openAddQuestion(null)}>
                <Plus className="mr-2 h-4 w-4" /> প্রশ্ন যোগ করুন
              </Button>
            )}
          </div>
        </div>

        {/* Question Dialog */}
        <Dialog open={qDialogOpen} onOpenChange={(open) => { setQDialogOpen(open); if (!open) resetQForm(); }}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editingQ ? "Edit" : "Add"} Question</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              {hasSections && (
                <div>
                  <Label>সেকশন</Label>
                  <select
                    value={qSectionId || ""}
                    onChange={(e) => setQSectionId(e.target.value || null)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— সেকশন ছাড়া —</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
              )}
              <div><Label>প্রশ্ন *</Label><div className="mt-1"><RichTextEditor content={qForm.question} onChange={(html) => setQForm({ ...qForm, question: html })} placeholder="প্রশ্নটি লিখুন..." minHeight="100px" /></div></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div><Label>Option A *</Label><Input value={qForm.option_a} onChange={(e) => setQForm({ ...qForm, option_a: e.target.value })} className="mt-1" /></div>
                <div><Label>Option B *</Label><Input value={qForm.option_b} onChange={(e) => setQForm({ ...qForm, option_b: e.target.value })} className="mt-1" /></div>
                <div><Label>Option C *</Label><Input value={qForm.option_c} onChange={(e) => setQForm({ ...qForm, option_c: e.target.value })} className="mt-1" /></div>
                <div><Label>Option D *</Label><Input value={qForm.option_d} onChange={(e) => setQForm({ ...qForm, option_d: e.target.value })} className="mt-1" /></div>
              </div>
              <div>
                <Label>সঠিক উত্তর</Label>
                <div className="mt-2 flex gap-2">
                  {["a", "b", "c", "d"].map((opt) => (
                    <button key={opt} type="button" onClick={() => setQForm({ ...qForm, correct_option: opt })}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 text-sm font-bold transition-colors ${qForm.correct_option === opt ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
                      {opt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label>ব্যাখ্যা (Explanation)</Label><div className="mt-1"><RichTextEditor content={qForm.explanation} onChange={(html) => setQForm({ ...qForm, explanation: html })} placeholder="উত্তরের ব্যাখ্যা দিন (ঐচ্ছিক)..." minHeight="100px" /></div></div>
              <Button onClick={handleSaveQ} className="w-full">{editingQ ? "Update" : "Add"} Question</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="mt-6 space-y-4">
          {/* Sections */}
          {sections.map((sec) => {
            const secQuestions = getQuestionsForSection(sec.id);
            const isExpanded = expandedSections.has(sec.id);
            return (
              <Collapsible key={sec.id} open={isExpanded} onOpenChange={() => toggleSection(sec.id)}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        <BookOpen className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{sec.title}</p>
                          <p className="text-xs text-muted-foreground">{secQuestions.length} টি প্রশ্ন{sec.description ? ` • ${sec.description}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" onClick={() => openEditSection(sec)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteSection(sec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border p-4">
                      {renderQuestionList(sec.id, secQuestions)}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {/* Unsectioned questions */}
          {(unsectionedQuestions.length > 0 || !hasSections) && (
            <div className={hasSections ? "rounded-xl border border-dashed border-border p-4" : ""}>
              {hasSections && unsectionedQuestions.length > 0 && (
                <p className="mb-3 text-sm font-medium text-muted-foreground">📋 সেকশন ছাড়া প্রশ্ন ({unsectionedQuestions.length})</p>
              )}
              {renderQuestionList(null, unsectionedQuestions)}
            </div>
          )}

          {questions.length === 0 && sections.length === 0 && (
            <p className="text-center text-muted-foreground py-8">কোনো প্রশ্ন বা সেকশন নেই। উপরের বাটন থেকে সেকশন বা প্রশ্ন যোগ করুন।</p>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz list view ──
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Quizzes</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Quiz</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Quiz</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => { const title = e.target.value; if (!editing && !form.slug) setForm((f) => ({ ...f, title, slug: generateSlug(title) })); else setForm((f) => ({ ...f, title })); }} className="mt-1" placeholder="কুইজের শিরোনাম" /></div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="mt-1" placeholder="seo-friendly-url-slug" />
                <p className="text-xs text-muted-foreground mt-1">SEO ফ্রেন্ডলি URL। খালি রাখলে টাইটেল থেকে অটো তৈরি হবে।</p>
              </div>
              <div><Label>Description</Label><div className="mt-1"><RichTextEditor content={form.description} onChange={(html) => setForm({ ...form, description: html })} placeholder="কুইজের বিবরণ (ঐচ্ছিক)" minHeight="100px" /></div></div>
              <div><Label>সময়সীমা (মিনিট)</Label><Input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="mt-1" /></div>
              
              <div className="rounded-lg border border-border p-4 space-y-3">
                <Label className="text-sm font-semibold">💰 মূল্য নির্ধারণ</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">দাম (৳)</Label>
                    <Input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" placeholder="0 = ফ্রি" />
                  </div>
                  <div>
                    <Label className="text-xs">আসল দাম (৳) - ঐচ্ছিক</Label>
                    <Input type="number" min="0" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="mt-1" placeholder="ডিসকাউন্ট দেখাতে" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {parseInt(form.price) > 0 ? "⚠️ পেইড কুইজ - ইউজারদের পেমেন্ট করতে হবে এবং অ্যাডমিন অ্যাপ্রুভ করতে হবে।" : "✅ ফ্রি কুইজ - সবাই সরাসরি এক্সেস করতে পারবে।"}
                </p>
              </div>

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
            <div key={quiz.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/30">
              <div className="cursor-pointer flex-1" onClick={() => openQuestions(quiz)}>
                <p className="font-medium text-foreground">{quiz.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {quiz.description && <span dangerouslySetInnerHTML={{ __html: quiz.description }} />}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {quiz.duration_minutes} মিনিট</span>
                  <span>{questionCounts[quiz.id] || 0} টি প্রশ্ন</span>
                  {quiz.negative_marking && <span className="text-destructive">নেগেটিভ মার্কিং ({quiz.negative_mark_value})</span>}
                  {quiz.price > 0 ? (
                    <span className="font-medium text-primary">৳{quiz.price}</span>
                  ) : (
                    <span className="text-green-600 font-medium">ফ্রি</span>
                  )}
                  {!quiz.is_published && <span className="text-destructive font-medium">Draft</span>}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
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
