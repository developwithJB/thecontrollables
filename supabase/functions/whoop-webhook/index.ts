import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  validWhoopSignature,
  whoopWebhookPayload,
  whoopDeliveryKey,
} from "../_shared/whoopWebhook.ts";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type,x-whoop-signature,x-whoop-signature-timestamp",
  "Content-Type": "application/json",
};
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST")
    return new Response(null, { status: 405, headers });
  const secret = Deno.env.get("WHOOP_CLIENT_SECRET");
  if (!secret)
    return new Response(JSON.stringify({ error: "webhook_unavailable" }), {
      status: 503,
      headers,
    });
  try {
    if (Number(req.headers.get("content-length") || 0) > 16384)
      return new Response(null, { status: 413, headers });
    const timestamp = req.headers.get("x-whoop-signature-timestamp"),
      signature = req.headers.get("x-whoop-signature");
    if (!timestamp || !signature)
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers,
      });
    const reader = req.body?.getReader(),
      chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16384) {
          await reader.cancel();
          return new Response(null, { status: 413, headers });
        }
        chunks.push(value);
      }
    const raw = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk, offset);
      offset += chunk.length;
    }
    if (
      !(await validWhoopSignature(
        raw,
        req.headers.get("x-whoop-signature-timestamp"),
        req.headers.get("x-whoop-signature"),
        secret,
      ))
    )
      return new Response(JSON.stringify({ error: "invalid_signature" }), {
        status: 401,
        headers,
      });
    let decoded: unknown;
    try {
      decoded = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      );
    } catch {
      return new Response(null, { status: 400, headers });
    }
    const payload = whoopWebhookPayload(decoded);
    if (!payload)
      return new Response(JSON.stringify({ error: "invalid_event" }), {
        status: 400,
        headers,
      });
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error } = await admin.from("whoop_webhook_events").insert({
      event_type: payload.type,
      whoop_user_id: payload.user_id,
      payload,
      delivery_key: await whoopDeliveryKey(payload),
      processed: false,
    });
    if (error && error.code !== "23505")
      return new Response(
        JSON.stringify({ error: "event_store_unavailable" }),
        { status: 503, headers },
      );
    // Event ingestion never reads access tokens, calls WHOOP, or changes a user.
    return new Response(
      JSON.stringify({ ok: true, duplicate: error?.code === "23505" }),
      { status: 200, headers },
    );
  } catch {
    console.error("WHOOP webhook ingestion unavailable");
    return new Response(JSON.stringify({ error: "webhook_unavailable" }), {
      status: 503,
      headers,
    });
  }
});
