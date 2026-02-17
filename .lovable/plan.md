

# সেটিংস পেজ সমস্যা সমাধান এবং হার্ডকোড রিমুভ করার পরিকল্পনা

## সমস্যা চিহ্নিতকরণ

### 1. মূল সমস্যা: `public_site_settings` টেবিল অস্তিত্বহীন
ডাটাবেজে `public_site_settings` নামে কোনো টেবিলই নেই। কিন্তু কোডের একাধিক জায়গায় এই টেবিল থেকে ডাটা পড়া এবং লেখা হচ্ছে। ফলে:
- **সেটিংস সেভ করলে পাবলিক সাইডে আপডেট হয় না** (HeroBanner, Footer, Contact পেজে পুরনো/ডিফল্ট ডাটা থাকে)
- `(supabase as any)` দিয়ে TypeScript চেক বাইপাস করা হয়েছে, তাই কম্পাইল-টাইমে কোনো এরর দেখায় না
- সেটিংস সেভ করার সময় `public_site_settings`-এ write ব্যর্থ হচ্ছে (silently fail)

### 2. হার্ডকোডেড ভ্যালু চিহ্নিত
নিচের জায়গাগুলোতে হার্ডকোডেড ফলব্যাক ভ্যালু আছে যেগুলো ডাটাবেজ থেকে আসা উচিত:

| ফাইল | হার্ডকোডেড ভ্যালু |
|------|-------------------|
| `useSiteSettings.tsx` | `"ShikhonHub"`, `"info@shikhonhub.com"`, `"+880 1XXX-XXXXXX"`, `"Dhaka, Bangladesh"` |
| `Footer.tsx` | `"info@shikhonhub.com"`, `"+880 1XXX-XXXXXX"`, `"Dhaka, Bangladesh"`, `"ShikhonHub"` |
| `Contact.tsx` | `"info@shikhonhub.com"`, `"+880 1XXX-XXXXXX"`, `"Dhaka, Bangladesh"` |
| `About.tsx` | পুরো পেজই `"ShikhonHub"` নামে হার্ডকোডেড |
| `Footer.tsx` (line 49) | `"সহজ স্কিলের নিউজলেটার"` — হার্ডকোডেড |

## সমাধান পরিকল্পনা

### ধাপ ১: `public_site_settings` টেবিল তৈরি (Database Migration)
- `site_settings` টেবিলের মতোই structure-এ একটি `public_site_settings` টেবিল তৈরি
- RLS পলিসি: যেকেউ SELECT করতে পারবে, শুধুমাত্র অ্যাডমিন INSERT/UPDATE/DELETE করতে পারবে
- বর্তমান `site_settings` থেকে পাবলিক কী-গুলো `public_site_settings`-এ কপি করার SQL

### ধাপ ২: হার্ডকোডেড ফলব্যাক ভ্যালু আপডেট
- **`useSiteSettings.tsx`**: ডিফল্ট ভ্যালু হিসেবে `"ShikhonHub"` এর বদলে খালি স্ট্রিং বা জেনেরিক ভ্যালু ব্যবহার। তবে ডাটাবেজ থেকে লোড না হওয়া পর্যন্ত ফলব্যাক হিসেবে ডাটাবেজের আসল ভ্যালু ব্যবহার করা হবে (site_settings টেবিল থেকে সরাসরি পড়া)
- **`Footer.tsx`**: ফলব্যাক `"info@shikhonhub.com"` সরিয়ে শুধু `settings.contact_email` ব্যবহার
- **`Contact.tsx`**: একই ফলব্যাক রিমুভ
- **`About.tsx`**: `useSiteSettings` হুক ব্যবহার করে `settings.site_name` দিয়ে ডায়নামিক করা

### ধাপ ৩: `useSiteSettings.tsx` ফিক্স
- `public_site_settings` টেবিল এখন তৈরি হবে, তাই সেখান থেকে সঠিকভাবে ডাটা লোড হবে
- ফলব্যাক ভ্যালুগুলো থেকে "ShikhonHub" রিমুভ করে ডাটাবেজের আসল ডাটা ব্যবহার

### ধাপ ৪: AdminSettings সেভ ফাংশন যাচাই
- `public_site_settings` টেবিল তৈরি হওয়ায় সেভ ফাংশন সঠিকভাবে কাজ করবে
- `upsert` ব্যবহার করে সেভ লজিক সরলীকরণ (insert-or-update এর বদলে একটি কলেই কাজ হবে)

## টেকনিক্যাল ডিটেইলস

### ডাটাবেজ মাইগ্রেশন SQL:
```text
CREATE TABLE public_site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public_site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read
CREATE POLICY "Anyone can view public settings"
  ON public_site_settings FOR SELECT USING (true);

-- Only admins can write
CREATE POLICY "Admins can manage public settings"
  ON public_site_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Copy existing public keys from site_settings
INSERT INTO public_site_settings (key, value)
SELECT key, value FROM site_settings
WHERE key IN (
  'site_name','site_description','copyright_text',
  'logo_url','footer_logo_url','admin_logo_url','favicon_url',
  'facebook_pixel_id','facebook_test_event_code',
  'contact_email','contact_phone','contact_address',
  'hero_title','hero_subtitle',
  'hero_btn1_text','hero_btn1_link','hero_btn2_text','hero_btn2_link',
  'hero_stat1_value','hero_stat1_label',
  'hero_stat2_value','hero_stat2_label',
  'hero_stat3_value','hero_stat3_label'
)
ON CONFLICT (key) DO NOTHING;
```

### পরিবর্তন হবে এমন ফাইলসমূহ:
1. `src/hooks/useSiteSettings.tsx` — হার্ডকোডেড ডিফল্ট রিমুভ
2. `src/components/layout/Footer.tsx` — হার্ডকোডেড ফলব্যাক রিমুভ
3. `src/pages/Contact.tsx` — হার্ডকোডেড ফলব্যাক রিমুভ
4. `src/pages/About.tsx` — ডায়নামিক সাইট নাম ব্যবহার
5. `src/pages/admin/AdminSettings.tsx` — সেভ লজিক উন্নতি (upsert ব্যবহার)

