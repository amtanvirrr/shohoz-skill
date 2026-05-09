# Payment UI/UX পরিমার্জনা পরিকল্পনা

## সমস্যা চিহ্নিতকরণ

দুটি স্বতন্ত্র বাগ পাওয়া গেছে চারটি জায়গায় (CourseDetail, BookDetail, QuizPage, LandingPage):

### বাগ ১ — বন্ধ payment options এখনও দেখায়
`CourseDetail.tsx` (লাইন 497-517) এবং `BookDetail.tsx` (লাইন 395-403) এ এই কোড আছে:

```tsx
{mfsMethods.length > 0 ? mfsMethods.map(...) : (["bkash", "nagad"] as const).map(...)}
```

অর্থাৎ admin যখন সব MFS method off করে দেয় বা কোনোটি নেই, তখন hardcoded fallback হিসেবে bKash/Nagad button দেখায়। ফলে যে methodগুলো admin বন্ধ রেখেছে সেগুলো user-এর সামনে চলে আসে এবং সেই দিয়ে order জমা হয়ে যায়।

এছাড়া initial state `useState("bkash")`/`paymentMethod: "bkash"` রাখা আছে — যদি bKash database-এ active না থাকে কিন্তু অন্য কিছু থাকে, list-এর প্রথম method auto-select হয় ঠিকই, কিন্তু hardcoded fallback path-এ এই default কোনো guard ছাড়াই server-এ যায়।

### বাগ ২ — SSLCommerz button বিভ্রান্তিকর ভাবে আলাদা
বর্তমানে layout এরকম:

```text
[ পেমেন্ট পদ্ধতি: bKash | Nagad ]
[ Transaction ID input ]
[ "কোর্স কিনুন" বড় button ]
———— অথবা ————
[ Globe icon — অনলাইন পেমেন্ট — ৳XXX ]
```

এতে user বুঝতে পারে না: "কোর্স কিনুন" আর "অনলাইন পেমেন্ট" কি একই purchase-এর দুটো রাস্তা নাকি আলাদা product? SSL button-টা একটা disconnected secondary action-এর মতো দেখায়।

---

## সমাধান

### ১. Frontend: একক unified Payment Selector

চারটি page-এ (Course/Book/Quiz/LandingPage) MFS methods এবং SSLCommerz-কে **একই radio-style selector**-এ মেশানো হবে। নতুন reusable component:

```text
src/components/PaymentSelector.tsx
```

UI কাঠামো:

```text
┌─ পেমেন্ট পদ্ধতি নির্বাচন করুন ─────────────┐
│  ┌───────────┐ ┌───────────┐ ┌─────────┐ │
│  │ ◉ bKash   │ │ ○ Nagad   │ │ ○ অনলাইন│ │
│  │  Personal │ │ Personal  │ │ পেমেন্ট │ │
│  └───────────┘ └───────────┘ └─────────┘ │
│                                            │
│  ▼ Selected method-এর details              │
│   - MFS হলে: phone, QR, instruction,       │
│     transaction ID input                   │
│   - SSLCommerz হলে: ছোট description +     │
│     min-amount warning (যদি price < min)  │
└────────────────────────────────────────────┘

[  নিশ্চিত করুন এবং পেমেন্ট করুন — ৳XXX  ]
```

একটি single primary CTA button থাকবে যা selected method অনুযায়ী action নেবে:
- MFS method selected → existing `handlePurchase` (orders insert)
- SSLCommerz selected → `sslcz-init` edge function call করে redirect

### ২. Frontend: hardcoded fallback সরানো

```tsx
// আগে
{mfsMethods.length > 0 ? mfsMethods.map(...) : (["bkash","nagad"]).map(...)}

// পরে
{mfsMethods.length === 0 && !sslczEnabled ? (
   <EmptyState message="বর্তমানে পেমেন্ট পদ্ধতি অনুপলব্ধ। অনুগ্রহ করে পরে চেষ্টা করুন বা আমাদের সাথে যোগাযোগ করুন।" />
) : (
   <PaymentSelector mfsMethods={mfsMethods} sslczEnabled={sslczEnabled} ... />
)}
```

Default `paymentMethod` state কে hardcoded `"bkash"` থেকে empty string `""` করা হবে; প্রথম available method auto-select হবে fetch-এর পরে।

### ৩. Backend safety guard

