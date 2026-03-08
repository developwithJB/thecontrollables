import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Permission lines rotated with each nudge (shame-free)
const PERMISSION_LINES = [
  "Nothing is required today.",
  "No pressure. Just a quiet check-in.",
  "You don't have to open this.",
  "Just a reminder that your Dashboard is here.",
  "Show up if you want. Skip if you need to.",
];

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
}

/**
 * Build the push notification payload based on Web Push protocol.
 * Uses raw crypto instead of npm web-push for Deno compatibility.
 */
async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string
): Promise<Response> {
  // Import the VAPID private key
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Create VAPID JWT
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: vapidSubject,
  };

  const encoder = new TextEncoder();

  function base64urlEncode(data: Uint8Array): string {
    let binary = "";
    for (const byte of data) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64urlDecode(str: string): Uint8Array {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Import VAPID private key for signing
  const rawPrivateKey = base64urlDecode(vapidPrivateKey);
  const rawPublicKey = base64urlDecode(vapidPublicKey);

  // Build JWK from raw keys
  const privateJwk = {
    kty: "EC",
    crv: "P-256",
    x: base64urlEncode(rawPublicKey.slice(1, 33)),
    y: base64urlEncode(rawPublicKey.slice(33, 65)),
    d: base64urlEncode(rawPrivateKey),
  };

  const signingKey = await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const headerB64 = base64urlEncode(encoder.encode(JSON.stringify(header)));
  const claimsB64 = base64urlEncode(encoder.encode(JSON.stringify(claims)));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    signingKey,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format that WebPush expects
  const sigBytes = new Uint8Array(signature);
  const vapidToken = `${unsignedToken}.${base64urlEncode(sigBytes)}`;

  // Encrypt the payload using Web Push encryption (aes128gcm)
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKeyBytes = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberPublicKeyBytes = base64urlDecode(subscription.p256dh_key);
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    subscriberPublicKeyBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  const authSecret = base64urlDecode(subscription.auth_key);

  // HKDF for IKM
  const ikmKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Build info for auth
  const authInfo = encoder.encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + subscriberPublicKeyBytes.length + localPublicKeyBytes.length);
  authInfoFull.set(authInfo);
  authInfoFull.set(subscriberPublicKeyBytes, authInfo.length);
  authInfoFull.set(localPublicKeyBytes, authInfo.length + subscriberPublicKeyBytes.length);

  const prkKey = await crypto.subtle.importKey("raw", authSecret, { name: "HKDF" }, false, ["deriveBits"]);
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(sharedSecret), info: authInfoFull },
    prkKey,
    256
  );

  // Derive CEK and nonce
  const prkKeyImport = await crypto.subtle.importKey("raw", new Uint8Array(prk), { name: "HKDF" }, false, ["deriveBits"]);

  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: cekInfo },
    prkKeyImport,
    128
  );

  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: nonceInfo },
    prkKeyImport,
    96
  );

  // Encrypt payload
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter
  // rest is zero padding

  const aesKey = await crypto.subtle.importKey("raw", new Uint8Array(cekBits), { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
    aesKey,
    paddedPayload
  );

  // Build aes128gcm header: salt(16) + rs(4) + idlen(1) + keyid(65)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  const idlen = new Uint8Array([65]);

  const body = new Uint8Array(16 + 4 + 1 + 65 + encrypted.byteLength);
  body.set(salt, 0);
  body.set(rs, 16);
  body.set(idlen, 20);
  body.set(localPublicKeyBytes, 21);
  body.set(new Uint8Array(encrypted), 86);

  // Re-derive with proper salt
  const cekWithSalt = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    prkKeyImport,
    128
  );
  const nonceWithSalt = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prkKeyImport,
    96
  );

  const aesKey2 = await crypto.subtle.importKey("raw", new Uint8Array(cekWithSalt), { name: "AES-GCM" }, false, ["encrypt"]);
  const encrypted2 = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceWithSalt) },
    aesKey2,
    paddedPayload
  );

  const finalBody = new Uint8Array(16 + 4 + 1 + 65 + encrypted2.byteLength);
  finalBody.set(salt, 0);
  finalBody.set(rs, 16);
  finalBody.set(idlen, 20);
  finalBody.set(localPublicKeyBytes, 21);
  finalBody.set(new Uint8Array(encrypted2), 86);

  // Encode public key for Authorization header
  const vapidPublicKeyEncoded = base64urlEncode(rawPublicKey);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${vapidToken}, k=${vapidPublicKeyEncoded}`,
      TTL: "86400",
      Urgency: "normal",
    },
    body: finalBody,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Public endpoint: return VAPID public key for client subscription
    if (body.action === "get_vapid_key") {
      const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
      if (!vapidPublicKey) {
        return new Response(
          JSON.stringify({ error: "VAPID not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ vapidPublicKey }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Main nudge-sending flow (called by cron)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:hello@agbcoaching.com";

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all push subscriptions with user context
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh_key, auth_key");

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No push subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map((s: PushSubscription) => s.user_id))];

    // Fetch profiles for timezone
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, timezone")
      .in("id", userIds);

    // Fetch active reset sessions for context
    const { data: sessions } = await supabase
      .from("reset_sessions")
      .select("user_id, current_day, status, start_date")
      .in("user_id", userIds)
      .eq("status", "active");

    // Fetch today's completed actions count per user
    const today = new Date().toISOString().split("T")[0];
    const { data: completedActions } = await supabase
      .from("completed_actions")
      .select("user_id")
      .in("user_id", userIds)
      .gte("completed_at", `${today}T00:00:00Z`);

    const profileMap = new Map((profiles || []).map((p: { id: string; timezone: string | null }) => [p.id, p]));
    const sessionMap = new Map((sessions || []).map((s: { user_id: string }) => [s.user_id, s]));
    const actionCountMap = new Map<string, number>();
    (completedActions || []).forEach((a: { user_id: string }) => {
      actionCountMap.set(a.user_id, (actionCountMap.get(a.user_id) || 0) + 1);
    });

    let sent = 0;
    let expired = 0;
    const errors: string[] = [];

    for (const sub of subscriptions as PushSubscription[]) {
      try {
        // Check if it's ~7 AM in user's timezone
        const profile = profileMap.get(sub.user_id);
        const tz = (profile as { timezone?: string })?.timezone || "America/New_York";
        const now = new Date();
        const userTime = new Date(
          now.toLocaleString("en-US", { timeZone: tz })
        );
        const hour = userTime.getHours();

        // Only send between 7-8 AM local time
        if (hour < 7 || hour >= 8) continue;

        // Check if we already sent a push today
        const { data: existingLog } = await supabase
          .from("email_nudge_logs")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("nudge_date", today)
          .eq("status", "push_sent")
          .maybeSingle();

        if (existingLog) continue;

        // Build context-aware message
        const session = sessionMap.get(sub.user_id);
        const actionsToday = actionCountMap.get(sub.user_id) || 0;

        let title: string;
        let messageBody: string;

        if (session) {
          if (actionsToday >= 3) {
            // Already done for today
            continue;
          } else if (actionsToday > 0) {
            title = "Almost there";
            messageBody = `${3 - actionsToday} action${3 - actionsToday === 1 ? "" : "s"} left today. You're closer than you think.`;
          } else {
            title = "Your Dashboard is ready";
            messageBody = `Day ${(session as { current_day: number }).current_day} — three small actions waiting for you.`;
          }
        } else {
          // No active session
          title = "Ready when you are";
          messageBody = "Start your next Snapshot whenever it feels right.";
        }

        // Add permission line
        const permLine = PERMISSION_LINES[Math.floor(Math.random() * PERMISSION_LINES.length)];
        const payload = JSON.stringify({
          title,
          body: `${messageBody}\n${permLine}`,
          url: "/dashboard",
        });

        const response = await sendWebPush(sub, payload, vapidPublicKey, vapidPrivateKey, vapidSubject);

        if (response.status === 201 || response.status === 200) {
          sent++;
          // Log as push_sent
          await supabase.from("email_nudge_logs").insert({
            user_id: sub.user_id,
            nudge_date: today,
            status: "push_sent",
          });
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, clean up
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          expired++;
        } else {
          const errText = await response.text();
          errors.push(`${sub.user_id}: ${response.status} ${errText}`);
        }
      } catch (err) {
        errors.push(`${sub.user_id}: ${(err as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({ sent, expired, errors: errors.slice(0, 5) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Push nudge error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
