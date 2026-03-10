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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { provider, redirect_uri } = await req.json();

    if (!provider || !["fitbit", "oura", "whoop"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = btoa(JSON.stringify({ user_id: userId, provider }));
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/wearable-oauth-callback`;

    let authUrl: string;

    if (provider === "fitbit") {
      const clientId = Deno.env.get("FITBIT_CLIENT_ID");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Fitbit not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scopes = "activity heartrate sleep profile";
      authUrl =
        `https://www.fitbit.com/oauth2/authorize?` +
        `response_type=code&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${encodeURIComponent(state)}`;
    } else if (provider === "oura") {
      const clientId = Deno.env.get("OURA_CLIENT_ID");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "Oura not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scopes = "daily heartrate personal sleep activity";
      authUrl =
        `https://cloud.ouraring.com/oauth/authorize?` +
        `response_type=code&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${encodeURIComponent(state)}`;
    } else {
      // WHOOP
      const clientId = Deno.env.get("WHOOP_CLIENT_ID");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "WHOOP not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const scopes = "read:recovery read:cycles read:sleep read:workout read:profile offline";
      authUrl =
        `https://api.prod.whoop.com/oauth/oauth2/auth?` +
        `response_type=code&client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&state=${encodeURIComponent(state)}`;
    }

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wearable-oauth-start error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
