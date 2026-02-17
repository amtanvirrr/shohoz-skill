import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Eye, Copy, ArrowLeft, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { generateSlug } from "@/lib/slugify";

interface LandingPage {
  id: string;
  slug: string;
  product_id: string;
  product_type: string;
  theme: string;
  headline: string;
  subheadline: string;
  hero_image_url: string;
  hero_video_url: string;
  benefits: { title: string; description: string }[];
  media_items: { type: string; url: string; caption: string }[];
  reviews: { name: string; rating: number; comment: string; image_url?: string }[];
  faqs: { question: string; answer: string }[];
  cta_text: string;
  cta_color: string;
  show_quantity: boolean;
  is_published: boolean;
  created_at: string;
}

interface Product {
  id: string;
  title: string;
  type: string;
  price: number;
  image_url: string;
}

const THEMES = [
  { value: "classic", label: "ক্লাসিক", description: "পরিচ্ছন্ন, পেশাদার ডিজাইন" },
  { value: "bold", label: "বোল্ড", description: "উজ্জ্বল রং ও বড় টাইপোগ্রাফি" },
  { value: "minimal", label: "মিনিমাল", description: "সাদামাটা, ফোকাসড লেআউট" },
];

const AdminLandingPages = () => {
  const { toast } = useToast();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingPage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const emptyPage: Omit<LandingPage, "id" | "created_at"> = {
    slug: "",
    product_id: "",
    product_type: "book",
    theme: "classic",
    headline: "",
    subheadline: "",
    hero_image_url: "",
    hero_video_url: "",
    benefits: [{ title: "", description: "" }],
    media_items: [],
    reviews: [],
    faqs: [{ question: "", answer: "" }],
    cta_text: "এখনই অর্ডার করুন",
    cta_color: "#e11d48",
    show_quantity: true,
    is_published: false,
  };

  const [form, setForm] = useState<Omit<LandingPage, "id" | "created_at">>(emptyPage);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [pagesRes, booksRes, coursesRes, quizzesRes] = await Promise.all([
      supabase.from("landing_pages").select("*").order("created_at", { ascending: false }),
      supabase.from("books").select("id, title, price, image_url"),
      supabase.from("courses").select("id, title, price, image_url"),
      supabase.from("quizzes").select("id, title, price"),
    ]);

    setPages((pagesRes.data as any[]) || []);

    const allProducts: Product[] = [
      ...((booksRes.data || []) as any[]).map((b: any) => ({ id: b.id, title: b.title, type: "book", price: b.price, image_url: b.image_url })),
      ...((coursesRes.data || []) as any[]).map((c: any) => ({ id: c.id, title: c.title, type: "course", price: c.price, image_url: c.image_url })),
      ...((quizzesRes.data || []) as any[]).map((q: any) => ({ id: q.id, title: q.title, type: "quiz", price: q.price, image_url: "" })),
    ];
    setProducts(allProducts);
    setLoading(false);
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setForm(f => ({
        ...f,
        product_id: productId,
        product_type: product.type,
        headline: f.headline || product.title,
        slug: f.slug || generateSlug(product.title),
        hero_image_url: f.hero_image_url || product.image_url || "",
      }));
    }
  };

  const handleSave = async () => {
    if (!form.product_id || !form.slug || !form.headline) {
      toast({ title: "প্রোডাক্ট, স্লাগ ও হেডলাইন আবশ্যক", variant: "destructive" });
      return;
    }

    const payload = {
      ...form,
      benefits: form.benefits.filter(b => b.title.trim()),
      faqs: form.faqs.filter(f => f.question.trim()),
      reviews: form.reviews.filter(r => r.name.trim()),
      media_items: form.media_items.filter(m => m.url.trim()),
    };

    if (editing) {
      const { error } = await supabase.from("landing_pages").update(payload as any).eq("id", editing.id);
      if (error) { toast({ title: "আপডেট ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "ল্যান্ডিং পেজ আপডেট হয়েছে" });
    } else {
      const { error } = await supabase.from("landing_pages").insert(payload as any);
      if (error) { toast({ title: "তৈরি ব্যর্থ", description: error.message, variant: "destructive" }); return; }
      toast({ title: "ল্যান্ডিং পেজ তৈরি হয়েছে" });
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyPage);
    fetchAll();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("মুছে ফেলতে চান?")) return;
    await supabase.from("landing_pages").delete().eq("id", id);
    toast({ title: "মুছে ফেলা হয়েছে" });
    fetchAll();
  };

  const openEdit = (page: LandingPage) => {
    setEditing(page);
    setForm({
      slug: page.slug,
      product_id: page.product_id,
      product_type: page.product_type,
      theme: page.theme,
      headline: page.headline,
      subheadline: page.subheadline,
      hero_image_url: page.hero_image_url || "",
      hero_video_url: page.hero_video_url || "",
      benefits: (page.benefits as any[])?.length ? page.benefits : [{ title: "", description: "" }],
      media_items: (page.media_items as any[]) || [],
      reviews: (page.reviews as any[]) || [],
      faqs: (page.faqs as any[])?.length ? page.faqs : [{ question: "", answer: "" }],
      cta_text: page.cta_text,
      cta_color: page.cta_color,
      show_quantity: page.show_quantity,
      is_published: page.is_published,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyPage);
    setDialogOpen(true);
  };

  // Array helpers
  const updateBenefit = (i: number, field: string, val: string) => {
    const arr = [...form.benefits];
    (arr[i] as any)[field] = val;
    setForm(f => ({ ...f, benefits: arr }));
  };
  const addBenefit = () => setForm(f => ({ ...f, benefits: [...f.benefits, { title: "", description: "" }] }));
  const removeBenefit = (i: number) => setForm(f => ({ ...f, benefits: f.benefits.filter((_, idx) => idx !== i) }));

  const updateFaq = (i: number, field: string, val: string) => {
    const arr = [...form.faqs];
    (arr[i] as any)[field] = val;
    setForm(f => ({ ...f, faqs: arr }));
  };
  const addFaq = () => setForm(f => ({ ...f, faqs: [...f.faqs, { question: "", answer: "" }] }));
  const removeFaq = (i: number) => setForm(f => ({ ...f, faqs: f.faqs.filter((_, idx) => idx !== i) }));

  const updateReview = (i: number, field: string, val: any) => {
    const arr = [...form.reviews];
    (arr[i] as any)[field] = val;
    setForm(f => ({ ...f, reviews: arr }));
  };
  const addReview = () => setForm(f => ({ ...f, reviews: [...f.reviews, { name: "", rating: 5, comment: "", image_url: "" }] }));
  const removeReview = (i: number) => setForm(f => ({ ...f, reviews: f.reviews.filter((_, idx) => idx !== i) }));

  const updateMedia = (i: number, field: string, val: string) => {
    const arr = [...form.media_items];
    (arr[i] as any)[field] = val;
    setForm(f => ({ ...f, media_items: arr }));
  };
  const addMedia = () => setForm(f => ({ ...f, media_items: [...f.media_items, { type: "image", url: "", caption: "" }] }));
  const removeMedia = (i: number) => setForm(f => ({ ...f, media_items: f.media_items.filter((_, idx) => idx !== i) }));

  if (loading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ল্যান্ডিং পেজ বিল্ডার</h1>
          <p className="text-sm text-muted-foreground">প্রোডাক্টের জন্য কাস্টম ল্যান্ডিং পেজ তৈরি করুন</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> নতুন পেজ</Button>
      </div>

      {/* List */}
      {pages.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">এখনো কোনো ল্যান্ডিং পেজ তৈরি করা হয়নি</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map(page => {
            const product = products.find(p => p.id === page.product_id);
            return (
              <Card key={page.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{page.headline || "Untitled"}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">{product?.title || "Unknown product"}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${page.is_published ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"}`}>
                      {page.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-muted-foreground mb-3">Theme: {THEMES.find(t => t.value === page.theme)?.label} • /lp/{page.slug}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(page)}><Edit className="h-3.5 w-3.5 mr-1" /> Edit</Button>
                    <Button size="sm" variant="outline" asChild><a href={`/lp/${page.slug}`} target="_blank"><Eye className="h-3.5 w-3.5 mr-1" /> View</a></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(page.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Editor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "ল্যান্ডিং পেজ এডিট করুন" : "নতুন ল্যান্ডিং পেজ তৈরি করুন"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>প্রোডাক্ট সিলেক্ট করুন *</Label>
                <Select value={form.product_id} onValueChange={handleProductSelect}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="প্রোডাক্ট বাছুন" /></SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        [{p.type === "book" ? "বই" : p.type === "course" ? "কোর্স" : "কুইজ"}] {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>থিম সিলেক্ট করুন *</Label>
                <Select value={form.theme} onValueChange={v => setForm(f => ({ ...f, theme: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {THEMES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label} — {t.description}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>স্লাগ (URL) *</Label>
                <Input className="mt-1" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="product-name" />
                <p className="text-xs text-muted-foreground mt-1">URL: /lp/{form.slug}</p>
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={form.is_published} onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))} />
                <Label>পাবলিশ করুন</Label>
              </div>
            </div>

            {/* Headline */}
            <Card>
              <CardHeader><CardTitle className="text-base">১. হেডলাইন ও সাবহেডলাইন</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>হেডলাইন *</Label>
                  <Input className="mt-1 text-lg font-bold" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} placeholder="আপনার আকর্ষণীয় হেডলাইন" />
                </div>
                <div>
                  <Label>সাবহেডলাইন</Label>
                  <Textarea className="mt-1" value={form.subheadline} onChange={e => setForm(f => ({ ...f, subheadline: e.target.value }))} placeholder="সংক্ষেপে প্রোডাক্টের মূল বার্তা" rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Hero Visual */}
            <Card>
              <CardHeader><CardTitle className="text-base">৩. হিরো ভিজ্যুয়াল</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>হিরো ইমেজ URL</Label>
                  <Input className="mt-1" value={form.hero_image_url} onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label>হিরো ভিডিও URL (YouTube/ভিমিও)</Label>
                  <Input className="mt-1" value={form.hero_video_url} onChange={e => setForm(f => ({ ...f, hero_video_url: e.target.value }))} placeholder="https://www.youtube.com/embed/..." />
                </div>
              </CardContent>
            </Card>

            {/* Benefits */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">২. প্রোডাক্ট বেনিফিট</CardTitle>
                <Button size="sm" variant="outline" onClick={addBenefit}><Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.benefits.map((b, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input value={b.title} onChange={e => updateBenefit(i, "title", e.target.value)} placeholder={`বেনিফিট ${i + 1} শিরোনাম`} />
                      <Input value={b.description} onChange={e => updateBenefit(i, "description", e.target.value)} placeholder="সংক্ষিপ্ত বর্ণনা" />
                    </div>
                    {form.benefits.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeBenefit(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Media Gallery */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">৩. মিডিয়া গ্যালারি (ছবি/ভিডিও)</CardTitle>
                <Button size="sm" variant="outline" onClick={addMedia}><Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.media_items.length === 0 && <p className="text-sm text-muted-foreground">কোনো মিডিয়া যোগ করা হয়নি</p>}
                {form.media_items.map((m, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Select value={m.type} onValueChange={v => updateMedia(i, "type", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">ছবি</SelectItem>
                          <SelectItem value="video">ভিডিও</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input value={m.url} onChange={e => updateMedia(i, "url", e.target.value)} placeholder="URL" />
                      <Input value={m.caption} onChange={e => updateMedia(i, "caption", e.target.value)} placeholder="ক্যাপশন (ঐচ্ছিক)" />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeMedia(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">৪. গ্রাহক রিভিউ / সফলতার গল্প</CardTitle>
                <Button size="sm" variant="outline" onClick={addReview}><Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.reviews.length === 0 && <p className="text-sm text-muted-foreground">কোনো রিভিউ যোগ করা হয়নি</p>}
                {form.reviews.map((r, i) => (
                  <div key={i} className="flex gap-2 items-start border rounded-lg p-3">
                    <div className="flex-1 space-y-2">
                      <Input value={r.name} onChange={e => updateReview(i, "name", e.target.value)} placeholder="গ্রাহকের নাম" />
                      <div className="flex gap-2">
                        <Select value={String(r.rating)} onValueChange={v => updateReview(i, "rating", Number(v))}>
                          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[5,4,3,2,1].map(n => <SelectItem key={n} value={String(n)}>{"⭐".repeat(n)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input className="flex-1" value={r.image_url || ""} onChange={e => updateReview(i, "image_url", e.target.value)} placeholder="ছবি URL (ঐচ্ছিক)" />
                      </div>
                      <Textarea value={r.comment} onChange={e => updateReview(i, "comment", e.target.value)} placeholder="রিভিউ / সফলতার গল্প" rows={2} />
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeReview(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CTA */}
            <Card>
              <CardHeader><CardTitle className="text-base">৫. CTA বাটন সেটিংস</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>CTA বাটন টেক্সট</Label>
                    <Input className="mt-1" value={form.cta_text} onChange={e => setForm(f => ({ ...f, cta_text: e.target.value }))} />
                  </div>
                  <div>
                    <Label>CTA বাটন রং</Label>
                    <div className="flex gap-2 mt-1">
                      <input type="color" value={form.cta_color} onChange={e => setForm(f => ({ ...f, cta_color: e.target.value }))} className="h-10 w-14 rounded border cursor-pointer" />
                      <Input value={form.cta_color} onChange={e => setForm(f => ({ ...f, cta_color: e.target.value }))} className="flex-1" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.show_quantity} onCheckedChange={v => setForm(f => ({ ...f, show_quantity: v }))} />
                  <Label>কোয়ান্টিটি সিলেক্টর দেখান (ফিজিক্যাল প্রোডাক্ট)</Label>
                </div>
              </CardContent>
            </Card>

            {/* FAQs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">৮. FAQ সেকশন</CardTitle>
                <Button size="sm" variant="outline" onClick={addFaq}><Plus className="h-3.5 w-3.5 mr-1" /> যোগ করুন</Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {form.faqs.map((f, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Input value={f.question} onChange={e => updateFaq(i, "question", e.target.value)} placeholder="প্রশ্ন" />
                      <Textarea value={f.answer} onChange={e => updateFaq(i, "answer", e.target.value)} placeholder="উত্তর" rows={2} />
                    </div>
                    {form.faqs.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => removeFaq(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>বাতিল</Button>
              <Button onClick={handleSave}>{editing ? "আপডেট করুন" : "তৈরি করুন"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLandingPages;
