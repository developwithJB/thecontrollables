import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
function oauthAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}
type Admin = ReturnType<typeof oauthAdmin>;
export const OAUTH_PROVIDERS = {
  wearable: ["whoop", "oura", "fitbit"],
  integration: ["google_calendar", "gmail", "instagram"],
} as const;
export type OAuthFamily = keyof typeof OAUTH_PROVIDERS;
const defaultOrigin = "https://thedashboard.agbcoaching.com";
export function safeOAuthOrigin(value: string | null) {
  try {
    const origin = new URL(value || defaultOrigin).origin;
    if (
      [
        defaultOrigin,
        "https://thecontrollables.lovable.app",
        "https://preview--thecontrollables.lovable.app",
        "https://62a2f598-751b-472c-b5a8-1befa73c4ea2.lovableproject.com",
        "https://id-preview--62a2f598-751b-472c-b5a8-1befa73c4ea2.lovable.app",
      ].includes(origin) ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    )
      return origin;
  } catch {
    /* Invalid origins use the fixed application origin. */
  }
  return defaultOrigin;
}
export const oauthHeaders = (req: Request) => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": safeOAuthOrigin(req.headers.get("origin")),
  "Access-Control-Allow-Headers":
    "authorization,x-client-info,apikey,content-type,x-supabase-client-platform,x-supabase-client-platform-version,x-supabase-client-runtime,x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  Vary: "Origin",
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
});
const hash = async (state: string) =>
  Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state)),
    ),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const validState = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export async function issueOAuthState(
  userId: string,
  provider: string,
  origin: string | null,
) {
  const admin = oauthAdmin();
  const state = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const { error } = await admin.from("oauth_state_requests").upsert(
    {
      state_hash: await hash(state),
      user_id: userId,
      provider,
      return_origin: safeOAuthOrigin(origin),
      expires_at: new Date(Date.now() + 600_000).toISOString(),
    },
    { onConflict: "user_id,provider" },
  );
  if (error) throw Error("oauth_state_unavailable");
  return state;
}
/** GET never exchanges codes or writes credentials. Finalization requires the
 * initiating account's authenticated POST, so copying a state cannot attach a
 * victim's provider to another UUID. DELETE consumes the nonce atomically. */
export async function receiveOAuth(
  req: Request,
  family: OAuthFamily,
): Promise<
  | { response: Response }
  | { admin: Admin; userId: string; provider: string; code: string }
> {
  const headers = oauthHeaders(req),
    json = (error: string, status: number) => ({
      response: new Response(JSON.stringify({ error }), { status, headers }),
    });
  if (req.method === "OPTIONS")
    return { response: new Response(null, { status: 204, headers }) };
  const admin = oauthAdmin();
  if (req.method === "GET") {
    const url = new URL(req.url),
      code = url.searchParams.get("code"),
      state = url.searchParams.get("state");
    const reconnect = (origin: string) => ({
      response: new Response(null, {
        status: 303,
        headers: {
          ...headers,
          Location:
            origin +
            (family === "wearable"
              ? "/wellness?wearable_error=restart_connection"
              : "/integrations?integration_error=restart_connection"),
        },
      }),
    });
    if (!validState(state)) return reconnect(defaultOrigin);
    const { data, error } = await admin
      .from("oauth_state_requests")
      .select("provider,return_origin")
      .eq("state_hash", await hash(state))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (
      error ||
      !data ||
      !(OAUTH_PROVIDERS[family] as readonly string[]).includes(data.provider)
    )
      return reconnect(defaultOrigin);
    if (!code || code.length > 4096 || url.searchParams.has("error"))
      return reconnect(safeOAuthOrigin(data.return_origin));
    const target = new URL(
      family === "wearable" ? "/wellness" : "/integrations",
      safeOAuthOrigin(data.return_origin),
    );
    target.hash = new URLSearchParams({
      oauth_return: family,
      code,
      state,
    }).toString();
    return {
      response: new Response(null, {
        status: 303,
        headers: { ...headers, Location: target.toString() },
      }),
    };
  }
  if (req.method !== "POST") return json("method_not_allowed", 405);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json("unauthorized", 401);
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json("unauthorized", 401);
  const raw = await req.text();
  if (raw.length > 8192) return json("invalid_payload", 413);
  let input: { state?: unknown; code?: unknown };
  try {
    input = JSON.parse(raw);
  } catch {
    return json("invalid_payload", 400);
  }
  if (
    !validState(input.state) ||
    typeof input.code !== "string" ||
    !input.code ||
    input.code.length > 4096
  )
    return json("invalid_state", 400);
  const { data, error } = await admin
    .from("oauth_state_requests")
    .delete()
    .eq("state_hash", await hash(input.state))
    .eq("user_id", auth.user.id)
    .in("provider", OAUTH_PROVIDERS[family])
    .gt("expires_at", new Date().toISOString())
    .select("provider")
    .maybeSingle();
  if (
    error ||
    !data ||
    !(OAUTH_PROVIDERS[family] as readonly string[]).includes(data.provider)
  )
    return json("invalid_state", 400);
  return {
    admin,
    userId: auth.user.id,
    provider: data.provider,
    code: input.code,
  };
}
