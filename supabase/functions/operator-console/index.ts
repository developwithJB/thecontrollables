import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OperatorAction {
  id: string;
  label: string;
  deep_link: string | null;
  xp_reward: number;
}

interface OperatorResponse {
  mode: string;
  headline: string;
  summary: string;
  rationale: string;
  recommended_actions: OperatorAction[];
  alternate_actions: OperatorAction[];
  warnings: string[];
  fallback_if_low_energy: { label: string; deep_link: string } | null;
  confidence: number;
  generated_by: "ai" | "rules";
}

// Command → mode mapping
const COMMAND_MODES: Record<string, string> = {
  "replan my day": "plan",
  "replan": "plan",
  "simplify today": "focus",
  "simplify": "focus",
  "what am i missing": "review",
  "missing": "review",
  "prep tomorrow": "plan",
  "tomorrow": "plan",
  "i feel off": "recovery",
  "feel off": "recovery",
  "low energy": "recovery",
  "recovery": "recovery",
  "focus": "focus",
  "review": "review",
};

function detectMode(command: string | null): string {
  if (!command) return "plan";
  const lower = command.toLowerCase().trim();
  for (const [key, mode] of Object.entries(COMMAND_MODES)) {
    if (lower.includes(key)) return mode;
  }
  return "plan";
}

