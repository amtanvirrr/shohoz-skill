import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, X, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  category: string;
  tags: string[];
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

const initialForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  category: "",
  tags: "",
  author_name: "",
  is_published: false,
  meta_title: "",
  meta_description: "",
};

const AdminBlog = () => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const { data } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
    setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-\u0980-\u09FF]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim() + "-" + Date.now().toString(36);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      cover_image_url: post.cover_image_url,
      category: post.category,
      tags: post.tags?.join(", ") || "",
      author_name: post.author_name,
      is_published: post.is_published,
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
    });
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `blog/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file);
    setUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("blog-images").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: urlData.publicUrl }));
  };

  const handleSave = async () => {
    if (!form.title) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }

    const slug = form.slug || generateSlug(form.title);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      title: form.title,
      slug,
      excerpt: form.excerpt,
      content: form.content,
      cover_image_url: form.cover_image_url,
      category: form.category,
      tags,
      author_name: form.author_name,
      is_published: form.is_published,
      published_at: form.is_published ? new Date().toISOString() : null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
    };

    if (editing) {
      const { error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Blog post updated" });
    } else {
      const { error } = await supabase.from("blog_posts").insert(payload);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Blog post created" });
    }
    setDialogOpen(false);
    resetForm();
    fetchPosts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ title: "Blog post deleted" });
    fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newState = !post.is_published;
    await supabase.from("blog_posts").update({
      is_published: newState,
      published_at: newState ? new Date().toISOString() : null,
    }).eq("id", post.id);
    toast({ title: newState ? "Published" : "Unpublished" });
    fetchPosts();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Post</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit Post" : "New Blog Post"}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
              </div>

              <div>
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto-generated from title" className="mt-1" />
              </div>

              <div>
                <Label>Author Name</Label>
                <Input value={form.author_name} onChange={(e) => setForm({ ...form, author_name: e.target.value })} className="mt-1" />
              </div>

              <div>
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Career Tips, Study Guide" className="mt-1" />
              </div>

              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="skill, career, tips" className="mt-1" />
              </div>

              {/* Cover Image */}
              <div>
                <Label>Cover Image</Label>
                <p className="text-xs text-muted-foreground">রিকমেন্ডেড সাইজ: 1200×630px (16:9 রেশিও)</p>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                {form.cover_image_url ? (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={form.cover_image_url} alt="Cover" className="h-20 w-36 rounded border border-border object-cover" />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                        Change
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, cover_image_url: "" })}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="mt-1 w-full" onClick={() => imageInputRef.current?.click()} disabled={uploading}>
                    <Upload className="mr-2 h-4 w-4" /> {uploading ? "Uploading..." : "Upload Cover Image"}
                  </Button>
                )}
              </div>

              <div>
                <Label>Excerpt</Label>
                <Textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary for listing page" className="mt-1" />
              </div>

              <div>
                <Label>Content (HTML)</Label>
                <Textarea rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="<h2>Heading</h2><p>Paragraph...</p>" className="mt-1 font-mono text-sm" />
              </div>

              {/* SEO */}
              <div className="rounded-lg border border-border p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">SEO Settings</h3>
                <div>
                  <Label>Meta Title</Label>
                  <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder="Custom title for search engines" className="mt-1" />
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea rows={2} value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="Custom description for search engines" className="mt-1" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={form.is_published} onCheckedChange={(checked) => setForm({ ...form, is_published: checked })} />
                <Label>Publish Now</Label>
              </div>

              <Button onClick={handleSave} className="w-full">{editing ? "Update" : "Create"} Post</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="mt-8 text-center text-muted-foreground">Loading...</p>
      ) : posts.length === 0 ? (
        <p className="mt-8 text-center text-muted-foreground">No blog posts yet. Create your first one!</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted-foreground">
              <tr>
                <th className="pb-3 pr-4">Title</th>
                <th className="pb-3 pr-4">Category</th>
                <th className="pb-3 pr-4">Author</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    <div className="flex items-center gap-3">
                      {post.cover_image_url && (
                        <img src={post.cover_image_url} alt="" className="h-10 w-16 rounded object-cover" />
                      )}
                      <span className="line-clamp-1">{post.title}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {post.category && <Badge variant="secondary">{post.category}</Badge>}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{post.author_name}</td>
                  <td className="py-3 pr-4">
                    <button onClick={() => togglePublish(post)} className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${post.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                        {post.is_published ? "Published" : "Draft"}
                      </span>
                    </button>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {post.is_published && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={`/blog/${post.slug}`} target="_blank"><Eye className="h-4 w-4" /></a>
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(post)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

export default AdminBlog;
