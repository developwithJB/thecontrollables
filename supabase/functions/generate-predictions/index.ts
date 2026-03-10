import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Prediction {
  prediction_type: string;
  forecast: string;
  confidence: number;
  reasons: string[];
  recommended_intervention: string;
  intervention_deep_link: string;
  urgency: "low" | "medium" | "high";
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const today = new Date().toISOString().split("T")[0];

    // Check cache first
    const { data: cached } = await admin
      .from("user_predictions")
      .select("*")
      .eq("user_id", userId)
      .eq("prediction_date", today);

    if (cached && cached.length > 0) {
      return new Response(JSON.stringify({ predictions: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gather data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      todayPlannerRes,
      weekPlannerRes,
      wellnessRes,
      healthRes,
      observationsRes,
      preferencesRes,
      mealLogsRes,
      billsRes,
      promisesRes,
      dailyResetsRes,
      whoopRecoveryRes,
      whoopSleepRes,
      whoopCycleRes,
    ] = await Promise.all([
      admin.from("planner_items").select("id, title, status, start_time, end_time, energy_level, item_type")
        .eq("user_id", userId).eq("scheduled_date", today),
      admin.from("planner_items").select("id, status, scheduled_date, item_type")
        .eq("user_id", userId).gte("scheduled_date", today)
        .lte("scheduled_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]),
      admin.from("wellness_logs").select("log_date, sleep_rating, movement_rating, inputs_rating, mood_rating")
        .eq("user_id", userId).gte("log_date", sevenDaysAgo.toISOString().split("T")[0])
        .order("log_date", { ascending: false }),
      admin.from("health_sync_data").select("sync_date, sleep_minutes, steps, active_minutes")
        .eq("user_id", userId).gte("sync_date", sevenDaysAgo.toISOString().split("T")[0]),
      admin.from("user_observations").select("observation_type, title, confidence, status, occurrences")
        .eq("user_id", userId).neq("status", "dismissed").gte("confidence", 0.6),
      admin.from("user_preferences_inferred").select("preference_key, preference_value, confidence")
        .eq("user_id", userId),
      admin.from("meal_logs").select("log_date, meal_type")
        .eq("user_id", userId).gte("log_date", sevenDaysAgo.toISOString().split("T")[0]),
      admin.from("recurring_bills").select("bill_name, amount, due_date, last_paid_date")
        .eq("user_id", userId).eq("is_active", true),
      admin.from("integrity_logs").select("id, kept, due_date, promised_at")
        .eq("user_id", userId).gte("promised_at", thirtyDaysAgo.toISOString()),
      admin.from("daily_resets").select("completed_at, day_number")
        .eq("user_id", userId).gte("completed_at", sevenDaysAgo.toISOString()),
      admin.from("whoop_recoveries").select("recovery_score, recorded_at")
        .eq("user_id", userId).order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("whoop_sleeps").select("sleep_performance_pct, end_time")
        .eq("user_id", userId).order("end_time", { ascending: false }).limit(1).maybeSingle(),
      admin.from("whoop_cycles").select("strain, start_time")
        .eq("user_id", userId).order("start_time", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const todayPlanner = todayPlannerRes.data || [];
    const weekPlanner = weekPlannerRes.data || [];
    const wellness = wellnessRes.data || [];
    const health = healthRes.data || [];
    const observations = observationsRes.data || [];
    const preferences = preferencesRes.data || [];
    const mealLogs = mealLogsRes.data || [];
    const bills = billsRes.data || [];
    const promises = promisesRes.data || [];
    const dailyResets = dailyResetsRes.data || [];

    const predictions: Prediction[] = [];

    // ---- 1. Today Drift Risk ----
    const todayTasks = todayPlanner.filter((i: any) => i.item_type === "task");
    const todayTodo = todayTasks.filter((i: any) => i.status === "todo");
    const now = new Date();
    const hourOfDay = now.getHours();
    
    if (todayTodo.length > 0 && hourOfDay >= 14) {
      const driftConfidence = Math.min(0.4 + (todayTodo.length * 0.1) + ((hourOfDay - 14) * 0.05), 0.95);
      const slippageObs = observations.find((o: any) => o.observation_type === "task_slippage");
      const reasons: string[] = [`${todayTodo.length} tasks still incomplete at ${hourOfDay > 12 ? hourOfDay - 12 + 'pm' : hourOfDay + 'am'}`];
      if (slippageObs) reasons.push("Pattern of task slippage detected");
      
      predictions.push({
        prediction_type: "today_drift",
        forecast: todayTodo.length > 3 
          ? "Today is likely to end with unfinished items"
          : "A couple tasks may slip if not tackled soon",
        confidence: driftConfidence,
        reasons,
        recommended_intervention: todayTodo.length > 3 
          ? "Pick your top 2 tasks and defer the rest to tomorrow"
          : "Block 30 minutes for your remaining tasks",
        intervention_deep_link: "/planner",
        urgency: driftConfidence > 0.7 ? "high" : "medium",
      });
    }

    // ---- 2. Weekly Completion Likelihood ----
    const weekTasks = weekPlanner.filter((i: any) => i.item_type === "task");
    const weekCompleted = weekTasks.filter((i: any) => i.status === "completed");
    if (weekTasks.length >= 5) {
      const weekRate = weekCompleted.length / weekTasks.length;
      const trendObs = observations.find((o: any) => o.observation_type === "planner_trend");
      const reasons: string[] = [`${weekCompleted.length}/${weekTasks.length} tasks completed this week so far`];
      
      if (weekRate < 0.4) {
        predictions.push({
          prediction_type: "weekly_completion",
          forecast: "This week's plan may be too ambitious",
          confidence: 0.7,
          reasons,
          recommended_intervention: "Review your remaining week and lighten where you can",
          intervention_deep_link: "/planner",
          urgency: "medium",
        });
      }
    }

    // ---- 3. Burnout Risk ----
    const recentSleepRatings = wellness.map((w: any) => w.sleep_rating).filter(Boolean);
    const avgSleep = recentSleepRatings.length > 0 
      ? recentSleepRatings.reduce((a: number, b: number) => a + b, 0) / recentSleepRatings.length 
      : null;
    const healthSleepMins = health.map((h: any) => h.sleep_minutes).filter(Boolean);
    const avgSleepMins = healthSleepMins.length > 0
      ? healthSleepMins.reduce((a: number, b: number) => a + b, 0) / healthSleepMins.length
      : null;
    const highLoadDays = weekPlanner.reduce((acc: Record<string, number>, i: any) => {
      acc[i.scheduled_date] = (acc[i.scheduled_date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const overloadedDays = Object.values(highLoadDays).filter((c) => c > 6).length;

    // WHOOP biometric signals for predictions
    const whoopRecovery = whoopRecoveryRes.data;
    const whoopSleep = whoopSleepRes.data;
    const whoopCycle = whoopCycleRes.data;

    const burnoutReasons: string[] = [];
    let burnoutScore = 0;
    if (avgSleep !== null && avgSleep <= 2) { burnoutScore += 0.3; burnoutReasons.push("Low sleep ratings recently"); }
    if (avgSleepMins !== null && avgSleepMins < 360) { burnoutScore += 0.2; burnoutReasons.push("Under 6 hours average sleep"); }
    if (overloadedDays >= 3) { burnoutScore += 0.25; burnoutReasons.push(`${overloadedDays} days this week with 6+ tasks`); }
    if (dailyResets.length < 2 && wellness.length < 3) { burnoutScore += 0.15; burnoutReasons.push("Low engagement with wellness rituals"); }

    // WHOOP-powered burnout/drift signals
    if (whoopRecovery && whoopRecovery.recovery_score !== null && whoopRecovery.recovery_score < 33) {
      burnoutScore += 0.3;
      burnoutReasons.push(`WHOOP recovery critically low at ${whoopRecovery.recovery_score}%`);
    } else if (whoopRecovery && whoopRecovery.recovery_score !== null && whoopRecovery.recovery_score < 50) {
      burnoutScore += 0.15;
      burnoutReasons.push(`WHOOP recovery below optimal at ${whoopRecovery.recovery_score}%`);
    }
    if (whoopSleep && whoopSleep.sleep_performance_pct !== null && whoopSleep.sleep_performance_pct < 70) {
      burnoutScore += 0.15;
      burnoutReasons.push(`WHOOP sleep performance low at ${whoopSleep.sleep_performance_pct}%`);
    }
    if (whoopCycle && whoopCycle.strain !== null && whoopCycle.strain > 14 && whoopRecovery && whoopRecovery.recovery_score !== null && whoopRecovery.recovery_score < 50) {
      burnoutScore += 0.2;
      burnoutReasons.push(`High strain (${whoopCycle.strain}) with low recovery — overtraining risk`);
    }

    if (burnoutScore >= 0.4) {
      predictions.push({
        prediction_type: "burnout_risk",
        forecast: burnoutScore >= 0.6 
          ? "You may be heading toward burnout this week"
          : "Some friction building — watch your energy",
        confidence: Math.min(burnoutScore + 0.2, 0.9),
        reasons: burnoutReasons,
        recommended_intervention: burnoutScore >= 0.6
          ? "Consider switching to Recovery Mode and lightening tomorrow"
          : "Protect your sleep tonight and defer one task",
        intervention_deep_link: "/dashboard",
        urgency: burnoutScore >= 0.6 ? "high" : "medium",
      });
    }

    // ---- 4. Recovery Need ----
    if (avgSleep !== null && avgSleep <= 2.5 && wellness.length >= 3) {
      predictions.push({
        prediction_type: "recovery_need",
        forecast: "Your body may need a lighter day",
        confidence: 0.7,
        reasons: ["Sleep quality has been consistently low", `Average rating: ${avgSleep.toFixed(1)}/5`],
        recommended_intervention: "Plan a recovery day with minimal obligations",
        intervention_deep_link: "/dashboard",
        urgency: "medium",
      });
    }

    // ---- 5. Focus Opportunity Window ----
    const focusPref = preferences.find((p: any) => p.preference_key === "best_focus_time");
    if (focusPref) {
      const window = (focusPref.preference_value as any)?.window || "morning";
      const inWindow = (window === "morning" && hourOfDay < 12) || 
                       (window === "afternoon" && hourOfDay >= 12 && hourOfDay < 17) ||
                       (window === "evening" && hourOfDay >= 17);
      
      if (inWindow && todayTodo.length > 0) {
        predictions.push({
          prediction_type: "focus_opportunity",
          forecast: `You're in your peak ${window} window — great time for deep work`,
          confidence: focusPref.confidence || 0.7,
          reasons: [`Based on your completion patterns, ${window} is your strongest period`],
          recommended_intervention: `Tackle your hardest task now: "${todayTodo[0]?.title || 'top priority'}"`,
          intervention_deep_link: "/planner",
          urgency: "low",
        });
      }
    }

    // ---- 6. Nutrition Slump Risk ----
    const mealDates = [...new Set(mealLogs.map((m: any) => m.log_date))];
    if (mealDates.length < 3 && mealLogs.length > 0) {
      predictions.push({
        prediction_type: "nutrition_slump",
        forecast: "Meal tracking dropped off — energy dip likely",
        confidence: 0.6,
        reasons: [`Only ${mealDates.length} days with meals logged this week`],
        recommended_intervention: "Log one meal today to stay on track",
        intervention_deep_link: "/dashboard",
        urgency: "low",
      });
    }

    // ---- 7. Planner Overload Risk ----
    const tomorrowDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];
    const tomorrowTasks = weekPlanner.filter((i: any) => i.scheduled_date === tomorrowDate && i.item_type === "task");
    if (tomorrowTasks.length > 6) {
      predictions.push({
        prediction_type: "planner_overload",
        forecast: `Tomorrow has ${tomorrowTasks.length} tasks — likely too many`,
        confidence: 0.75,
        reasons: [`${tomorrowTasks.length} tasks scheduled`, "Days with 6+ tasks have lower completion rates"],
        recommended_intervention: "Trim tomorrow to your top 4 priorities",
        intervention_deep_link: "/planner",
        urgency: "medium",
      });
    }

    // ---- 8. Financial Pressure Risk ----
    const todayDOM = new Date().getDate();
    const upcomingBills = bills.filter((b: any) => {
      const diff = b.due_date - todayDOM;
      return diff >= 0 && diff <= 5;
    });
    const totalDue = upcomingBills.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
    if (upcomingBills.length >= 2 || totalDue > 500) {
      predictions.push({
        prediction_type: "financial_pressure",
        forecast: `${upcomingBills.length} bills due in the next 5 days ($${totalDue.toFixed(0)})`,
        confidence: 0.8,
        reasons: upcomingBills.map((b: any) => `${b.bill_name}: $${b.amount}`),
        recommended_intervention: "Review your bills and confirm payments are queued",
        intervention_deep_link: "/money",
        urgency: totalDue > 1000 ? "high" : "medium",
      });
    }

    // Generate AI explanations for high-urgency predictions
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableApiKey && predictions.filter(p => p.urgency !== "low").length > 0) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `You are a supportive personal coach. Given a list of predictions about a user's day, write a brief 1-2 sentence personalized explanation for each. Be warm, never alarmist. Use "likely friction" not "danger." Return ONLY a JSON array of strings matching the prediction order.`,
              },
              {
                role: "user",
                content: JSON.stringify(predictions.map(p => ({
                  type: p.prediction_type,
                  forecast: p.forecast,
                  reasons: p.reasons,
                }))),
              },
            ],
            temperature: 0.5,
          }),
        });

        if (aiRes.ok) {
          const data = await aiRes.json();
          const raw = data.choices?.[0]?.message?.content ?? "";
          const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          try {
            const explanations = JSON.parse(cleaned) as string[];
            predictions.forEach((p, i) => {
              if (explanations[i]) {
                (p as any).explanation = explanations[i];
              }
            });
          } catch { /* use forecasts as-is */ }
        }
      } catch (err) {
        console.error("AI explanation generation failed:", err);
      }
    }

    // Upsert predictions
    for (const pred of predictions) {
      await admin.from("user_predictions").upsert({
        user_id: userId,
        prediction_type: pred.prediction_type,
        prediction_date: today,
        forecast: pred.forecast,
        confidence: pred.confidence,
        reasons: pred.reasons,
        recommended_intervention: pred.recommended_intervention,
        intervention_deep_link: pred.intervention_deep_link,
        urgency: pred.urgency,
        explanation: (pred as any).explanation || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,prediction_type,prediction_date" });
    }

    // Also detect and set adaptive mode
    let suggestedMode = "maintenance";
    const modeReasons: string[] = [];

    if (burnoutScore >= 0.5 || (avgSleep !== null && avgSleep <= 2)) {
      suggestedMode = "recovery";
      modeReasons.push("Low energy/sleep signals detected");
    } else if (todayTasks.length > 5 || overloadedDays >= 3) {
      suggestedMode = "focus";
      modeReasons.push("High task density — focus will help");
    } else if (weekCompleted.length / Math.max(weekTasks.length, 1) >= 0.7 && dailyResets.length >= 4) {
      suggestedMode = "maintenance";
      modeReasons.push("Good momentum — maintain your rhythm");
    }

    // Check if user has manual override
    const { data: currentMode } = await admin.from("user_modes")
      .select("active_mode, source, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    const isManualOverride = currentMode?.source === "manual" && 
      (!currentMode.expires_at || new Date(currentMode.expires_at) > new Date());

    if (!isManualOverride) {
      await admin.from("user_modes").upsert({
        user_id: userId,
        active_mode: suggestedMode,
        source: "system",
        reasons: modeReasons,
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }

    // Return predictions + mode
    const { data: finalPredictions } = await admin.from("user_predictions")
      .select("*").eq("user_id", userId).eq("prediction_date", today)
      .order("urgency");

    const { data: finalMode } = await admin.from("user_modes")
      .select("*").eq("user_id", userId).maybeSingle();

    return new Response(JSON.stringify({
      predictions: finalPredictions || [],
      mode: finalMode,
      suggested_mode: suggestedMode,
      cached: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-predictions:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
