

# Steadfast, Pathao, RedX কুরিয়ার ইন্টিগ্রেশন প্ল্যান

## সারসংক্ষেপ

অ্যাডমিন প্যানেলের অর্ডার পেজ থেকে সরাসরি Steadfast, Pathao এবং RedX কুরিয়ারে পার্সেল/অর্ডার পাঠানোর সুবিধা তৈরি করা হবে। অ্যাডমিন সেটিংসে প্রতিটি কুরিয়ারের API credentials কনফিগার করা যাবে এবং অর্ডার লিস্ট থেকে এক ক্লিকে কুরিয়ারে পাঠানো যাবে।

---

## প্রতিটি কুরিয়ারের API তথ্য

### 1. Steadfast Courier
- **Base URL:** `https://portal.steadfast.com.bd/api/v1`
- **Authentication:** `Api-Key` + `Secret-Key` হেডারে পাঠাতে হয়
- **Create Order:** `POST /create_order`
  - Parameters: `invoice`, `recipient_name`, `recipient_phone`, `recipient_address`, `cod_amount`, `note`
  - Response: `consignment_id`, `tracking_code`, `status`
- **Credentials প্রয়োজন:** API Key, Secret Key (Steadfast Portal থেকে পাওয়া যায়)

### 2. Pathao Courier
- **Base URL:** `https://api-hermes.pathao.com` (Production)
- **Authentication:** OAuth2 - `client_id`, `client_secret`, `username`, `password` দিয়ে Access Token নিতে হয়
- **Token Endpoint:** `POST /aladdin/api/v1/issue-token`
- **Create Order:** `POST /aladdin/api/v1/orders`
  - Parameters: `store_id`, `merchant_order_id`, `recipient_name`, `recipient_phone`, `recipient_address`, `recipient_city`, `recipient_zone`, `recipient_area`, `delivery_type` (48=normal), `item_type` (2=parcel), `item_quantity`, `item_weight`, `amount_to_collect`
- **Credentials প্রয়োজন:** Client ID, Client Secret, Username (email), Password

### 3. RedX Courier
- **Base URL:** `https://openapi.redx.com.bd/v1.0.0-beta`
- **Authentication:** `API-ACCESS-TOKEN: Bearer <token>` হেডারে পাঠাতে হয়
- **Create Parcel:** `POST /parcel`
  - Parameters: `customer_name`, `customer_phone`, `delivery_area`, `delivery_area_id`, `customer_address`, `cash_collection_amount`, `parcel_weight`, `merchant_invoice_id`, `value`, `pickup_store_id`
  - Response: `tracking_id`
- **Credentials প্রয়োজন:** API Access Token (RedX Developer Panel থেকে)

---

## ইমপ্লিমেন্টেশন স্টেপস

### Step 1: Database Migration
`orders` টেবিলে নতুন কলাম যোগ করা হবে:
- `courier_provider` (text, nullable) -- steadfast / pathao / redx
- `courier_tracking_id` (text, nullable) -- কুরিয়ারের tracking ID
- `courier_consignment_id` (text, nullable) -- কুরিয়ারের consignment/order ID
- `courier_status` (text, nullable) -- কুরিয়ারের ডেলিভারি স্ট্যাটাস
- `courier_sent_at` (timestamptz, nullable) -- কুরিয়ারে পাঠানোর সময়

### Step 2: Admin Settings UI আপডেট
Settings পেজে "Courier Integration" প্লেসহোল্ডারটি রিপ্লেস করে তিনটি কুরিয়ারের জন্য আলাদা সেকশন:

- **Steadfast:** API Key, Secret Key ইনপুট ফিল্ড
- **Pathao:** Client ID, Client Secret, Username, Password ইনপুট ফিল্ড + Default Store ID
- **RedX:** API Access Token ইনপুট ফিল্ড + Default Pickup Store ID

সব credentials `site_settings` টেবিলে সেভ হবে।

### Step 3: Edge Function তৈরি — `send-to-courier`
একটি Edge Function যা:
1. Order ID এবং selected courier provider (steadfast/pathao/redx) রিসিভ করবে
2. `site_settings` থেকে সেই কুরিয়ারের credentials ফেচ করবে
3. কুরিয়ারের API কল করে পার্সেল তৈরি করবে
4. প্রাপ্ত tracking ID দিয়ে `orders` টেবিল আপডেট করবে
5. সফল/ব্যর্থ রেসপন্স রিটার্ন করবে

### Step 4: Admin Orders UI আপডেট
অর্ডার টেবিলে নতুন ফিচার:
- প্রতিটি অর্ডারের Actions কলামে **"কুরিয়ারে পাঠান"** বাটন (শুধু physical book অর্ডারের জন্য, যেগুলো এখনো কুরিয়ারে পাঠানো হয়নি)
- বাটনে ক্লিক করলে একটি ড্রপডাউন/ডায়ালগ আসবে — Steadfast, Pathao, বা RedX সিলেক্ট করা যাবে
- কুরিয়ারে পাঠানোর পরে tracking ID দেখাবে (ক্লিকেবল লিংক)
- কুরিয়ার স্ট্যাটাস কলাম যোগ হবে

---

## টেকনিক্যাল ডিটেইলস

### Edge Function: `send-to-courier/index.ts`

```text
Request: POST { orderId, courier: "steadfast" | "pathao" | "redx" }

Flow:
1. Fetch order details from orders table
2. Fetch courier credentials from site_settings
3. Switch by courier provider:
   - Steadfast: POST to /create_order with Api-Key + Secret-Key headers
   - Pathao: First get token via /issue-token, then POST to /orders
   - RedX: POST to /parcel with API-ACCESS-TOKEN header
4. Update orders table with tracking info
5. Return { success, tracking_id }
```

### site_settings এ নতুন keys:
- `steadfast_api_key`, `steadfast_secret_key`
- `pathao_client_id`, `pathao_client_secret`, `pathao_username`, `pathao_password`, `pathao_store_id`
- `redx_api_token`, `redx_pickup_store_id`

### ফাইল পরিবর্তনের তালিকা:
1. **নতুন মাইগ্রেশন** — orders টেবিলে courier কলাম যোগ
2. **`supabase/functions/send-to-courier/index.ts`** — নতুন Edge Function
3. **`supabase/config.toml`** — নতুন ফাংশন রেজিস্ট্রেশন
4. **`src/pages/admin/AdminSettings.tsx`** — Courier credentials UI
5. **`src/pages/admin/AdminOrders.tsx`** — কুরিয়ারে পাঠানোর বাটন ও ট্র্যাকিং তথ্য

---

## ইউজারের কাছ থেকে কি দরকার

ইমপ্লিমেন্টেশনের জন্য কোনো API key এখনই দরকার নেই। সব credentials অ্যাডমিন সেটিংস পেজ থেকে কনফিগার করা যাবে এবং ডাটাবেসে সেভ থাকবে। তবে ব্যবহার করতে হলে আপনাকে প্রতিটি কুরিয়ারের Merchant Panel থেকে API credentials সংগ্রহ করতে হবে:

- **Steadfast:** portal.steadfast.com.bd → API Settings
- **Pathao:** merchant.pathao.com → Developer API
- **RedX:** redx.com.bd → Developer API

