# Mobile Nav Redesign — Dashboard Center + Draggable Menu FAB

## Goals
1. Bottom nav-এর মাঝখানের Menu FAB সরিয়ে সেখানে **Dashboard** রাখা।
2. "মেনু" button-টা bottom nav থেকে সরিয়ে আলাদা একটা **floating draggable FAB**-এ রূপান্তর করা — যেটা শুধু left বা right edge-এ snap হয়ে আটকে থাকবে।
3. FAB যে পাশে আটকে থাকবে, সেই পাশ থেকেই Sheet menu slide হয়ে আসবে।

---

## Changes

### 1. `src/components/layout/MobileBottomNav.tsx`
- **Center slot:** Menu FAB-এর জায়গায় Dashboard FAB।
  - Icon: `LayoutDashboard`, label: "ড্যাশবোর্ড"
  - Same elevated style: `-mt-7 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent`, ring, shadow
  - Logged-in হলে `/dashboard`-এ navigate, না হলে `/login?redirect=/dashboard`
  - Active state যখন `pathname === "/dashboard"`
- Sheet/Trigger/Menu button সম্পূর্ণ remove। 4 tabs (হোম, কোর্স | বই, কুইজ) আগের মতোই থাকবে।

### 2. New file `src/components/layout/FloatingMenuFab.tsx`
- Mobile-only (`md:hidden`), `position: fixed`, z-index nav-এর উপরে।
- **State:**
  - `side: "left" | "right"` — localStorage key `floatingMenuSide` (default `"right"`)
  - `topPx: number` — vertical position, localStorage key `floatingMenuTop` (default ~60% viewport height)
  - `dragging`, `moved` (click vs drag detection)
- **Drag behavior:** pointer events (`onPointerDown/Move/Up`, `setPointerCapture`).
  - Y axis freely follows pointer, clamped between `[80px, viewport-160px]`।
  - X axis নয় — release হওয়ার সময় pointer viewport-এর কোন অর্ধে আছে দেখে `left`/`right` snap; smooth transition দিয়ে edge-এ বসবে (e.g. `12px` inset)।
  - `touch-action: none` যাতে scroll না হয়।
- **Click vs drag:** total displacement < 6px হলে click হিসেবে treat → Sheet open।
- **Sheet:**
  - `<Sheet>` with `<SheetContent side={side}>` — side dynamic, তাই FAB যে পাশে snapped, সেই পাশ থেকে slide।
  - Existing menu contents (moreLinks, auth links, theme toggle, logout) — current `MobileBottomNav` থেকে move করে আনতে হবে।
  - `SheetContent` width: `w-[85vw] sm:max-w-sm`, `h-full overflow-y-auto`।
- **FAB visual:** `h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-background/60 backdrop-blur`. Subtle drag-handle dots বা just Menu icon। `active:scale-95`। `prefers-reduced-motion` respect।
- Bottom safe-area aware (don't overlap nav): default top placement above nav; clamp upper bound considers nav height.

### 3. `src/App.tsx`
- `GlobalMobileNav`-এ `<MobileBottomNav />`-এর পাশাপাশি `<FloatingMenuFab />` render (same admin/lp guard)।

### 4. `src/index.css`
- `.footer-safe` padding আগের মতই (6.5rem) থাকবে — Dashboard FAB একই উচ্চতা ব্যবহার করছে।

---

## Out of Scope
- Sheet menu-র contents/items, routing, auth flow, theme system — unchanged।
- Header (desktop) nav — unchanged।
- কোনো নতুন dependency নেই (drag native pointer events দিয়ে handled)।

## Edge Cases
- SSR/initial render-এ `window` undefined guard।
- Orientation/resize-এ position re-clamp।
- Sheet open থাকা অবস্থায় drag disabled।
- Reduced-motion: snap transition skip।
