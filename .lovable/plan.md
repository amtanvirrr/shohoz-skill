# Modern UI/UX Upgrade Plan — ShohozSkill

বর্তমান সাইটটি functional কিন্তু visual identity তে "টেমপ্লেট-look" — flat cards, static hero, simple typography hierarchy, কম depth, কম motion. লক্ষ্য: একটি **premium, modern, brand-forward** experience — Apple/Notion/Hashnode-class polish, কিন্তু আপনার navy + orange brand-এ ও সম্পূর্ণ বাংলা typography তে।

নিচের planটা **৬টি phase** এ ভাগ করা — প্রতি phase আলাদা ভাবে approve করে ship করা যাবে। সবকিছু একসাথে করতে গেলে regression risk বেশি।

---

## Phase 1 — Design System Foundation (high impact, low risk)

বর্তমান tokens (`index.css`) basic shadcn defaults এর উপর। এগুলোকে rich, layered design language এ upgrade.

- **Color tokens সম্প্রসারণ**: `--primary-glow`, `--accent-glow`, `--surface-1/2/3` (elevation tiers), `--border-subtle`, `--border-strong`, semantic gradients (`--gradient-hero`, `--gradient-card`, `--gradient-mesh`).
- **Shadow system**: 5-tier elevation (`--shadow-xs` → `--shadow-2xl`) plus colored shadows (`--shadow-primary-glow`, `--shadow-accent-glow`) যা hover এ premium feel দেয়।
- **Radius scale**: `--radius-sm/md/lg/xl/2xl` — বর্তমান flat `0.75rem` এর বদলে contextual radius।
- **Typography scale**: fluid `clamp()` based `--text-display`, `--text-h1..h4`, optical sizing tighten করে Bengali letter-spacing ও line-height balance fine-tune (Hind Siliguri default রাখা হবে — memory অনুযায়ী)।
- **Motion tokens**: `--ease-spring`, `--ease-smooth`, `--duration-fast/base/slow` — সব transition consistent।
- **Dark mode pass**: navy-deep base, subtle blue tint, glass আরো premium।

## Phase 2 — Hero & Landing Page Redesign

বর্তমান hero একটা flat 2-column split। Modernization:

- **Animated mesh gradient background** (CSS conic + radial blobs, GPU-cheap), navy থেকে accent এ subtle drift।
- **Floating glass orbs / grain texture overlay** — depth দেয় empty না দেখিয়ে।
- **Headline reveal animation**: word-by-word fade-up (Framer Motion / CSS staggered), accent-coloured key word highlight।
- **Trust strip**: hero এর নিচে compact stat row (5,000+ students, ⭐ rating, partner logos) — sticky social proof।
- **Search-first secondary block**: prominent unified search (course / book / quiz) inline, যেহেতু এটাই primary action।
- **Featured sections redesign**: section-headers with kicker + animated underline, cards পেতে আরো breathing room, hover এ tilt/lift micro-interaction (3D subtle), price prominently।
- **Category quick-access chips**: hero এর নিচে scrollable chips → directly filtered listing এ যায়।

## Phase 3 — Navigation & Header

- **Glass header refinement**: scroll এ shrink + border fade-in, blur intensify।
- **Mega-menu** for Courses/Books: hover এ thumbnail preview সহ category dropdown (desktop)।
- **Command palette** (⌘K): search courses, books, blog, quiz, dashboard pages — power-user feel।
- **Mobile bottom nav**: active indicator pill animation, haptic-style scale on tap।
- **Theme toggle**: animated sun↔moon morph with view-transition API।
- **Auth state**: avatar-এ status dot, dropdown menu (dashboard / orders / logout) — current 3 button cluster এর বদলে।

## Phase 4 — Cards, Lists & Detail Pages

বর্তমান cards সবগুলো একই pattern — uniform কিন্তু flat।

- **Card variants**: `featured` (gradient border + glow), `default`, `compact` — context-aware।
- **Image treatment**: subtle ken-burns on hover, gradient scrim, badge placement consistent।
- **Skeleton loaders**: shimmer skeletons সব list page এ — perceived performance বড় boost।
- **Product detail page (Course/Book)**:
  - Sticky purchase rail (right side, desktop) — price, CTA, instructor card।
  - Tabbed content: Overview / Curriculum / Reviews / FAQ — animated tab indicator।
  - Rich review section: rating breakdown bar chart, verified badge prominent।
  - Sample preview prominent (PDF / video trailer)।
- **Empty states**: illustrated + actionable CTA, current "এখনো কোন কোর্স নেই" এর বদলে।

## Phase 5 — Micro-interactions & Motion

- **ScrollReveal upgrade**: stagger children, slide+fade variants, IntersectionObserver based, reduced-motion respected।
- **Button press feedback**: 95% scale + spring back (memory অনুযায়ী), ripple ছাড়া clean।
- **Page transitions**: Framer Motion route transition (fade + 8px y-shift)।
- **Toast redesign**: glass + icon + colored stripe, top-center on mobile।
- **Form polish**: floating labels, inline validation icons, success ✓ animation।
- **Confetti / sound** already আছে purchase এ — extend করে quiz pass, course complete এও।

## Phase 6 — Polish, Performance, A11y

- **Image optimization**: all uploads → `.webp` with `loading="lazy"`, `decoding="async"`, blurhash placeholder।
- **Font loading**: `font-display: swap`, preconnect Google Fonts, subset Bengali range।
- **A11y audit**: focus rings consistent (using `--ring`), skip-link, ARIA on icon buttons, contrast ratio ≥4.5 (admin contrast checker দিয়ে verify)।
- **Lighthouse pass target**: Performance ≥90, A11y ≥95।
- **Print stylesheet** (invoice/order receipt)।

---

## Recommended Rollout Order

```text
Week 1: Phase 1 (tokens) + Phase 2 (hero + Index page)
Week 2: Phase 3 (header/nav) + Phase 4 (cards + product detail)
Week 3: Phase 5 (motion) + Phase 6 (polish)
```

প্রতি phase shipping এর পর preview করে next phase শুরু করব — যাতে আপনি direction confirm করতে পারেন।

## Technical Notes

- **No business logic changes** — শুধু presentational layer, design tokens, components।
- **Framer Motion** add করব (lightweight, tree-shakeable) phase 5 এর জন্য; বাকি animation pure CSS।
- **No new backend/DB changes**।
- Existing memory rules (Bengali only, navy+orange palette, glassmorphism, Hind Siliguri default, no uppercase Bengali) সব respect করা হবে।
- shadcn components সব রাখা হবে — শুধু variants extend করা হবে (button এ `premium`, `glow`; card এ `featured`)।

---

## পরবর্তী পদক্ষেপ

আপনি বললে **Phase 1 + Phase 2** দিয়ে শুরু করব — এতেই সবচেয়ে বড় visual jump আসবে (tokens + hero + homepage)। অথবা যেকোনো specific phase আগে চাইলে সেটাও সম্ভব।