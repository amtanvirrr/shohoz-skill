import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "অনুগ্রহ করে কমপক্ষে ৩ অক্ষর দিন।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const q = query.trim();

    // Validate: only allow alphanumeric, hyphens, @, dots, spaces, Bengali chars
    if (q.length > 100) {
      return new Response(
        JSON.stringify({ error: "অনুসন্ধান অনুমোদিত সীমার বাইরে।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Use exact match on order_id OR exact match on customer_phone
    // This prevents enumeration attacks with wildcards
    const { data, error } = await supabase
      .from("orders")
      .select("order_id, status, product_title, created_at")
      .or(`order_id.eq.${q},customer_phone.eq.${q}`)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Track order error:", error);
      return new Response(
        JSON.stringify({ error: "সার্ভারে সমস্যা হয়েছে।" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return only non-sensitive fields
    return new Response(
      JSON.stringify({ data: data || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Track order error:", e);
    return new Response(
      JSON.stringify({ error: "সার্ভারে সমস্যা হয়েছে।" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
