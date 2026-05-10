import { useEffect, useState, useRef } from "react";
import { generateSlug } from "@/lib/slugify";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Pencil, Trash2, Upload, X, FileText, GripVertical,
  Video, BookOpen, HelpCircle, ChevronDown, ChevronRight, Settings
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Course {
  id: string;
  title: string;
  instructor: string;
  description: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  duration: string;
  sort_order: number;
  video_url: string;
  lesson_type: string;
}

interface LessonResource {
  id: string;
  lesson_id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  sort_order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  lesson_id: string | null;
  negative_marking: boolean;
  negative_mark_value: number;
  pass_mark: number;
  duration_minutes?: number;
  slug?: string;
}

interface QuizSection {
  id: string;
  quiz_id: string;
  title: string;
  description: string | null;
  sort_order: number;
}

interface QuizQuestion {
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

const lessonInitial = {
  title: "", content: "", duration: "", video_url: "", lesson_type: "text",
};

// Sortable lesson item component
interface SortableLessonItemProps {
  lesson: Lesson;
  idx: number;
  resources: LessonResource[];
  lessonQuizzes: Quiz[];
  getLessonIcon: (type: string) => React.ReactNode;
  formatFileSize: (bytes: number) => string;
  uploadingResource: string | null;
  triggerResourceUpload: (lessonId: string) => void;
  handleDeleteResource: (id: string) => void;
  openAddQuiz: (lessonId: string) => void;
  handleDeleteQuiz: (id: string) => void;
  openEditLesson: (lesson: Lesson) => void;
  handleDeleteLesson: (id: string) => void;
  openQuizManager: (quiz: Quiz) => void;
}

const SortableLessonItem = ({
  lesson, idx, resources: lessonResources, lessonQuizzes, getLessonIcon, formatFileSize,
  uploadingResource, triggerResourceUpload, handleDeleteResource,
  openAddQuiz, handleDeleteQuiz, openEditLesson, handleDeleteLesson, openQuizManager,
}: SortableLessonItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <AccordionItem value={lesson.id} className="rounded-lg border border-border bg-card">
        <AccordionTrigger className="px-4 py-3 hover:no-underline">
          <div className="flex w-full items-center gap-3 text-left">
            <button
              type="button"
              className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-4 w-4" />
            </button>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {idx + 1}
            </span>
            {getLessonIcon(lesson.lesson_type)}
            <div className="flex-1">
              <p className="font-medium text-foreground">{lesson.title}</p>
              <p className="text-xs text-muted-foreground">
                {lesson.lesson_type === "video" ? "🎥 Video" : lesson.lesson_type === "quiz" ? "❓ Quiz" : "📖 Text"}
                {lesson.duration && ` • ${lesson.duration}`}
                {lessonResources.length > 0 && ` • ${lessonResources.length} resource(s)`}
                {lessonQuizzes.length > 0 && ` • ${lessonQuizzes.length} quiz(zes)`}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          {lesson.content && (
            <div className="mb-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              {lesson.content.substring(0, 200)}{lesson.content.length > 200 && "..."}
            </div>
          )}
          {lesson.video_url && (
            <div className="mb-3 text-sm">
              <span className="font-medium text-foreground">Video URL:</span>{" "}
              <a href={lesson.video_url} target="_blank" rel="noreferrer" className="text-primary underline">{lesson.video_url}</a>
            </div>
          )}
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">📁 Resources</h4>
              <Button variant="outline" size="sm" onClick={() => triggerResourceUpload(lesson.id)} disabled={uploadingResource === lesson.id}>
                <Upload className="mr-1 h-3 w-3" />
                {uploadingResource === lesson.id ? "Uploading..." : "Upload"}
              </Button>
            </div>
            {lessonResources.length === 0 ? (
              <p className="text-xs text-muted-foreground">No resources yet.</p>
            ) : (
              <div className="space-y-1">
                {lessonResources.map((res) => (
                  <div key={res.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <a href={res.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate text-foreground hover:underline">{res.title}</a>
                    <span className="text-xs text-muted-foreground">{formatFileSize(res.file_size)}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteResource(res.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mb-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-foreground">❓ Quizzes</h4>
              <Button variant="outline" size="sm" onClick={() => openAddQuiz(lesson.id)}>
                <Plus className="mr-1 h-3 w-3" /> Add Quiz
              </Button>
            </div>
            {lessonQuizzes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No quizzes for this lesson.</p>
            ) : (
              <div className="space-y-1">
                {lessonQuizzes.map((quiz) => (
                  <div key={quiz.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-foreground">{quiz.title}</span>
                    {quiz.pass_mark > 0 && <span className="text-xs text-muted-foreground">পাস: {quiz.pass_mark}</span>}
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => openQuizManager(quiz)}>
                      <Settings className="mr-1 h-3 w-3" /> ম্যানেজ
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteQuiz(quiz.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-border pt-3">
            <Button variant="outline" size="sm" onClick={() => openEditLesson(lesson)}>
              <Pencil className="mr-1 h-3 w-3" /> Edit Lesson
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
              <Trash2 className="mr-1 h-3 w-3" /> Delete
            </Button>
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
};

const AdminCourseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [resources, setResources] = useState<Record<string, LessonResource[]>>({});
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  // Lesson dialog
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState(lessonInitial);

  // Resource upload
  const [uploadingResource, setUploadingResource] = useState<string | null>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const [activeResourceLesson, setActiveResourceLesson] = useState<string | null>(null);

  // Quiz dialog (add/link)
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [quizForm, setQuizForm] = useState({ title: "", description: "", pass_mark: "0", duration_minutes: "10", negative_marking: false, negative_mark_value: "0.25" });

  // Quiz Manager dialog (sections + questions)
  const [managerOpen, setManagerOpen] = useState(false);
  const [managedQuiz, setManagedQuiz] = useState<Quiz | null>(null);
  const [mSections, setMSections] = useState<QuizSection[]>([]);
  const [mQuestions, setMQuestions] = useState<QuizQuestion[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Section form
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<QuizSection | null>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", description: "" });

  // Question form
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [questionSectionId, setQuestionSectionId] = useState<string | null>(null);
  const [qForm, setQForm] = useState({
    question: "", option_a: "", option_b: "", option_c: "", option_d: "",
    correct_option: "a", explanation: "",
  });

  const fetchAll = async () => {
    if (!id) return;
    const [courseRes, lessonsRes, quizzesRes] = await Promise.all([
      supabase.from("courses").select("id, title, instructor, description").eq("id", id).single(),
      supabase.from("lessons").select("*").eq("course_id", id).order("sort_order"),
      supabase.from("quizzes").select("*").not("lesson_id", "is", null),
    ]);
    setCourse(courseRes.data as Course);
    const lessonData = (lessonsRes.data as Lesson[]) || [];
    setLessons(lessonData);

    const lessonIds = lessonData.map((l) => l.id);
    const courseQuizzes = ((quizzesRes.data as Quiz[]) || []).filter(
      (q) => q.lesson_id && lessonIds.includes(q.lesson_id)
    );
    setQuizzes(courseQuizzes);

    if (lessonIds.length > 0) {
      const { data: resData } = await supabase
        .from("lesson_resources")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("sort_order");
      const grouped: Record<string, LessonResource[]> = {};
      (resData || []).forEach((r: any) => {
        if (!grouped[r.lesson_id]) grouped[r.lesson_id] = [];
        grouped[r.lesson_id].push(r as LessonResource);
      });
      setResources(grouped);
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  // ---- Lesson CRUD ----
  const openAddLesson = () => {
    setEditingLesson(null);
    setLessonForm(lessonInitial);
    setLessonDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || "",
      duration: lesson.duration,
      video_url: lesson.video_url || "",
      lesson_type: lesson.lesson_type || "text",
    });
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async () => {
    if (!lessonForm.title) {
      toast({ title: "Lesson title required", variant: "destructive" });
      return;
    }
    const payload = {
      course_id: id!,
      title: lessonForm.title,
      content: lessonForm.content || null,
      duration: lessonForm.duration,
      video_url: lessonForm.video_url,
      lesson_type: lessonForm.lesson_type,
      sort_order: editingLesson ? editingLesson.sort_order : lessons.length,
    };

    if (editingLesson) {
      const { error } = await supabase.from("lessons").update(payload).eq("id", editingLesson.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Lesson updated" });
    } else {
      const { error } = await supabase.from("lessons").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Lesson added" });
    }
    setLessonDialogOpen(false);
    fetchAll();
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm("Delete this lesson and all its resources?")) return;
    await supabase.from("lessons").delete().eq("id", lessonId);
    toast({ title: "Lesson deleted" });
    fetchAll();
  };

  // ---- Resource Upload ----
  const triggerResourceUpload = (lessonId: string) => {
    setActiveResourceLesson(lessonId);
    setTimeout(() => resourceInputRef.current?.click(), 100);
  };

  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeResourceLesson) return;
    setUploadingResource(activeResourceLesson);

    const ext = file.name.split(".").pop();
    const path = `${activeResourceLesson}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("lesson-resources").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingResource(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("lesson-resources").getPublicUrl(path);

    const fileType = file.type || ext || "unknown";
    const { error: insertErr } = await supabase.from("lesson_resources").insert({
      lesson_id: activeResourceLesson,
      title: file.name,
      file_url: urlData.publicUrl,
      file_type: fileType,
      file_size: file.size,
      sort_order: (resources[activeResourceLesson]?.length || 0),
    });
    if (insertErr) {
      toast({ title: "Error saving resource", description: insertErr.message, variant: "destructive" });
    } else {
      toast({ title: "Resource added" });
    }
    setUploadingResource(null);
    if (e.target) e.target.value = "";
    fetchAll();
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm("Delete this resource?")) return;
    await supabase.from("lesson_resources").delete().eq("id", resourceId);
    toast({ title: "Resource deleted" });
    fetchAll();
  };

  // ---- Quiz for lesson (Add/Link) ----
  const openAddQuiz = async (lessonId: string) => {
    setQuizLessonId(lessonId);
    setQuizForm({ title: "", description: "", pass_mark: "0", duration_minutes: "10", negative_marking: false, negative_mark_value: "0.25" });
    setQuizDialogOpen(true);
  };




  const handleSaveNewQuiz = async () => {
    if (!quizForm.title || !quizLessonId) {
      toast({ title: "Quiz title required", variant: "destructive" });
      return;
    }
    const slugValue = generateSlug(quizForm.title) + '-' + Date.now().toString(36);
    const { data, error } = await supabase.from("quizzes").insert({
      title: quizForm.title,
      description: quizForm.description || null,
      lesson_id: quizLessonId,
      is_published: true,
      pass_mark: parseFloat(quizForm.pass_mark) || 0,
      duration_minutes: parseInt(quizForm.duration_minutes) || 10,
      negative_marking: quizForm.negative_marking,
      negative_mark_value: quizForm.negative_marking ? parseFloat(quizForm.negative_mark_value) || 0.25 : 0,
      slug: slugValue,
    }).select().single();
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "কুইজ তৈরি হয়েছে! এখন প্রশ্ন যোগ করুন।" });
    setQuizDialogOpen(false);
    await fetchAll();
    // Auto-open manager for the newly created quiz
    if (data) {
      openQuizManager(data as Quiz);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("এই কুইজটি ডিলিট করতে চান? কুইজের সব প্রশ্ন ও সেকশনও মুছে যাবে।")) return;
    // Delete questions, sections, then quiz
    await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
    await supabase.from("quiz_sections").delete().eq("quiz_id", quizId);
    await supabase.from("quizzes").delete().eq("id", quizId);
    toast({ title: "কুইজ ডিলিট হয়েছে" });
    fetchAll();
  };

  // ============ QUIZ MANAGER (Sections + Questions) ============
  const openQuizManager = async (quiz: Quiz) => {
    setManagedQuiz(quiz);
    setManagerOpen(true);
    await fetchQuizData(quiz.id);
  };

  const fetchQuizData = async (quizId: string) => {
    const [secRes, qRes] = await Promise.all([
      supabase.from("quiz_sections").select("*").eq("quiz_id", quizId).order("sort_order"),
      supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order"),
    ]);
    setMSections((secRes.data as QuizSection[]) || []);
    setMQuestions((qRes.data as QuizQuestion[]) || []);
    // Expand all sections by default
    const exp: Record<string, boolean> = {};
    (secRes.data || []).forEach((s: any) => { exp[s.id] = true; });
    setExpandedSections(exp);
  };

  // Section CRUD
  const openAddSection = () => {
    setEditingSection(null);
    setSectionForm({ title: "", description: "" });
    setSectionDialogOpen(true);
  };

  const openEditSection = (sec: QuizSection) => {
    setEditingSection(sec);
    setSectionForm({ title: sec.title, description: sec.description || "" });
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async () => {
    if (!sectionForm.title || !managedQuiz) {
      toast({ title: "সেকশনের নাম দিন", variant: "destructive" });
      return;
    }
    if (editingSection) {
      const { error } = await supabase.from("quiz_sections").update({
        title: sectionForm.title,
        description: sectionForm.description || null,
      }).eq("id", editingSection.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "সেকশন আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("quiz_sections").insert({
        quiz_id: managedQuiz.id,
        title: sectionForm.title,
        description: sectionForm.description || null,
        sort_order: mSections.length,
      });
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "সেকশন যোগ হয়েছে" });
    }
    setSectionDialogOpen(false);
    fetchQuizData(managedQuiz.id);
  };

  const handleDeleteSection = async (secId: string) => {
    if (!managedQuiz) return;
    if (!confirm("এই সেকশনটি ডিলিট করবেন? সেকশনের প্রশ্নগুলো আনগ্রুপ হবে।")) return;
    // Ungroup questions first
    await supabase.from("quiz_questions").update({ section_id: null }).eq("section_id", secId);
    await supabase.from("quiz_sections").delete().eq("id", secId);
    toast({ title: "সেকশন ডিলিট হয়েছে" });
    fetchQuizData(managedQuiz.id);
  };

  // Question CRUD
  const openAddQuestion = (sectionId: string | null) => {
    setEditingQuestion(null);
    setQuestionSectionId(sectionId);
    setQForm({ question: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", explanation: "" });
    setQuestionDialogOpen(true);
  };

  const openEditQuestion = (q: QuizQuestion) => {
    setEditingQuestion(q);
    setQuestionSectionId(q.section_id);
    setQForm({
      question: q.question,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_option: q.correct_option,
      explanation: q.explanation || "",
    });
    setQuestionDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!qForm.question || !qForm.option_a || !qForm.option_b || !qForm.option_c || !qForm.option_d || !managedQuiz) {
      toast({ title: "প্রশ্ন ও সব অপশন পূরণ করুন", variant: "destructive" });
      return;
    }
    const payload = {
      quiz_id: managedQuiz.id,
      section_id: questionSectionId || null,
      question: qForm.question,
      option_a: qForm.option_a,
      option_b: qForm.option_b,
      option_c: qForm.option_c,
      option_d: qForm.option_d,
      correct_option: qForm.correct_option,
      explanation: qForm.explanation || null,
      sort_order: editingQuestion ? editingQuestion.sort_order : mQuestions.length,
    };
    if (editingQuestion) {
      const { error } = await supabase.from("quiz_questions").update(payload).eq("id", editingQuestion.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "প্রশ্ন আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("quiz_questions").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "প্রশ্ন যোগ হয়েছে" });
    }
    setQuestionDialogOpen(false);
    fetchQuizData(managedQuiz.id);
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!managedQuiz) return;
    if (!confirm("এই প্রশ্নটি ডিলিট করবেন?")) return;
    await supabase.from("quiz_questions").delete().eq("id", qId);
    toast({ title: "প্রশ্ন ডিলিট হয়েছে" });
    fetchQuizData(managedQuiz.id);
  };

  const renderQuestionList = (questions: QuizQuestion[]) => (
    <div className="space-y-2">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="flex-1 text-sm font-medium text-foreground">
              <span className="mr-1 text-muted-foreground">{i + 1}.</span> {q.question}
            </p>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditQuestion(q)}>
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteQuestion(q.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {["a", "b", "c", "d"].map((opt) => (
              <span key={opt} className={`rounded px-2 py-1 ${q.correct_option === opt ? "bg-success text-success dark:bg-success/30 dark:text-success font-semibold" : "bg-muted text-muted-foreground"}`}>
                {opt.toUpperCase()}: {(q as any)[`option_${opt}`]}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  // ---- Helpers ----
  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-primary" />;
      case "quiz": return <HelpCircle className="h-4 w-4 text-primary" />;
      default: return <BookOpen className="h-4 w-4 text-primary" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ---- Drag & Drop ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex);
    setLessons(reordered);

    const updates = reordered.map((l, i) =>
      supabase.from("lessons").update({ sort_order: i }).eq("id", l.id)
    );
    await Promise.all(updates);
    toast({ title: "Lesson order updated" });
  };

  if (loading) return <p className="py-12 text-center text-muted-foreground">Loading...</p>;
  if (!course) return <p className="py-12 text-center text-muted-foreground">Course not found.</p>;

  const unsectionedQuestions = mQuestions.filter((q) => !q.section_id);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/courses")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
          <p className="text-sm text-muted-foreground">by {course.instructor} — Curriculum & Lessons</p>
        </div>
      </div>

      {/* Add Lesson button */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Lessons ({lessons.length})
        </h2>
        <Button onClick={openAddLesson}><Plus className="mr-2 h-4 w-4" /> Add Lesson</Button>
      </div>

      {/* Lessons Accordion */}
      {lessons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          No lessons yet. Add your first lesson to build the curriculum!
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            <Accordion type="multiple" className="space-y-2">
              {lessons.map((lesson, idx) => (
                <SortableLessonItem
                  key={lesson.id}
                  lesson={lesson}
                  idx={idx}
                  resources={resources[lesson.id] || []}
                  lessonQuizzes={quizzes.filter((q) => q.lesson_id === lesson.id)}
                  getLessonIcon={getLessonIcon}
                  formatFileSize={formatFileSize}
                  uploadingResource={uploadingResource}
                  triggerResourceUpload={triggerResourceUpload}
                  handleDeleteResource={handleDeleteResource}
                  openAddQuiz={openAddQuiz}
                  handleDeleteQuiz={handleDeleteQuiz}
                  openEditLesson={openEditLesson}
                  handleDeleteLesson={handleDeleteLesson}
                  openQuizManager={openQuizManager}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      )}

      {/* Hidden file input for resources */}
      <input ref={resourceInputRef} type="file" className="hidden" onChange={handleResourceUpload} />

      {/* Lesson Dialog */}
      <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Lesson Type</Label>
              <Select value={lessonForm.lesson_type} onValueChange={(v) => setLessonForm({ ...lessonForm, lesson_type: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">📖 Text/Article</SelectItem>
                  <SelectItem value="video">🎥 Video</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Title *</Label><Input value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Duration</Label><Input value={lessonForm.duration} onChange={(e) => setLessonForm({ ...lessonForm, duration: e.target.value })} className="mt-1" placeholder="e.g. 30 min" /></div>
            {lessonForm.lesson_type === "video" && (
              <div><Label>Video URL</Label><Input value={lessonForm.video_url} onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })} className="mt-1" placeholder="YouTube/Vimeo URL" /></div>
            )}
            <div><Label>Content</Label><div className="mt-1"><RichTextEditor content={lessonForm.content} onChange={(html) => setLessonForm({ ...lessonForm, content: html })} placeholder="লেসনের কন্টেন্ট লিখুন..." minHeight="200px" /></div></div>
            <Button onClick={handleSaveLesson} className="w-full">{editingLesson ? "Update" : "Add"} Lesson</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Create Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>লেসনে নতুন কুইজ তৈরি করুন</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>কুইজের নাম *</Label><Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} className="mt-1" placeholder="যেমন: লেসন ১ কুইজ" /></div>
            <div><Label>বিবরণ</Label><div className="mt-1"><RichTextEditor content={quizForm.description} onChange={(html) => setQuizForm({ ...quizForm, description: html })} placeholder="কুইজের বিবরণ..." minHeight="80px" /></div></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>সময় (মিনিট)</Label><Input type="number" min="1" value={quizForm.duration_minutes} onChange={(e) => setQuizForm({ ...quizForm, duration_minutes: e.target.value })} className="mt-1" /></div>
              <div><Label>পাস মার্ক</Label><Input type="number" min="0" step="0.5" value={quizForm.pass_mark} onChange={(e) => setQuizForm({ ...quizForm, pass_mark: e.target.value })} className="mt-1" /></div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={quizForm.negative_marking} onCheckedChange={(v) => setQuizForm({ ...quizForm, negative_marking: v })} />
              <Label>নেগেটিভ মার্কিং</Label>
              {quizForm.negative_marking && (
                <Input type="number" min="0" step="0.25" value={quizForm.negative_mark_value} onChange={(e) => setQuizForm({ ...quizForm, negative_mark_value: e.target.value })} className="w-20" placeholder="0.25" />
              )}
            </div>
            <Button onClick={handleSaveNewQuiz} className="w-full">কুইজ তৈরি করুন ও প্রশ্ন যোগ করুন</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== QUIZ MANAGER DIALOG ========== */}
      <Dialog open={managerOpen} onOpenChange={setManagerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>📝 কুইজ ম্যানেজ: {managedQuiz?.title}</DialogTitle>
          </DialogHeader>
          {managedQuiz && (
            <div className="space-y-4 pt-2">
              {/* Stats */}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span>মোট প্রশ্ন: <strong className="text-foreground">{mQuestions.length}</strong></span>
                <span>সেকশন: <strong className="text-foreground">{mSections.length}</strong></span>
                {managedQuiz.pass_mark > 0 && <span>পাস মার্ক: <strong className="text-foreground">{managedQuiz.pass_mark}</strong></span>}
              </div>

              {/* Sections */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">📖 সেকশনসমূহ</h3>
                <Button variant="outline" size="sm" onClick={openAddSection}>
                  <Plus className="mr-1 h-3 w-3" /> সেকশন যোগ
                </Button>
              </div>

              {mSections.map((sec) => {
                const secQuestions = mQuestions.filter((q) => q.section_id === sec.id);
                return (
                  <Collapsible key={sec.id} open={expandedSections[sec.id]} onOpenChange={(open) => setExpandedSections({ ...expandedSections, [sec.id]: open })}>
                    <div className="rounded-lg border border-border">
                      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          {expandedSections[sec.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium text-foreground">{sec.title}</span>
                          <span className="text-xs text-muted-foreground">({secQuestions.length} প্রশ্ন)</span>
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditSection(sec)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteSection(sec.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-3 pb-3">
                        {secQuestions.length > 0 && renderQuestionList(secQuestions)}
                        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => openAddQuestion(sec.id)}>
                          <Plus className="mr-1 h-3 w-3" /> এই সেকশনে প্রশ্ন যোগ
                        </Button>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}

              {/* Unsectioned questions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {mSections.length > 0 ? "📋 সেকশনবিহীন প্রশ্ন" : "📋 প্রশ্নসমূহ"}
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => openAddQuestion(null)}>
                    <Plus className="mr-1 h-3 w-3" /> প্রশ্ন যোগ
                  </Button>
                </div>
                {unsectionedQuestions.length > 0 ? renderQuestionList(unsectionedQuestions) : (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    {mSections.length > 0 ? "কোনো সেকশনবিহীন প্রশ্ন নেই।" : "এখনো কোনো প্রশ্ন যোগ করা হয়নি।"}
                  </p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSection ? "সেকশন এডিট" : "নতুন সেকশন"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>সেকশনের নাম *</Label><Input value={sectionForm.title} onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })} className="mt-1" placeholder="যেমন: নাউন, ভার্ব" /></div>
            <div><Label>বিবরণ</Label><div className="mt-1"><RichTextEditor content={sectionForm.description} onChange={(html) => setSectionForm({ ...sectionForm, description: html })} placeholder="ঐচ্ছিক বিবরণ..." minHeight="80px" /></div></div>
            <Button onClick={handleSaveSection} className="w-full">{editingSection ? "আপডেট" : "যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "প্রশ্ন এডিট" : "নতুন প্রশ্ন যোগ"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {mSections.length > 0 && (
              <div>
                <Label>সেকশন (ঐচ্ছিক)</Label>
                <Select value={questionSectionId || "none"} onValueChange={(v) => setQuestionSectionId(v === "none" ? null : v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— সেকশন নেই —</SelectItem>
                    {mSections.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>প্রশ্ন *</Label><div className="mt-1"><RichTextEditor content={qForm.question} onChange={(html) => setQForm({ ...qForm, question: html })} placeholder="প্রশ্ন লিখুন..." minHeight="80px" /></div></div>
            <div><Label>অপশন A *</Label><div className="mt-1"><RichTextEditor content={qForm.option_a} onChange={(html) => setQForm({ ...qForm, option_a: html })} placeholder="অপশন A" minHeight="60px" /></div></div>
            <div><Label>অপশন B *</Label><div className="mt-1"><RichTextEditor content={qForm.option_b} onChange={(html) => setQForm({ ...qForm, option_b: html })} placeholder="অপশন B" minHeight="60px" /></div></div>
            <div><Label>অপশন C *</Label><div className="mt-1"><RichTextEditor content={qForm.option_c} onChange={(html) => setQForm({ ...qForm, option_c: html })} placeholder="অপশন C" minHeight="60px" /></div></div>
            <div><Label>অপশন D *</Label><div className="mt-1"><RichTextEditor content={qForm.option_d} onChange={(html) => setQForm({ ...qForm, option_d: html })} placeholder="অপশন D" minHeight="60px" /></div></div>
            <div>
              <Label>সঠিক উত্তর *</Label>
              <Select value={qForm.correct_option} onValueChange={(v) => setQForm({ ...qForm, correct_option: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">A</SelectItem>
                  <SelectItem value="b">B</SelectItem>
                  <SelectItem value="c">C</SelectItem>
                  <SelectItem value="d">D</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>ব্যাখ্যা (ঐচ্ছিক)</Label><div className="mt-1"><RichTextEditor content={qForm.explanation} onChange={(html) => setQForm({ ...qForm, explanation: html })} placeholder="সঠিক উত্তরের ব্যাখ্যা" minHeight="60px" /></div></div>
            <Button onClick={handleSaveQuestion} className="w-full">{editingQuestion ? "আপডেট" : "প্রশ্ন যোগ করুন"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourseDetail;
