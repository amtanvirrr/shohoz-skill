import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EVENTS = [
  "PageView", "ViewContent", "Purchase", "Lead",
  "AddToCart", "InitiateCheckout", "CompleteRegistration",
  "Search", "AddPaymentInfo", "Subscribe",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch pixel config from site_settings
    const { data: settings } = await sb
      .from("site_settings")
      .select("key, value")
      .in("key", ["facebook_pixel_id", "facebook_capi_token", "facebook_test_event_code"]);

    const cfg: Record<string, string> = {};
    settings?.forEach((r: any) => { cfg[r.key] = r.value; });

    const pixelId = cfg.facebook_pixel_id;
    const capiToken = cfg.facebook_capi_token;

    if (!pixelId || !capiToken) {
      return new Response(JSON.stringify({ error: "Pixel ID or CAPI token not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate input
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event_name, event_id, params, user_data } = body;

    // Validate event_name
    if (!event_name || typeof event_name !== "string" || !ALLOWED_EVENTS.includes(event_name)) {
      return new Response(JSON.stringify({ error: "Invalid event_name. Allowed: " + ALLOWED_EVENTS.join(", ") }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate event_id
    if (!event_id || typeof event_id !== "string" || event_id.length > 100) {
      return new Response(JSON.stringify({ error: "Invalid event_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventData: any = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      action_source: "website",
      event_source_url: params?.source_url || undefined,
      user_data: {
        client_ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || undefined,
        client_user_agent: req.headers.get("user-agent") || undefined,
        ...(user_data || {}),
      },
    };

    // Add custom data (e.g. Purchase value, content_ids)
    if (params) {
      const { source_url, ...customData } = params;
      if (Object.keys(customData).length > 0) {
        eventData.custom_data = customData;
      }
    }

    // Build request URL
    let url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${capiToken}`;
    const testEventCode = cfg.facebook_test_event_code;
    if (testEventCode) {
      url += `&test_event_code=${encodeURIComponent(testEventCode)}`;
    }

    const fbResponse = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [eventData] }),
    });

    const fbResult = await fbResponse.json();

    return new Response(JSON.stringify({ success: true, fb_response: fbResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
