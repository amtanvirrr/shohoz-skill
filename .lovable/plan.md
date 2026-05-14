## সমস্যা

মোবাইলে Featured Course ও Featured বই কার্ডের width এখন `w-[44%]` (≈172px on 390px viewport)। কিন্তু কার্ডের ভেতরের content — padding (`p-4`), title (`text-lg`), badge সারি, price + CTA এক row — এই narrow width-এ বেমানান হয়ে যাচ্ছে। CTA pill ও price overflow/wrap হচ্ছে, badge দুইটা পাশাপাশি বসছে না, title অতিরিক্ত বড় দেখাচ্ছে।

লক্ষ্য: মোবাইলে কার্ডের ভেতরের সব element compact ও readable হোক, `sm:` breakpoint থেকে আগের desktop চেহারা অপরিবর্তিত থাকুক।

## পদ্ধতি

`src/pages/Index.tsx` এর Featured Course (line ~365–411) এবং Featured Book (line ~463–509) — দুই কার্ডে একই pattern apply:

**1. Padding ছোট করা**
- `p-4 sm:p-5` → `p-3 sm:p-5`

**2. Badge সারি (category + type)**
- প্রতিটি badge: `px-3 py-1 text-xs` → `px-2 py-0.5 text-[10px] sm:px-3 sm:py-1 sm:text-xs`
- gap: `gap-2` → `gap-1.5 sm:gap-2`

**3. Title**
- `text-lg` → `text-sm sm:text-lg`
- margin: `mt-3` → `mt-2 sm:mt-3`

**4. Instructor/author + duration meta**
- `text-sm` (instructor) → `text-xs sm:text-sm`
- duration row: `text-xs` রাখা, কিন্তু `mt-3` → `mt-2 sm:mt-3`

**5. Divider**
- `my-4` → `my-3 sm:my-4`

**6. Price + CTA row**
- Layout: মোবাইলে stack (`flex-col items-start`), `sm:` থেকে আগের `flex-row items-center justify-between`
- Price: `text-xl` → `text-base sm:text-lg`, line-through `text-sm` → `text-xs sm:text-sm`
- CTA pill: `px-3 py-1.5 text-xs` → `px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs`, মোবাইলে full-width (`w-full justify-center sm:w-auto`)

**7. Discount badge (image overlay)**
- `bottom-3 left-3 px-2.5 py-1 text-[11px]` → `bottom-2 left-2 px-2 py-0.5 text-[10px] sm:bottom-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[11px]`

## যা পরিবর্তন হবে না

- Card width (`w-[44%]`), carousel snap, peek behavior
- Desktop/tablet (`sm:` ও তার উপরে) চেহারা — সব আগের মতোই
- Quiz card, অন্য section, image aspect ratio, color tokens
- Business logic, data fetching, CTA destinations

## Files

- `src/pages/Index.tsx` — Featured Course কার্ড (line ~365–411) এবং Featured Book কার্ড (line ~463–509)

Approve করলে এগিয়ে যাব।
