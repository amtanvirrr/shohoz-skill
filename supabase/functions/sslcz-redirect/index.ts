const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "fail";
  const site = url.searchParams.get("site") || "";

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

  const target = `${site || ""}/payment/${status}${tranId ? `?order=${encodeURIComponent(tranId)}` : ""}`;

  // 303 redirect for POST → GET
  return new Response(null, {
    status: 303,
    headers: { ...corsHeaders, Location: target },
  });
});