import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

interface BrandingFields {
  site_name: string;
  site_description: string;
  copyright_text: string;
  logo_url: string;
  footer_logo_url: string;
  admin_logo_url: string;
  favicon_url: string;
  facebook_pixel_id: string;
}

const defaultBranding: BrandingFields = {
  site_name: "",
  site_description: "",
  copyright_text: "",
  logo_url: "",
  footer_logo_url: "",
  admin_logo_url: "",
  favicon_url: "",
  facebook_pixel_id: "",
};

const ALL_KEYS = Object.keys(defaultBranding) as (keyof BrandingFields)[];

const AdminSettings = () => {
  const { toast } = useToast();
  const [fields, setFields] = useState<BrandingFields>(defaultBranding);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ALL_KEYS);
      if (data) {
        const merged = { ...defaultBranding };
        data.forEach((row) => {
          if (row.key in merged) {
            (merged as any)[row.key] = row.value;
          }
        });
        setFields(merged);
      }
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleChange = (key: keyof BrandingFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    // Get existing keys
    const { data: existing } = await supabase.from("site_settings").select("key").in("key", ALL_KEYS);
    const existingKeys = new Set(existing?.map((r) => r.key) || []);

    const upserts = ALL_KEYS.map((key) => {
      if (existingKeys.has(key)) {
        return supabase.from("site_settings").update({ value: fields[key] }).eq("key", key);
      } else if (fields[key]) {
        return supabase.from("site_settings").insert({ key, value: fields[key] });
      }
      return null;
    }).filter(Boolean);

    await Promise.all(upserts);
    setSaving(false);
    toast({ title: "সেটিংস সেভ হয়েছে" });
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <Button onClick={saveAll} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? "সেভ হচ্ছে..." : "সব সেভ করুন"}
        </Button>
      </div>

      <div className="mt-8 max-w-lg space-y-8">
        {/* Site Branding */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">সাইট ব্র্যান্ডিং</h3>
          <p className="text-sm text-muted-foreground">সাইটের নাম, বর্ণনা এবং কপিরাইট টেক্সট পরিবর্তন করুন।</p>

          <div>
            <Label htmlFor="site_name">সাইট নাম</Label>
            <Input id="site_name" value={fields.site_name} onChange={(e) => handleChange("site_name", e.target.value)} className="mt-1" placeholder="ShikhonHub" />
          </div>
          <div>
            <Label htmlFor="site_description">ফুটার বর্ণনা</Label>
            <Textarea id="site_description" value={fields.site_description} onChange={(e) => handleChange("site_description", e.target.value)} className="mt-1" placeholder="আপনার শেখার সেরা প্ল্যাটফর্ম..." rows={3} />
          </div>
          <div>
            <Label htmlFor="copyright_text">কপিরাইট টেক্সট</Label>
            <Input id="copyright_text" value={fields.copyright_text} onChange={(e) => handleChange("copyright_text", e.target.value)} className="mt-1" placeholder="© 2026 ShikhonHub. All rights reserved." />
          </div>
        </div>

        {/* Logos */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">লোগো ও আইকন</h3>
          <p className="text-sm text-muted-foreground">ইমেজ URL দিন। Supabase Storage বা যেকোনো CDN URL ব্যবহার করতে পারেন।</p>

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

        {/* Facebook Pixel */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Facebook Pixel</h3>
          <p className="text-sm text-muted-foreground">ট্র্যাকিংয়ের জন্য Facebook Pixel ID যোগ করুন।</p>
          <div>
            <Label htmlFor="pixel">Pixel ID</Label>
            <Input id="pixel" value={fields.facebook_pixel_id} onChange={(e) => handleChange("facebook_pixel_id", e.target.value)} className="mt-1" placeholder="Enter Pixel ID" />
          </div>
        </div>

        {/* Courier Placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground">Courier Integration</h3>
          <p className="mt-1 text-sm text-muted-foreground">Courier API integration placeholder.</p>
          <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            Coming soon — Steadfast, Pathao, RedX integration support.
          </div>
        </div>

        {/* SMTP Placeholder */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-semibold text-foreground">Email Notifications (SMTP)</h3>
          <p className="mt-1 text-sm text-muted-foreground">Configure SMTP for order notification emails.</p>
          <div className="mt-4 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            SMTP configuration can be set up via backend secrets. Contact support for setup.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
