import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather 7-day aggregated metrics
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();

    const [
      eventsResult,
      actionsResult,
      resetsResult,
      sessionsResult,
      entitlementsResult,
      onboardingResult,
      totalUsersResult,
      wellnessResult,
    ] = await Promise.all([
      adminClient.from("app_events").select("event_name, created_at").gte("created_at", weekAgoISO),
      adminClient.from("completed_actions").select("controllable, created_at, user_id").gte("created_at", weekAgoISO),
      adminClient.from("daily_resets").select("user_id, created_at").gte("created_at", weekAgoISO),
      adminClient.from("reset_sessions").select("id, status, user_id, start_date, completed_at"),
      adminClient.from("user_entitlements").select("user_id, granted_at, expires_at, source"),
      adminClient.from("user_onboarding").select("user_id, simplified_mode_completed, created_at, first_action_completed_at"),
      adminClient.auth.admin.listUsers({ perPage: 1000 }),
      adminClient.from("wellness_logs").select("user_id, sleep_rating, movement_rating, nutrition_rating").gte("created_at", weekAgoISO),
    ]);

    // Aggregate events by name and day-of-week
    const eventsByName: Record<string, number> = {};
    const eventsByDow: Record<number, number> = {};
    for (const e of eventsResult.data || []) {
      eventsByName[e.event_name] = (eventsByName[e.event_name] || 0) + 1;
      const dow = new Date(e.created_at).getDay();
      eventsByDow[dow] = (eventsByDow[dow] || 0) + 1;
    }

    // Aggregate actions by controllable
    const actionsByControllable: Record<string, number> = {};
    const actionUserIds = new Set<string>();
    for (const a of actionsResult.data || []) {
      const key = a.controllable || "unknown";
      actionsByControllable[key] = (actionsByControllable[key] || 0) + 1;
      actionUserIds.add(a.user_id);
    }

    // Reset count per user
    const resetsByUser: Record<string, number> = {};
    for (const r of resetsResult.data || []) {
      resetsByUser[r.user_id] = (resetsByUser[r.user_id] || 0) + 1;
    }
    const avgResetsPerUser = Object.keys(resetsByUser).length > 0
      ? Object.values(resetsByUser).reduce((a, b) => a + b, 0) / Object.keys(resetsByUser).length
      : 0;

    // Session stats
    const allSessions = sessionsResult.data || [];
    const completedSessions = allSessions.filter((s: any) => s.status === "completed").length;
    const activeSessions = allSessions.filter((s: any) => s.status === "active").length;

    // Entitlement/conversion
    const totalUsers = totalUsersResult.data?.users?.length || 0;
    const activeEntitlements = (entitlementsResult.data || []).filter(
      (e: any) => !e.expires_at || new Date(e.expires_at) > now
    );
    const paidUsers = new Set(activeEntitlements.map((e: any) => e.user_id)).size;

    // Onboarding / activation delay
    const onboardingData = onboardingResult.data || [];
    const activationDelays: number[] = [];
    const allUserMap = new Map((totalUsersResult.data?.users || []).map((u: any) => [u.id, u]));
    for (const o of onboardingData) {
      if (o.first_action_completed_at) {
        const user = allUserMap.get(o.user_id);
        if (user) {
          const delay = (new Date(o.first_action_completed_at).getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24);
          activationDelays.push(Math.max(0, delay));
        }
      }
    }
    const avgActivationDelay = activationDelays.length > 0
      ? activationDelays.reduce((a, b) => a + b, 0) / activationDelays.length
      : 0;

    // Wellness averages
    const wellnessData = wellnessResult.data || [];
    const avgSleep = wellnessData.length > 0
      ? wellnessData.filter((w: any) => w.sleep_rating).reduce((s: number, w: any) => s + w.sleep_rating, 0) / wellnessData.filter((w: any) => w.sleep_rating).length || 0
      : 0;

    const metricsBlob = {
      period: "last_7_days",
      totalUsers,
      paidUsers,
      freeUsers: totalUsers - paidUsers,
      conversionRate: totalUsers > 0 ? ((paidUsers / totalUsers) * 100).toFixed(1) + "%" : "0%",
      eventsByName: Object.entries(eventsByName).sort((a, b) => b[1] - a[1]).slice(0, 15),
      eventsByDayOfWeek: eventsByDow,
      actionsByControllable,
      activeUsersWithActions: actionUserIds.size,
      avgResetsPerActiveUser: avgResetsPerUser.toFixed(1),
      totalSessions: allSessions.length,
      completedSessions,
      activeSessions,
      completionRate: allSessions.length > 0 ? ((completedSessions / allSessions.length) * 100).toFixed(1) + "%" : "0%",
      avgActivationDelayDays: avgActivationDelay.toFixed(1),
      avgSleepRating: avgSleep.toFixed(1),
      wellnessLogsCount: wellnessData.length,
    };

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a product analytics advisor for a personal growth app called "The Controllables." The app uses 7-day Snapshots, daily check-ins, and 5 focus areas (Awareness, Perspective, Habit, Wellness, Environment). Users track promises, time investment, and wellness. Generate actionable, data-driven insights.`,
          },
          {
            role: "user",
            content: `Here are the aggregated metrics from the last 7 days (no PII included):\n\n${JSON.stringify(metricsBlob, null, 2)}\n\nGenerate insights using the generate_insights tool.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_insights",
              description: "Generate structured weekly insights for the admin dashboard.",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["behavioral", "retention_risk", "growth_opportunity", "experiment"],
                        },
                        title: { type: "string" },
                        detail: { type: "string" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["type", "title", "detail", "confidence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI returned unexpected format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        insights: parsed.insights || [],
        generatedAt: now.toISOString(),
        metricsSnapshot: metricsBlob,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("admin-insights error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
