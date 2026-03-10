import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateParam = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const appUrl = Deno.env.get("APP_URL") || "https://thecontrollables.lovable.app";

    if (error || !code || !stateParam) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/wellness?wearable_error=${error || "missing_code"}` },
      });
    }

    let state: { user_id: string; provider: string };
    try {
      state = JSON.parse(atob(stateParam));
    } catch {
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/wellness?wearable_error=invalid_state` },
      });
    }

    const { user_id, provider } = state;
    const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/wearable-oauth-callback`;

    let tokenData: { access_token: string; refresh_token: string; expires_in: number; scope?: string };

    if (provider === "fitbit") {
      const clientId = Deno.env.get("FITBIT_CLIENT_ID")!;
      const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET")!;

      const resp = await fetch("https://api.fitbit.com/oauth2/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("Fitbit token error:", errBody);
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/wellness?wearable_error=token_exchange_failed` },
        });
      }

      tokenData = await resp.json();
    } else if (provider === "oura") {
      const clientId = Deno.env.get("OURA_CLIENT_ID")!;
      const clientSecret = Deno.env.get("OURA_CLIENT_SECRET")!;

      const resp = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("Oura token error:", errBody);
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/wellness?wearable_error=token_exchange_failed` },
        });
      }

      tokenData = await resp.json();
    } else if (provider === "whoop") {
      const clientId = Deno.env.get("WHOOP_CLIENT_ID")!;
      const clientSecret = Deno.env.get("WHOOP_CLIENT_SECRET")!;

      const resp = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: callbackUrl,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        console.error("WHOOP token error:", errBody);
        return new Response(null, {
          status: 302,
          headers: { Location: `${appUrl}/wellness?wearable_error=token_exchange_failed` },
        });
      }

      tokenData = await resp.json();
    } else {
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/wellness?wearable_error=invalid_provider` },
      });
    }

    // Store tokens using service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    // Build metadata — for WHOOP, fetch profile to get whoop_user_id
    let metadata: Record<string, any> = {};
    if (provider === "whoop") {
      try {
        const profileResp = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (profileResp.ok) {
          const profile = await profileResp.json();
          metadata = {
            whoop_user_id: String(profile.user_id),
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
          };
        }
      } catch (e) {
        console.error("WHOOP profile fetch error:", e);
      }
    }

    const { error: upsertError } = await supabase
      .from("wearable_connections")
      .upsert(
        {
          user_id,
          provider,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
          scopes: tokenData.scope || null,
          connected_at: new Date().toISOString(),
          metadata,
        },
        { onConflict: "user_id,provider" }
      );

    if (upsertError) {
      console.error("DB upsert error:", upsertError);
      return new Response(null, {
        status: 302,
        headers: { Location: `${appUrl}/wellness?wearable_error=db_error` },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/wellness?wearable_connected=${provider}` },
    });
  } catch (err) {
    console.error("wearable-oauth-callback error:", err);
    const appUrl = Deno.env.get("APP_URL") || "https://thecontrollables.lovable.app";
    return new Response(null, {
      status: 302,
      headers: { Location: `${appUrl}/wellness?wearable_error=internal` },
    });
  }
});
