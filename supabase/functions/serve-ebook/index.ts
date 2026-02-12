import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to get user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get book_id from query
    const url = new URL(req.url);
    const bookId = url.searchParams.get("book_id");
    if (!bookId) {
      return new Response(JSON.stringify({ error: "book_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin client to check purchase & generate signed URL
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user has a confirmed/delivered order for this book
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", bookId)
      .eq("product_type", "book")
      .in("status", ["confirmed", "delivered"])
      .limit(1)
      .maybeSingle();

    // Also allow admins
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });

    if (!order && !isAdmin) {
      return new Response(JSON.stringify({ error: "Purchase not found" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get book's ebook_file_url
    const { data: book } = await supabaseAdmin
      .from("books")
      .select("ebook_file_url")
      .eq("id", bookId)
      .single();

    if (!book?.ebook_file_url) {
      return new Response(JSON.stringify({ error: "Ebook file not available" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Extract path from the URL (remove bucket prefix if full URL)
    let filePath = book.ebook_file_url;
    // If it's a full storage URL, extract the path after /object/public/ebook-files/ or similar
    const bucketPrefix = "/object/public/ebook-files/";
    const idx = filePath.indexOf(bucketPrefix);
    if (idx !== -1) {
      filePath = filePath.substring(idx + bucketPrefix.length);
    }
    // Also handle /storage/v1/object/... pattern
    const storagePrefix = "/storage/v1/object/";
    const sIdx = filePath.indexOf(storagePrefix);
    if (sIdx !== -1) {
      // Extract after bucket name
      const afterPrefix = filePath.substring(sIdx + storagePrefix.length);
      // Format: public/ebook-files/path or sign/ebook-files/path  
      const parts = afterPrefix.split("/");
      if (parts.length >= 2) {
        filePath = parts.slice(2).join("/"); // skip "public" and "ebook-files"
      }
    }

    // Generate short-lived signed URL (10 minutes)
    const { data: signedUrlData, error: signedError } = await supabaseAdmin.storage
      .from("ebook-files")
      .createSignedUrl(filePath, 600, { download: false });

    if (signedError || !signedUrlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Failed to generate URL", details: signedError?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: signedUrlData.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
