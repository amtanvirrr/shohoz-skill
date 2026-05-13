# Floating Menu Fixes + Mobile Header Polish + Sheet UI Enhancement

## 1. FAB clickable while open + toggle close — `src/components/layout/FloatingMenuFab.tsx`

**Cause:** Radix `Dialog` (Sheet)-এর modal mode বাইরের সব element-এর pointer-events disable করে দেয়, ফলে sheet open থাকলে FAB icon click কাজ করে না।

**Fix:**
- `<Sheet modal={false} ...>` — outside interactions allow হবে।
- যেহেতু modal=false মানে overlay নিজে close করবে না, একটা custom dim layer add করব (`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm`) যা open হলে দেখাবে এবং click করলে close হবে। FAB রাখব `z-[70]`, sheet content `z-50`, custom overlay `z-40` — fully clickable।
- FAB-এর existing pointer-up toggle (`setOpen(o => !o)`) আগের মতোই — open অবস্থায় tap করলে close হবে।
- Sheet open থাকা অবস্থায়ও drag allow থাকবে (যেহেতু modal=false)।

## 2. Mobile header — `src/components/layout/Header.tsx`

- **Logo-র পাশে site name mobile-এও দেখাবে:** `<span className="hidden sm:inline">` থেকে `hidden sm:inline` সরিয়ে সবসময় visible (smaller font on mobile e.g. `text-base sm:text-xl`, truncate)।
- **Logged-out mobile login button:** বর্তমানে শুধু `UserIcon` দেখায়। সাথে "লগইন" text যোগ করব (`<UserIcon /> লগইন`)। `sm:hidden` Button এ icon + text।

## 3. Slide-in menu UI enhancement — `src/components/layout/FloatingMenuFab.tsx` SheetContent

Redesign with:
- **Header block:** Logged-in হলে avatar (initials/photo) + name + email এর mini profile card (gradient background `from-primary/10 to-accent/10`, rounded-2xl, border)। Logged-out হলে welcome message + prominent "লগইন / রেজিস্টার" CTA pair।
- **Quick navigation grid (2-col):** হোম, কোর্স, বই, কুইজ — colored icon tiles (each its own subtle tint), active highlight সহ।
- **Section "আরও":** ব্লগ, আমাদের সম্পর্কে, যোগাযোগ — list rows with icon tile, label, chevron।
- **Section "অ্যাকাউন্ট":** ড্যাশবোর্ড, অ্যাডমিন প্যানেল (admin), লগআউট — same row style।
- **Footer row:** Theme toggle as a segmented switch (Sun/Moon icons with active pill), site version/branding line।
- **Visual polish:**
  - SheetContent: `glass-card` style, rounded inner edge (left side: `rounded-r-3xl`, right side: `rounded-l-3xl`), subtle gradient border, `p-0` then internal padded sections, scrollable body।
  - Section headers: tiny uppercase Bengali label in muted color।
  - Smooth `animate-in slide-in-from-{side}` already provided by Radix; add per-item stagger via CSS delays (optional)।
  - Reduced-motion respected।

## Out of Scope
- Bottom nav, routes, auth flow — অপরিবর্তিত।
- Desktop header layout — অপরিবর্তিত।
- কোনো নতুন dependency নেই।
