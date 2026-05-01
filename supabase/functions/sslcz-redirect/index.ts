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
  const target = `${site}/payment/${status}${safeTran ? `?order=${encodeURIComponent(safeTran)}` : ""}`;

  // 303 redirect for POST → GET
  return new Response(null, {
    status: 303,
    headers: { ...corsHeaders, Location: target },
  });
});