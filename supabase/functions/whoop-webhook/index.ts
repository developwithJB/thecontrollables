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

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Store webhook event for debugging
    const eventType = body.type || "unknown";
    const whoopUserId = body.user_id ? String(body.user_id) : null;

    await supabase.from("whoop_webhook_events").insert({
      event_type: eventType,
      whoop_user_id: whoopUserId,
      payload: body,
      processed: false,
    });

    // If we have a whoop user id, find the connected user and trigger a sync
    if (whoopUserId) {
      // Find the user by whoop_user_id stored in wearable_connections metadata
      const { data: connections } = await supabase
        .from("wearable_connections")
        .select("user_id, access_token, refresh_token, token_expires_at")
        .eq("provider", "whoop");

      if (connections) {
        for (const conn of connections) {
          // Check metadata for whoop_user_id match
          // Since metadata is stored as JSONB, we need to check it
          const { data: fullConn } = await supabase
            .from("wearable_connections")
            .select("*")
            .eq("user_id", conn.user_id)
            .eq("provider", "whoop")
            .single();

          if (fullConn?.metadata && (fullConn.metadata as any).whoop_user_id === whoopUserId) {
            // Mark the webhook as processed
            // The actual sync will happen on next user interaction or scheduled job
            // For now, just log the match
            console.log(`WHOOP webhook matched user ${conn.user_id} for event ${eventType}`);
            break;
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whoop-webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
