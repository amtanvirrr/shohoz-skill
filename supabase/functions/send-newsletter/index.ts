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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { postId } = await req.json();
    if (!postId) {
      throw new Error("postId is required");
    }

    // Fetch blog post
    const serviceClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: post, error: postError } = await serviceClient
      .from("blog_posts")
      .select("title, slug, excerpt, cover_image_url, author_name")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      throw new Error("Blog post not found");
    }

    // Fetch active subscribers with their unsubscribe tokens
    const { data: subscribers, error: subError } = await serviceClient
      .from("newsletter_subscribers")
      .select("email, unsubscribe_token")
      .eq("is_active", true);

    if (subError) {
      throw new Error("Failed to fetch subscribers");
    }

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No active subscribers" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const siteUrl = "https://shohozskill.lovable.app";
    const postUrl = `${siteUrl}/blog/${post.slug}`;
    const SUPABASE_PROJECT_URL = SUPABASE_URL;

    // Send emails individually for unique unsubscribe links
    let totalSent = 0;
    let totalFailed = 0;

    for (const subscriber of subscribers) {
      const unsubscribeUrl = `${SUPABASE_PROJECT_URL}/functions/v1/unsubscribe?token=${subscriber.unsubscribe_token}`;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Shohoz Skill <onboarding@resend.dev>",
          to: [subscriber.email],
          subject: `📖 নতুন আর্টিকেল: ${post.title}`,
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
              <div style="background: linear-gradient(135deg, #14315C, #1F4A8A); padding: 32px 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">সহজ স্কিল</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">নিউজলেটার</p>
              </div>
              ${post.cover_image_url ? `<img src="${post.cover_image_url}" alt="${post.title}" style="width: 100%; height: auto; display: block;" />` : ""}
              <div style="padding: 32px 24px;">
                <h2 style="color: #1a1a2e; margin: 0 0 12px; font-size: 22px; line-height: 1.4;">${post.title}</h2>
                <p style="color: #666; font-size: 13px; margin: 0 0 16px;">লেখক: ${post.author_name}</p>
                <p style="color: #444; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">${post.excerpt}</p>
                <a href="${postUrl}" style="display: inline-block; background: #F58A1F; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(245,138,31,0.25);">পুরো আর্টিকেল পড়ুন →</a>
              </div>
              <div style="border-top: 1px solid #eee; padding: 20px 24px; text-align: center;">
                <p style="color: #999; font-size: 12px; margin: 0;">এই ইমেইল পেয়েছেন কারণ আপনি সহজ স্কিলের নিউজলেটারে সাবস্ক্রাইব করেছেন।</p>
                <a href="${unsubscribeUrl}" style="color: #999; font-size: 12px; text-decoration: underline; display: inline-block; margin-top: 8px;">আনসাবস্ক্রাইব করুন</a>
              </div>
            </div>
          `,
        }),
      });

      if (res.ok) {
        totalSent += 1;
      } else {
        totalFailed += 1;
        const errorBody = await res.text();
        console.error(`Resend failed for ${subscriber.email} [${res.status}]: ${errorBody}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Newsletter error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
