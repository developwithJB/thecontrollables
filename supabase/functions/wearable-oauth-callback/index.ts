import {receiveOAuth,oauthHeaders} from "../_shared/oauthState.ts";

Deno.serve(async (req) => {
  try {
    const completion=await receiveOAuth(req,"wearable");
    if("response" in completion)return completion.response;
    const {admin:supabase,userId:user_id,provider,code}=completion;
    const headers=oauthHeaders(req);
    const failure=(reason:string)=>new Response(JSON.stringify({error:reason}),{status:400,headers});
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
        console.error("Fitbit token exchange failed");
        return failure("token_exchange_failed");
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
        console.error("Oura token exchange failed");
        return failure("token_exchange_failed");
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
        console.error("WHOOP token exchange failed");
        return failure("token_exchange_failed");
      }

      tokenData = await resp.json();
    } else {
      return failure("invalid_provider");
    }

    if(!tokenData.access_token || !Number.isFinite(tokenData.expires_in) || tokenData.expires_in<=0)return failure("invalid_token_response");
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
      return failure("db_error");
    }

    return new Response(JSON.stringify({provider}),{headers});
  } catch {
    return new Response(JSON.stringify({error:"connection_failed"}),{status:500,headers:oauthHeaders(req)});
  }
});
