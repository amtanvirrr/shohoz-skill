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
};

const PUBLIC_KEYS: (keyof BrandingFields)[] = [
  "site_name", "site_description", "copyright_text",
  "logo_url", "footer_logo_url", "admin_logo_url", "favicon_url",
  "facebook_pixel_id", "facebook_test_event_code",
  "contact_email", "contact_phone", "contact_address",
];

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
    // Get existing keys from both tables
    const [{ data: existing }, { data: existingPublic }] = await Promise.all([
      supabase.from("site_settings").select("key").in("key", ALL_KEYS),
      (supabase as any).from("public_site_settings").select("key").in("key", PUBLIC_KEYS),
    ]);
    const existingKeys = new Set(existing?.map((r: any) => r.key) || []);
    const existingPublicKeys = new Set((existingPublic || []).map((r: any) => r.key));

    // Save all to site_settings (admin-only)
    const upserts = ALL_KEYS.map((key) => {
      if (existingKeys.has(key)) {
        return supabase.from("site_settings").update({ value: fields[key] }).eq("key", key);
      } else if (fields[key]) {
        return supabase.from("site_settings").insert({ key, value: fields[key] });
      }
      return null;
    }).filter(Boolean);

    // Sync public keys to public_site_settings
    const publicOps = PUBLIC_KEYS.map((key) => {
      if (existingPublicKeys.has(key)) {
        return (supabase as any).from("public_site_settings").update({ value: fields[key] }).eq("key", key);
      } else if (fields[key]) {
        return (supabase as any).from("public_site_settings").insert({ key, value: fields[key] });
      }
      return null;
    }).filter(Boolean);

    await Promise.all([...upserts, ...publicOps]);
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

      <div className="mt-8 max-w-2xl space-y-8">
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

        {/* Meta Pixel & Conversions API */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Meta Pixel & Conversions API</h3>
          <p className="text-sm text-muted-foreground">
            ক্লায়েন্ট-সাইড Pixel এবং সার্ভার-সাইড Conversions API এর মাধ্যমে ইভেন্ট ট্র্যাকিং করুন। PageView, Purchase ইত্যাদি ইভেন্ট অটোমেটিকভাবে ট্র্যাক হবে।
          </p>
          <div>
            <Label htmlFor="pixel">Pixel ID</Label>
            <Input id="pixel" value={fields.facebook_pixel_id} onChange={(e) => handleChange("facebook_pixel_id", e.target.value)} className="mt-1" placeholder="e.g. 123456789012345" />
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

        {/* Contact Information */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">যোগাযোগ তথ্য</h3>
          <p className="text-sm text-muted-foreground">কন্টাক্ট পেজ এবং ফুটারে প্রদর্শিত যোগাযোগের তথ্য পরিবর্তন করুন।</p>
          <div>
            <Label htmlFor="contact_email">ইমেইল</Label>
            <Input id="contact_email" value={fields.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} className="mt-1" placeholder="info@shikhonhub.com" />
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

        {/* Courier Integration - Steadfast */}
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

        {/* Courier Integration - Pathao */}
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

        {/* Courier Integration - RedX */}
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

        {/* SMTP Email Notifications */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h3 className="font-display text-lg font-semibold text-foreground">Email Notifications (SMTP)</h3>
          <p className="text-sm text-muted-foreground">
            নতুন অর্ডার আসলে অ্যাডমিনকে ইমেইলে নোটিফিকেশন পাঠাতে SMTP কনফিগার করুন।
          </p>

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
      </div>
    </div>
  );
};

export default AdminSettings;
