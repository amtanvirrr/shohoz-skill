# SSLCommerz পেমেন্ট ফ্লো অপটিমাইজেশন প্ল্যান

বর্তমান ফ্লো বিশ্লেষণ করে যে issueগুলো পেলাম এবং যেগুলো ঠিক করব:

## যা পেয়েছি

1. **৳1 অর্ডার fail হয়েছে গেটওয়ে থেকে** — SSL response: `"The minimum transaction amount is not allowed as per admin configuration!"`। অর্থাৎ আপনার live store-এ SSL panel থেকে minimum ৳10 (বা তার বেশি) সেট করা আছে। SSL API spec-এ ৳1 allowed হলেও merchant account-level minimum SSL admin panel থেকে আলাদাভাবে কনফিগার হয়। এই minimum কোডে override করা সম্ভব না — তবে এটা নিয়ে UX ও সঠিক error message অনেক ভাল করা যায়।
2. **Init-এ fail হলে `orders.notes` লেখা হয় না** — শুধু redirect এ গিয়ে fail হলে notes লেখা হয়। ফলে admin dashboard / PaymentResult-এ "ব্যর্থতার কারণ" অংশ ফাঁকা থাকে।
3. **Init failure HTTP 200** রিটার্ন করে `{error,...}` সহ — ক্লায়েন্ট পড়তে পারলেও observability/standard semantic হিসেবে 400 ভাল।
4. **`sslcz_min_amount` ডিফল্ট কোডে ১০, DB-তে ৩০** — মিল নেই। কোডের ডিফল্ট কম রেখে admin-set value-কে authoritative করি; gateway থেকে যদি "minimum transaction amount" failedreason আসে তাহলে UI-তে স্পষ্টভাবে "এটি গেটওয়ে কনফিগারেশন থেকে নির্ধারিত — অন্য পদ্ধতি ব্যবহার করুন" বলবে।
5. **Duplicate pending orders** — ব্যবহারকারী একটু পরপর ক্লিক করলে multiple pending order তৈরি হয়। যদি একই (user, product, price) এর জন্য ৩০ মিনিটের মধ্যে existing pending order থাকে এবং gateway URL valid থাকে, সেটা reuse করব।
6. **`cus_email` ডিফল্ট `noemail@example.com`** — SSL কখনো এটা rejection-এ ব্যবহার করে। email না থাকলে user.email বা phone-derived placeholder ব্যবহার করব।
7. **Verification timeout (40s)** — slow IPN-এ user "Timeout" দেখে। Polling-কে progressive backoff এবং auto-validator fallback দিয়ে আরো resilient করব।
8. **Validator fallback** — IPN delay হলে PaymentResult থেকে server-এ একটা lightweight `sslcz-verify` call করে validator API-তে check করার সুযোগ রাখব (best-effort, server-only call)।

## যা পরিবর্তন করব

### supabase/functions/sslcz-init/index.ts
- Server-এ existing pending SSL order খুঁজব (same user + product + price + status='pending' + created_at < 30 min) — থাকলে নতুন তৈরি না করে আগের `gateway_session_key` থেকে gateway URL reconstruct করে রিটার্ন করব।
- Gateway init fail হলে: `orders.notes` ফিল্ডে `failedreason` লিখব (বাংলা prefix সহ) যেন PaymentResult পেজে এবং admin order list-এ কারণ দেখা যায়।
- HTTP status 400 দেব gateway init fail-এ (200 না)।
- `cus_email` placeholder: ইমেইল না থাকলে `<phone>@noemail.local` ব্যবহার করব (SSL কম reject করে)।
- `phone` validation: শুধু digits ও + রাখব, length 10–15।
- `customer_address` থাকলে `cus_city` নির্ণয়ের চেষ্টা থাকবে না, "Dhaka" রেখে দেব (SSL এ city required), তবে field cap বাড়াব।

### supabase/functions/sslcz-ipn/index.ts
- Validator response-এ `currency_amount`/`currency_type` না মিললে স্পষ্ট notes লিখে cancel।
- IPN duplicate prevention: যদি `payment_verified=true` থাকে, 200 OK রিটার্ন (আগেই করছি, ঠিক রাখব)।
- `notes` সবসময় meaningful রাখব success/fail উভয় ক্ষেত্রে।

### নতুন supabase/functions/sslcz-verify/index.ts (lightweight)
- Authenticated user নিজের pending order-এর জন্য call করতে পারবে।
- `gateway_session_key` থাকলে validator API-তে query করে success হলে IPN-এর মত order update করবে।
- PaymentResult page polling-এর শেষ চেষ্টায় (timeout হওয়ার আগে) এই function call করবে — IPN delay হলেও user দ্রুত verified হবে।

### src/pages/PaymentResult.tsx
- 40s polling-এর জায়গায় progressive backoff: 2,2,2,3,3,4,4,5… (max ~60s) এবং ১৫s-এ একবার `sslcz-verify` call।
- Success পর্যন্ত `notes` থাকলে subtle হিসেবে দেখানো (currently শুধু fail/cancel-এ)।

### src/components/PaymentSelector.tsx ও SslczPayButton.tsx
- Error mapping: gateway থেকে আসা "minimum transaction amount … as per admin configuration" আলাদা category হিসেবে handle (`gateway_min_amount`) — toast/banner-এ স্পষ্ট বলবে: "এই amount আপনার গেটওয়ে account-এ allowed না, অন্য পদ্ধতি ব্যবহার করুন"।
- Default `sslMinAmount` ১০ → কেবল gateway response দেখে dynamic adjust করব না (security), কিন্তু gateway fail-এর পর local hint দেখাব।
- `mapPaymentError` এ `gateway_min_amount` ও improved fallback যোগ করব।

### src/lib/paymentErrors.ts
- নতুন category `gateway_min_amount` যোগ; "minimum transaction amount … admin configuration" pattern match।

## Technical Details

```text
sslcz-init flow (new):
  auth → validate body
  → look up product (price authoritative)
  → look up active pending order (user, product, price, < 30min)
       found + has gateway_session_key → reuse, return cached gateway_url
       not found → insert pending order
  → call SSL gwprocess
       SUCCESS → save sessionkey/response, return gateway_url
       FAILED  → write notes(failedreason), status=cancelled, return 400 + mapped error

sslcz-verify (new, verify_jwt=true):
  auth → load own pending order with gateway_session_key
  → call SSL validator (val_id absent? skip)
  → if VALID & amount/currency/tran_id match → mirror IPN success path
  → return {verified, status}

PaymentResult polling:
  attempts 1..N with backoff
  every ~15s: call sslcz-verify in parallel
  any success → stop, show receipt
```

## যে ফাইল পরিবর্তন/নতুন তৈরি হবে
- `supabase/functions/sslcz-init/index.ts` (edit)
- `supabase/functions/sslcz-ipn/index.ts` (small notes improvements)
- `supabase/functions/sslcz-verify/index.ts` (new) + `supabase/config.toml` entry (`verify_jwt = true`)
- `src/pages/PaymentResult.tsx` (polling + verify call)
- `src/components/PaymentSelector.tsx` (error category copy)
- `src/components/SslczPayButton.tsx` (sync min/default)
- `src/lib/paymentErrors.ts` (new mapping)

## যা পরিবর্তন করব না
- DB schema (নতুন column লাগবে না — সব existing field দিয়ে চলবে)।
- Min amount কোডে hardcode override (gateway-side limit আপনাকে SSL panel থেকে কমাতে হবে — এটা আমরা bypass করতে পারি না)।

কনফার্ম করলে implement শুরু করব।