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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(renderHTML("অবৈধ আনসাবস্ক্রাইব লিঙ্ক।", false), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(token)) {
      return new Response(renderHTML("অবৈধ আনসাবস্ক্রাইব লিঙ্ক।", false), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: false })
      .eq("unsubscribe_token", token)
      .eq("is_active", true)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Unsubscribe error:", error);
      return new Response(renderHTML("আনসাবস্ক্রাইব করতে সমস্যা হয়েছে।", false), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (!data) {
      return new Response(renderHTML("আপনি ইতোমধ্যে আনসাবস্ক্রাইব করেছেন অথবা এই লিঙ্কটি অবৈধ।", true), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(renderHTML("আপনি সফলভাবে আনসাবস্ক্রাইব করেছেন। আপনি আর নিউজলেটার ইমেইল পাবেন না।", true), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("Unsubscribe error:", err);
    return new Response(renderHTML("কিছু একটা সমস্যা হয়েছে।", false), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }
});

function renderHTML(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>আনসাবস্ক্রাইব - সহজ স্কিল</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 16px; padding: 48px 32px; max-width: 480px; width: 90%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #1a1a2e; font-size: 22px; margin: 0 0 16px; }
    p { color: #555; font-size: 15px; line-height: 1.7; margin: 0 0 24px; }
    a { display: inline-block; background: #0d7377; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
    a:hover { background: #0a5c5f; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? "✅" : "⚠️"}</div>
    <h1>${success ? "আনসাবস্ক্রাইব" : "সমস্যা"}</h1>
    <p>${message}</p>
    <a href="https://shohozskill.lovable.app">সহজ স্কিলে ফিরে যান</a>
  </div>
</body>
</html>`;
}
