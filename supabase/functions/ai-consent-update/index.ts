import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALLOWED_KEYS = new Set([
  "calendar_context",
  "body_context",
  "money_context",
  "email_summary_context",
  "memory_enabled",
  "push_nudges_enabled",
  "email_nudges_enabled",
]);

const toJson = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return toJson({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return toJson({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const patch = body.patch && typeof body.patch === "object" ? body.patch : {};
    const updates: Record<string, boolean | string> = {};

    for (const [key, value] of Object.entries(patch)) {
      if (ALLOWED_KEYS.has(key) && typeof value === "boolean") {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) return toJson({ error: "No valid consent updates provided" }, 400);
    updates.updated_at = new Date().toISOString();

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await admin
      .from("ai_consents")
      .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" })
      .select("*")
      .single();

    if (error) throw error;
    return toJson({ consents: data });
  } catch (error) {
    console.error("ai-consent-update error:", error);
    return toJson({ error: "Internal server error" }, 500);
  }
});
