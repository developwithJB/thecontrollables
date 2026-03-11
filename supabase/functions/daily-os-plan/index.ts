import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanItem {
  id: string;
  title: string;
  reason: string;
  source: string;
  deep_link: string;
}

interface TimeBlock {
  title: string;
  start: string;
  end: string;
  energy: string;
  source: string;
}

interface QuickWin {
  id: string;
  title: string;
  action_link: string;
  reason: string;
}

interface Blocker {
  text: string;
  reason: string;
}

interface FallbackPlan {
  title: string;
  description: string;
  items: string[];
}

interface OSPlan {
  top_three: PlanItem[];
  suggested_time_blocks: TimeBlock[];
  quick_wins: QuickWin[];
  blockers_or_risks: Blocker[];
  fallback_plan: FallbackPlan;
  why_today: string;
  generated_by: "ai" | "rules";
}

function buildRulesPlan(context: {
  hasActiveSnapshot: boolean;
  currentDay: number;
  snapshotControllable: string | null;
  pendingPromises: Array<{ id: string; promise_text: string; due_date: string | null }>;
  todayPlannerItems: Array<{ id: string; title: string; item_type: string }>;
  wellnessLoggedToday: boolean;
  buildWeakest: string | null;
  wellnessStreak: number;
}): OSPlan {
  const {
    hasActiveSnapshot,
    currentDay,
    snapshotControllable,
    pendingPromises,
    todayPlannerItems,
    wellnessLoggedToday,
    buildWeakest,
    wellnessStreak,
  } = context;

  const topThree: PlanItem[] = [];

  // Priority 1: Snapshot check-in
  if (hasActiveSnapshot) {
    topThree.push({
      id: "snapshot_checkin",
      title: `Complete Day ${currentDay} Snapshot`,
      reason: "Daily check-in keeps your streak alive and builds momentum",
      source: "Snapshot",
      deep_link: "/reset",
    });
  }

  // Priority 2: Pending promises due today or overdue
  const overduePromise = pendingPromises.find(
    (p) => p.due_date && new Date(p.due_date) <= new Date()
  );
  if (overduePromise && topThree.length < 3) {
    topThree.push({
      id: `promise_${overduePromise.id}`,
      title: `Review promise: "${overduePromise.promise_text.slice(0, 50)}${overduePromise.promise_text.length > 50 ? "…" : ""}"`,
      reason: overduePromise.due_date
        ? `Due ${new Date(overduePromise.due_date).toLocaleDateString()}`
        : "Pending integrity review",
      source: "Promise",
      deep_link: "/dashboard",
    });
  }

  // Priority 3: First planner task
  const firstTask = todayPlannerItems.find((i) => i.item_type === "task");
  if (firstTask && topThree.length < 3) {
    topThree.push({
      id: `planner_${firstTask.id}`,
      title: firstTask.title,
      reason: "Scheduled for today in your planner",
      source: "Planner",
      deep_link: "/planner",
    });
  }

  // Fill to 3 if needed
  if (!wellnessLoggedToday && topThree.length < 3) {
    topThree.push({
      id: "wellness_log",
      title: "Log your wellness check-in",
      reason: "Tracking sleep, movement, and nutrition builds your Body score",
      source: "Wellness",
      deep_link: "/dashboard",
    });
  }


  const quickWins: QuickWin[] = [];
  if (!wellnessLoggedToday) {
    quickWins.push({
      id: "qw_wellness",
      title: "Log wellness",
      action_link: "/dashboard",
      reason: "2 min habit",
    });
  }
  quickWins.push({
    id: "qw_planner",
    title: "Open Planner",
    action_link: "/planner",
    reason: "Plan your day",
  });
  if (pendingPromises.length > 0) {
    quickWins.push({
      id: "qw_promises",
      title: "Review promises",
      action_link: "/dashboard",
      reason: `${pendingPromises.length} pending`,
    });
  }

  const blockers: Blocker[] = [];
  if (pendingPromises.length > 2) {
    blockers.push({
      text: `${pendingPromises.length} unresolved promises`,
      reason: "Open loops drain mental energy and reduce integrity score",
    });
  }
  if (wellnessStreak === 0 && hasActiveSnapshot) {
    blockers.push({
      text: "No wellness streak active",
      reason: "Consistent tracking predicts Snapshot completion success",
    });
  }

  const weakestName = buildWeakest
    ? buildWeakest.charAt(0).toUpperCase() + buildWeakest.slice(1)
    : "your weakest area";

  const whyToday = hasActiveSnapshot
    ? `Day ${currentDay} of your active Snapshot${snapshotControllable ? ` — focused on ${snapshotControllable}` : ""}. ${wellnessStreak > 0 ? `You're on a ${wellnessStreak}-day streak. Keep it going.` : "Start a wellness streak today to build momentum."}`
    : `Your Build score shows ${weakestName} needs attention. These three priorities give you the highest return today.`;

  return {
    top_three: topThree.slice(0, 3),
    suggested_time_blocks: todayPlannerItems
      .filter((i) => i.item_type === "time_block")
      .slice(0, 3)
      .map((i) => ({
        title: i.title,
        start: "09:00",
        end: "10:00",
        energy: "medium",
        source: "Planner",
      })),
    quick_wins: quickWins.slice(0, 4),
    blockers_or_risks: blockers,
    fallback_plan: {
      title: "Low Energy Mode",
      description: "If today goes sideways, do just these two things:",
      items: [
        hasActiveSnapshot ? `Complete Day ${currentDay} check-in (5 min)` : "Log a 5-min wellness check-in",
        "Keep one promise — even a small one",
      ],
    },
    why_today: whyToday,
    generated_by: "rules",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let forceRefresh = false;
    let localDate: string | null = null;
    let timezone = "UTC";

    try {
      const body = await req.json();
      forceRefresh = body?.forceRefresh === true;
      localDate = body?.localDate || null;
      timezone = body?.timezone || "UTC";
    } catch {
      // no body
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth client (user scoped)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const today = localDate || new Date().toISOString().split("T")[0];

    // Service role client for broad reads
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check if we have a cached plan for today
    const { data: existingPlan } = await admin
      .from("daily_os_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", today)
      .maybeSingle();

    if (existingPlan && !forceRefresh) {
      return new Response(
        JSON.stringify({ plan: existingPlan.plan_data, cached: true, generated_by: existingPlan.plan_data?.generated_by ?? "rules", plan_id: existingPlan.id, interactions: existingPlan.interactions, refresh_count: existingPlan.refresh_count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Max 3 refreshes per day
    if (existingPlan && forceRefresh && existingPlan.refresh_count >= 3) {
      return new Response(
        JSON.stringify({ plan: existingPlan.plan_data, cached: true, generated_by: existingPlan.plan_data?.generated_by ?? "rules", plan_id: existingPlan.id, interactions: existingPlan.interactions, refresh_count: existingPlan.refresh_count, refresh_limit_reached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Gather context in parallel
    const [
      activeSessionRes,
      plannerItemsRes,
      pendingPromisesRes,
      wellnessLogsRes,
      userBuildCurrentRes,
      entitlementsRes,
      completedActionsRes,
    ] = await Promise.all([
      admin
        .from("reset_sessions")
        .select("id, current_day, journey_id, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("planner_items")
        .select("id, title, item_type, status, start_time, end_time, energy_level")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .order("sort_order", { ascending: true }),
      admin
        .from("integrity_logs")
        .select("id, promise_text, due_date, promised_at")
        .eq("user_id", userId)
        .is("kept", null)
        .order("promised_at", { ascending: false })
        .limit(10),
      admin
        .from("wellness_logs")
        .select("log_date")
        .eq("user_id", userId)
        .gte("log_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("log_date", { ascending: false }),
      admin
        .from("user_build_current")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("user_entitlements")
        .select("entitlement_type, expires_at")
        .eq("user_id", userId)
        .order("granted_at", { ascending: false })
        .limit(5),
      admin
        .from("completed_actions")
        .select("action_text, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", sevenDaysAgo.toISOString())
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

    const activeSession = activeSessionRes.data;
    const plannerItems = plannerItemsRes.data || [];
    const pendingPromises = pendingPromisesRes.data || [];
    const wellnessLogs = wellnessLogsRes.data || [];
    const buildCurrent = userBuildCurrentRes.data;
    const entitlements = entitlementsRes.data || [];
    const recentActions = completedActionsRes.data || [];

    const wellnessLoggedToday = wellnessLogs.some((l) => l.log_date === today);
    const wellnessStreak = wellnessLogs.length; // simplified streak count

    // Determine if paid
    const now = new Date();
    const isPaid = entitlements.some((e) => {
      if (!e.expires_at) return true;
      return new Date(e.expires_at) > now;
    });

    // Find weakest Build controllable
    let buildWeakest: string | null = null;
    if (buildCurrent) {
      const scores: Record<string, number> = {
        awareness: buildCurrent.awareness ?? 0,
        perspective: buildCurrent.perspective ?? 0,
        habit: buildCurrent.habit ?? 0,
        wellness: buildCurrent.wellness ?? 0,
        environment: buildCurrent.environment ?? 0,
      };
      buildWeakest = Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
    }

    const contextData = {
      hasActiveSnapshot: !!activeSession,
      currentDay: activeSession?.current_day ?? 1,
      snapshotControllable: activeSession?.journey_id ?? null,
      pendingPromises,
      todayPlannerItems: plannerItems,
      wellnessLoggedToday,
      buildWeakest,
      wellnessStreak,
    };

    let plan: OSPlan;
    let generatedBy: "ai" | "rules" = "rules";

    // Try AI path for paid users
    if (isPaid) {
      const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
      if (lovableApiKey) {
        try {
          const systemPrompt = `You are a high-performance life operating system. Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "top_three": [{"id": string, "title": string, "reason": string, "source": string, "deep_link": string}],
  "suggested_time_blocks": [{"title": string, "start": string, "end": string, "energy": "low"|"medium"|"high", "source": string}],
  "quick_wins": [{"id": string, "title": string, "action_link": string, "reason": string}],
  "blockers_or_risks": [{"text": string, "reason": string}],
  "fallback_plan": {"title": string, "description": string, "items": string[]},
  "why_today": string,
  "generated_by": "ai"
}
Rules:
- top_three: exactly 3 items, highest-leverage priorities grounded in the user's actual data
- suggested_time_blocks: 2-3 blocks matching planner items or natural focus windows
- quick_wins: 3-4 low-friction actions completable in under 10 min
- blockers_or_risks: 0-2 real risks, skip if none
- fallback_plan: 2 items for low-energy days
- why_today: 1-2 sentences connecting the priorities to the user's real data
- source values: "Snapshot", "Planner", "Promise", "Wellness", "Build", "Guide"
- deep_link values MUST be one of: "/home", "/dashboard", "/planner", "/wellness", "/growth", "/wealth", "/reset". Do NOT invent routes.
- action_link values MUST be one of: "/home", "/dashboard", "/planner", "/wellness", "/growth", "/wealth", "/reset". Do NOT invent routes.`;

          const userPrompt = `Today is ${today}. Here is the user's context:

Active Snapshot: ${activeSession ? `Day ${activeSession.current_day}, Journey: ${activeSession.journey_id || "not set"}` : "No active snapshot"}
Today's Planner Items (${plannerItems.length}): ${plannerItems.slice(0, 5).map((i) => `${i.title} [${i.item_type}]`).join(", ") || "none"}
Pending Promises (${pendingPromises.length}): ${pendingPromises.slice(0, 3).map((p) => `"${p.promise_text.slice(0, 40)}"`).join(", ") || "none"}
Wellness logged today: ${wellnessLoggedToday}
Wellness logs last 7 days: ${wellnessLogs.length}
Build weakest area: ${buildWeakest || "unknown"}
Build archetype: ${buildCurrent?.build_archetype_key || "not assessed"}
Recent completions: ${recentActions.slice(0, 5).map((a) => a.action_text.slice(0, 30)).join(", ") || "none"}

Generate the daily operating plan.`;

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const rawContent = aiData.choices?.[0]?.message?.content ?? "";
            // Strip markdown code fences if present
            const jsonStr = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            const parsed = JSON.parse(jsonStr) as OSPlan;
            parsed.generated_by = "ai";
            plan = parsed;
            generatedBy = "ai";
          } else {
            throw new Error(`AI returned ${aiRes.status}`);
          }
        } catch (aiErr) {
          console.error("AI plan generation failed, falling back to rules:", aiErr);
          plan = buildRulesPlan(contextData);
        }
      } else {
        plan = buildRulesPlan(contextData);
      }
    } else {
      plan = buildRulesPlan(contextData);
    }

    // Persist to daily_os_plans
    const newRefreshCount = existingPlan ? existingPlan.refresh_count + 1 : 0;

    const { data: savedPlan, error: saveError } = await admin
      .from("daily_os_plans")
      .upsert({
        user_id: userId,
        plan_date: today,
        plan_data: plan,
        interactions: existingPlan?.interactions ?? {},
        refresh_count: newRefreshCount,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,plan_date" })
      .select()
      .maybeSingle();

    if (saveError) {
      console.error("Failed to save daily OS plan:", saveError);
    }

    return new Response(
      JSON.stringify({
        plan,
        cached: false,
        generated_by: generatedBy,
        plan_id: savedPlan?.id ?? null,
        interactions: savedPlan?.interactions ?? {},
        refresh_count: newRefreshCount,
        refresh_limit_reached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("daily-os-plan error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
