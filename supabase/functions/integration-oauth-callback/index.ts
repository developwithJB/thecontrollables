import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN_ENDPOINTS: Record<string, string> = {
  google_calendar: "https://oauth2.googleapis.com/token",
  gmail: "https://oauth2.googleapis.com/token",
  todoist: "https://todoist.com/oauth/access_token",
  notion: "https://api.notion.com/v1/oauth/token",
  instagram: "https://api.instagram.com/oauth/access_token",
};

const CLIENT_ENV: Record<string, { id: string; secret: string }> = {
  google_calendar: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  gmail: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  todoist: { id: "TODOIST_CLIENT_ID", secret: "TODOIST_CLIENT_SECRET" },
  notion: { id: "NOTION_CLIENT_ID", secret: "NOTION_CLIENT_SECRET" },
  instagram: { id: "INSTAGRAM_APP_ID", secret: "INSTAGRAM_APP_SECRET" },
};

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateRaw = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error || !code || !stateRaw) {
      const parsedState = stateRaw ? JSON.parse(atob(stateRaw)) : {};
      const redirectUri = parsedState.redirectUri || "/integrations";
      const errorMsg = error || "missing_code";
      if (parsedState.popup) {
        return new Response(
          `<!DOCTYPE html><html><body><script>window.opener.postMessage({type:"oauth-complete",provider:"${parsedState.provider || ""}",error:"${errorMsg}"},"*");window.close();</script></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUri}?integration_error=${errorMsg}` },
      });
    }

    const { provider, userId, redirectUri, popup } = JSON.parse(atob(stateRaw));
    const envKeys = CLIENT_ENV[provider];
    const clientId = Deno.env.get(envKeys.id)!;
    const clientSecret = Deno.env.get(envKeys.secret)!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/integration-oauth-callback`;

    let tokenData: any;

    if (provider === "instagram") {
      // Instagram short-lived token exchange
      const formData = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        redirect_uri: callbackUrl,
        code,
      });
      const res = await fetch(TOKEN_ENDPOINTS[provider], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });
      const shortLived = await res.json();
      if (shortLived.error_type || shortLived.error_message) {
        tokenData = { error: shortLived.error_message || shortLived.error_type };
      } else {
        // Exchange for long-lived token
        const llRes = await fetch(
          `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortLived.access_token}`
        );
        const longLived = await llRes.json();
        tokenData = {
          access_token: longLived.access_token || shortLived.access_token,
          expires_in: longLived.expires_in || 5184000,
          user_id: shortLived.user_id,
        };
      }
    } else if (provider === "notion") {
      const basicAuth = btoa(`${clientId}:${clientSecret}`);
      const res = await fetch(TOKEN_ENDPOINTS[provider], {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: callbackUrl }),
      });
      tokenData = await res.json();
    } else if (provider === "todoist") {
      const res = await fetch(TOKEN_ENDPOINTS[provider], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
      });
      tokenData = await res.json();
    } else {
      // Google
      const res = await fetch(TOKEN_ENDPOINTS[provider], {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: callbackUrl,
          grant_type: "authorization_code",
        }),
      });
      tokenData = await res.json();
    }

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData);
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUri}?integration_error=token_exchange_failed` },
      });
    }

    // Extract tokens
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Get account identifier
    let providerAccountId: string | null = null;
    let scopes: string[] = [];
    let metadata: any = {};

    if (provider === "instagram") {
      // Fetch username from Instagram Graph API
      try {
        const profileRes = await fetch(
          `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
        );
        const profile = await profileRes.json();
        providerAccountId = profile.username || profile.id || String(tokenData.user_id);
        metadata = { instagram_user_id: profile.id || tokenData.user_id };
      } catch {
        providerAccountId = String(tokenData.user_id);
        metadata = { instagram_user_id: tokenData.user_id };
      }
      scopes = ["instagram_business_basic"];
    } else if (provider === "google_calendar" || provider === "gmail") {
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const userInfo = await userInfoRes.json();
        providerAccountId = userInfo.email;
      } catch { /* ignore */ }
      scopes = (tokenData.scope || "").split(" ");
    } else if (provider === "todoist") {
      providerAccountId = tokenData.token_type || "todoist_user";
    } else if (provider === "notion") {
      providerAccountId = tokenData.owner?.user?.name || tokenData.workspace_name || "notion_user";
      metadata = { workspace_id: tokenData.workspace_id, workspace_name: tokenData.workspace_name };
    }

    // Upsert into integration_connections using service role
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await serviceClient
      .from("integration_connections")
      .upsert({
        user_id: userId,
        provider,
        provider_account_id: providerAccountId,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        scopes,
        status: "active",
        error_message: null,
        metadata,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,provider" });

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(null, {
        status: 302,
        headers: { Location: `${redirectUri}?integration_error=save_failed` },
      });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${redirectUri}?integration_success=${provider}` },
    });
  } catch (err) {
    console.error("integration-oauth-callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "/integrations?integration_error=unexpected" },
    });
  }
});
