import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    const { event_name, event_id, params, user_data } = await req.json();

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
      url += `&test_event_code=${testEventCode}`;
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
