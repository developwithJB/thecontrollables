/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOMAINS = new Set(["planner", "body", "money", "growth", "communication", "general"]);
type PlanTier = "free" | "plus" | "pro" | "premium" | "lifetime";
const MEMORY_LIMITS: Record<PlanTier, number> = {
  free: 0,
  plus: 5,
  pro: 200,
  premium: 1000,
  lifetime: 1000,
};
const AI_LIMIT_MESSAGE = "You've used your free AI plans for this month. Upgrade to keep your AI learning you.";

const toJson = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizePlanTier = (value: unknown): PlanTier => {
  if (value === "plus" || value === "pro" || value === "premium" || value === "lifetime") return value;
  return "free";
};

async function getPlanTier(admin: any, userId: string): Promise<PlanTier> {
  const { data } = await admin
    .from("user_entitlements")
    .select("plan_tier, expires_at, current_period_end")
    .eq("user_id", userId)
    .eq("entitlement_type", "full_access")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return "free";
  const expiresAt = data.current_period_end || data.expires_at;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) return "free";
  return normalizePlanTier(data.plan_tier);
}

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
    const action = body.action === "create" || body.action === "archive" ? body.action : null;
    if (!action) return toJson({ error: "Invalid action" }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const userId = user.id;

    if (action === "archive") {
      const memoryId = typeof body.memoryId === "string" ? body.memoryId : null;
      if (!memoryId) return toJson({ error: "memoryId is required" }, 400);

      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("ai_memories")
        .update({ archived_at: now, updated_at: now })
        .eq("id", memoryId)
        .eq("user_id", userId)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return toJson({ error: "Memory not found" }, 404);

      await admin.from("ai_feedback_events").insert({
        user_id: userId,
        feedback_type: "memory_archived",
        metadata: { memory_id: memoryId },
      });

      return toJson({ memory: data });
    }

    const { data: consents } = await admin
      .from("ai_consents")
      .select("memory_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    if (consents?.memory_enabled !== true) {
      return toJson({
        error: "Memory is disabled",
        memory_limited: true,
        limit_message: "Turn on memory in AI settings before saving personalization.",
      }, 403);
    }

    const planTier = await getPlanTier(admin, userId);
    const memoryLimit = MEMORY_LIMITS[planTier];
    const { count: activeMemoryCount } = await admin
      .from("ai_memories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("archived_at", null);

    if ((activeMemoryCount || 0) >= memoryLimit) {
      return toJson({
        error: "Memory limit reached",
        memory_limited: true,
        upgrade_required: planTier === "free",
        limit_message: planTier === "free" ? AI_LIMIT_MESSAGE : "Your AI memory limit is full. Archive old memories or upgrade for more personalization.",
        usage_limits: {
          plan_tier: planTier,
          mode: "memory",
          limit: memoryLimit,
          used: activeMemoryCount || 0,
          remaining: 0,
        },
      }, 403);
    }

    const memory = body.memory && typeof body.memory === "object" ? body.memory : {};
    const domain = DOMAINS.has(memory.domain) ? memory.domain : "general";
    const content = typeof memory.content === "string" ? memory.content.trim().slice(0, 500) : "";
    if (!content) return toJson({ error: "Memory content is required" }, 400);

    const confidence = typeof memory.confidence === "number"
      ? Math.min(1, Math.max(0, memory.confidence))
      : 0.8;

    const { data, error } = await admin
      .from("ai_memories")
      .insert({
        user_id: userId,
        domain,
        content,
        confidence,
        source: typeof memory.source === "string" ? memory.source.slice(0, 80) : "user_confirmed",
        metadata: memory.metadata && typeof memory.metadata === "object" ? memory.metadata : {},
      })
      .select("*")
      .single();

    if (error) throw error;

    await admin.from("ai_feedback_events").insert({
      user_id: userId,
      feedback_type: "memory_created",
      metadata: { memory_id: data.id, domain },
    });

    return toJson({ memory: data });
  } catch (error) {
    console.error("ai-memory-update error:", error);
    return toJson({ error: "Internal server error" }, 500);
  }
});
