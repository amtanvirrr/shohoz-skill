import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Image, Video, ArrowUp, ArrowDown, Upload, Loader2 } from "lucide-react";

interface HeroFields {
  hero_title: string;
  hero_subtitle: string;
  hero_btn1_text: string;
  hero_btn1_link: string;
  hero_btn2_text: string;
  hero_btn2_link: string;
  hero_stat1_value: string;
  hero_stat1_label: string;
  hero_stat2_value: string;
  hero_stat2_label: string;
  hero_stat3_value: string;
  hero_stat3_label: string;
}

interface HeroSlide {
  id: string;
  media_url: string;
  media_type: string;
  sort_order: number;
  is_active: boolean;
}

const defaultFields: HeroFields = {
  hero_title: "", hero_subtitle: "",
  hero_btn1_text: "", hero_btn1_link: "",
  hero_btn2_text: "", hero_btn2_link: "",
  hero_stat1_value: "", hero_stat1_label: "",
  hero_stat2_value: "", hero_stat2_label: "",
  hero_stat3_value: "", hero_stat3_label: "",
};

const HERO_KEYS = Object.keys(defaultFields) as (keyof HeroFields)[];

const AdminHero = () => {
  const { toast } = useToast();
  const [uploadingSlide, setUploadingSlide] = useState<string | null>(null);
  const [fields, setFields] = useState<HeroFields>(defaultFields);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    const [settingsRes, slidesRes] = await Promise.all([
      supabase.from("site_settings").select("key, value").in("key", HERO_KEYS),
      supabase.from("hero_slides").select("*").order("sort_order", { ascending: true }),
    ]);

    if (settingsRes.data) {
      const merged = { ...defaultFields };
      settingsRes.data.forEach((row) => {
        if (row.key in merged) (merged as any)[row.key] = row.value;
      });
      setFields(merged);
    }
    setSlides(slidesRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (key: keyof HeroFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    setSaving(true);
    const { data: existing } = await supabase.from("site_settings").select("key").in("key", HERO_KEYS);
    const existingKeys = new Set(existing?.map((r) => r.key) || []);

    const ops = HERO_KEYS.map((key) => {
      if (existingKeys.has(key)) {
        return supabase.from("site_settings").update({ value: fields[key] }).eq("key", key);
      } else if (fields[key]) {
        return supabase.from("site_settings").insert({ key, value: fields[key] });
      }
      return null;
    }).filter(Boolean);

    await Promise.all(ops);
    setSaving(false);
    toast({ title: "হিরো সেটিংস সেভ হয়েছে" });
  };

  const addSlide = async () => {
    const maxOrder = slides.length > 0 ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0;
    const { data } = await supabase.from("hero_slides").insert({ media_url: "", media_type: "image", sort_order: maxOrder }).select().single();
    if (data) setSlides((prev) => [...prev, data]);
  };

  const handleFileUpload = async (slideId: string, file: File) => {
    setUploadingSlide(slideId);
    const ext = file.name.split(".").pop();
    const path = `slides/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("hero-media").upload(path, file);
    if (error) {
      toast({ title: "আপলোড ব্যর্থ", description: error.message, variant: "destructive" });
      setUploadingSlide(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("hero-media").getPublicUrl(path);
    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    await updateSlide(slideId, { media_url: urlData.publicUrl, media_type: mediaType });
    setUploadingSlide(null);
    toast({ title: "আপলোড সফল" });
  };

  const updateSlide = async (id: string, updates: Partial<HeroSlide>) => {
    await supabase.from("hero_slides").update(updates).eq("id", id);
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const deleteSlide = async (id: string) => {
    await supabase.from("hero_slides").delete().eq("id", id);
    setSlides((prev) => prev.filter((s) => s.id !== id));
  };

  const moveSlide = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= slides.length) return;
    const updated = [...slides];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    await Promise.all(
      updated.map((s, i) => supabase.from("hero_slides").update({ sort_order: i }).eq("id", s.id))
    );
    fetchData();
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">হিরো ব্যানার</h1>
        <Button onClick={saveSettings} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "সেভ হচ্ছে..." : "সেটিংস সেভ করুন"}
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        {/* Left: Text & Buttons & Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">টেক্সট</h3>
            <div>
              <Label>শিরোনাম</Label>
              <Textarea value={fields.hero_title} onChange={(e) => handleChange("hero_title", e.target.value)} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>সাবটাইটেল</Label>
              <Textarea value={fields.hero_subtitle} onChange={(e) => handleChange("hero_subtitle", e.target.value)} className="mt-1" rows={2} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">বাটন</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>বাটন ১ টেক্সট</Label>
                <Input value={fields.hero_btn1_text} onChange={(e) => handleChange("hero_btn1_text", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>বাটন ১ লিংক</Label>
                <Input value={fields.hero_btn1_link} onChange={(e) => handleChange("hero_btn1_link", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>বাটন ২ টেক্সট</Label>
                <Input value={fields.hero_btn2_text} onChange={(e) => handleChange("hero_btn2_text", e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>বাটন ২ লিংক</Label>
                <Input value={fields.hero_btn2_link} onChange={(e) => handleChange("hero_btn2_link", e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">স্ট্যাটিস্টিকস</h3>
            {[1, 2, 3].map((n) => (
              <div key={n} className="grid grid-cols-2 gap-3">
                <div>
                  <Label>স্ট্যাট {n} ভ্যালু</Label>
                  <Input value={(fields as any)[`hero_stat${n}_value`]} onChange={(e) => handleChange(`hero_stat${n}_value` as keyof HeroFields, e.target.value)} className="mt-1" placeholder="5,000+" />
                </div>
                <div>
                  <Label>স্ট্যাট {n} লেবেল</Label>
                  <Input value={(fields as any)[`hero_stat${n}_label`]} onChange={(e) => handleChange(`hero_stat${n}_label` as keyof HeroFields, e.target.value)} className="mt-1" placeholder="Students" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Media Slides */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground">মিডিয়া স্লাইড</h3>
            <Button variant="outline" size="sm" onClick={addSlide} className="gap-1.5">
              <Plus className="h-4 w-4" /> স্লাইড যোগ করুন
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">সরাসরি ছবি বা ভিডিও আপলোড করুন। একাধিক স্লাইড থাকলে অটো-স্লাইডিং হবে।</p>

          {slides.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">
              কোনো স্লাইড নেই। উপরের বাটনে ক্লিক করে যোগ করুন।
            </div>
          )}

          {slides.map((slide, idx) => (
            <div key={slide.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">স্লাইড #{idx + 1}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSlide(idx, 1)} disabled={idx === slides.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSlide(slide.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label>মিডিয়া আপলোড</Label>
                <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border p-3 hover:bg-muted/50 transition-colors">
                  {uploadingSlide === slide.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {uploadingSlide === slide.id ? "আপলোড হচ্ছে..." : "ছবি বা ভিডিও নির্বাচন করুন"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(slide.id, file);
                      e.target.value = "";
                    }}
                    disabled={uploadingSlide === slide.id}
                  />
                </label>
              </div>
              {slide.media_url && (
                <div className="aspect-video overflow-hidden rounded-lg border border-border">
                  {slide.media_type === "video" ? (
                    <video src={slide.media_url} className="h-full w-full object-cover" muted />
                  ) : (
                    <img src={slide.media_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminHero;
