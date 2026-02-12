import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  book_type: string;
  page_count: number | null;
  stock_quantity: number | null;
  ebook_file_url: string | null;
  demo_pdf_url: string | null;
}

const initialForm = {
  title: "",
  author: "",
  price: "",
  original_price: "",
  image_url: "",
  description: "",
  category: "",
  is_published: true,
  book_type: "physical" as string,
  page_count: "",
  stock_quantity: "",
  ebook_file_url: "",
  demo_pdf_url: "",
};

const AdminBooks = () => {
  const { toast } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const [uploadingEbook, setUploadingEbook] = useState(false);
  const [uploadingDemo, setUploadingDemo] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const ebookInputRef = useRef<HTMLInputElement>(null);
  const demoInputRef = useRef<HTMLInputElement>(null);

  const fetchBooks = async () => {
    const { data } = await supabase.from("books").select("*").order("created_at", { ascending: false });
    setBooks((data as Book[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchBooks(); }, []);

  const resetForm = () => {
    setForm(initialForm);
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
      book_type: book.book_type || "physical",
      page_count: book.page_count ? String(book.page_count) : "",
      stock_quantity: book.stock_quantity ? String(book.stock_quantity) : "",
      ebook_file_url: book.ebook_file_url || "",
      demo_pdf_url: book.demo_pdf_url || "",
    });
    setDialogOpen(true);
  };

  const uploadFile = async (
    file: File,
    bucket: string,
    folder: string,
    setUpl: (v: boolean) => void
  ): Promise<string | null> => {
    setUpl(true);
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file);
    setUpl(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "book-images", "covers", setUploading);
    if (url) setForm((f) => ({ ...f, image_url: url }));
  };

  const handleEbookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "ebook-files", "ebooks", setUploadingEbook);
    if (url) setForm((f) => ({ ...f, ebook_file_url: url }));
  };

  const handleDemoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFile(file, "book-images", "demos", setUploading);
    if (url) setForm((f) => ({ ...f, demo_pdf_url: url }));
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
      book_type: form.book_type,
      page_count: form.page_count ? parseInt(form.page_count) : null,
      stock_quantity: form.book_type === "physical" && form.stock_quantity ? parseInt(form.stock_quantity) : null,
      ebook_file_url: form.book_type === "ebook" ? form.ebook_file_url : null,
      demo_pdf_url: form.demo_pdf_url || null,
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
              {/* Book Type */}
              <div>
                <Label>Book Type *</Label>
                <Select value={form.book_type} onValueChange={(v) => setForm({ ...form, book_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">📦 Physical Book</SelectItem>
                    <SelectItem value="ebook">📱 E-Book</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
              <div><Label>Author</Label><Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="mt-1" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price (৳) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
                <div><Label>Original Price (৳)</Label><Input type="number" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="mt-1" /></div>
              </div>

              {/* Cover Image Upload */}
              <div>
              <Label>Cover Image</Label>
                <p className="text-xs text-muted-foreground">রিকমেন্ডেড সাইজ: 600×800px (3:4 রেশিও)</p>
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
              
              <div><Label>Page Count</Label><Input type="number" value={form.page_count} onChange={(e) => setForm({ ...form, page_count: e.target.value })} className="mt-1" /></div>

              {/* Physical book fields */}
              {form.book_type === "physical" && (
                <div><Label>Stock Quantity</Label><Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} className="mt-1" /></div>
              )}

              {/* Ebook fields */}
              {form.book_type === "ebook" && (
                <div>
                  <Label>E-Book File (PDF)</Label>
                  <input ref={ebookInputRef} type="file" accept=".pdf,.epub" className="hidden" onChange={handleEbookUpload} />
                  {form.ebook_file_url ? (
                    <div className="mt-1 flex items-center gap-3 rounded-md border border-border p-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm text-muted-foreground">File uploaded</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, ebook_file_url: "" })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => ebookInputRef.current?.click()} disabled={uploadingEbook}>
                      <Upload className="mr-2 h-4 w-4" /> {uploadingEbook ? "Uploading..." : "Upload E-Book File"}
                    </Button>
                  )}
                </div>
              )}

              {/* Demo PDF */}
              <div>
                <Label>Demo PDF (Preview)</Label>
                <input ref={demoInputRef} type="file" accept=".pdf" className="hidden" onChange={handleDemoUpload} />
                {form.demo_pdf_url ? (
                  <div className="mt-1 flex items-center gap-3 rounded-md border border-border p-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm text-muted-foreground">Demo uploaded</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, demo_pdf_url: "" })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => demoInputRef.current?.click()} disabled={uploadingDemo}>
                    <Upload className="mr-2 h-4 w-4" /> {uploadingDemo ? "Uploading..." : "Upload Demo PDF"}
                  </Button>
                )}
              </div>

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
              <tr><th className="pb-3 pr-4">Title</th><th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Author</th><th className="pb-3 pr-4">Price</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Actions</th></tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    <div className="flex items-center gap-2">
                      {book.image_url && <img src={book.image_url} alt="" className="h-10 w-8 rounded object-cover" />}
                      {book.title}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {book.book_type === "ebook" ? "📱 E-Book" : "📦 Physical"}
                    </span>
                  </td>
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
