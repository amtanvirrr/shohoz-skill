import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      }
      setAllCourses(coursesRes.data || []);
      setAllBooks(booksRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleChange = (key: keyof BrandingFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFeaturedId = (key: "featured_course_ids" | "featured_book_ids", id: string) => {
    setFields((prev) => {
      const ids = prev[key] ? prev[key].split(",").filter(Boolean) : [];
      const updated = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      return { ...prev, [key]: updated.join(",") };
    });
  };

  const saveAll = async () => {
    setSaving(true);

    // Upsert all keys to site_settings
    const siteOps = ALL_KEYS.map((key) =>
      supabase.from("site_settings").upsert({ key, value: fields[key] }, { onConflict: "key" })
    );

    // Upsert public keys to public_site_settings
    const publicOps = PUBLIC_KEYS.map((key) =>
      (supabase as any).from("public_site_settings").upsert({ key, value: fields[key] }, { onConflict: "key" })
    );

    await Promise.all([...siteOps, ...publicOps]);
    setSaving(false);
    toast({ title: "সেটিংস সেভ হয়েছে" });
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">Settings</h1>
        <Button onClick={saveAll} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
        </Button>
      </div>

      <div className="mt-6 max-w-2xl">
        {/* Site Branding */}
        {activeSection === "branding" && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display text-lg font-semibold text-foreground">সাইট ব্র্যান্ডিং</h3>
            <p className="text-sm text-muted-foreground">সাইটের নাম, বর্ণনা এবং কপিরাইট টেক্সট পরিবর্তন করুন।</p>
            <div>
              <Label htmlFor="site_name">সাইট নাম</Label>
              <Input id="site_name" value={fields.site_name} onChange={(e) => handleChange("site_name", e.target.value)} className="mt-1" placeholder="আপনার সাইটের নাম" />
            </div>
            <div>
              <Label htmlFor="site_description">ফুটার বর্ণনা</Label>
              <Textarea id="site_description" value={fields.site_description} onChange={(e) => handleChange("site_description", e.target.value)} className="mt-1" placeholder="আপনার শেখার সেরা প্ল্যাটফর্ম..." rows={3} />
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

        {/* Homepage Sections */}
        {activeSection === "homepage" && (
          <div className="rounded-xl border border-border bg-card p-6 space-y-6">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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

        {/* Courier Settings */}
        {activeSection === "courier" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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

            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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

            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
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
      </div>
    </div>
  );
};

export default AdminSettings;
