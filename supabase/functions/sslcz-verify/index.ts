import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Best-effort fallback verifier for SSLCommerz orders. Used when the IPN is
 * delayed and we want to confirm the user's payment without waiting forever.
 * The user must own the order. We query SSL's session-status API by tran_id
 * (the merchant-side order id) and only mark the order paid if SSL returns
 * VALID/VALIDATED with matching amount + currency.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: u, error: uErr } = await userClient.auth.getUser(token);
    if (uErr || !u?.user) return json({ error: "Unauthorized" }, 401);
    const userId = u.user.id;

    let orderIdInput = "";
    try {
      const body = await req.json();
      orderIdInput = String(body?.order_id || "").trim();
    } catch { /* ignore */ }
    if (!orderIdInput) return json({ error: "order_id required" }, 400);
    const safeOrder = orderIdInput.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);
    if (!safeOrder) return json({ error: "Invalid order_id" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { data: order } = await admin
      .from("orders")
      .select("id, order_id, user_id, price, status, payment_verified, payment_method")
      .eq("order_id", safeOrder)
      .maybeSingle();

    if (!order || order.user_id !== userId) return json({ error: "Not found" }, 404);
    if (order.payment_method !== "sslcommerz") return json({ verified: false, reason: "not_ssl" });
    if (order.payment_verified) return json({ verified: true, reason: "already_verified" });

    // Load credentials
    const { data: settingsRows } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["sslcz_store_id", "sslcz_store_password", "sslcz_mode"]);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (settings[r.key] = r.value));
    if (!settings.sslcz_store_id || !settings.sslcz_store_password) {
      return json({ verified: false, reason: "gateway_not_configured" });
    }

    const isLive = settings.sslcz_mode === "live";
    const baseUrl = isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

    // Use transaction-id query — works without val_id and only queries our own tran.
    const u2 = new URL(`${baseUrl}/validator/api/merchantTransIDvalidationAPI.php`);
    u2.searchParams.set("tran_id", order.order_id);
    u2.searchParams.set("store_id", settings.sslcz_store_id);
    u2.searchParams.set("store_passwd", settings.sslcz_store_password);
    u2.searchParams.set("v", "1");
    u2.searchParams.set("format", "json");

    let v: any;
    try {
      const r = await fetch(u2.toString());
      v = await r.json();
    } catch (e) {
      return json({ verified: false, reason: `network: ${(e as Error).message}` });
    }

    // The endpoint returns { no_of_trans_found, element: [...] }
    const elements = Array.isArray(v?.element) ? v.element : [];
    const match = elements.find((el: any) =>
      el?.tran_id === order.order_id &&
      (el?.status === "VALID" || el?.status === "VALIDATED") &&
      Number(el?.amount) >= Number(order.price) &&
      el?.currency_type === "BDT"
    );

    if (!match) {
      const anyEl = elements.find((el: any) => el?.tran_id === order.order_id);
      return json({
        verified: false,
        reason: anyEl?.status ? `gateway_status:${anyEl.status}` : "no_match",
      });
    }

    await admin.from("orders").update({
      status: "confirmed",
      payment_verified: true,
      transaction_id: match.bank_tran_id || match.val_id || null,
      gateway_tran_id: match.tran_id,
      gateway_val_id: match.val_id || null,
      gateway_response: match,
      notes: "validator API দিয়ে যাচাই সম্পন্ন",
    }).eq("id", order.id);

    // Best-effort notify
    fetch(`${SUPABASE_URL}/functions/v1/notify-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({ orderId: order.order_id }),
    }).catch(() => {});

    return json({ verified: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});