# লোগোর কালার থিমে সম্পূর্ণ রিব্র্যান্ড

লোগোর তিনটি প্রধান রঙ থেকে নতুন প্যালেট:
- **Navy (Deep Blue)** — লোগোর বাইরের রিং, ক্যাপ, "SHOHOZ SKILL" টেক্সট → **Primary**
- **Orange** — ট্যাসেল, "LEARN TO EARN", কার্ভ → **Accent**
- **Sky Blue** — বইয়ের পাতার ফ্লেম, ব্যাকগ্রাউন্ড আক্সেন্ট → **Secondary highlight / Info**
- **White** — সারফেস

বাকি সব কালার (success, warning, destructive, muted) সামঞ্জস্যপূর্ণ রেখে এই তিনটার সাথে ব্যালেন্স করা হবে।

## প্রস্তাবিত টোকেন (HSL)

| টোকেন | বর্তমান | নতুন | ব্যবহার |
|---|---|---|---|
| `--primary` | `174 65% 28%` (teal) | **`218 60% 20%`** (logo navy) | বাটন, লিঙ্ক, হেডিং অ্যাকসেন্ট, ফোকাস রিং |
| `--primary-foreground` | white | white | প্রাইমারির উপর টেক্সট |
| `--accent` | `36 95% 52%` (amber) | **`28 95% 55%`** (logo orange) | CTA, badge, highlight, hover glow |
| `--accent-foreground` | white | white | অ্যাকসেন্টের উপর টেক্সট |
| `--secondary` | `200 20% 94%` | **`210 40% 96%`** (soft sky) | সেকেন্ডারি সারফেস |
| `--ring` | teal | **navy (same as primary)** | ফোকাস রিং |
| `--success` | `152 60% 40%` | **`152 55% 38%`** (slight harmonize) | অপরিবর্তিত প্রায় |
| `--warning` | amber | **`28 95% 55%`** (= accent) | ওয়ার্নিং orange-aligned |
| `--destructive` | `0 72% 51%` | অপরিবর্তিত | এরর/ডিলিট |
| `--background` | `210 30% 98%` | **`210 40% 99%`** (cleaner white) | পেজ bg |
| `--foreground` | `220 25% 12%` | **`218 50% 12%`** (navy-tinted) | প্রধান টেক্সট |
| `--border` / `--input` | `220 15% 90%` | **`218 25% 90%`** | বর্ডার |

### Dark mode
| টোকেন | নতুন |
|---|---|
| `--background` | `218 40% 8%` (deep navy bg) |
| `--card` / `--popover` | `218 35% 12%` |
| `--primary` | **`28 95% 58%`** (orange হয় primary in dark — visibility) |
| `--primary-foreground` | `218 50% 10%` |
| `--accent` | **`210 90% 70%`** (sky blue) |
| `--secondary` / `--muted` | `218 30% 16%` |
| `--border` / `--input` | `218 25% 22%` |
| `--ring` | orange (= primary) |

ডার্ক মোডে navy ব্যাকগ্রাউন্ডে navy primary দেখা যাবে না — তাই dark-এ orange primary, light-এ navy primary। Sidebar টোকেনগুলোও ম্যাচিং করানো হবে।

## কোথায় কোথায় চেঞ্জ হবে

### 1. Frontend tokens (একমাত্র মূল ফাইল)
- **`src/index.css`** — `:root` ও `.dark` ব্লকে উপরের টেবিল অনুযায়ী সব HSL ভ্যালু আপডেট। `--sidebar-*` টোকেনগুলোও primary/accent এর সাথে align করা হবে।
- কোনো গ্লাস/শ্যাডো ইউটিলিটির স্ট্রাকচার চেঞ্জ হবে না — তারা `var(--primary)` রেফারেন্স ব্যবহার করে, তাই অটোমেটিকভাবে নতুন কালারে রেন্ডার হবে।

