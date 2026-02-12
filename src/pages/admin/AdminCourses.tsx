import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, X, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Course {
  id: string;
  title: string;
  instructor: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string;
  category: string;
  duration: string;
  is_published: boolean;
}

const initialForm = {
  title: "",
  instructor: "",
  price: "",
  original_price: "",
  image_url: "",
  description: "",
  category: "",
  duration: "",
  is_published: true,
};

const AdminCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchCourses = async () => {
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    setCourses((data as Course[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
  };

  const openEdit = (course: Course) => {
    setEditing(course);
    setForm({
      title: course.title,
      instructor: course.instructor,
      price: String(course.price),
      original_price: course.original_price ? String(course.original_price) : "",
      image_url: course.image_url,
      description: course.description,
      category: course.category,
      duration: course.duration,
      is_published: course.is_published,
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `covers/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("course-images").upload(path, file);
    setUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("course-images").getPublicUrl(path);
    setForm((f) => ({ ...f, image_url: urlData.publicUrl }));
  };

  const handleSave = async () => {
    if (!form.title || !form.price) {
      toast({ title: "Title and price required", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title,
      instructor: form.instructor,
      price: parseInt(form.price),
      original_price: form.original_price ? parseInt(form.original_price) : null,
      image_url: form.image_url,
      description: form.description,
      category: form.category,
      duration: form.duration,
      is_published: form.is_published,
    };

    if (editing) {
      const { error } = await supabase.from("courses").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Course updated" });
    } else {
      const { error } = await supabase.from("courses").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Course added" });
    }
    setDialogOpen(false);
    resetForm();
    fetchCourses();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this course?")) return;
    await supabase.from("courses").delete().eq("id", id);
    toast({ title: "Course deleted" });
    fetchCourses();
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Courses</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Course</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Course" : "Add Course"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
              <div><Label>Instructor</Label><Input value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} className="mt-1" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (৳) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
                <div><Label>Original Price (৳)</Label><Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="mt-1" /></div>
              </div>

              <div><Label>Duration</Label><Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="mt-1" placeholder="e.g. 40 hours" /></div>

              {/* Cover Image Upload */}
              <div>
                <Label>Cover Image</Label>
                <p className="text-xs text-muted-foreground">রিকমেন্ডেড সাইজ: 1280×720px (16:9 রেশিও)</p>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {form.image_url ? (
                  <div className="mt-1 flex items-center gap-3">
                    <img src={form.image_url} alt="Cover" className="h-20 w-16 rounded border border-border object-cover" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                        Change
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: "" })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-2 h-4 w-4" /> {uploading ? "Uploading..." : "Upload Image"}
                  </Button>
                )}
              </div>

              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Course</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : courses.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No courses yet. Add your first course!</p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted-foreground">
                <tr><th className="pb-3 pr-4">Title</th><th className="pb-3 pr-4">Instructor</th><th className="pb-3 pr-4">Price</th><th className="pb-3 pr-4">Duration</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-border">
                    <td className="py-3 pr-4 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {course.image_url && <img src={course.image_url} alt="" className="h-10 w-10 rounded object-cover" />}
                        {course.title}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{course.instructor}</td>
                    <td className="py-3 pr-4">৳{course.price}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{course.duration}</td>
                    <td className="py-3 pr-4"><span className={`rounded-full px-2 py-0.5 text-xs ${course.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{course.is_published ? "Published" : "Draft"}</span></td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/courses/${course.id}`)} title="Manage Lessons"><BookOpen className="mr-1 h-4 w-4" /> Lessons</Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(course)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(course.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 space-y-3 md:hidden">
            {courses.map((course) => (
              <div key={course.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-3">
                  {course.image_url && <img src={course.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm line-clamp-1">{course.title}</h4>
                    <p className="text-xs text-muted-foreground">{course.instructor} • {course.duration}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-semibold text-foreground">৳{course.price}</span>
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${course.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{course.is_published ? "Published" : "Draft"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 border-t border-border pt-2">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs h-8" onClick={() => navigate(`/admin/courses/${course.id}`)}><BookOpen className="mr-1 h-3.5 w-3.5" /> Lessons</Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(course)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(course.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminCourses;
