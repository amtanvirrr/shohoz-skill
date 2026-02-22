import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/RichTextEditor";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Review {
  id: string;
  course_id: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_active: boolean;
  is_admin_added: boolean;
  created_at: string;
}

interface CourseOption {
  id: string;
  title: string;
}

const initialForm = {
  course_id: "",
  reviewer_name: "",
  rating: "5",
  comment: "",
  is_active: true,
};

const AdminReviews = () => {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [form, setForm] = useState(initialForm);

  const fetchData = async () => {
    const [revRes, courseRes] = await Promise.all([
      supabase.from("reviews").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("id, title").order("title"),
    ]);
    setReviews((revRes.data as Review[]) || []);
    setCourses((courseRes.data as CourseOption[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { setForm(initialForm); setEditing(null); };

  const openEdit = (r: Review) => {
    setEditing(r);
    setForm({
      course_id: r.course_id,
      reviewer_name: r.reviewer_name,
      rating: String(r.rating),
      comment: r.comment,
      is_active: r.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.course_id || !form.reviewer_name || !form.comment) {
      toast({ title: "Course, name & comment required", variant: "destructive" });
      return;
    }
    const payload = {
      course_id: form.course_id,
      reviewer_name: form.reviewer_name,
      rating: parseInt(form.rating),
      comment: form.comment,
      is_active: form.is_active,
      is_admin_added: true,
    };

    if (editing) {
      const { error } = await supabase.from("reviews").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Review updated" });
    } else {
      const { error } = await supabase.from("reviews").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Review added" });
    }
    setDialogOpen(false);
    resetForm();
    fetchData();
  };

  const toggleActive = async (r: Review) => {
    await supabase.from("reviews").update({ is_active: !r.is_active }).eq("id", r.id);
    toast({ title: r.is_active ? "Review deactivated" : "Review activated" });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    await supabase.from("reviews").delete().eq("id", id);
    toast({ title: "Review deleted" });
    fetchData();
  };

  const courseName = (id: string) => courses.find((c) => c.id === id)?.title || "Unknown";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Review</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Review" : "Add Review"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Course *</Label>
                <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select course" /></SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reviewer Name *</Label>
                <Input value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Rating *</Label>
                <Select value={form.rating} onValueChange={(v) => setForm({ ...form, rating: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <SelectItem key={n} value={String(n)}>{"⭐".repeat(n)} ({n})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comment *</Label>
                <div className="mt-1"><RichTextEditor content={form.comment} onChange={(html) => setForm({ ...form, comment: html })} placeholder="রিভিউ কমেন্ট লিখুন..." minHeight="150px" /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
              </label>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Review</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : reviews.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">Reviewer</th>
                <th className="pb-3 pr-4">Course</th>
                <th className="pb-3 pr-4">Rating</th>
                <th className="pb-3 pr-4">Comment</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {r.reviewer_name}
                    {r.is_admin_added && <span className="ml-1 text-xs text-muted-foreground">(admin)</span>}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground max-w-[150px] truncate">{courseName(r.course_id)}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground max-w-[200px] truncate">{r.comment}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${r.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {r.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => toggleActive(r)} title={r.is_active ? "Deactivate" : "Activate"}>
                        {r.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