### 2. Tailwind config
- **`tailwind.config.ts`** — কোনো হার্ডকোডেড hex/rgb পাইনি; সব টোকেন-ভিত্তিক। চেঞ্জ লাগবে না (verify করব)।

### 3. হার্ডকোডেড কালার অডিট ও ফিক্স
নিচের ফাইলগুলোতে hex/named কালার আছে — টোকেনে রিপ্লেস করা হবে যেখানে প্রযোজ্য:
- `src/pages/LandingPage.tsx` (থিম প্রিভিউ স্ক্রিন — থিমগুলো রাখব, কিন্তু default স্কীমকে নতুন প্যালেটে আনব)
- `src/pages/admin/AdminBlog.tsx`, `AdminLandingPages.tsx` (TipTap/preview swatches)
- `src/components/PaymentSelector.tsx`, `OrderSuccessDialog.tsx` (badge/icon টিন্ট)
- `src/App.css` (যদি থাকে অপ্রয়োজনীয় কালার)

প্রতিটি ফাইলে `text-[#xxxxxx]` / `bg-[#xxxxxx]` খুঁজে — যদি ব্র্যান্ড কালার হয় → `text-primary`/`bg-accent` ইত্যাদি টোকেন; যদি স্ট্যাটাস কালার হয় (success/warning) → সেই টোকেন।

### 4. Hero/Landing থিম প্রিসেট
`AdminHero` ও `AdminLandingPages` এ যেসব hard-coded preset color palette আছে, সেগুলোর "Default / Brand" প্রিসেট নতুন navy+orange কম্বিনেশনে আপডেট হবে। ইউজারের কাস্টম থিমগুলোতে হাত দেওয়া হবে না (DB-তে সংরক্ষিত)।

### 5. Backend / Email
- **Edge functions** (`notify-order`, `send-newsletter`, `unsubscribe`) — HTML email টেমপ্লেটে যদি hex কালার থাকে (header background, button), সেগুলো নতুন navy `#14315C` ও orange `#F58A1F` দিয়ে আপডেট হবে।
- কোনো DB row বা settings টেবিলে hex কালার ফিল্ড থাকলে (যেমন `site_settings.brand_color`), একটি migration দিয়ে default আপডেট — কিন্তু ইউজার-সেট ভ্যালু ওভাররাইট নয়।

### 6. Static assets
- `public/favicon` ও `public/og-image` যদি পুরোনো teal-based হয়, পরে regenerate করা যাবে (এই প্ল্যানের scope-এর বাইরে যদি না বলেন)।

## Verification
- লাইট ও ডার্ক মোডে: হোম, কোর্স ডিটেইল, চেকআউট, ড্যাশবোর্ড, অ্যাডমিন প্যানেল, ফুটার, মোবাইল বটম নাভ — প্রতিটিতে কনট্রাস্ট চেক।
- WCAG AA: navy `#14315C` on white = 11.6:1 ✓; orange on white ≈ 3.1:1 (large/CTA-only ব্যবহার, ছোট টেক্সটে নয়); dark mode-এ orange on navy = 7.4:1 ✓।
- বিল্ড ক্লিন করে preview সব রুটে ভিজুয়াল চেক।

## Memory update
পরিবর্তনের পরে `mem://index.md` ও `mem://style/branding`-এ "deep teal & amber" → **"navy & orange (logo-based)"** আপডেট করা হবে।

## টেকনিক্যাল সারাংশ
- প্রায় সব রঙ semantic tokens (`--primary`, `--accent` ইত্যাদি) এর মাধ্যমে নিয়ন্ত্রিত — তাই **মূল কাজ `src/index.css`-এ প্রায় ২৫–৩০ লাইন HSL আপডেট**।
- হার্ডকোডেড hex (~৫–৬টি ফাইল) ও email টেমপ্লেট কালার ম্যানুয়ালি রিপ্লেস।
- কোনো বিজনেস লজিক/স্কিমা চেঞ্জ নেই; পিউর প্রেজেন্টেশন রিব্র্যান্ড।
