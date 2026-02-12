import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Map courier-specific statuses to our unified statuses
function mapStatus(courier: string, rawStatus: string): string {
  const s = rawStatus?.toLowerCase() || "";

  // Delivered
  if (["delivered", "delivered_approved", "completed", "Success"].some((k) => s.includes(k.toLowerCase()))) {
    return "delivered";
  }
  // Cancelled / Returned
  if (["cancel", "returned", "return", "failed", "expired"].some((k) => s.includes(k.toLowerCase()))) {
    return "cancelled";
  }
  // In transit
  if (["in_transit", "in transit", "picked", "pickup", "on_the_way", "at_hub", "sorting", "assigned", "accepted"].some((k) => s.includes(k.toLowerCase()))) {
    return "in_transit";
  }
  // Pending at courier
  if (["pending", "unknown", "processing"].some((k) => s.includes(k.toLowerCase()))) {
    return "pending_pickup";
  }

  return rawStatus || "unknown";
}

// Map courier status to our order status
function mapToOrderStatus(courierStatus: string): string | null {
  if (courierStatus === "delivered") return "delivered";
  if (courierStatus === "cancelled") return "cancelled";
  return null; // Don't change order status for in-transit etc.
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all orders that have been sent to courier but not yet delivered/cancelled
    const { data: orders, error: fetchErr } = await supabase
      .from("orders")
      .select("*")
      .not("courier_provider", "is", null)
      .not("courier_tracking_id", "is", null)
      .not("courier_status", "in", '("delivered","cancelled")');

    if (fetchErr) {
      console.error("Fetch orders error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!orders || orders.length === 0) {
      return new Response(JSON.stringify({ message: "No orders to check", updated: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all courier credentials
    const credKeys = [
      "steadfast_api_key", "steadfast_secret_key",
      "pathao_client_id", "pathao_client_secret", "pathao_username", "pathao_password",
      "redx_api_token",
    ];
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", credKeys);

    const creds: Record<string, string> = {};
    settings?.forEach((s: any) => { creds[s.key] = s.value; });

    // Cache Pathao token
    let pathaoToken: string | null = null;

    const getPathaoToken = async (): Promise<string | null> => {
      if (pathaoToken) return pathaoToken;
      if (!creds.pathao_client_id || !creds.pathao_client_secret || !creds.pathao_username || !creds.pathao_password) return null;
      try {
        const res = await fetch("https://api-hermes.pathao.com/aladdin/api/v1/issue-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: creds.pathao_client_id,
            client_secret: creds.pathao_client_secret,
            username: creds.pathao_username,
            password: creds.pathao_password,
            grant_type: "password",
          }),
        });
        const data = await res.json();
        pathaoToken = data.token || data.access_token || null;
        return pathaoToken;
      } catch (e) {
        console.error("Pathao token error:", e);
        return null;
      }
    };

    let updated = 0;
    const results: any[] = [];

    for (const order of orders) {
      const courier = order.courier_provider;
      const trackingId = order.courier_tracking_id;
      const consignmentId = order.courier_consignment_id;
      let rawStatus = "";

      try {
        if (courier === "steadfast") {
          if (!creds.steadfast_api_key || !creds.steadfast_secret_key) continue;
          const res = await fetch(
            `https://portal.steadfast.com.bd/api/v1/status_by_cid/${consignmentId}`,
            {
              headers: {
                "Api-Key": creds.steadfast_api_key,
                "Secret-Key": creds.steadfast_secret_key,
              },
            }
          );
          const data = await res.json();
          rawStatus = data?.delivery_status || data?.status || "";
        } else if (courier === "pathao") {
          const token = await getPathaoToken();
          if (!token) continue;
          const res = await fetch(
            `https://api-hermes.pathao.com/aladdin/api/v1/orders/${consignmentId}`,
            {
              headers: { "Authorization": `Bearer ${token}` },
            }
          );
          const data = await res.json();
          rawStatus = data?.data?.order_status || "";
        } else if (courier === "redx") {
          if (!creds.redx_api_token) continue;
          const res = await fetch(
            `https://openapi.redx.com.bd/v1.0.0-beta/parcel/track/${trackingId}`,
            {
              headers: {
                "API-ACCESS-TOKEN": `Bearer ${creds.redx_api_token}`,
              },
            }
          );
          const data = await res.json();
          // Get last status from tracking array
          const tracking = data?.tracking || [];
          rawStatus = tracking.length > 0 ? tracking[tracking.length - 1]?.status || "" : data?.current_status || "";
        }

        if (!rawStatus) continue;

        const mappedCourierStatus = mapStatus(courier!, rawStatus);
        const mappedOrderStatus = mapToOrderStatus(mappedCourierStatus);

        // Only update if status changed
        if (mappedCourierStatus !== order.courier_status) {
          const updateData: any = { courier_status: mappedCourierStatus };
          if (mappedOrderStatus) {
            updateData.status = mappedOrderStatus;
          }
          await supabase.from("orders").update(updateData).eq("id", order.id);
          updated++;
          results.push({ order_id: order.order_id, courier, old: order.courier_status, new: mappedCourierStatus });
        }
      } catch (err) {
        console.error(`Error checking ${courier} order ${order.order_id}:`, err);
      }
    }

    console.log(`Checked ${orders.length} orders, updated ${updated}`);

    return new Response(
      JSON.stringify({ message: `Checked ${orders.length}, updated ${updated}`, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-courier-status error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
