import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { orderId, courier } = await req.json();
    if (!orderId || !courier) {
      return new Response(JSON.stringify({ error: "orderId and courier required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch courier credentials from site_settings
    const credentialKeys: Record<string, string[]> = {
      steadfast: ["steadfast_api_key", "steadfast_secret_key"],
      pathao: ["pathao_client_id", "pathao_client_secret", "pathao_username", "pathao_password", "pathao_store_id"],
      redx: ["redx_api_token", "redx_pickup_store_id"],
    };

    const keys = credentialKeys[courier];
    if (!keys) {
      return new Response(JSON.stringify({ error: "Invalid courier provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", keys);

    const creds: Record<string, string> = {};
    settings?.forEach((s: any) => { creds[s.key] = s.value; });

    let trackingId = "";
    let consignmentId = "";

    // Parse COD amount
    const codAmount = order.payment_method === "cod" ? order.price : 0;

    if (courier === "steadfast") {
      const apiKey = creds.steadfast_api_key;
      const secretKey = creds.steadfast_secret_key;
      if (!apiKey || !secretKey) {
        return new Response(JSON.stringify({ error: "Steadfast API credentials not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://portal.steadfast.com.bd/api/v1/create_order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": apiKey,
          "Secret-Key": secretKey,
        },
        body: JSON.stringify({
          invoice: order.order_id,
          recipient_name: order.customer_name,
          recipient_phone: order.customer_phone,
          recipient_address: order.customer_address || "",
          cod_amount: codAmount,
          note: order.notes || "",
        }),
      });

      const result = await res.json();
      console.log("Steadfast response:", JSON.stringify(result));

      if (result.status === 200 || result.consignment?.consignment_id) {
        consignmentId = String(result.consignment?.consignment_id || "");
        trackingId = String(result.consignment?.tracking_code || consignmentId);
      } else {
        return new Response(JSON.stringify({ error: result.message || "Steadfast API error", details: result }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (courier === "pathao") {
      const clientId = creds.pathao_client_id;
      const clientSecret = creds.pathao_client_secret;
      const username = creds.pathao_username;
      const password = creds.pathao_password;
      const storeId = creds.pathao_store_id;

      if (!clientId || !clientSecret || !username || !password) {
        return new Response(JSON.stringify({ error: "Pathao API credentials not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get access token
      const tokenRes = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/issue-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          username: username,
          password: password,
          grant_type: "password",
        }),
      });

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.token || tokenData.access_token;
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Pathao token failed", details: tokenData }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create order
      const orderRes = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          store_id: parseInt(storeId || "0"),
          merchant_order_id: order.order_id,
          recipient_name: order.customer_name,
          recipient_phone: order.customer_phone,
          recipient_address: order.customer_address || "",
          recipient_city: 1,
          recipient_zone: 1,
          delivery_type: 48,
          item_type: 2,
          item_quantity: 1,
          item_weight: 0.5,
          amount_to_collect: codAmount,
          item_description: order.product_title,
        }),
      });

      const orderResult = await orderRes.json();
      console.log("Pathao response:", JSON.stringify(orderResult));

      if (orderResult.data?.consignment_id) {
        consignmentId = String(orderResult.data.consignment_id);
        trackingId = consignmentId;
      } else {
        return new Response(JSON.stringify({ error: orderResult.message || "Pathao API error", details: orderResult }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (courier === "redx") {
      const apiToken = creds.redx_api_token;
      const pickupStoreId = creds.redx_pickup_store_id;

      if (!apiToken) {
        return new Response(JSON.stringify({ error: "RedX API token not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const res = await fetch("https://openapi.redx.com.bd/v1.0.0-beta/parcel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "API-ACCESS-TOKEN": `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          delivery_area: order.customer_address || "",
          customer_address: order.customer_address || "",
          merchant_invoice_id: order.order_id,
          cash_collection_amount: codAmount,
          parcel_weight: 500,
          value: order.price,
          ...(pickupStoreId ? { pickup_store_id: parseInt(pickupStoreId) } : {}),
        }),
      });

      const result = await res.json();
      console.log("RedX response:", JSON.stringify(result));

      if (result.tracking_id) {
        trackingId = String(result.tracking_id);
        consignmentId = trackingId;
      } else {
        return new Response(JSON.stringify({ error: result.message || "RedX API error", details: result }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update order with courier info
    await supabase
      .from("orders")
      .update({
        courier_provider: courier,
        courier_tracking_id: trackingId,
        courier_consignment_id: consignmentId,
        courier_status: "dispatched",
        courier_sent_at: new Date().toISOString(),
        status: "shipped",
      } as any)
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ success: true, tracking_id: trackingId, consignment_id: consignmentId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-to-courier error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