function buildRulesResponse(ctx: {
  hasActiveSnapshot: boolean;
  currentDay: number;
  snapshotJourney: string | null;
  pendingPromises: Array<{ id: string; promise_text: string; due_date: string | null }>;
  todayPlannerItems: Array<{ id: string; title: string; item_type: string; status: string }>;
  wellnessLoggedToday: boolean;
  buildWeakest: string | null;
  wellnessStreak: number;
  lastMealLogDate: string | null;
  billsDueThisWeek: Array<{ bill_name: string; amount: number; due_date: number }>;
  mode: string;
  today: string;
}): OperatorResponse {
  const {
    hasActiveSnapshot,
    currentDay,
    pendingPromises,
    todayPlannerItems,
    wellnessLoggedToday,
    buildWeakest,
    wellnessStreak,
    lastMealLogDate,
    billsDueThisWeek,
    mode,
    today,
  } = ctx;

  const actions: OperatorAction[] = [];
  const warnings: string[] = [];
  let headline = "";
  let summary = "";
  let rationale = "";

  // Priority items based on mode
  if (mode === "recovery") {
    headline = "Take it easy today";
    summary = "Focus on one small win. Everything else can wait.";
    rationale = "You indicated low energy. Recovery mode prioritizes wellness and minimal commitments.";

    if (hasActiveSnapshot) {
      actions.push({
        id: "recovery_snapshot",
        label: `Complete Day ${currentDay} check-in`,
        deep_link: "/reset",
        xp_reward: 10,
      });
    }
    if (!wellnessLoggedToday) {
      actions.push({
        id: "recovery_wellness",
        label: "Log a quick wellness check",
        deep_link: "/dashboard",
        xp_reward: 5,
      });
    }
  } else if (mode === "focus") {
    const incompleteTasks = todayPlannerItems.filter(
      (i) => i.status === "todo"
    );
    headline =
      incompleteTasks.length > 3
        ? `Simplify: pick your top 2 of ${incompleteTasks.length} tasks`
        : "Stay focused on what matters";
    summary =
      incompleteTasks.length > 3
        ? "You have too many tasks today. Do less, do it well."
        : "Your plate looks manageable. Execute with intention.";
    rationale = `Based on ${incompleteTasks.length} pending planner items for today.`;

    incompleteTasks.slice(0, 2).forEach((task, i) => {
      actions.push({
        id: `focus_task_${i}`,
        label: task.title,
        deep_link: "/planner",
        xp_reward: 10,
      });
    });
  } else if (mode === "review") {
    headline = "Here's what needs attention";
    const gaps: string[] = [];
    if (!wellnessLoggedToday) gaps.push("wellness");
    if (!hasActiveSnapshot) gaps.push("no active snapshot");
    if (pendingPromises.length > 0)
      gaps.push(`${pendingPromises.length} open promises`);
    if (billsDueThisWeek.length > 0)
      gaps.push(`${billsDueThisWeek.length} bills due this week`);

    summary =
      gaps.length > 0
        ? `Gaps found: ${gaps.join(", ")}`
        : "Everything looks good. Keep your momentum.";
    rationale = "Scanned all modules for missed items and open loops.";

    if (!wellnessLoggedToday) {
      actions.push({
        id: "review_wellness",
        label: "Log wellness",
        deep_link: "/dashboard",
        xp_reward: 5,
      });
    }
    if (pendingPromises.length > 0) {
      actions.push({
        id: "review_promises",
        label: `Review ${pendingPromises.length} promises`,
        deep_link: "/dashboard",
        xp_reward: 10,
      });
    }
    if (billsDueThisWeek.length > 0) {
      actions.push({
        id: "review_bills",
        label: `Check bills due this week`,
        deep_link: "/money",
        xp_reward: 5,
      });
    }
  } else {
    // Default: plan mode
    headline = hasActiveSnapshot
      ? `Day ${currentDay} — here's your plan`
      : "Set your priorities for today";

    const parts: string[] = [];
    if (hasActiveSnapshot) parts.push(`Snapshot Day ${currentDay}`);
    if (todayPlannerItems.length > 0)
      parts.push(`${todayPlannerItems.length} planner items`);
    if (pendingPromises.length > 0)
      parts.push(`${pendingPromises.length} open promises`);

    summary = parts.length > 0 ? parts.join(" · ") : "Start with one intentional action.";

    rationale = hasActiveSnapshot
      ? `Your active snapshot is on Day ${currentDay}. ${wellnessStreak > 0 ? `${wellnessStreak}-day wellness streak going.` : "No wellness streak yet."}`
      : `${buildWeakest ? `Your weakest area is ${buildWeakest}. ` : ""}Focus on high-leverage actions today.`;

    // Build actions
    if (hasActiveSnapshot) {
      actions.push({
        id: "plan_snapshot",
        label: `Complete Day ${currentDay} Snapshot`,
        deep_link: "/reset",
        xp_reward: 10,
      });
    }
    const overduePromise = pendingPromises.find(
      (p) => p.due_date && new Date(p.due_date) <= new Date(today)
    );
    if (overduePromise) {
      actions.push({
        id: "plan_promise",
        label: `Resolve: "${overduePromise.promise_text.slice(0, 40)}"`,
        deep_link: "/dashboard",
        xp_reward: 10,
      });
    }
    const firstTask = todayPlannerItems.find(
      (i) => i.status === "todo" && i.item_type === "task"
    );
    if (firstTask && actions.length < 3) {
      actions.push({
        id: "plan_task",
        label: firstTask.title,
        deep_link: "/planner",
        xp_reward: 10,
      });
    }
    if (!wellnessLoggedToday && actions.length < 3) {
      actions.push({
        id: "plan_wellness",
        label: "Log wellness check-in",
        deep_link: "/dashboard",
        xp_reward: 5,
      });
    }
  }

  // Warnings
  if (lastMealLogDate) {
    const daysSinceMeal = Math.floor(
      (new Date(today).getTime() - new Date(lastMealLogDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceMeal >= 3) {
      warnings.push(`You haven't logged meals in ${daysSinceMeal} days`);
    }
  }
  if (pendingPromises.length > 3) {
    warnings.push(`${pendingPromises.length} unresolved promises — open loops drain energy`);
  }

  const alternates: OperatorAction[] = [];
  if (todayPlannerItems.length > 0) {
    alternates.push({
      id: "alt_planner",
      label: "Open Plan",
      deep_link: "/planner",
      xp_reward: 0,
    });
  }

  return {
    mode,
    headline,
    summary,
    rationale,
    recommended_actions: actions.slice(0, 4),
    alternate_actions: alternates.slice(0, 2),
    warnings,
    fallback_if_low_energy: {
      label: hasActiveSnapshot
        ? `Just do your Day ${currentDay} check-in`
        : "Log a 5-min wellness check",
      deep_link: hasActiveSnapshot ? "/reset" : "/dashboard",
    },
    confidence: 0.6,
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

    let command: string | null = null;
    let localDate: string | null = null;
    let timezone = "UTC";

    try {
      const body = await req.json();
      command = body?.command || null;
      localDate = body?.localDate || null;
      timezone = body?.timezone || "UTC";
    } catch {
      // no body
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const today = localDate || new Date().toISOString().split("T")[0];
    const mode = detectMode(command);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check cache (non-command requests)
    if (!command) {
      const { data: cached } = await admin
        .from("operator_suggestions")
        .select("*")
        .eq("user_id", userId)
        .eq("suggestion_date", today)
        .eq("mode", mode)
        .maybeSingle();

      if (cached && cached.status !== "dismissed") {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Gather context in parallel
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      activeSessionRes,
      plannerItemsRes,
      pendingPromisesRes,
      wellnessLogsRes,
      buildCurrentRes,
      billsRes,
      lastMealRes,
      observationsRes,
      preferencesRes,
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
        .select("id, title, item_type, status")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .order("sort_order", { ascending: true }),
      admin
        .from("integrity_logs")
        .select("id, promise_text, due_date")
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
        .select("awareness, perspective, habit, wellness, environment")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("recurring_bills")
        .select("bill_name, amount, due_date")
        .eq("user_id", userId)
        .eq("is_active", true),
      admin
        .from("meal_logs")
        .select("log_date")
        .eq("user_id", userId)
        .order("log_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("user_observations")
        .select("observation_type, title, description, confidence, status")
        .eq("user_id", userId)
        .neq("status", "dismissed")
        .gte("confidence", 0.65)
        .order("last_seen_at", { ascending: false })
        .limit(5),
      admin
        .from("user_preferences_inferred")
        .select("preference_key, preference_value, confidence")
        .eq("user_id", userId),
    ]);

    const activeSession = activeSessionRes.data;
    const plannerItems = plannerItemsRes.data || [];
    const pendingPromises = pendingPromisesRes.data || [];
    const wellnessLogs = wellnessLogsRes.data || [];
    const buildCurrent = buildCurrentRes.data;
    const allBills = billsRes.data || [];
    const lastMealLog = lastMealRes.data;
    const userObservations = observationsRes.data || [];
    const userPreferences = preferencesRes.data || [];

    const wellnessLoggedToday = wellnessLogs.some((l: any) => l.log_date === today);
    const wellnessStreak = wellnessLogs.length;

    // Bills due this week (due_date is day of month 1-31)
    const todayDate = new Date(today);
    const dayOfMonth = todayDate.getDate();
    const billsDueThisWeek = allBills.filter((b: any) => {
      const diff = b.due_date - dayOfMonth;
      return diff >= 0 && diff <= 7;
    });

    // Find weakest build controllable
    let buildWeakest: string | null = null;
    if (buildCurrent) {
      const scores: Record<string, number> = {
        awareness: Number(buildCurrent.awareness) || 0,
        perspective: Number(buildCurrent.perspective) || 0,
        habit: Number(buildCurrent.habit) || 0,
        wellness: Number(buildCurrent.wellness) || 0,
        environment: Number(buildCurrent.environment) || 0,
      };
      buildWeakest =
        Object.entries(scores).sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
    }

    const contextData = {
      hasActiveSnapshot: !!activeSession,
      currentDay: activeSession?.current_day ?? 1,
      snapshotJourney: activeSession?.journey_id ?? null,
      pendingPromises,
      todayPlannerItems: plannerItems,
      wellnessLoggedToday,
      buildWeakest,
      wellnessStreak,
      lastMealLogDate: lastMealLog?.log_date ?? null,
      billsDueThisWeek,
      mode,
      today,
    };

    let response: OperatorResponse;

    // Try AI generation
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableApiKey) {
      try {
        const systemPrompt = `You are an AI operator for a personal life management system called "The Controllables." Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "mode": "${mode}",
  "headline": string (1 line, punchy),
  "summary": string (1-2 sentences, grounded in data),
  "rationale": string (why this recommendation, referencing actual user data),
  "recommended_actions": [{"id": string, "label": string (action verb, <8 words), "deep_link": string, "xp_reward": number}] (max 4),
  "alternate_actions": [{"id": string, "label": string, "deep_link": string|null, "xp_reward": number}] (max 2),
  "warnings": [string] (max 2, only real issues),
  "fallback_if_low_energy": {"label": string, "deep_link": string},
  "confidence": number (0-1),
  "generated_by": "ai"
}
Mode: ${mode}
deep_link values: "/reset", "/planner", "/dashboard", "/money"
${command ? `User command: "${command}"` : "Default daily plan."}
${mode === "recovery" ? "Prioritize wellness and minimal commitments. Be gentle." : ""}
${mode === "focus" ? "Keep only top 2 items. Defer everything else." : ""}
${mode === "review" ? "Scan all areas for gaps and missed items." : ""}`;

        const observationsSummary = userObservations.length > 0
          ? `\nSystem observations: ${userObservations.map((o: any) => `${o.title} (${Math.round(o.confidence * 100)}% confidence)`).join("; ")}`
          : "";
        const preferencesSummary = userPreferences.length > 0
          ? `\nLearned preferences: ${userPreferences.map((p: any) => `${p.preference_key}: ${JSON.stringify(p.preference_value)}`).join("; ")}`
          : "";

        const userPrompt = `Today: ${today}
Active Snapshot: ${activeSession ? `Day ${activeSession.current_day}, Journey: ${activeSession.journey_id || "none"}` : "None"}
Planner items today (${plannerItems.length}): ${plannerItems.slice(0, 5).map((i: any) => `${i.title} [${i.status}]`).join(", ") || "none"}
Pending promises (${pendingPromises.length}): ${pendingPromises.slice(0, 3).map((p: any) => `"${p.promise_text.slice(0, 40)}"`).join(", ") || "none"}
Wellness logged today: ${wellnessLoggedToday}
Wellness streak: ${wellnessStreak} days
Build weakest: ${buildWeakest || "unknown"}
Bills due this week: ${billsDueThisWeek.length > 0 ? billsDueThisWeek.map((b: any) => `${b.bill_name} ($${b.amount})`).join(", ") : "none"}
Last meal log: ${lastMealLog?.log_date || "never"}${observationsSummary}${preferencesSummary}`;

        const aiRes = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
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
              temperature: 0.6,
            }),
          }
        );

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const rawContent = aiData.choices?.[0]?.message?.content ?? "";
          const jsonStr = rawContent
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          response = JSON.parse(jsonStr) as OperatorResponse;
          response.generated_by = "ai";
        } else {
          throw new Error(`AI returned ${aiRes.status}`);
        }
      } catch (aiErr) {
        console.error("AI operator failed, falling back to rules:", aiErr);
        response = buildRulesResponse(contextData);
      }
    } else {
      response = buildRulesResponse(contextData);
    }

    // Persist suggestion (upsert by user_id + date + mode)
    await admin.from("operator_suggestions").upsert(
      {
        user_id: userId,
        suggestion_date: today,
        mode: response.mode,
        headline: response.headline,
        summary: response.summary,
        rationale: response.rationale,
        recommended_actions: response.recommended_actions,
        alternate_actions: response.alternate_actions,
        warnings: response.warnings,
        confidence: response.confidence,
        generated_by: response.generated_by,
        status: "pending",
      },
      { onConflict: "user_id,suggestion_date,mode" }
    );

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("operator-console error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
