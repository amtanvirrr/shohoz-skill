import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

// Allowlist of site origins we'll redirect users to after payment.
// Any value not in this list is ignored (defense against open-redirect via crafted gateway responses).
const ALLOWED_HOSTS = [
  "shohozskill.com.bd",
  "www.shohozskill.com.bd",
  "shohozskill.lovable.app",
];
const ALLOWED_HOST_SUFFIXES = [".lovable.app", ".lovable.dev"];
const FALLBACK_SITE = "https://shohozskill.com.bd";

function safeSite(raw: string): string {
  if (!raw) return FALLBACK_SITE;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return FALLBACK_SITE;
    const host = u.hostname.toLowerCase();
    if (ALLOWED_HOSTS.includes(host)) return `${u.protocol}//${u.host}`;
    if (ALLOWED_HOST_SUFFIXES.some((s) => host.endsWith(s))) return `${u.protocol}//${u.host}`;
    return FALLBACK_SITE;
  } catch {
    return FALLBACK_SITE;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const rawStatus = url.searchParams.get("status") || "fail";
  const status = ["success", "fail", "cancel"].includes(rawStatus) ? rawStatus : "fail";
  const site = safeSite(url.searchParams.get("site") || "");

  // Read tran_id from POST body or query
  let tranId = url.searchParams.get("tran_id") || "";
  if (!tranId && req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/x-www-form-urlencoded") || ct.includes("multipart/form-data")) {
        const form = await req.formData();
        tranId = String(form.get("tran_id") || "");
      } else if (ct.includes("application/json")) {
        const body = await req.json();
        tranId = body.tran_id || "";
      }
    } catch { /* ignore */ }
  }

  // Sanitize tran_id to printable safe chars only (our order_id format is ORD-XXXXXXXX)
  const safeTran = tranId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64);

  // Safety net: if gateway reports fail/cancel, mark the pending order as cancelled
  // immediately (do not wait for IPN). Never downgrade a confirmed/verified order.
  if (safeTran && (status === "fail" || status === "cancel")) {
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SERVICE) {
        const admin = createClient(SUPABASE_URL, SERVICE);
        const { data: order } = await admin
          .from("orders")
          .select("id, status, payment_verified")
          .eq("order_id", safeTran)
          .maybeSingle();
        if (order && !order.payment_verified && order.status !== "confirmed" && order.status !== "delivered") {
          await admin
            .from("orders")
            .update({
              status: "cancelled",
              gateway_tran_id: safeTran,
              notes: status === "cancel"
                ? "ব্যবহারকারী পেমেন্ট বাতিল করেছেন"
                : "পেমেন্ট গেটওয়েতে ব্যর্থ হয়েছে",
            })
            .eq("id", order.id);
        }
      }
    } catch { /* swallow — redirect must always proceed */ }
  }

  const target = `${site}/payment/${status}${safeTran ? `?order=${encodeURIComponent(safeTran)}` : ""}`;

  // 303 redirect for POST → GET
  return new Response(null, {
    status: 303,
    headers: { ...corsHeaders, Location: target },
  });
});