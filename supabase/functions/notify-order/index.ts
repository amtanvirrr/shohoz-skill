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

    const { orderId } = await req.json();
    if (!orderId || typeof orderId !== "string") {
      throw new Error("orderId is required");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch order data from database (server-side verified)
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("order_id, customer_name, customer_phone, customer_email, customer_address, product_title, product_type, price, payment_method, transaction_id, notes")
      .eq("order_id", orderId)
      .single();

    if (orderError || !orderData) {
      console.log("Order not found:", orderId);
      return new Response(
        JSON.stringify({ success: false, reason: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch SMTP settings from site_settings
    const { data: settings } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", [
        "smtp_host",
        "smtp_port",
        "smtp_user",
        "smtp_pass",
        "smtp_from_email",
        "smtp_from_name",
        "admin_notification_email",
      ]);

    const cfg: Record<string, string> = {};
    (settings || []).forEach((r: { key: string; value: string }) => {
      cfg[r.key] = r.value;
    });

    const smtpHost = cfg.smtp_host;
    const smtpPort = parseInt(cfg.smtp_port || "587", 10);
    const smtpUser = cfg.smtp_user;
    const smtpPass = cfg.smtp_pass;
    const fromEmail = cfg.smtp_from_email || smtpUser;
    const fromName = cfg.smtp_from_name || "Shohoz Skill";
    const adminEmail = cfg.admin_notification_email;

    if (!smtpHost || !smtpUser || !smtpPass || !adminEmail) {
      console.log("SMTP not configured, skipping notification");
      return new Response(
        JSON.stringify({ success: false, reason: "SMTP not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      order_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      product_title,
      product_type,
      price,
      payment_method,
      transaction_id,
      notes,
    } = orderData;

    const productTypeLabel = product_type === "book" ? "বই" : "কোর্স";
    const paymentLabel =
      payment_method === "cod"
        ? "Cash on Delivery"
        : payment_method.charAt(0).toUpperCase() + payment_method.slice(1);

    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #14315C, #1F4A8A); padding: 24px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 22px;">🛒 নতুন অর্ডার এসেছে!</h1>
        </div>
        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333; width: 40%;">Order ID</td>
              <td style="padding: 10px 8px; color: #555;">${order_id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">পণ্যের ধরন</td>
              <td style="padding: 10px 8px; color: #555;">${productTypeLabel}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">পণ্যের নাম</td>
              <td style="padding: 10px 8px; color: #555;">${product_title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">মূল্য</td>
              <td style="padding: 10px 8px; color: #555; font-weight: 600;">৳${price}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">পেমেন্ট</td>
              <td style="padding: 10px 8px; color: #555;">${paymentLabel}</td>
            </tr>
            ${transaction_id ? `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">Transaction ID</td>
              <td style="padding: 10px 8px; color: #555;">${transaction_id}</td>
            </tr>` : ""}
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">কাস্টমার</td>
              <td style="padding: 10px 8px; color: #555;">${customer_name}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">ফোন</td>
              <td style="padding: 10px 8px; color: #555;">${customer_phone}</td>
            </tr>
            ${customer_email ? `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">ইমেইল</td>
              <td style="padding: 10px 8px; color: #555;">${customer_email}</td>
            </tr>` : ""}
            ${customer_address ? `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">ঠিকানা</td>
              <td style="padding: 10px 8px; color: #555;">${customer_address}</td>
            </tr>` : ""}
            ${notes ? `<tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 10px 8px; font-weight: 600; color: #333;">নোট</td>
              <td style="padding: 10px 8px; color: #555;">${notes}</td>
            </tr>` : ""}
          </table>
        </div>
        <div style="background: #f8f9fa; padding: 16px 24px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #999;">এই ইমেইল অটোমেটিকভাবে পাঠানো হয়েছে।</p>
        </div>
      </div>
    `;

    const { SmtpClient } = await import("https://deno.land/x/smtp@v0.7.0/mod.ts");

    const client = new SmtpClient();
    
    const connectConfig: any = {
      hostname: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
    };

    if (smtpPort === 465) {
      await client.connectTLS(connectConfig);
    } else {
      await client.connect(connectConfig);
    }

    await client.send({
      from: `${fromName} <${fromEmail}>`,
      to: adminEmail,
      subject: `🛒 নতুন অর্ডার: ${order_id} — ${product_title}`,
      content: "নতুন অর্ডার এসেছে। HTML সাপোর্টেড ইমেইল ক্লায়েন্টে দেখুন।",
      html: emailHtml,
    });

    await client.close();

    console.log(`Order notification sent to ${adminEmail} for order ${order_id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Notify order error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
