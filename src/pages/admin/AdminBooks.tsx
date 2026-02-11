import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  original_price: number | null;
  image_url: string;
  description: string;
  category: string;
  is_published: boolean;
}

const AdminBooks = () => {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState({ title: "", author: "", price: "", original_price: "", image_url: "", description: "", category: "", is_published: true });

  const fetchBooks = async () => {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setBooks((data as Book[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, []);

  const resetForm = () => {
    setForm({ title: "", author: "", price: "", original_price: "", image_url: "", description: "", category: "", is_published: true });
    setEditing(null);
  };

  const openEdit = (book: Book) => {
    setEditing(book);
    setForm({
      title: book.title,
      author: book.author,
      price: String(book.price),
      original_price: book.original_price ? String(book.original_price) : "",
      image_url: book.image_url,
      description: book.description,
      category: book.category,
      is_published: book.is_published,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.price) {
      toast({ title: "Title and price required", variant: "destructive" });
      return;
    }
    const payload = {
      title: form.title,
      author: form.author,
      price: parseInt(form.price),
      original_price: form.original_price ? parseInt(form.original_price) : null,
      image_url: form.image_url,
      description: form.description,
      category: form.category,
      is_published: form.is_published,
    };

    if (editing) {
      const { error } = await supabase.from("books").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Book updated" });
    } else {
      const { error } = await supabase.from("books").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Book added" });
    }
    setDialogOpen(false);
    resetForm();
    fetchBooks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this book?")) return;
    await supabase.from("books").delete().eq("id", id);
    toast({ title: "Book deleted" });
    fetchBooks();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Books</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Add Book</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit Book" : "Add Book"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
              <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (৳) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
                <div><Label>Original Price</Label><Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="mt-1" /></div>
              </div>
              <div><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="mt-1" /></div>
              <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1" /></div>
              <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} /> Published</label>
              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Add"} Book</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : books.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No books yet. Add your first book!</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr><th className="pb-3 pr-4">Title</th><th className="pb-3 pr-4">Author</th><th className="pb-3 pr-4">Price</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium text-foreground">{book.title}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{book.author}</td>
                  <td className="py-3 pr-4">৳{book.price}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${book.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {book.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(book)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(book.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminBooks;
