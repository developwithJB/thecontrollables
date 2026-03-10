import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROVIDER_CONFIG: Record<string, { authUrl: string; clientIdEnv: string; defaultScopes: string[] }> = {
  google_calendar: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    defaultScopes: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/calendar.events",
    ],
  },
  gmail: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    defaultScopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
  },
  todoist: {
    authUrl: "https://todoist.com/oauth/authorize",
    clientIdEnv: "TODOIST_CLIENT_ID",
    defaultScopes: ["data:read_write"],
  },
  notion: {
    authUrl: "https://api.notion.com/v1/oauth/authorize",
    clientIdEnv: "NOTION_CLIENT_ID",
    defaultScopes: [],
  },
  instagram: {
    authUrl: "https://www.instagram.com/oauth/authorize",
    clientIdEnv: "INSTAGRAM_APP_ID",
    defaultScopes: ["instagram_business_basic"],
  },
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

    const { provider, redirectUri } = await req.json();
    const config = PROVIDER_CONFIG[provider];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown provider: ${provider}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientId = Deno.env.get(config.clientIdEnv);
    if (!clientId) {
      return new Response(JSON.stringify({ error: `${provider} not configured. Client ID missing.` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build callback URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/integration-oauth-callback`;

    // State encodes provider + userId + redirectUri
    const state = btoa(JSON.stringify({ provider, userId, redirectUri }));

    let authUrl: string;

    if (provider === "instagram") {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: config.defaultScopes.join(","),
        state,
      });
      authUrl = `${config.authUrl}?${params.toString()}`;
    } else if (provider === "notion") {
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        owner: "user",
        state,
      });
      authUrl = `${config.authUrl}?${params.toString()}`;
    } else if (provider === "todoist") {
      const params = new URLSearchParams({
        client_id: clientId,
        scope: config.defaultScopes.join(","),
        state,
      });
      authUrl = `${config.authUrl}?${params.toString()}`;
    } else {
      // Google (calendar or gmail)
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackUrl,
        response_type: "code",
        scope: config.defaultScopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state,
      });
      authUrl = `${config.authUrl}?${params.toString()}`;
    }

    return new Response(JSON.stringify({ url: authUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("integration-oauth-start error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
