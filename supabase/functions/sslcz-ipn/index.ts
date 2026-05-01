import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    let payload: Record<string, string> = {};
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (payload[k] = String(v)));
    }

    const tranId = payload.tran_id;
    const valId = payload.val_id;
    const status = payload.status;
    const ipnStoreId = payload.store_id;
    if (!tranId) return new Response("missing tran_id", { status: 400, headers: corsHeaders });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE);

    // Load credentials FIRST so we can verify store_id matches before trusting payload
    const { data: settingsRows } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["sslcz_store_id", "sslcz_store_password", "sslcz_mode"]);
    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((r: any) => (settings[r.key] = r.value));

    if (!settings.sslcz_store_id || !settings.sslcz_store_password) {
      return new Response("gateway not configured", { status: 503, headers: corsHeaders });
    }
    if (ipnStoreId && ipnStoreId !== settings.sslcz_store_id) {
      return new Response("store_id mismatch", { status: 401, headers: corsHeaders });
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, order_id, price, status, payment_verified")
      .eq("order_id", tranId)
      .maybeSingle();

    if (!order) return new Response("order not found", { status: 404, headers: corsHeaders });
    if (order.payment_verified) return new Response("already verified", { headers: corsHeaders });

    if (status !== "VALID" && status !== "VALIDATED") {
      await admin.from("orders").update({
        status: "cancelled",
        gateway_response: payload,
        gateway_tran_id: tranId,
      }).eq("id", order.id);
      return new Response("payment failed", { headers: corsHeaders });
    }

    if (!valId) return new Response("missing val_id", { status: 400, headers: corsHeaders });

    // Server-side validation against SSLCOMMERZ validator
    const isLive = settings.sslcz_mode === "live";
    const baseUrl = isLive ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

    const u = new URL(`${baseUrl}/validator/api/validationserverAPI.php`);
    u.searchParams.set("val_id", valId);
    u.searchParams.set("store_id", settings.sslcz_store_id);
    u.searchParams.set("store_passwd", settings.sslcz_store_password);
    u.searchParams.set("format", "json");

    const vResp = await fetch(u.toString());
    const vData = await vResp.json();

    const verified = (vData.status === "VALID" || vData.status === "VALIDATED") &&
      vData.tran_id === tranId &&
      Number(vData.amount) >= Number(order.price) &&
      vData.currency === "BDT";

    if (!verified) {
      await admin.from("orders").update({
        status: "cancelled",
        is_fraud_flagged: Number(vData.amount) < Number(order.price),
        gateway_response: vData,
        gateway_tran_id: tranId,
        gateway_val_id: valId,
      }).eq("id", order.id);
      return new Response("validation failed", { headers: corsHeaders });
    }

    await admin.from("orders").update({
      status: "confirmed",
      payment_verified: true,
      transaction_id: vData.bank_tran_id || valId,
      gateway_tran_id: tranId,
      gateway_val_id: valId,
      gateway_response: vData,
    }).eq("id", order.id);

    // Notify (best-effort, non-blocking)
    fetch(`${SUPABASE_URL}/functions/v1/notify-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({ orderId: order.order_id }),
    }).catch(() => {});

    return new Response("ok", { headers: corsHeaders });
  } catch (e) {
    return new Response(`error: ${(e as Error).message}`, { status: 500, headers: corsHeaders });
  }
});