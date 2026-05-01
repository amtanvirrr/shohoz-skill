## লক্ষ্য

বর্তমানে সাইটটি শুধু ম্যানুয়াল MFS (bKash/Nagad ইত্যাদি) পেমেন্ট সাপোর্ট করে — ইউজার নিজে টাকা পাঠিয়ে Transaction ID দেয়, অ্যাডমিন ম্যানুয়ালি ভেরিফাই করেন। এই প্ল্যানে **SSLCOMMERZ** যোগ করা হবে — বাংলাদেশের জনপ্রিয় পেমেন্ট অ্যাগ্রিগেটর যা bKash, Nagad, Rocket, কার্ড, ব্যাংক — সব একসাথে হ্যান্ডেল করে এবং স্বয়ংক্রিয়ভাবে পেমেন্ট ভেরিফাই করে।

## উচ্চ-পর্যায়ের ফ্লো

```text
ইউজার → "SSLCOMMERZ এ পে করুন" বাটন
   ↓
edge function: sslcz-init  (অর্ডার তৈরি + SSLCOMMERZ session API কল)
   ↓
SSLCOMMERZ Gateway পেজ (bKash/Nagad/Card/Bank)
   ↓ success/fail/cancel
edge function: sslcz-ipn  (সার্ভার-সাইড IPN — পেমেন্ট ভ্যালিডেট)
   ↓
orders.payment_verified = true, status = 'confirmed'
   ↓
ইউজার success পেজে রিডিরেক্ট → কন্টেন্ট অ্যাক্সেস
```

## অ্যাডমিন প্যানেলে কী থাকবে

`/admin/payments` পেজে একটি নতুন **"SSLCOMMERZ Gateway"** ট্যাব/সেকশন:

- **Store ID** (text)
- **Store Password** (password — মাস্কড)
- **Mode**: Sandbox / Live (toggle)
- **Enabled**: চেকআউটে দেখাবে কিনা (toggle)
- **Display Name**: "অনলাইন পেমেন্ট (কার্ড/মোবাইল ব্যাংকিং)"
- **Test Connection** বাটন — credentials ভেরিফাই করবে
- IPN URL এবং Success/Fail/Cancel URL দেখানো হবে যেগুলো ইউজার SSLCOMMERZ মার্চেন্ট প্যানেলে কপি করবে

ক্রেডেনশিয়াল `site_settings` টেবিলে স্টোর হবে (অ্যাডমিন-only RLS) — পাবলিক টেবিলে যাবে না।

## চেকআউট UI পরিবর্তন

`CourseDetail.tsx`, `BookDetail.tsx`, `QuizPage.tsx` — তিনটি জায়গায়:

- বিদ্যমান ম্যানুয়াল MFS অপশনগুলোর পাশে একটি নতুন **"অনলাইন পেমেন্ট (SSLCOMMERZ)"** কার্ড।
- সিলেক্ট করলে Transaction ID ফিল্ড লুকাবে — শুধু "পে করুন" বাটন দেখাবে।
- বাটন ক্লিক → `sslcz-init` edge function কল → ইউজারকে gateway URL এ রিডিরেক্ট।

ফিজিক্যাল বইয়ের জন্যও SSLCOMMERZ অপশন থাকবে (অগ্রিম পেমেন্ট, COD এর বিকল্প হিসেবে)।

## ব্যাকএন্ড পরিবর্তন

### ১. Database migration

- `site_settings`-এ নতুন কী: `sslcz_store_id`, `sslcz_store_password`, `sslcz_mode` (`sandbox`/`live`), `sslcz_enabled` (`true`/`false`)
- `orders` টেবিলে নতুন কলাম: `gateway_session_key` (text, nullable), `gateway_tran_id` (text, nullable), `gateway_val_id` (text, nullable), `gateway_response` (jsonb, nullable)
- `order_status` enum এ যদি না থাকে: `paid`, `failed`, `cancelled` যোগ করা (চেক করব)
- `payment_method` enum এ `sslcommerz` যোগ করা

### ২. তিনটি Edge Function

| ফাংশন | কাজ | verify_jwt |
|---|---|---|
| `sslcz-init` | অর্ডার তৈরি, SSLCOMMERZ `gwprocess/v4/api.php` কল করে session তৈরি, gateway URL রিটার্ন | true (ইউজার লগইন আবশ্যক) |
| `sslcz-ipn` | SSLCOMMERZ থেকে server-to-server callback, `validator/api/validationserverAPI.php` দিয়ে ভেরিফাই, অর্ডার আপডেট | false (পাবলিক, কিন্তু validation API কলে নিজেই সিকিউর) |
| `sslcz-redirect` | ব্রাউজার success/fail/cancel রিডিরেক্ট হ্যান্ডল, ইউজারকে ফ্রন্টএন্ড পেজে পাঠায় | false |

প্রোডাকশন endpoint: `https://securepay.sslcommerz.com`, sandbox: `https://sandbox.sslcommerz.com` — `sslcz_mode` থেকে পিক করবে।

### ৩. সিকিউরিটি

- Store password শুধু `site_settings` (admin-only RLS) থেকে পড়া হবে — কখনো ক্লায়েন্টে যাবে না।
- IPN-এ `val_id` দিয়ে SSLCOMMERZ validation API কল করে সব ফিল্ড (amount, currency, store_id) match করা হবে — replay/forgery আটকাতে।
- `tran_id` হিসেবে `orders.order_id` ব্যবহার হবে যেন duplicate IPN একই অর্ডার আপডেট করে।

## প্রোডাকশন-রেডি বানানোর জন্য চেকলিস্ট

- Sandbox/Live একই কোডে toggle দিয়ে — অ্যাডমিন এক ক্লিকে switch করতে পারবে
- IPN failure logging (`gateway_response` jsonb এ পুরো রেসপন্স)
- Idempotent IPN handler (একই tran_id একাধিকবার এলে double-confirm হবে না)
- Currency hard-coded `BDT`
- Amount mismatch detection — যদি SSLCOMMERZ কম amount রিপোর্ট করে, fraud flag

## প্রভাবিত ফাইল

**নতুন:**
- `supabase/functions/sslcz-init/index.ts`
- `supabase/functions/sslcz-ipn/index.ts`
- `supabase/functions/sslcz-redirect/index.ts`
- নতুন migration ফাইল

**এডিট:**
- `src/pages/admin/AdminPayments.tsx` — SSLCOMMERZ সেটিংস সেকশন যোগ
- `src/pages/CourseDetail.tsx`, `src/pages/BookDetail.tsx`, `src/pages/QuizPage.tsx` — gateway বাটন
- `src/App.tsx` — `/payment/success`, `/payment/fail`, `/payment/cancel` রাউট

## কী **এই প্ল্যানে নেই**

- Refund API ইন্টিগ্রেশন (পরে যোগ করা যাবে)
- Subscription/recurring পেমেন্ট
- বিদ্যমান ম্যানুয়াল MFS ফ্লো রিমুভ — দুটোই পাশাপাশি থাকবে