বর্তমানে `orders` table-এ যেকেউ `payment_method: "bkash"` দিয়ে insert করতে পারে যদিও admin সেটা off রেখেছে। একটি database trigger যোগ হবে:

```sql
-- BEFORE INSERT trigger on orders
-- যদি payment_method 'cod'/'sslcommerz' না হয় (অর্থাৎ MFS),
-- তাহলে payment_methods table-এ provider=NEW.payment_method AND is_active=true থাকতে হবে।
-- SSLCommerz হলে public_site_settings-এ sslcz_enabled='true' থাকতে হবে।
-- না হলে RAISE EXCEPTION 'এই পেমেন্ট পদ্ধতি বর্তমানে নিষ্ক্রিয়'।
```

এতে disabled method দিয়ে কোনো client-side bypass করেও order জমা দেওয়া যাবে না।

### ৪. Edge case handling

- **সব method off + SSL off** → empty state message + admin notification নয়, শুধু user-friendly বার্তা।
- **শুধু SSL on, MFS সব off** → SSL automatic select হয়ে থাকবে, একটাই card visible।
- **শুধু MFS on, SSL off** → আগের মতই MFS list, কিন্তু hardcoded fallback ছাড়া।
- **Free product (price=0)** → PaymentSelector render হবে না, "ফ্রিতে এনরোল করুন" button থাকবে (existing behavior unchanged)।
- **Physical book (COD)** → PaymentSelector render হবে না, "ক্যাশ অন ডেলিভারি" badge + confirm button (existing behavior unchanged)।

### ৫. Admin Panel

`AdminPayments.tsx`-এ ছোট improvement — সব MFS off + SSL off হলে warning banner দেখানো হবে: "⚠️ কোনো সক্রিয় পেমেন্ট পদ্ধতি নেই — গ্রাহক কিছু কিনতে পারবে না।"

---

## প্রভাবিত ফাইলসমূহ

### নতুন
- `src/components/PaymentSelector.tsx` — reusable unified selector
- নতুন migration: `orders` insert validation trigger

### পরিবর্তিত
- `src/pages/CourseDetail.tsx` — hardcoded fallback সরানো, PaymentSelector ব্যবহার
- `src/pages/BookDetail.tsx` — same (digital book অংশের জন্য)
- `src/pages/QuizPage.tsx` — same
- `src/pages/LandingPage.tsx` — already MFS-only check করে; SSL integrate করা হবে
- `src/pages/admin/AdminPayments.tsx` — empty state warning banner
- `src/components/SslczPayButton.tsx` — internal logic PaymentSelector-এ merge হবে; component deprecated/removed

---

## টেকনিক্যাল বিস্তারিত

### PaymentSelector props API
```ts
interface PaymentSelectorProps {
  productType: "course" | "book" | "quiz";
  productId: string;
  productTitle: string;
  price: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  requireCustomerFields?: boolean;
  onMfsSubmit: (provider: string, transactionId: string) => Promise<void>;
  submitting?: boolean;
}
```

Component নিজে fetch করবে `payment_methods` (active) এবং `public_site_settings` (sslcz_*) — যাতে parent pages-এ duplicate fetch logic না থাকে। পরে cleanup phase-এ parent থেকে এই fetchগুলো সরানো হবে।

### Validation trigger (সংক্ষেপে)
```sql
CREATE FUNCTION public.validate_order_payment_method()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.payment_method::text = 'cod' THEN RETURN NEW; END IF;
  IF NEW.payment_method::text = 'sslcommerz' THEN
    IF NOT EXISTS (SELECT 1 FROM public_site_settings WHERE key='sslcz_enabled' AND value='true')
      THEN RAISE EXCEPTION 'অনলাইন পেমেন্ট বর্তমানে বন্ধ';
    END IF;
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE provider = NEW.payment_method::text AND is_active=true)
    THEN RAISE EXCEPTION 'এই পেমেন্ট পদ্ধতি নিষ্ক্রিয়';
  END IF;
  RETURN NEW;
END$$;
```

(SSLCommerz orders edge function থেকে service-role দিয়ে insert হয়, কিন্তু trigger তখনও validate করবে — `sslcz_enabled=true` থাকলেই pass)।

### বিদ্যমান `payment_method` enum values
পরীক্ষা করতে হবে enum-এ `bkash`, `nagad`, `rocket`, `upay`, `cod`, `sslcommerz` সব আছে কিনা — না থাকলে migration-এ যোগ করা হবে।
