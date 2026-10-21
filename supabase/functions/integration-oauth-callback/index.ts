import {receiveOAuth,oauthHeaders} from "../_shared/oauthState.ts";

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

Deno.serve(async (req) => {
  const headers=oauthHeaders(req);
  const failure=(reason:string)=>new Response(JSON.stringify({error:reason}),{status:400,headers});
  try {
    const completion=await receiveOAuth(req,"integration");
    if("response" in completion)return completion.response;
    const {admin:serviceClient,userId,provider,code}=completion;
    const envKeys = CLIENT_ENV[provider];
    if (!envKeys)return failure("invalid_provider");
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

    if(tokenData.error || !tokenData.access_token)return failure("token_exchange_failed");
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

    if(upsertError)return failure("save_failed");
    return new Response(JSON.stringify({provider}),{headers});
  } catch {
    return new Response(JSON.stringify({error:"connection_failed"}),{status:500,headers});
  }
});
