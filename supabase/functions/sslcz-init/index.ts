import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InitBody {
  product_type: "course" | "book" | "quiz";
  product_id: string;
  product_title: string;
  price: number; // client-suggested; will be re-validated server-side
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as InitBody;
    if (!body?.product_id || !body?.product_type || !body?.customer_name || !body?.customer_phone) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (!["course", "book", "quiz"].includes(body.product_type)) {
      return json({ error: "Invalid product_type" }, 400);
    }
    // Basic input length caps to avoid abuse
    if (body.customer_name.length > 200 || body.customer_phone.length > 30) {
      return json({ error: "Invalid customer fields" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // SERVER-SIDE PRICE LOOKUP — never trust client price
    const tableMap: Record<string, string> = { course: "courses", book: "books", quiz: "quizzes" };
    const tbl = tableMap[body.product_type];
    const { data: product, error: pErr } = await admin
      .from(tbl)
      .select("id, price, is_published, title")
      .eq("id", body.product_id)
      .maybeSingle();
    if (pErr || !product) return json({ error: "Product not found" }, 404);
    if (!product.is_published) return json({ error: "Product not available" }, 400);

    const serverPrice = Number(product.price) || 0;
    if (serverPrice <= 0) return json({ error: "Product is free or unpriced" }, 400);

    // Allow physical book shipping uplift: client price may be >= server price (never less)
    const finalPrice = body.product_type === "book" && Number(body.price) > serverPrice
      ? Math.floor(Number(body.price))
      : serverPrice;
    const productTitle = (product.title || body.product_title || "").toString().slice(0, 200);

    // Load SSLCOMMERZ settings (admin-only table — service role bypasses RLS)
    const { data: settingsRows } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["sslcz_store_id", "sslcz_store_password", "sslcz_mode", "sslcz_enabled"]);

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (settings[r.key] = r.value));

    if (settings.sslcz_enabled !== "true") return json({ error: "SSLCOMMERZ not enabled" }, 400);
    if (!settings.sslcz_store_id || !settings.sslcz_store_password) {
      return json({ error: "SSLCOMMERZ credentials not configured" }, 400);
    }
    const isLive = settings.sslcz_mode === "live";
    const baseUrl = isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

    // Create order (pending)
    const { data: order, error: oErr } = await admin
      .from("orders")
      .insert({
        user_id: userId,
        product_id: body.product_id,
        product_type: body.product_type,
        product_title: productTitle,
        price: finalPrice,
        customer_name: body.customer_name,
        customer_phone: body.customer_phone,
        customer_email: body.customer_email || null,
        customer_address: body.customer_address || null,
        payment_method: "sslcommerz",
        status: "pending",
        payment_verified: false,
      })
      .select("id, order_id")
      .single();

    if (oErr || !order) return json({ error: oErr?.message || "Order create failed" }, 500);

    // Build site URL for redirects
    const origin = req.headers.get("origin") || req.headers.get("referer")?.replace(/\/$/, "") || "";
    const fnBase = `${SUPABASE_URL}/functions/v1`;

    const params = new URLSearchParams();
    params.set("store_id", settings.sslcz_store_id);
    params.set("store_passwd", settings.sslcz_store_password);
    params.set("total_amount", String(finalPrice));
    params.set("currency", "BDT");
    params.set("tran_id", order.order_id);
    params.set("success_url", `${fnBase}/sslcz-redirect?status=success&site=${encodeURIComponent(origin)}`);
    params.set("fail_url", `${fnBase}/sslcz-redirect?status=fail&site=${encodeURIComponent(origin)}`);
    params.set("cancel_url", `${fnBase}/sslcz-redirect?status=cancel&site=${encodeURIComponent(origin)}`);
    params.set("ipn_url", `${fnBase}/sslcz-ipn`);
    params.set("cus_name", body.customer_name);
    params.set("cus_email", body.customer_email || "noemail@example.com");
    params.set("cus_phone", body.customer_phone);
    params.set("cus_add1", body.customer_address || "N/A");
    params.set("cus_city", "Dhaka");
    params.set("cus_country", "Bangladesh");
    params.set("shipping_method", body.product_type === "book" ? "Courier" : "NO");
    params.set("product_name", productTitle);
    params.set("product_category", body.product_type);
    params.set("product_profile", body.product_type === "book" ? "physical-goods" : "non-physical-goods");
    params.set("num_of_item", "1");

    const resp = await fetch(`${baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await resp.json();

    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      await admin.from("orders").update({
        status: "cancelled",
        gateway_response: data,
      }).eq("id", order.id);
      return json({ error: data.failedreason || "Gateway init failed", details: data }, 200);
    }

    await admin.from("orders").update({
      gateway_session_key: data.sessionkey,
      gateway_response: data,
    }).eq("id", order.id);

    return json({ gateway_url: data.GatewayPageURL, order_id: order.order_id });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}