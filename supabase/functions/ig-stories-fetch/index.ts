import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = user.id;

    // Get Instagram connection
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection, error: connError } = await serviceClient
      .from("integration_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "instagram")
      .eq("status", "active")
      .maybeSingle();

    if (connError || !connection) {
      return new Response(JSON.stringify({ error: "Instagram not connected", media: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = connection.access_token;

    // Check if token is expired and refresh if needed
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at).getTime();
      const now = Date.now();
      // Refresh if within 7 days of expiry
      if (expiresAt - now < 7 * 24 * 60 * 60 * 1000) {
        try {
          const refreshRes = await fetch(
            `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
          );
          const refreshData = await refreshRes.json();
          if (refreshData.access_token) {
            accessToken = refreshData.access_token;
            const newExpiry = new Date(Date.now() + (refreshData.expires_in || 5184000) * 1000).toISOString();
            await serviceClient
              .from("integration_connections")
              .update({
                access_token: accessToken,
                token_expires_at: newExpiry,
                updated_at: new Date().toISOString(),
              })
              .eq("id", connection.id);
          }
        } catch (e) {
          console.error("Token refresh failed:", e);
        }
      }
    }

    // Fetch user media
    const mediaRes = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&limit=25&access_token=${accessToken}`
    );
    const mediaData = await mediaRes.json();

    if (mediaData.error) {
      console.error("Instagram API error:", mediaData.error);
      if (mediaData.error.code === 190) {
        await serviceClient
          .from("integration_connections")
          .update({ status: "error", error_message: "Token expired or revoked" })
          .eq("id", connection.id);
      }
      return new Response(JSON.stringify({ error: mediaData.error.message, media: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map media to clean format
    const media = (mediaData.data || []).map((item: any) => ({
      id: item.id,
      caption: item.caption || null,
      media_type: item.media_type,
      thumbnail_url: item.media_type === "VIDEO" ? (item.thumbnail_url || item.media_url) : item.media_url,
      timestamp: item.timestamp,
      permalink: item.permalink,
    }));

    // Update last_synced_at
    await serviceClient
      .from("integration_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return new Response(JSON.stringify({ media, username: connection.provider_account_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ig-stories-fetch error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", media: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
