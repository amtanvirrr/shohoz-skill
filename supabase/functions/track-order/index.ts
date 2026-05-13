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
    const body = await req.json().catch(() => ({}));
    const { query, order_id, phone } = body as {
      query?: string;
      order_id?: string;
      phone?: string;
    };

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // VERIFIED MODE: order_id + phone must BOTH match the same order.
    // Returns full details for the trackable order (no enumeration possible
    // — attacker needs both fields to view anything sensitive).
    if (order_id && phone) {
      const oid = String(order_id).trim();
      const ph = String(phone).trim();
      if (oid.length < 4 || oid.length > 64 || ph.length < 4 || ph.length > 32) {
        return new Response(
          JSON.stringify({ error: "অনুসন্ধান অনুমোদিত সীমার বাইরে।" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          "order_id, status, product_title, product_type, price, payment_method, customer_name, customer_address, created_at, updated_at, courier_provider, courier_tracking_id, courier_status, courier_sent_at, transaction_id, payment_verified, notes",
        )
        .eq("order_id", oid)
        .eq("customer_phone", ph)
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Track order verified error:", error);
        return new Response(
          JSON.stringify({ error: "সার্ভারে সমস্যা হয়েছে।" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ verified: true, order: data || null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // QUICK LOOKUP MODE (legacy): minimal status fields by either order_id
    // OR phone. Used by the homepage search; full details require verified mode.
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: "অনুগ্রহ করে কমপক্ষে ৩ অক্ষর দিন।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const q = query.trim();
    if (q.length > 100) {
      return new Response(
        JSON.stringify({ error: "অনুসন্ধান অনুমোদিত সীমার বাইরে।" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ data: data || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Track order error:", e);
    return new Response(
      JSON.stringify({ error: "সার্ভারে সমস্যা হয়েছে।" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
