import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import RichTextEditor from "@/components/RichTextEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Save, Copy, Loader2, RotateCcw, Download, Share2, Check, Smartphone, Tablet, Monitor } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ---------- Color helpers ----------
const hexToHsl = (hex: string): string | null => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const hslToHex = (hsl: string): string => {
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360, s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Parse loose HSL inputs and normalize to "H S% L%". Returns null if unparseable.
const normalizeHsl = (raw: string): string | null => {
  if (!raw) return null;
  const cleaned = raw
    .toLowerCase()
    .replace(/hsla?\(/g, "")
    .replace(/\)/g, "")
    .replace(/deg/g, "")
    .replace(/%/g, "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.slice(0, 3).map((p) => parseFloat(p));
  if (nums.some((n) => Number.isNaN(n))) return null;
  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
  const h = Math.round(((nums[0] % 360) + 360) % 360);
  const s = Math.round(clamp(nums[1], 0, 100));
  const l = Math.round(clamp(nums[2], 0, 100));
  return `${h} ${s}% ${l}%`;
};

const FONT_OPTIONS = [
  { value: "sylheti-keteki", label: "সিলেটি কেতেকি (Galada)", family: "'Galada', cursive" },
  { value: "jami", label: "জামি (Hind Siliguri)", family: "'Hind Siliguri', sans-serif" },
  { value: "mohan", label: "মোহন (Noto Sans Bengali)", family: "'Noto Sans Bengali', sans-serif" },
  { value: "rupali", label: "রূপালি (Tiro Bangla)", family: "'Tiro Bangla', serif" },
];

interface BrandingFields {
  site_name: string;
  site_description: string;
  copyright_text: string;
  site_font: string;
  logo_url: string;
  footer_logo_url: string;
  admin_logo_url: string;
  favicon_url: string;
  facebook_pixel_id: string;
  facebook_capi_token: string;
  facebook_test_event_code: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_from_email: string;
  smtp_from_name: string;
  admin_notification_email: string;
  steadfast_api_key: string;
  steadfast_secret_key: string;
  pathao_client_id: string;
  pathao_client_secret: string;
  pathao_username: string;
  pathao_password: string;
  pathao_store_id: string;
  redx_api_token: string;
  redx_pickup_store_id: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  newsletter_title: string;
  about_content: string;
  contact_page_title: string;
  contact_page_subtitle: string;
  homepage_courses_title: string;
  homepage_courses_subtitle: string;
  homepage_books_title: string;
  homepage_books_subtitle: string;
  homepage_reviews_title: string;
  homepage_reviews_subtitle: string;
  homepage_track_title: string;
  homepage_track_subtitle: string;
  featured_course_ids: string;
  featured_book_ids: string;
  terms_content: string;
  privacy_content: string;
  refund_content: string;
  refund_timeline_text: string;
  trade_license_number: string;
  registered_address: string;
  company_details: string;
  payment_banner_url: string;
  theme_primary: string;
  theme_accent: string;
  theme_highlight: string;
}

const defaultBranding: BrandingFields = {
  site_name: "",
  site_description: "",
  copyright_text: "",
  site_font: "default",
  logo_url: "",
  footer_logo_url: "",
  admin_logo_url: "",
  favicon_url: "",
  facebook_pixel_id: "",
  facebook_capi_token: "",
  facebook_test_event_code: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_pass: "",
  smtp_from_email: "",
  smtp_from_name: "",
  admin_notification_email: "",
  steadfast_api_key: "",
  steadfast_secret_key: "",
  pathao_client_id: "",
  pathao_client_secret: "",
  pathao_username: "",
  pathao_password: "",
  pathao_store_id: "",
  redx_api_token: "",
  redx_pickup_store_id: "",
  contact_email: "",
  contact_phone: "",
  contact_address: "",
  newsletter_title: "",
  about_content: "",
  contact_page_title: "",
  contact_page_subtitle: "",
  homepage_courses_title: "",
  homepage_courses_subtitle: "",
  homepage_books_title: "",
  homepage_books_subtitle: "",
  homepage_reviews_title: "",
  homepage_reviews_subtitle: "",
  homepage_track_title: "",
  homepage_track_subtitle: "",
  featured_course_ids: "",
  featured_book_ids: "",
  terms_content: "",
  privacy_content: "",
  refund_content: "",
  refund_timeline_text: "৭–১০ কর্মদিবস",
  trade_license_number: "",
  registered_address: "",
  company_details: "",
  payment_banner_url: "",
  theme_primary: "218 60% 20%",
  theme_accent: "28 95% 55%",
  theme_highlight: "200 90% 60%",
};

const PUBLIC_KEYS: (keyof BrandingFields)[] = [
  "site_name", "site_description", "copyright_text", "site_font",
  "logo_url", "footer_logo_url", "admin_logo_url", "favicon_url",
  "facebook_pixel_id", "facebook_test_event_code",
  "contact_email", "contact_phone", "contact_address", "newsletter_title", "about_content",
  "contact_page_title", "contact_page_subtitle",
  "homepage_courses_title", "homepage_courses_subtitle",
  "homepage_books_title", "homepage_books_subtitle",
  "homepage_reviews_title", "homepage_reviews_subtitle",
  "homepage_track_title", "homepage_track_subtitle",
  "featured_course_ids", "featured_book_ids",
  "terms_content", "privacy_content", "refund_content", "refund_timeline_text",
  "trade_license_number", "registered_address", "company_details", "payment_banner_url",
  "theme_primary", "theme_accent", "theme_highlight",
];

const ALL_KEYS = Object.keys(defaultBranding) as (keyof BrandingFields)[];

const AdminSettings = () => {
  const { toast } = useToast();
  const location = useLocation();
  const activeSection = location.hash?.replace("#", "") || "branding";
  const [fields, setFields] = useState<BrandingFields>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allCourses, setAllCourses] = useState<{ id: string; title: string }[]>([]);
  const [allBooks, setAllBooks] = useState<{ id: string; title: string }[]>([]);
  const [themeRaw, setThemeRaw] = useState<Record<string, string>>({});
  const [themeErrors, setThemeErrors] = useState<Record<string, boolean>>({});
  const [lastSaved, setLastSaved] = useState<BrandingFields>(defaultBranding);
  const [cssCopied, setCssCopied] = useState(false);
  const [autoSaveTheme, setAutoSaveTheme] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin_theme_autosave") === "1";
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const fetchAll = async () => {
      const [settingsRes, coursesRes, booksRes] = await Promise.all([
        supabase.from("site_settings").select("key, value").in("key", ALL_KEYS),
        supabase.from("courses").select("id, title").eq("is_published", true).order("title"),
        supabase.from("books").select("id, title").eq("is_published", true).order("title"),
      ]);
      if (settingsRes.data) {
        const merged = { ...defaultBranding };
        settingsRes.data.forEach((row) => {
          if (row.key in merged) {
            (merged as any)[row.key] = row.value;
          }
        });
        setFields(merged);
        setLastSaved(merged);
      }
      setAllCourses(coursesRes.data || []);
      setAllBooks(booksRes.data || []);
      setLoading(false);

      // Apply shared theme from URL (?themeShare=BASE64) if present
      try {
        const url = new URL(window.location.href);
        const shared = url.searchParams.get("themeShare");
        if (shared) {
          const decoded = JSON.parse(atob(decodeURIComponent(shared)));
          const isHsl = (v: unknown) =>
            typeof v === "string" && /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/.test(v.trim());
          if (isHsl(decoded.p) && isHsl(decoded.a) && isHsl(decoded.h)) {
            const next = {
              theme_primary: decoded.p.trim(),
              theme_accent: decoded.a.trim(),
              theme_highlight: decoded.h.trim(),
            };
            setFields((prev) => ({ ...prev, ...next }));
            setThemeRaw(next);
            window.location.hash = "theme";
            toast({
              title: "শেয়ার করা থিম লোড হয়েছে",
              description: 'সংরক্ষণ করতে "সব সেভ করুন" ক্লিক করুন।',
            });
          } else {
            toast({
              title: "শেয়ার লিংক ত্রুটিপূর্ণ",
              description: "থিম ভ্যালু পড়া যায়নি।",
              variant: "destructive",
            });
          }
          url.searchParams.delete("themeShare");
          window.history.replaceState({}, "", url.toString() + (window.location.hash || ""));
        }
      } catch {
        toast({
          title: "শেয়ার লিংক ডিকোড ব্যর্থ",
          description: "লিংকটি যাচাই করুন।",
          variant: "destructive",
        });
      }
    };
    fetchAll();
  }, []);

  const handleChange = (key: keyof BrandingFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  // Live theme preview — applies CSS vars while editing
  useEffect(() => {
    const root = document.documentElement;
    if (fields.theme_primary) {
      root.style.setProperty("--primary", fields.theme_primary);
      root.style.setProperty("--sidebar-primary", fields.theme_primary);
    }
    if (fields.theme_accent) {
      root.style.setProperty("--accent", fields.theme_accent);
    }
    if (fields.theme_highlight) {
      root.style.setProperty("--ring", fields.theme_highlight);
      root.style.setProperty("--sidebar-ring", fields.theme_highlight);
      root.style.setProperty("--highlight", fields.theme_highlight);
    }
  }, [fields.theme_primary, fields.theme_accent, fields.theme_highlight]);

  // Persist auto-save toggle preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin_theme_autosave", autoSaveTheme ? "1" : "0");
    }
  }, [autoSaveTheme]);

  // Debounced auto-save for the 3 theme keys
  useEffect(() => {
    if (!autoSaveTheme || loading) return;
    const hasError = Object.values(themeErrors).some(Boolean);
    if (hasError) return;
    const themeKeys = ["theme_primary", "theme_accent", "theme_highlight"] as const;
    const dirty = themeKeys.some((k) => fields[k] !== lastSaved[k]);
    if (!dirty) return;

    const handle = window.setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        const ops = themeKeys.map((key) =>
          supabase.from("site_settings").upsert({ key, value: fields[key] }, { onConflict: "key" })
        );
        const results = await Promise.all(ops);
        const firstError = results.find((r: any) => r?.error)?.error;
        if (firstError) throw firstError;
        setLastSaved((prev) => ({
          ...prev,
          theme_primary: fields.theme_primary,
          theme_accent: fields.theme_accent,
          theme_highlight: fields.theme_highlight,
        }));
        setAutoSaveStatus("saved");
        window.setTimeout(() => setAutoSaveStatus("idle"), 1500);
      } catch (err: any) {
        setAutoSaveStatus("error");
        toast({
          title: "অটো-সেভ ব্যর্থ",
          description: err?.message || "সার্ভারে সংযোগ করা যায়নি।",
          variant: "destructive",
        });
      }
    }, 800);

    return () => window.clearTimeout(handle);
  }, [autoSaveTheme, fields.theme_primary, fields.theme_accent, fields.theme_highlight, themeErrors, lastSaved, loading]);

  const commitThemeHsl = (key: keyof BrandingFields, label: string) => {
    const raw = themeRaw[key] ?? fields[key];
    if (raw === fields[key]) {
      setThemeErrors((prev) => ({ ...prev, [key]: false }));
      return;
    }
    const normalized = normalizeHsl(raw);
    if (!normalized) {
      toast({
        title: `${label} — ভুল HSL ফরম্যাট`,
        description: `সঠিক ফরম্যাট: "218 60% 20%" (H 0–360, S/L 0–100%)। আগের মান ফিরিয়ে আনা হলো।`,
        variant: "destructive",
      });
      setThemeRaw((prev) => ({ ...prev, [key]: fields[key] }));
      setThemeErrors((prev) => ({ ...prev, [key]: false }));
      return;
    }
    setThemeErrors((prev) => ({ ...prev, [key]: false }));
    setThemeRaw((prev) => ({ ...prev, [key]: normalized }));
    if (normalized !== raw) {
      toast({ title: `${label} অটো-সংশোধন হয়েছে`, description: `→ ${normalized}` });
    }
    handleChange(key, normalized);
  };

  const toggleFeaturedId = (key: "featured_course_ids" | "featured_book_ids", id: string) => {
    setFields((prev) => {
      const ids = prev[key] ? prev[key].split(",").filter(Boolean) : [];
      const updated = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      return { ...prev, [key]: updated.join(",") };
    });
  };

  const saveAll = async () => {
    // Block save while there are unresolved HSL errors
    const hasThemeError = Object.values(themeErrors).some(Boolean);
    if (hasThemeError) {
      toast({
        title: "সেভ ব্যর্থ",
        description: "থিম কালার ইনপুটে ভুল ফরম্যাট আছে — আগে ঠিক করুন।",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const snapshot = lastSaved;
    const pending = { ...fields };

    try {
      const siteOps = ALL_KEYS.map((key) =>
        supabase.from("site_settings").upsert({ key, value: pending[key] }, { onConflict: "key" })
      );
      const publicOps = PUBLIC_KEYS.map((key) =>
        (supabase as any).from("public_site_settings").upsert({ key, value: pending[key] }, { onConflict: "key" })
      );

      const results = await Promise.all([...siteOps, ...publicOps]);
      const firstError = results.find((r: any) => r?.error)?.error;
      if (firstError) throw firstError;

      setLastSaved(pending);
      toast({
        title: "সেটিংস আপডেট হয়েছে",
        description: "সব পরিবর্তন সফলভাবে সংরক্ষণ করা হয়েছে।",
      });
    } catch (err: any) {
      // Rollback in-memory state to last successfully saved snapshot
      setFields(snapshot);
      setThemeRaw({
        theme_primary: snapshot.theme_primary,
        theme_accent: snapshot.theme_accent,
        theme_highlight: snapshot.theme_highlight,
      });
      setThemeErrors({});
      toast({
        title: "সংরক্ষণ ব্যর্থ হয়েছে",
        description: err?.message
          ? `${err.message} — পরিবর্তনগুলো রোলব্যাক করা হয়েছে।`
          : "সার্ভারে সংযোগ করা যায়নি — পরিবর্তনগুলো রোলব্যাক করা হয়েছে।",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Settings</h1>
        <Button onClick={saveAll} disabled={saving} aria-busy={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
        </Button>
      </div>

      <fieldset disabled={saving} aria-busy={saving} className={`mt-6 max-w-2xl ${saving ? "pointer-events-none opacity-60" : ""}`}>
        {saving && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            সেটিংস সংরক্ষণ হচ্ছে — অনুগ্রহ করে অপেক্ষা করুন...
          </div>
        )}
        {/* Site Branding */}
        {activeSection === "branding" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">সাইট ব্র্যান্ডিং</h3>
            <p className="text-sm text-muted-foreground">সাইটের নাম, বর্ণনা এবং কপিরাইট টেক্সট পরিবর্তন করুন।</p>
            <div>
              <Label htmlFor="site_name">সাইট নাম</Label>
              <Input id="site_name" value={fields.site_name} onChange={(e) => handleChange("site_name", e.target.value)} className="mt-1" placeholder="আপনার সাইটের নাম" />
            </div>
            <div>
              <Label htmlFor="site_description">ফুটার বর্ণনা</Label>
              <div className="mt-1"><RichTextEditor content={fields.site_description} onChange={(html) => handleChange("site_description", html)} placeholder="আপনার শেখার সেরা প্ল্যাটফর্ম..." minHeight="100px" /></div>
            </div>
            <div>
              <Label htmlFor="copyright_text">কপিরাইট টেক্সট</Label>
              <Input id="copyright_text" value={fields.copyright_text} onChange={(e) => handleChange("copyright_text", e.target.value)} className="mt-1" placeholder="© 2026 Your Site. All rights reserved." />
            </div>
            <div>
              <Label htmlFor="site_font">সাইট ফন্ট</Label>
              <Select value={fields.site_font || "default"} onValueChange={(val) => handleChange("site_font", val)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="ফন্ট নির্বাচন করুন" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <div>
                        <span className="text-sm font-medium">{f.label}</span>
                        <p className="text-base text-muted-foreground mt-0.5" style={{ fontFamily: f.family }}>
                          আমি বাংলায় গান গাই — Preview Text
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fields.site_font && fields.site_font !== "default" && (
                <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4">
                  <p className="text-xs text-muted-foreground mb-1">প্রিভিউ:</p>
                  <p className="text-lg" style={{ fontFamily: FONT_OPTIONS.find(f => f.value === fields.site_font)?.family }}>
                    আমি বাংলায় গান গাই, বাংলা আমার প্রাণ।
                  </p>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">পুরো ওয়েবসাইটের ফন্ট পরিবর্তন করুন।</p>
            </div>
          </div>
        )}

        {/* Theme Colors */}
        {activeSection === "theme" && (
          <div className="rounded-xl glass-card p-6 space-y-6">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">থিম কালার</h3>
              <p className="text-sm text-muted-foreground">
                Navy primary, Orange accent ও Sky Blue highlight কালার এডিট করুন। নিচের পরিবর্তন তাৎক্ষণিকভাবে পুরো সাইটে দেখা যাবে — সংরক্ষণ করতে "সব সেভ করুন" বাটনে ক্লিক করুন।
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <Switch
                  id="theme-autosave"
                  checked={autoSaveTheme}
                  onCheckedChange={setAutoSaveTheme}
                />
                <div>
                  <Label htmlFor="theme-autosave" className="text-sm font-semibold">
                    অটো-সেভ থিম
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    চালু থাকলে কালার পরিবর্তন ০.৮ সেকেন্ড পর স্বয়ংক্রিয়ভাবে সংরক্ষণ হবে।
                  </p>
                </div>
              </div>
              {autoSaveTheme && (
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {autoSaveStatus === "saving" && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="text-muted-foreground">সংরক্ষণ হচ্ছে...</span>
                    </>
                  )}
                  {autoSaveStatus === "saved" && (
                    <>
                      <Check className="h-3.5 w-3.5 text-success" />
                      <span className="text-success">সংরক্ষিত</span>
                    </>
                  )}
                  {autoSaveStatus === "error" && <span className="text-destructive">ব্যর্থ</span>}
                  {autoSaveStatus === "idle" && (
                    <span className="text-muted-foreground">প্রস্তুত</span>
                  )}
                </span>
              )}
            </div>

            {[
              { key: "theme_primary" as const, label: "Primary (Navy)", desc: "প্রাইমারি বাটন, লিংক এবং সাইডবার রঙ।" },
              { key: "theme_accent" as const, label: "Accent (Orange)", desc: "CTA বাটন, ব্যাজ এবং হাইলাইট রঙ।" },
              { key: "theme_highlight" as const, label: "Highlight (Sky Blue)", desc: "ফোকাস রিং এবং সাব-হাইলাইট রঙ।" },
            ].map(({ key, label, desc }) => {
              const hsl = fields[key] || "0 0% 0%";
              const hex = hslToHex(hsl);
              const rawValue = themeRaw[key] ?? hsl;
              const hasError = !!themeErrors[key];
              return (
                <div key={key} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
                  <div
                    className="h-12 w-12 rounded-lg border border-border shadow-inner"
                    style={{ backgroundColor: `hsl(${hsl})` }}
                    aria-hidden
                  />
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">HSL মান</Label>
                    <Input
                      value={rawValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setThemeRaw((prev) => ({ ...prev, [key]: v }));
                        setThemeErrors((prev) => ({ ...prev, [key]: !normalizeHsl(v) }));
                      }}
                      onBlur={() => commitThemeHsl(key, label)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          commitThemeHsl(key, label);
                        }
                      }}
                      placeholder="218 60% 20%"
                      className={`font-mono text-sm ${hasError ? "border-destructive focus-visible:ring-destructive" : ""}`}
                      aria-invalid={hasError}
                    />
                    {hasError && (
                      <p className="text-xs text-destructive">ফরম্যাট: "H S% L%" — যেমন 218 60% 20%</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">কালার পিকার</Label>
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => {
                        const newHsl = hexToHsl(e.target.value);
                        if (newHsl) {
                          handleChange(key, newHsl);
                          setThemeRaw((prev) => ({ ...prev, [key]: newHsl }));
                          setThemeErrors((prev) => ({ ...prev, [key]: false }));
                        }
                      }}
                      className="h-10 w-16 cursor-pointer rounded-md border border-border bg-transparent"
                    />
                  </div>
                </div>
              );
            })}

            <div className="space-y-4 rounded-lg border border-border p-3 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">লাইভ প্রিভিউ</p>
                <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5">
                  {([
                    { id: "mobile", label: "মোবাইল", Icon: Smartphone },
                    { id: "tablet", label: "ট্যাবলেট", Icon: Tablet },
                    { id: "desktop", label: "ডেস্কটপ", Icon: Monitor },
                  ] as const).map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPreviewDevice(id)}
                      aria-pressed={previewDevice === id}
                      title={label}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                        previewDevice === id
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto rounded-md bg-muted/20 p-2 sm:p-3">
                <div
                  className={`mx-auto space-y-3 rounded-md bg-background p-3 ring-1 ring-border transition-[max-width] duration-300 ${
                    previewDevice === "mobile"
                      ? "max-w-[360px]"
                      : previewDevice === "tablet"
                      ? "max-w-[768px]"
                      : "max-w-full"
                  }`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {previewDevice === "mobile" ? "৩৬০px" : previewDevice === "tablet" ? "৭৬৮px" : "ফুল প্রস্থ"}
                  </p>

                {/* Navbar mock */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-primary px-3 py-2 text-primary-foreground shadow sm:px-4 sm:py-2.5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <span className="font-display text-sm font-bold">আপনার সাইট</span>
                    <nav className={`gap-3 text-xs ${previewDevice === "mobile" ? "hidden" : "flex"}`}>
                      <a className="opacity-90 hover:opacity-100">হোম</a>
                      <a className="opacity-90 hover:opacity-100">কোর্স</a>
                      <a className="opacity-90 hover:opacity-100">বই</a>
                    </nav>
                  </div>
                  <button className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground sm:px-3 sm:text-xs">
                    সাইন ইন
                  </button>
                </div>

                {/* Sidebar + Card layout */}
                <div
                  className={`grid gap-3 ${
                    previewDevice === "mobile" ? "grid-cols-1" : "grid-cols-[140px_1fr] sm:grid-cols-[160px_1fr]"
                  }`}
                >
                <div className="rounded-md bg-sidebar p-2 text-sidebar-foreground">
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">সাইডবার</p>
                  <ul className="space-y-1 text-xs">
                    <li className="rounded bg-sidebar-primary px-2 py-1.5 font-medium text-sidebar-primary-foreground">
                      ড্যাশবোর্ড
                    </li>
                    <li className="rounded px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      অর্ডারস
                    </li>
                    <li className="rounded px-2 py-1.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                      সেটিংস
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  {/* Card */}
                  <div className="rounded-lg border border-border bg-card p-3 text-card-foreground shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-sm font-semibold">নমুনা কোর্স কার্ড</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">কালার থিম কেমন দেখাচ্ছে যাচাই করুন।</p>
                      </div>
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                        নতুন
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Primary</span>
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">Accent</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ backgroundColor: `hsl(${fields.theme_highlight} / 0.18)`, color: `hsl(${fields.theme_highlight})` }}
                      >
                        Highlight
                      </span>
                      <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">সফল</span>
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">সতর্ক</span>
                      <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">এরর</span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button size="sm">Primary</Button>
                    <Button size="sm" variant="secondary">Secondary</Button>
                    <Button size="sm" variant="outline">Outline</Button>
                    <Button size="sm" variant="ghost">Ghost</Button>
                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">Accent CTA</Button>
                  </div>

                  {/* Form / focus ring */}
                  <div className={`grid gap-2 ${previewDevice === "mobile" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                    <Input placeholder="ফোকাস রিং চেক করুন" />
                    <Input
                      placeholder="হাইলাইট রিং"
                      style={{ outline: "none" }}
                      className="focus-visible:ring-2"
                    />
                  </div>

                  {/* Links */}
                  <p className="text-xs text-muted-foreground">
                    এটি একটি নমুনা প্যারাগ্রাফ —{" "}
                    <a className="font-semibold text-primary underline underline-offset-2 hover:text-primary/80">প্রাইমারি লিংক</a>
                    {" "}এবং{" "}
                    <a className="font-semibold text-accent underline underline-offset-2 hover:text-accent/80">অ্যাকসেন্ট লিংক</a>
                    {" "}কেমন দেখাচ্ছে যাচাই করুন।
                  </p>
                </div>
                </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const defaults = {
                    theme_primary: "218 60% 20%",
                    theme_accent: "28 95% 55%",
                    theme_highlight: "200 90% 60%",
                  };
                  setFields((prev) => ({ ...prev, ...defaults }));
                  setThemeRaw(defaults);
                  setThemeErrors({});
                  toast({
                    title: "ডিফল্ট থিম প্রয়োগ হয়েছে",
                    description: "Navy / Orange / Sky Blue পুনরায় সেট করা হলো। সংরক্ষণ করতে \"সব সেভ করুন\" ক্লিক করুন।",
                  });
                }}
              >
                <RotateCcw className="h-4 w-4" />
                ডিফল্ট থিম রিসেট
              </Button>
              <Button
                variant={cssCopied ? "default" : "outline"}
                size="sm"
                className="gap-2"
                onClick={async () => {
                  const css = `:root {\n  --primary: ${fields.theme_primary};\n  --accent: ${fields.theme_accent};\n  --highlight: ${fields.theme_highlight};\n}`;
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(css);
                    } else {
                      const ta = document.createElement("textarea");
                      ta.value = css;
                      ta.style.position = "fixed";
                      ta.style.opacity = "0";
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand("copy");
                      document.body.removeChild(ta);
                    }
                    setCssCopied(true);
                    window.setTimeout(() => setCssCopied(false), 2000);
                  } catch {
                    toast({
                      title: "কপি ব্যর্থ",
                      description: "ক্লিপবোর্ড অ্যাক্সেস পাওয়া যায়নি।",
                      variant: "destructive",
                    });
                  }
                }}
              >
                {cssCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {cssCopied ? "কপি হয়েছে" : "CSS ভ্যারিয়েবল কপি করুন"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  const css = `/* Theme exported from admin settings */\n:root {\n  --primary: ${fields.theme_primary};\n  --accent: ${fields.theme_accent};\n  --highlight: ${fields.theme_highlight};\n  --ring: ${fields.theme_highlight};\n  --sidebar-primary: ${fields.theme_primary};\n  --sidebar-ring: ${fields.theme_highlight};\n}\n`;
                  try {
                    const blob = new Blob([css], { type: "text/css;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    const stamp = new Date().toISOString().slice(0, 10);
                    a.href = url;
                    a.download = `theme-${stamp}.css`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast({
                      title: "থিম ডাউনলোড হয়েছে",
                      description: `theme-${stamp}.css ফাইল সংরক্ষিত হলো।`,
                    });
                  } catch {
                    toast({
                      title: "ডাউনলোড ব্যর্থ",
                      description: "ফাইল তৈরি করা যায়নি — আবার চেষ্টা করুন।",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Download className="h-4 w-4" />
                .css ফাইল ডাউনলোড
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={async () => {
                  try {
                    const payload = btoa(
                      JSON.stringify({
                        p: fields.theme_primary,
                        a: fields.theme_accent,
                        h: fields.theme_highlight,
                      })
                    );
                    const url = new URL(window.location.href);
                    url.searchParams.set("themeShare", payload);
                    url.hash = "theme";
                    const link = url.toString();
                    await navigator.clipboard.writeText(link);
                    toast({
                      title: "শেয়ার লিংক কপি হয়েছে",
                      description: "অন্য অ্যাডমিনের সাথে শেয়ার করুন — খোলামাত্রই থিম প্রিভিউ হবে।",
                    });
                  } catch {
                    toast({
                      title: "কপি ব্যর্থ",
                      description: "ক্লিপবোর্ড অ্যাক্সেস পাওয়া যায়নি।",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Share2 className="h-4 w-4" />
                শেয়ার লিংক তৈরি
              </Button>
            </div>

            <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">{`:root {
  --primary: ${fields.theme_primary};
  --accent: ${fields.theme_accent};
  --highlight: ${fields.theme_highlight};
}`}</pre>
          </div>
        )}

        {/* Homepage Sections */}
        {activeSection === "homepage" && (
          <div className="rounded-xl glass-card p-6 space-y-6">
            <h3 className="font-display text-lg font-semibold text-foreground">হোমপেজ সেকশন</h3>
            <p className="text-sm text-muted-foreground">হোমপেজের প্রতিটি সেকশনের টাইটেল, সাবটাইটেল এবং ফিচার্ড প্রোডাক্ট নির্বাচন করুন।</p>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">কোর্স সেকশন</h4>
              <div>
                <Label>সেকশন টাইটেল</Label>
                <Input value={fields.homepage_courses_title} onChange={(e) => handleChange("homepage_courses_title", e.target.value)} className="mt-1" placeholder="ফিচার্ড কোর্স" />
              </div>
              <div>
                <Label>সেকশন সাবটাইটেল</Label>
                <Input value={fields.homepage_courses_subtitle} onChange={(e) => handleChange("homepage_courses_subtitle", e.target.value)} className="mt-1" placeholder="ক্যারিয়ার গড়তে সেরা কোর্সগুলো" />
              </div>
              <div>
                <Label className="mb-2 block">ফিচার্ড কোর্স সিলেক্ট করুন</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                  {allCourses.map((c) => {
                    const selected = fields.featured_course_ids.split(",").filter(Boolean).includes(c.id);
                    return (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={selected} onCheckedChange={() => toggleFeaturedId("featured_course_ids", c.id)} />
                        <span className={selected ? "font-medium text-foreground" : "text-muted-foreground"}>{c.title}</span>
                      </label>
                    );
                  })}
                  {allCourses.length === 0 && <p className="text-xs text-muted-foreground">কোন কোর্স পাওয়া যায়নি।</p>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">সিলেক্ট না করলে সর্বশেষ ৩টি কোর্স দেখাবে।</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">বই সেকশন</h4>
              <div>
                <Label>সেকশন টাইটেল</Label>
                <Input value={fields.homepage_books_title} onChange={(e) => handleChange("homepage_books_title", e.target.value)} className="mt-1" placeholder="ফিচার্ড বই" />
              </div>
              <div>
                <Label>সেকশন সাবটাইটেল</Label>
                <Input value={fields.homepage_books_subtitle} onChange={(e) => handleChange("homepage_books_subtitle", e.target.value)} className="mt-1" placeholder="নিজেকে এক ধাপ এগিয়ে নিন" />
              </div>
              <div>
                <Label className="mb-2 block">ফিচার্ড বই সিলেক্ট করুন</Label>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-border p-3">
                  {allBooks.map((b) => {
                    const selected = fields.featured_book_ids.split(",").filter(Boolean).includes(b.id);
                    return (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={selected} onCheckedChange={() => toggleFeaturedId("featured_book_ids", b.id)} />
                        <span className={selected ? "font-medium text-foreground" : "text-muted-foreground"}>{b.title}</span>
                      </label>
                    );
                  })}
                  {allBooks.length === 0 && <p className="text-xs text-muted-foreground">কোন বই পাওয়া যায়নি।</p>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">সিলেক্ট না করলে সর্বশেষ ৩টি বই দেখাবে।</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">রিভিউ সেকশন</h4>
              <div>
                <Label>সেকশন টাইটেল</Label>
                <Input value={fields.homepage_reviews_title} onChange={(e) => handleChange("homepage_reviews_title", e.target.value)} className="mt-1" placeholder="আমাদের শিক্ষার্থীরা যা বলেন" />
              </div>
              <div>
                <Label>সেকশন সাবটাইটেল</Label>
                <Input value={fields.homepage_reviews_subtitle} onChange={(e) => handleChange("homepage_reviews_subtitle", e.target.value)} className="mt-1" placeholder="আমাদের শিক্ষার্থীদের মতামত" />
              </div>
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground">অর্ডার ট্র্যাকিং সেকশন</h4>
              <div>
                <Label>সেকশন টাইটেল</Label>
                <Input value={fields.homepage_track_title} onChange={(e) => handleChange("homepage_track_title", e.target.value)} className="mt-1" placeholder="আপনার অর্ডার ট্র্যাক করুন" />
              </div>
              <div>
                <Label>সেকশন সাবটাইটেল</Label>
                <Input value={fields.homepage_track_subtitle} onChange={(e) => handleChange("homepage_track_subtitle", e.target.value)} className="mt-1" placeholder="আপনার অর্ডারের বর্তমান অবস্থা জানুন" />
              </div>
            </div>
          </div>
        )}

        {/* Logos */}
        {activeSection === "logos" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">লোগো ও আইকন</h3>
            <p className="text-sm text-muted-foreground">ইমেজ URL দিন। Storage বা যেকোনো CDN URL ব্যবহার করতে পারেন।</p>
            <div>
              <Label htmlFor="logo_url">হেডার লোগো URL</Label>
              <Input id="logo_url" value={fields.logo_url} onChange={(e) => handleChange("logo_url", e.target.value)} className="mt-1" placeholder="/favicon.webp" />
              {fields.logo_url && <img src={fields.logo_url} alt="Preview" className="mt-2 h-10 w-10 rounded-lg object-cover border border-border" />}
            </div>
            <div>
              <Label htmlFor="footer_logo_url">ফুটার লোগো URL</Label>
              <Input id="footer_logo_url" value={fields.footer_logo_url} onChange={(e) => handleChange("footer_logo_url", e.target.value)} className="mt-1" placeholder="/favicon.webp" />
              {fields.footer_logo_url && <img src={fields.footer_logo_url} alt="Preview" className="mt-2 h-10 w-10 rounded-lg object-cover border border-border" />}
            </div>
            <div>
              <Label htmlFor="admin_logo_url">অ্যাডমিন সাইডবার লোগো URL</Label>
              <Input id="admin_logo_url" value={fields.admin_logo_url} onChange={(e) => handleChange("admin_logo_url", e.target.value)} className="mt-1" placeholder="/favicon.webp" />
              {fields.admin_logo_url && <img src={fields.admin_logo_url} alt="Preview" className="mt-2 h-10 w-10 rounded-lg object-cover border border-border" />}
            </div>
            <div>
              <Label htmlFor="favicon_url">ফ্যাভিকন URL</Label>
              <Input id="favicon_url" value={fields.favicon_url} onChange={(e) => handleChange("favicon_url", e.target.value)} className="mt-1" placeholder="/favicon.webp" />
              {fields.favicon_url && <img src={fields.favicon_url} alt="Preview" className="mt-2 h-8 w-8 rounded object-cover border border-border" />}
            </div>
          </div>
        )}

        {/* Meta Pixel */}
        {activeSection === "pixel" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">Meta Pixel & Conversions API</h3>
            <p className="text-sm text-muted-foreground">ক্লায়েন্ট-সাইড Pixel এবং সার্ভার-সাইড Conversions API এর মাধ্যমে ইভেন্ট ট্র্যাকিং করুন।</p>
            <div>
              <Label htmlFor="pixel_id">Pixel ID</Label>
              <Input id="pixel_id" value={fields.facebook_pixel_id} onChange={(e) => handleChange("facebook_pixel_id", e.target.value)} className="mt-1" placeholder="e.g. 123456789012345" />
              <p className="mt-1 text-xs text-muted-foreground">Meta Events Manager থেকে Pixel ID কপি করুন।</p>
            </div>
            <div>
              <Label htmlFor="capi_token">Conversions API Access Token</Label>
              <Input id="capi_token" type="password" value={fields.facebook_capi_token} onChange={(e) => handleChange("facebook_capi_token", e.target.value)} className="mt-1" placeholder="EAAxxxxxxx..." />
              <p className="mt-1 text-xs text-muted-foreground">Events Manager → Settings → Conversions API → Generate Access Token।</p>
            </div>
            <div>
              <Label htmlFor="test_event">Test Event Code (ঐচ্ছিক)</Label>
              <Input id="test_event" value={fields.facebook_test_event_code} onChange={(e) => handleChange("facebook_test_event_code", e.target.value)} className="mt-1" placeholder="e.g. TEST12345" />
              <p className="mt-1 text-xs text-muted-foreground">Events Manager → Test Events → Test Event Code কপি করুন। টেস্ট শেষে এটি মুছে ফেলুন।</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">অটোমেটিক ট্র্যাকিং ইভেন্ট:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><strong>PageView</strong> — প্রতিটি পেজ ভিজিটে</li>
                <li><strong>Purchase</strong> — অর্ডার সাবমিটের সময়</li>
                <li><strong>ViewContent</strong> — কোর্স/বই ডিটেইল পেজে</li>
              </ul>
              <p className="mt-2">ইভেন্টগুলো Client + Server উভয় দিক থেকে পাঠানো হয় (Deduplication Event ID সহ)।</p>
            </div>
          </div>
        )}

        {/* Contact Information */}
        {activeSection === "contact" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">যোগাযোগ তথ্য</h3>
            <p className="text-sm text-muted-foreground">কন্টাক্ট পেজ এবং ফুটারে প্রদর্শিত যোগাযোগের তথ্য পরিবর্তন করুন।</p>
            <div>
              <Label htmlFor="contact_email">ইমেইল</Label>
              <Input id="contact_email" value={fields.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} className="mt-1" placeholder="info@example.com" />
            </div>
            <div>
              <Label htmlFor="contact_phone">ফোন নম্বর</Label>
              <Input id="contact_phone" value={fields.contact_phone} onChange={(e) => handleChange("contact_phone", e.target.value)} className="mt-1" placeholder="+880 1XXX-XXXXXX" />
            </div>
            <div>
              <Label htmlFor="contact_address">ঠিকানা</Label>
              <Input id="contact_address" value={fields.contact_address} onChange={(e) => handleChange("contact_address", e.target.value)} className="mt-1" placeholder="Dhaka, Bangladesh" />
            </div>
          </div>
        )}

        {/* Contact Page */}
        {activeSection === "contact-page" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">কন্টাক্ট পেজ</h3>
            <p className="text-sm text-muted-foreground">কন্টাক্ট পেজের টাইটেল ও সাবটাইটেল পরিবর্তন করুন।</p>
            <div>
              <Label htmlFor="contact_page_title">পেজ টাইটেল</Label>
              <Input id="contact_page_title" value={fields.contact_page_title} onChange={(e) => handleChange("contact_page_title", e.target.value)} className="mt-1" placeholder="যোগাযোগ করুন" />
            </div>
            <div>
              <Label htmlFor="contact_page_subtitle">পেজ সাবটাইটেল</Label>
              <Input id="contact_page_subtitle" value={fields.contact_page_subtitle} onChange={(e) => handleChange("contact_page_subtitle", e.target.value)} className="mt-1" placeholder="আমাদের সাথে যোগাযোগ করুন" />
            </div>
          </div>
        )}

        {/* Newsletter */}
        {activeSection === "newsletter-settings" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">নিউজলেটার</h3>
            <p className="text-sm text-muted-foreground">ফুটারে প্রদর্শিত নিউজলেটার সেকশনের টাইটেল পরিবর্তন করুন।</p>
            <div>
              <Label htmlFor="newsletter_title">নিউজলেটার টাইটেল</Label>
              <Input id="newsletter_title" value={fields.newsletter_title} onChange={(e) => handleChange("newsletter_title", e.target.value)} className="mt-1" placeholder="আমাদের নিউজলেটার" />
            </div>
          </div>
        )}

        {/* About Page */}
        {activeSection === "about" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">About পেজ</h3>
            <p className="text-sm text-muted-foreground">About পেজে প্রদর্শিত কন্টেন্ট পরিবর্তন করুন।</p>
            <div>
              <Label>About কন্টেন্ট</Label>
              <div className="mt-1">
                <RichTextEditor content={fields.about_content} onChange={(html) => handleChange("about_content", html)} />
              </div>
            </div>
          </div>
        )}

        {activeSection === "compliance" && (
          <div className="space-y-6">
            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">কোম্পানি তথ্য (পেমেন্ট গেটওয়ে কম্প্লায়েন্স)</h3>
              <p className="text-sm text-muted-foreground">SSLCommerz সহ পেমেন্ট গেটওয়ের জন্য বাধ্যতামূলক তথ্য। ফুটার ও About পেজে দেখাবে।</p>
              <div>
                <Label htmlFor="trade_license_number">ট্রেড লাইসেন্স নম্বর *</Label>
                <Input id="trade_license_number" value={fields.trade_license_number} onChange={(e) => handleChange("trade_license_number", e.target.value)} className="mt-1" placeholder="যেমন: TRAD/DSCC/123456/2024" />
                <p className="mt-1 text-xs text-muted-foreground">পেমেন্ট গেটওয়ে অনুমোদনের জন্য আবশ্যক।</p>
              </div>
              <div>
                <Label htmlFor="registered_address">নিবন্ধিত ঠিকানা (ট্রেড লাইসেন্স অনুযায়ী)</Label>
                <Textarea id="registered_address" rows={3} value={fields.registered_address} onChange={(e) => handleChange("registered_address", e.target.value)} className="mt-1" placeholder="House 12, Road 5, Dhanmondi, Dhaka-1205, Bangladesh" />
              </div>
              <div>
                <Label>কোম্পানি ও ম্যানেজমেন্ট ডিটেলস (About পেজে দেখাবে)</Label>
                <div className="mt-1"><RichTextEditor content={fields.company_details} onChange={(html) => handleChange("company_details", html)} placeholder="প্রতিষ্ঠার বছর, ম্যানেজিং ডিরেক্টর/ফাউন্ডারের নাম, ইত্যাদি..." /></div>
              </div>
              <div>
                <Label htmlFor="payment_banner_url">পেমেন্ট মেথড ব্যানার URL (ফুটারে)</Label>
                <Input id="payment_banner_url" value={fields.payment_banner_url} onChange={(e) => handleChange("payment_banner_url", e.target.value)} className="mt-1" placeholder="https://... (খালি রাখলে ডিফল্ট ব্যানার দেখাবে)" />
                {fields.payment_banner_url && <img src={fields.payment_banner_url} alt="Banner preview" className="mt-2 max-h-20 rounded border border-border bg-white p-1" />}
              </div>
            </div>

            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">ব্যবহারের শর্তাবলী (Terms & Conditions)</h3>
              <p className="text-sm text-muted-foreground">খালি রাখলে ডিফল্ট কম্প্লায়েন্ট কপি দেখাবে।</p>
              <RichTextEditor content={fields.terms_content} onChange={(html) => handleChange("terms_content", html)} />
            </div>

            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">প্রাইভেসি পলিসি</h3>
              <RichTextEditor content={fields.privacy_content} onChange={(html) => handleChange("privacy_content", html)} />
            </div>

            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">রিটার্ন ও রিফান্ড পলিসি</h3>
              <div>
                <Label htmlFor="refund_timeline_text">রিফান্ড টাইমলাইন (সংক্ষিপ্ত)</Label>
                <Input id="refund_timeline_text" value={fields.refund_timeline_text} onChange={(e) => handleChange("refund_timeline_text", e.target.value)} className="mt-1" placeholder="৭–১০ কর্মদিবস" />
                <p className="mt-1 text-xs text-muted-foreground">পেজের শীর্ষে ব্যাজ হিসেবে দেখাবে। স্ট্যান্ডার্ড: ৭–১০ কর্মদিবস।</p>
              </div>
              <div>
                <Label>পূর্ণ রিফান্ড পলিসি কন্টেন্ট</Label>
                <div className="mt-1"><RichTextEditor content={fields.refund_content} onChange={(html) => handleChange("refund_content", html)} /></div>
              </div>
            </div>
          </div>
        )}
        {activeSection === "courier" && (
          <div className="space-y-6">
            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Steadfast Courier</h3>
              <p className="text-sm text-muted-foreground">Steadfast Portal থেকে API Key এবং Secret Key সংগ্রহ করুন।</p>
              <div>
                <Label htmlFor="steadfast_api_key">API Key</Label>
                <Input id="steadfast_api_key" value={fields.steadfast_api_key} onChange={(e) => handleChange("steadfast_api_key", e.target.value)} className="mt-1" placeholder="Steadfast API Key" />
              </div>
              <div>
                <Label htmlFor="steadfast_secret_key">Secret Key</Label>
                <Input id="steadfast_secret_key" type="password" value={fields.steadfast_secret_key} onChange={(e) => handleChange("steadfast_secret_key", e.target.value)} className="mt-1" placeholder="Steadfast Secret Key" />
              </div>
            </div>

            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">Pathao Courier</h3>
              <p className="text-sm text-muted-foreground">Pathao Merchant Panel থেকে API credentials সংগ্রহ করুন।</p>
              <div>
                <Label htmlFor="pathao_client_id">Client ID</Label>
                <Input id="pathao_client_id" value={fields.pathao_client_id} onChange={(e) => handleChange("pathao_client_id", e.target.value)} className="mt-1" placeholder="Pathao Client ID" />
              </div>
              <div>
                <Label htmlFor="pathao_client_secret">Client Secret</Label>
                <Input id="pathao_client_secret" type="password" value={fields.pathao_client_secret} onChange={(e) => handleChange("pathao_client_secret", e.target.value)} className="mt-1" placeholder="Pathao Client Secret" />
              </div>
              <div>
                <Label htmlFor="pathao_username">Username (Email)</Label>
                <Input id="pathao_username" value={fields.pathao_username} onChange={(e) => handleChange("pathao_username", e.target.value)} className="mt-1" placeholder="merchant@email.com" />
              </div>
              <div>
                <Label htmlFor="pathao_password">Password</Label>
                <Input id="pathao_password" type="password" value={fields.pathao_password} onChange={(e) => handleChange("pathao_password", e.target.value)} className="mt-1" placeholder="••••••••" />
              </div>
              <div>
                <Label htmlFor="pathao_store_id">Default Store ID</Label>
                <Input id="pathao_store_id" value={fields.pathao_store_id} onChange={(e) => handleChange("pathao_store_id", e.target.value)} className="mt-1" placeholder="e.g. 12345" />
              </div>
            </div>

            <div className="rounded-xl glass-card p-6 space-y-4">
              <h3 className="font-display text-lg font-semibold text-foreground">RedX Courier</h3>
              <p className="text-sm text-muted-foreground">RedX Developer Panel থেকে API Access Token সংগ্রহ করুন।</p>
              <div>
                <Label htmlFor="redx_api_token">API Access Token</Label>
                <Input id="redx_api_token" type="password" value={fields.redx_api_token} onChange={(e) => handleChange("redx_api_token", e.target.value)} className="mt-1" placeholder="RedX API Token" />
              </div>
              <div>
                <Label htmlFor="redx_pickup_store_id">Default Pickup Store ID</Label>
                <Input id="redx_pickup_store_id" value={fields.redx_pickup_store_id} onChange={(e) => handleChange("redx_pickup_store_id", e.target.value)} className="mt-1" placeholder="e.g. 12345" />
              </div>
            </div>
          </div>
        )}

        {/* SMTP */}
        {activeSection === "smtp" && (
          <div className="rounded-xl glass-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">Email Notifications (SMTP)</h3>
            <p className="text-sm text-muted-foreground">নতুন অর্ডার আসলে অ্যাডমিনকে ইমেইলে নোটিফিকেশন পাঠাতে SMTP কনফিগার করুন।</p>
            <div>
              <Label htmlFor="smtp_host">SMTP Host</Label>
              <Input id="smtp_host" value={fields.smtp_host} onChange={(e) => handleChange("smtp_host", e.target.value)} className="mt-1" placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label htmlFor="smtp_port">SMTP Port</Label>
              <Input id="smtp_port" value={fields.smtp_port} onChange={(e) => handleChange("smtp_port", e.target.value)} className="mt-1" placeholder="587" />
              <p className="mt-1 text-xs text-muted-foreground">সাধারণত TLS: 587, SSL: 465</p>
            </div>
            <div>
              <Label htmlFor="smtp_user">SMTP Username / Email</Label>
              <Input id="smtp_user" value={fields.smtp_user} onChange={(e) => handleChange("smtp_user", e.target.value)} className="mt-1" placeholder="your@gmail.com" />
            </div>
            <div>
              <Label htmlFor="smtp_pass">SMTP Password / App Password</Label>
              <Input id="smtp_pass" type="password" value={fields.smtp_pass} onChange={(e) => handleChange("smtp_pass", e.target.value)} className="mt-1" placeholder="••••••••" />
              <p className="mt-1 text-xs text-muted-foreground">Gmail হলে App Password ব্যবহার করুন (2FA চালু থাকতে হবে)।</p>
            </div>
            <div>
              <Label htmlFor="smtp_from_name">From Name</Label>
              <Input id="smtp_from_name" value={fields.smtp_from_name} onChange={(e) => handleChange("smtp_from_name", e.target.value)} className="mt-1" placeholder="Shohoz Skill" />
            </div>
            <div>
              <Label htmlFor="smtp_from_email">From Email (ঐচ্ছিক)</Label>
              <Input id="smtp_from_email" value={fields.smtp_from_email} onChange={(e) => handleChange("smtp_from_email", e.target.value)} className="mt-1" placeholder="noreply@yourdomain.com" />
              <p className="mt-1 text-xs text-muted-foreground">খালি রাখলে SMTP Username ব্যবহার হবে।</p>
            </div>
            <div>
              <Label htmlFor="admin_notification_email">অ্যাডমিন নোটিফিকেশন ইমেইল *</Label>
              <Input id="admin_notification_email" value={fields.admin_notification_email} onChange={(e) => handleChange("admin_notification_email", e.target.value)} className="mt-1" placeholder="admin@yourdomain.com" />
              <p className="mt-1 text-xs text-muted-foreground">নতুন অর্ডারের নোটিফিকেশন এই ইমেইলে যাবে।</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">কিভাবে কাজ করে:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>নতুন অর্ডার আসলে অটোমেটিকভাবে অ্যাডমিনকে ইমেইল পাঠানো হবে</li>
                <li>ইমেইলে সম্পূর্ণ অর্ডার ডিটেইলস থাকবে — পণ্য, মূল্য, কাস্টমার তথ্য</li>
                <li>Gmail ব্যবহার করলে: Google Account → Security → App Passwords → Generate</li>
              </ul>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
};

export default AdminSettings;
