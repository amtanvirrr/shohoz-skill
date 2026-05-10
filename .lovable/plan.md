## লক্ষ্য

Mobile ইউজারদের জন্য একটি app-style bottom navigation bar যোগ করা, যাতে সাইটের প্রধান মেনুগুলো এক হাতেই accessible হয় এবং নেভিগেশন অনেক বেশি ইউজারফ্রেন্ডলি হয়।

## ডিজাইন স্ট্রাকচার

Bottom nav-এ ৫টি প্রাইমারি স্লট থাকবে (অপ্টিমাল mobile UX, ৫-এর বেশি হলে ভিড় লাগে):

```text
┌──────────────────────────────────────────┐
│  হোম   কোর্স   বই   কুইজ   মেনু          │
│  🏠     📚      📖    ❓     ☰           │
└──────────────────────────────────────────┘
```

1. হোম — `/`
2. কোর্স — `/courses`
3. বই — `/books`
4. কুইজ — `/quizzes`
5. মেনু — একটি sheet/drawer খুলবে যেখানে বাকি সব আইটেম থাকবে: ব্লগ, আমাদের সম্পর্কে, যোগাযোগ, ড্যাশবোর্ড/লগইন/রেজিস্টার, অ্যাডমিন (admin হলে), ডার্ক/লাইট মোড টগল, লগআউট।

প্রতিটি item-এ Lucide আইকন + Bengali লেবেল। Active route-এ primary color + subtle background highlight (existing design tokens ব্যবহার করে glassmorphism মেনে)।

## আচরণ

- শুধু `md` breakpoint-এর নিচে দেখাবে (`md:hidden`); desktop-এ existing header অপরিবর্তিত।
- `fixed bottom-0` + `z-50` + glass effect, safe-area inset (`pb-[env(safe-area-inset-bottom)]`) iOS-এর জন্য।
- পেজের content যাতে bottom bar-এর নিচে hide না হয়: `Layout.tsx`-এ mobile-only `pb-16` `<main>`-এ যোগ করা হবে।
- "মেনু" বাটনে Shadcn `Sheet` (bottom side) খুলবে; user/auth state অনুযায়ী dynamic options দেখাবে।
- বিদ্যমান mobile hamburger drawer (Header-এর) সরিয়ে ফেলা হবে যাতে duplicate না হয় — Header mobile-এ শুধু logo + theme toggle + avatar/auth-shortcut রাখবে। (অথবা পুরো hamburger সরিয়ে শুধু logo রাখা যাবে যেহেতু সব কিছু bottom nav-এ আছে।)
- Active state detection: `useLocation().pathname` দিয়ে।
- Landing pages (`/lp/:slug`) এবং admin routes-এ bottom nav দেখাবে না — Layout-এ থাকা route-গুলোতেই দেখাবে (Layout-এর ভিতরে থাকায় এটা automatic)।

## প্রযুক্তিগত পরিবর্তন

নতুন ফাইল:
- `src/components/layout/MobileBottomNav.tsx` — bottom nav UI + "More" sheet সহ।

সম্পাদনা:
- `src/components/layout/Layout.tsx` — `<MobileBottomNav />` mount, `<main>`-এ `pb-20 md:pb-0` যোগ।
- `src/components/layout/Header.tsx` — mobile hamburger drawer সরানো, ছোট header রাখা (logo + theme toggle + avatar shortcut)।

কোনো backend/business logic পরিবর্তন নেই — শুধু presentation।

## ভেরিফিকেশন

- 384px viewport-এ bottom nav fixed থেকে দেখা যায়, পেজ scroll করলে content lower bar-এর পিছনে যায় না।
- প্রতিটি tab navigate করে, active state ঠিকঠাক highlight হয়।
- "মেনু" sheet auth state অনুযায়ী সঠিক options দেখায় (logged-in/logged-out/admin), ডার্ক মোড toggle এবং লগআউট কাজ করে।
- Desktop (≥768px)-এ bottom nav দেখায় না, header আগের মতো থাকে।
