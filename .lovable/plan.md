## Overview

SSLCommerz/Payment Gateway compliance বাস্তবায়ন — তিনটি লিগ্যাল পেজ, ফুটার আপডেট, চেকআউট কনসেন্ট চেকবক্স, পেমেন্ট ব্যানার, ট্রেড লাইসেন্স/রেজিস্টার্ড অ্যাড্রেস ও সবকিছু অ্যাডমিন প্যানেল থেকে এডিটেবল।

## Database (1 migration)

`public_site_settings`-এ নতুন key গুলো যোগ হবে (text rows): `terms_content`, `privacy_content`, `refund_content`, `refund_timeline_text`, `trade_license_number`, `registered_address`, `company_details`, `payment_banner_url`. কোনো নতুন টেবিল লাগবে না — বিদ্যমান key/value প্যাটার্ন ব্যবহার হবে।

## নতুন পাবলিক পেজ (৩টি)

1. `/terms` — Terms & Conditions
2. `/privacy` — Privacy Policy  
3. `/refund` — Return & Refund Policy (ডিফল্ট কপিতে **৭–১০ কর্মদিবস** টাইমলাইন স্পষ্টভাবে লেখা)

তিনটিই `About.tsx`-এর মতো সরল প্যাটার্ন: `useSiteSettings` থেকে HTML কনটেন্ট লোড → `DOMPurify.sanitize` → render। ডেটাবেসে কনটেন্ট না থাকলে কম্প্লায়েন্ট ডিফল্ট Bengali টেক্সট দেখাবে। `App.tsx`-এ রুট যোগ হবে।

## Footer আপডেট (`src/components/layout/Footer.tsx`)

- "সাপোর্ট" কলামের প্লেইন `<span>` গুলো `<Link>`-এ পরিবর্তন: প্রাইভেসি পলিসি → `/privacy`, ব্যবহারের শর্তাবলী → `/terms`, রিফান্ড পলিসি → `/refund`। About link আগে থেকেই আছে।
- নতুন "কোম্পানি তথ্য" ব্লক: Trade License No. + Registered Address (settings থেকে)।
- Payment banner: settings এর `payment_banner_url` ইমেজ ফুটারে দেখাবে (fallback হিসেবে SSLCommerz-এর স্ট্যান্ডার্ড পেমেন্ট মেথড ব্যানার `src/assets/`-এ রাখা একটি ডিফল্ট ইমেজ — bKash/Nagad/Rocket/Visa/Master/Amex)।

## About পেজ আপডেট

`About.tsx`-এ কোম্পানি ও ম্যানেজমেন্ট ডিটেলস + Trade License Number সেকশন যোগ হবে (settings থেকে পড়ে)।

## চেকআউট কনসেন্ট চেকবক্স (MANDATORY)

প্রতিটি অর্ডার সাবমিট পয়েন্টে কনসেন্ট চেকবক্স যোগ:
- `src/pages/BookDetail.tsx` (অর্ডার ফর্ম)
- `src/pages/CourseDetail.tsx`
- `src/pages/QuizPage.tsx`
- `src/pages/LandingPage.tsx` (অর্ডার ফর্ম সেকশন)

প্যাটার্ন: "Place Order" বাটনের ঠিক আগে blank `Checkbox` (Radix) + লেবেল: *"আমি [শর্তাবলী](/terms), [প্রাইভেসি পলিসি](/privacy) এবং [রিফান্ড পলিসি](/refund) পড়েছি ও সম্মত আছি।"* — আনচেকড থাকলে সাবমিট বাটন `disabled`। ৪টি পেজের একই UX-এর জন্য `src/components/CheckoutConsent.tsx` নামে ছোট shared component তৈরি হবে।

## অ্যাডমিন প্যানেল এক্সটেনশন

`src/pages/admin/AdminSettings.tsx`-এ নতুন ট্যাব **"আইনি ও কম্প্লায়েন্স"** যোগ হবে যেখানে অ্যাডমিন এডিট করতে পারবে:

- Terms & Conditions (RichTextEditor)
- Privacy Policy (RichTextEditor)
- Return & Refund Policy (RichTextEditor) — ডিফল্ট প্রি-ফিল্ড টেমপ্লেটে ৭–১০ কর্মদিবস উল্লেখ।
- Refund timeline text (Input — ফলব্যাক/সারাংশ)
- Trade License Number (Input — MANDATORY মার্ক)
- Registered Address (Textarea)
- Company & Management details (RichTextEditor — About-এ দেখাবে)
- Payment banner image (URL/আপলোড — `hero-media` বাকেট রিইউজ)

### Technical Details

- `useSiteSettings` hook এবং `SiteSettings` interface-এ ৮টি নতুন key যোগ; `defaults` আপডেট।
- `AdminSettings.tsx`-এর `BrandingFields` interface ও `defaultBranding` object-এ একই key যোগ হবে।
- Payment banner-এর জন্য প্রয়োজনে `imagegen--generate_image` (premium) ব্যবহার করে একটি ক্লিন ডিফল্ট "Accepted Payment Methods" ব্যানার generate হবে (bKash, Nagad, Rocket, Visa, Mastercard, Amex লোগোসহ) `src/assets/payment-methods.png`-এ।
- কনসেন্ট চেকবক্স স্টেট প্রতি পেজে লোকাল `useState<boolean>`; submit handler-এ guard: `if (!agreed) { toast.error("শর্তাবলীতে সম্মতি দিন"); return; }`।

## নিরাপত্তা

লিগ্যাল কনটেন্ট পাবলিক — `public_site_settings` ইতিমধ্যে public read RLS-এ আছে, কোনো পরিবর্তন লাগবে না। `DOMPurify.sanitize` সব রেন্ডারে।

## Out of scope

কোনো বিদ্যমান পেমেন্ট/অর্ডার বিজনেস লজিকে পরিবর্তন নেই — শুধু কনসেন্ট গার্ড যুক্ত হবে।