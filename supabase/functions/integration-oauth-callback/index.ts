import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TOKEN_ENDPOINTS: Record<string, string> = {
  google_calendar: "https://oauth2.googleapis.com/token",
  gmail: "https://oauth2.googleapis.com/token",
  instagram: "https://api.instagram.com/oauth/access_token",
};

const CLIENT_ENV: Record<string, { id: string; secret: string }> = {
  google_calendar: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  gmail: { id: "GOOGLE_CLIENT_ID", secret: "GOOGLE_CLIENT_SECRET" },
  instagram: { id: "INSTAGRAM_APP_ID", secret: "INSTAGRAM_APP_SECRET" },
};

/** Build an HTML page that tries postMessage → window.close → redirect fallback */
function popupResultPage(provider: string, redirectUri: string, error?: string) {
  const isError = !!error;
  const icon = isError ? "❌" : "✅";
  const heading = isError ? "Connection Failed" : "Connected!";
  const subtitle = isError
    ? (error || "").replace(/_/g, " ")
    : "Redirecting back…";
  const paramKey = isError ? "integration_error" : "integration_success";
  const paramVal = isError ? (error || "unknown") : provider;
  const fallbackUrl = `${redirectUri}?${paramKey}=${encodeURIComponent(paramVal)}`;

  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f9fa;color:#333;text-align:center}.msg{padding:2rem;max-width:320px}h2{margin:0 0 .5rem}p{color:${isError ? "#c00" : "#666"};font-size:.9rem}a{display:inline-block;margin-top:1rem;color:#0066cc;text-decoration:underline;font-size:.85rem}</style></head><body><div class="msg"><h2>${icon} ${heading}</h2><p>${subtitle}</p><a href="${fallbackUrl}" id="fallback" style="display:none">Tap here if not redirected</a></div><script>
(function(){
  var sent=false;
  try{if(window.opener){window.opener.postMessage({type:"oauth-complete",provider:"${provider}"${isError ? ',error:"' + (error || "") + '"' : ""}},"*");sent=true;}}catch(e){}
  // Try closing the popup after a short delay
  setTimeout(function(){try{window.close()}catch(e){}},800);
  // If still open after 1.5s, show fallback link and redirect
  setTimeout(function(){
    document.getElementById("fallback").style.display="inline-block";
    if(!sent){window.location.href="${fallbackUrl}";}
  },1500);
})();
</script></body></html>`;
}

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
          popupResultPage(parsedState.provider || "", redirectUri, errorMsg),
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
    if (!envKeys) {
      const msg = `unsupported_provider_${provider}`;
      if (popup) {
        return new Response(popupResultPage(provider, redirectUri || "/integrations", msg), { headers: { "Content-Type": "text/html" } });
      }
      return new Response(null, { status: 302, headers: { Location: `${redirectUri || "/integrations"}?integration_error=${msg}` } });
    }
    const clientId = Deno.env.get(envKeys.id)!;
    const clientSecret = Deno.env.get(envKeys.secret)!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/integration-oauth-callback`;

    let tokenData: any;

    if (provider === "instagram") {
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
      const rd = redirectUri || "/integrations";
      if (popup) {
        return new Response(popupResultPage(provider, rd, "token_exchange_failed"), { headers: { "Content-Type": "text/html" } });
      }
      return new Response(null, { status: 302, headers: { Location: `${rd}?integration_error=token_exchange_failed` } });
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || null;
    const expiresIn = tokenData.expires_in;
    const tokenExpiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    let providerAccountId: string | null = null;
    let scopes: string[] = [];
    let metadata: any = {};

    if (provider === "instagram") {
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
    }

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
      const rd = redirectUri || "/integrations";
      if (popup) {
        return new Response(popupResultPage(provider, rd, "save_failed"), { headers: { "Content-Type": "text/html" } });
      }
      return new Response(null, { status: 302, headers: { Location: `${rd}?integration_error=save_failed` } });
    }

    const rd = redirectUri || "/integrations";
    if (popup) {
      return new Response(popupResultPage(provider, rd), { headers: { "Content-Type": "text/html" } });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: `${rd}?integration_success=${provider}` },
    });
  } catch (err) {
    console.error("integration-oauth-callback error:", err);
    return new Response(null, {
      status: 302,
      headers: { Location: "/integrations?integration_error=unexpected" },
    });
  }
});
