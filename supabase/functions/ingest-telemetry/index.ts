import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sanitizeTelemetry } from "../_shared/telemetry.ts";
const project = "62a2f598-751b-472c-b5a8-1befa73c4ea2";
function allowed(origin: string) {
  return (
    origin === "https://thedashboard.agbcoaching.com" ||
    origin === "https://thecontrollables.lovable.app" ||
    origin === "https://preview--thecontrollables.lovable.app" ||
    origin === `https://${project}.lovableproject.com` ||
    origin === `https://id-preview--${project}.lovable.app` ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
}
serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed(origin) ? origin : "null",
    "Access-Control-Allow-Headers":
      "authorization,x-client-info,apikey,content-type,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });
  if (!allowed(origin)) return reply({ error: "origin_not_allowed" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 8192)
    return reply({ error: "payload_too_large" }, 413);
  const reader = req.body?.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 8192) {
        await reader.cancel();
        return reply({ error: "payload_too_large" }, 413);
      }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return reply({ error: "invalid_payload" }, 400);
  }
  const url = Deno.env.get("SUPABASE_URL")!,
    key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, key, { auth: { persistSession: false } });
  let owner: string | null = null;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (token && token !== anon) {
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data.user) return reply({ error: "unauthorized" }, 401);
    owner = data.user.id;
  }
  let event: ReturnType<typeof sanitizeTelemetry>;
  try {
    event = sanitizeTelemetry(input, owner);
  } catch {
    return reply({ error: "invalid_payload" }, 400);
  }
  // A client-supplied network header is never authorization. The independent
  // global ceiling also bounds writes if network identifiers are missing/spoofed.
  const network =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const signingKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    signingKey,
    new TextEncoder().encode(
      new Date().toISOString().slice(0, 10) + ":" + (owner || network),
    ),
  );
  const actor = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const { data: slot, error: limitError } = await admin.rpc(
    "take_telemetry_ingest_slot",
    { p_actor: actor },
  );
  if (limitError) return reply({ error: "telemetry_unavailable" }, 503);
  if (slot !== true) return reply({ error: "rate_limited" }, 429);
  const { error } = await admin.from(event.table).insert(event.row);
  return error
    ? reply({ error: "telemetry_unavailable" }, 503)
    : reply({ accepted: true }, 202);
});
