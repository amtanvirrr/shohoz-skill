import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Plus, Pencil, Trash2, Upload, X, FileText, GripVertical,
  Video, BookOpen, HelpCircle, ChevronDown, ChevronRight
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
}

const lessonInitial = {
  title: "", content: "", duration: "", video_url: "", lesson_type: "text",
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

  // Quiz dialog
  const [quizDialogOpen, setQuizDialogOpen] = useState(false);
  const [quizLessonId, setQuizLessonId] = useState<string | null>(null);
  const [quizForm, setQuizForm] = useState({ title: "", description: "" });

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

    // Filter quizzes for this course's lessons
    const lessonIds = lessonData.map((l) => l.id);
    const courseQuizzes = ((quizzesRes.data as Quiz[]) || []).filter(
      (q) => q.lesson_id && lessonIds.includes(q.lesson_id)
    );
    setQuizzes(courseQuizzes);

    // Fetch resources for all lessons
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

  // ---- Quiz for lesson ----
  const openAddQuiz = (lessonId: string) => {
    setQuizLessonId(lessonId);
    setQuizForm({ title: "", description: "" });
    setQuizDialogOpen(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizForm.title || !quizLessonId) {
      toast({ title: "Quiz title required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("quizzes").insert({
      title: quizForm.title,
      description: quizForm.description || null,
      lesson_id: quizLessonId,
      is_published: true,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Quiz added to lesson" });
    setQuizDialogOpen(false);
    fetchAll();
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Delete this quiz?")) return;
    await supabase.from("quizzes").delete().eq("id", quizId);
    toast({ title: "Quiz deleted" });
    fetchAll();
  };

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

  if (loading) return <p className="py-12 text-center text-muted-foreground">Loading...</p>;
  if (!course) return <p className="py-12 text-center text-muted-foreground">Course not found.</p>;

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
        <Accordion type="multiple" className="space-y-2">
          {lessons.map((lesson, idx) => {
            const lessonResources = resources[lesson.id] || [];
            const lessonQuizzes = quizzes.filter((q) => q.lesson_id === lesson.id);

            return (
              <AccordionItem key={lesson.id} value={lesson.id} className="rounded-lg border border-border bg-card">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex w-full items-center gap-3 text-left">
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
                  {/* Lesson content preview */}
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

                  {/* Resources */}
                  <div className="mb-3">
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">📁 Resources</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => triggerResourceUpload(lesson.id)}
                        disabled={uploadingResource === lesson.id}
                      >
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
                            <a href={res.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate text-foreground hover:underline">
                              {res.title}
                            </a>
                            <span className="text-xs text-muted-foreground">{formatFileSize(res.file_size)}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteResource(res.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quizzes */}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => navigate(`/admin/quizzes`)}
                            >
                              Manage
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteQuiz(quiz.id)}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
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
            );
          })}
        </Accordion>
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
            <div><Label>Content</Label><Textarea rows={6} value={lessonForm.content} onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })} className="mt-1" placeholder="Lesson content or notes..." /></div>
            <Button onClick={handleSaveLesson} className="w-full">{editingLesson ? "Update" : "Add"} Lesson</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quiz Dialog */}
      <Dialog open={quizDialogOpen} onOpenChange={setQuizDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Quiz to Lesson</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div><Label>Quiz Title *</Label><Input value={quizForm.title} onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })} className="mt-1" /></div>
            <div><Label>Description</Label><Textarea rows={3} value={quizForm.description} onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })} className="mt-1" /></div>
            <p className="text-xs text-muted-foreground">After creating, go to the Quizzes section to add questions.</p>
            <Button onClick={handleSaveQuiz} className="w-full">Create Quiz</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCourseDetail;
