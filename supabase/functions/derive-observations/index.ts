import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Observation {
  observation_type: string;
  title: string;
  description: string;
  source: string;
  confidence: number;
  supporting_refs: Array<{ table: string; id: string; context: string }>;
}

interface InferredPreference {
  preference_key: string;
  preference_value: Record<string, unknown>;
  confidence: number;
  source_observations: string[];
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    // Gather last 30 days of data in parallel
    const [
      plannerItemsRes,
      wellnessLogsRes,
      mealLogsRes,
      promisesRes,
      healthSyncRes,
      resetSessionsRes,
      dailyResetsRes,
      billsRes,
      transactionsRes,
      challengeProgressRes,
    ] = await Promise.all([
      admin
        .from("planner_items")
        .select("id, title, status, scheduled_date, completed_at, start_time, item_type")
        .eq("user_id", userId)
        .gte("scheduled_date", thirtyDaysAgoStr)
        .order("scheduled_date", { ascending: false }),
      admin
        .from("wellness_logs")
        .select("id, log_date, sleep_rating, movement_rating, inputs_rating")
        .eq("user_id", userId)
        .gte("log_date", thirtyDaysAgoStr),
      admin
        .from("meal_logs")
        .select("id, log_date, meal_type, created_at")
        .eq("user_id", userId)
        .gte("log_date", thirtyDaysAgoStr),
      admin
        .from("integrity_logs")
        .select("id, promise_text, promised_at, kept, kept_at, due_date")
        .eq("user_id", userId)
        .gte("promised_at", thirtyDaysAgo.toISOString()),
      admin
        .from("health_sync_data")
        .select("id, sync_date, sleep_minutes, steps")
        .eq("user_id", userId)
        .gte("sync_date", thirtyDaysAgoStr),
      admin
        .from("reset_sessions")
        .select("id, current_day, start_date, status, completed_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      admin
        .from("daily_resets")
        .select("id, day_number, completed_at, session_id")
        .eq("user_id", userId)
        .gte("completed_at", thirtyDaysAgo.toISOString()),
      admin
        .from("recurring_bills")
        .select("id, bill_name, amount, due_date, last_paid_date, is_active")
        .eq("user_id", userId)
        .eq("is_active", true),
      admin
        .from("transactions")
        .select("id, amount, transaction_date, category")
        .eq("user_id", userId)
        .gte("transaction_date", thirtyDaysAgoStr),
      admin
        .from("challenge_progress")
        .select("id, challenge_id, day_number, completed")
        .eq("user_id", userId)
        .gte("created_at", thirtyDaysAgo.toISOString()),
    ]);

    const plannerItems = plannerItemsRes.data || [];
    const wellnessLogs = wellnessLogsRes.data || [];
    const mealLogs = mealLogsRes.data || [];
    const promises = promisesRes.data || [];
    const healthSync = healthSyncRes.data || [];
    const resetSessions = resetSessionsRes.data || [];
    const dailyResets = dailyResetsRes.data || [];
    const bills = billsRes.data || [];
    const transactions = transactionsRes.data || [];
    const challengeProgress = challengeProgressRes.data || [];

    const observations: Observation[] = [];
    const inferredPreferences: InferredPreference[] = [];

    // 1. Task Slippage Detection
    // Count tasks that appear on multiple dates (rescheduled)
    const taskTitles = plannerItems.filter((i: any) => i.item_type === "task").map((i: any) => i.title.toLowerCase().trim());
    const titleCounts: Record<string, number> = {};
    taskTitles.forEach((t: string) => {
      titleCounts[t] = (titleCounts[t] || 0) + 1;
    });
    const slippedTasks = Object.entries(titleCounts).filter(([_, count]) => count >= 3);
    if (slippedTasks.length > 0) {
      observations.push({
        observation_type: "task_slippage",
        title: "Tasks tend to slip",
        description: `${slippedTasks.length} task(s) appeared 3+ times across different days. Consider breaking them down or blocking dedicated time.`,
        source: "planner",
        confidence: Math.min(0.5 + slippedTasks.length * 0.1, 0.9),
        supporting_refs: slippedTasks.slice(0, 3).map(([title]) => ({
          table: "planner_items",
          id: "multiple",
          context: title,
        })),
      });
    }

    // 2. Best Focus Window Detection
    const completedWithTime = plannerItems.filter(
      (i: any) => i.status === "completed" && i.start_time
    );
    if (completedWithTime.length >= 5) {
      const hourBuckets: Record<string, number> = {};
      completedWithTime.forEach((i: any) => {
        const hour = parseInt(i.start_time.split(":")[0], 10);
        const bucket = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
        hourBuckets[bucket] = (hourBuckets[bucket] || 0) + 1;
      });
      const sorted = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0 && sorted[0][1] >= 3) {
        const bestWindow = sorted[0][0];
        observations.push({
          observation_type: "focus_window",
          title: `You complete more in the ${bestWindow}`,
          description: `${sorted[0][1]} of your completed tasks were scheduled in the ${bestWindow}. Consider protecting this time.`,
          source: "planner",
          confidence: Math.min(0.5 + sorted[0][1] * 0.05, 0.85),
          supporting_refs: [{ table: "planner_items", id: "aggregate", context: bestWindow }],
        });
        inferredPreferences.push({
          preference_key: "best_focus_time",
          preference_value: { window: bestWindow, strength: sorted[0][1] },
          confidence: Math.min(0.5 + sorted[0][1] * 0.05, 0.85),
          source_observations: ["focus_window"],
        });
      }
    }

    // 3. Sleep-Energy Correlation
    if (wellnessLogs.length >= 7 && healthSync.length >= 5) {
      const lowSleepDays = healthSync.filter((h: any) => h.sleep_minutes && h.sleep_minutes < 360);
      if (lowSleepDays.length >= 3) {
        const lowSleepDates = new Set(lowSleepDays.map((h: any) => h.sync_date));
        const lowEnergyAfterBadSleep = wellnessLogs.filter(
          (w: any) => lowSleepDates.has(w.log_date) && (w.sleep_rating <= 2 || w.movement_rating <= 2)
        );
        if (lowEnergyAfterBadSleep.length >= 2) {
          observations.push({
            observation_type: "sleep_energy_correlation",
            title: "Poor sleep impacts your next day",
            description: `${lowEnergyAfterBadSleep.length} times in the last 30 days, low sleep was followed by low energy ratings.`,
            source: "wellness",
            confidence: Math.min(0.5 + lowEnergyAfterBadSleep.length * 0.1, 0.85),
            supporting_refs: lowEnergyAfterBadSleep.slice(0, 3).map((w: any) => ({
              table: "wellness_logs",
              id: w.id,
              context: w.log_date,
            })),
          });
        }
      }
    }

    // 4. Meal Consistency
    const mealDates = [...new Set(mealLogs.map((m: any) => m.log_date))];
    const totalDays = 30;
    const loggingRate = mealDates.length / totalDays;
    if (loggingRate < 0.3 && mealLogs.length > 0) {
      observations.push({
        observation_type: "meal_consistency",
        title: "Meal logging is sporadic",
        description: `You logged meals on ${mealDates.length} of the last 30 days (${Math.round(loggingRate * 100)}%). Consistent logging helps spot patterns.`,
        source: "meals",
        confidence: 0.7,
        supporting_refs: [{ table: "meal_logs", id: "aggregate", context: `${mealDates.length} days` }],
      });
    }

    // 5. Planner Completion Trend
    const completedItems = plannerItems.filter((i: any) => i.status === "completed");
    const totalItems = plannerItems.filter((i: any) => i.item_type === "task");
    if (totalItems.length >= 10) {
      const completionRate = completedItems.length / totalItems.length;
      if (completionRate < 0.5) {
        observations.push({
          observation_type: "planner_trend",
          title: "Task completion rate is low",
          description: `Only ${Math.round(completionRate * 100)}% of your planned tasks were completed. Consider planning fewer, more focused tasks.`,
          source: "planner",
          confidence: 0.75,
          supporting_refs: [{ table: "planner_items", id: "aggregate", context: `${completedItems.length}/${totalItems.length}` }],
        });
      } else if (completionRate >= 0.8) {
        observations.push({
          observation_type: "planner_trend",
          title: "Strong task follow-through",
          description: `You completed ${Math.round(completionRate * 100)}% of your planned tasks. You're reliable to yourself.`,
          source: "planner",
          confidence: 0.8,
          supporting_refs: [{ table: "planner_items", id: "aggregate", context: `${completedItems.length}/${totalItems.length}` }],
        });
      }
    }

    // 6. Promise Follow-through
    const resolvedPromises = promises.filter((p: any) => p.kept !== null);
    const keptPromises = promises.filter((p: any) => p.kept === true);
    if (resolvedPromises.length >= 3) {
      const keepRate = keptPromises.length / resolvedPromises.length;
      if (keepRate < 0.6) {
        observations.push({
          observation_type: "promise_followthrough",
          title: "Promise integrity needs attention",
          description: `${Math.round(keepRate * 100)}% of your promises were kept. Consider making fewer, more achievable commitments.`,
          source: "promises",
          confidence: 0.7,
          supporting_refs: [{ table: "integrity_logs", id: "aggregate", context: `${keptPromises.length}/${resolvedPromises.length}` }],
        });
      } else if (keepRate >= 0.85) {
        observations.push({
          observation_type: "promise_followthrough",
          title: "High promise integrity",
          description: `You kept ${Math.round(keepRate * 100)}% of your commitments. Your word is reliable.`,
          source: "promises",
          confidence: 0.8,
          supporting_refs: [{ table: "integrity_logs", id: "aggregate", context: `${keptPromises.length}/${resolvedPromises.length}` }],
        });
      }
    }

    // 7. Season Momentum
    if (dailyResets.length >= 5) {
      // Check for consistent daily completion
      const completedDays = dailyResets.filter((d: any) => d.completed_at);
      if (completedDays.length >= 5) {
        observations.push({
          observation_type: "season_momentum",
          title: "Strong Snapshot momentum",
          description: `You've completed ${completedDays.length} Snapshot days recently. Consistency is building.`,
          source: "reset",
          confidence: 0.75,
          supporting_refs: [{ table: "daily_resets", id: "aggregate", context: `${completedDays.length} days` }],
        });
      }
    }

    // 8. Money Stress Signals
    const todayDate = new Date();
    const dayOfMonth = todayDate.getDate();
    const overdueBills = bills.filter((b: any) => {
      if (!b.last_paid_date) return false;
      const lastPaid = new Date(b.last_paid_date);
      const monthsSincePaid = (todayDate.getFullYear() - lastPaid.getFullYear()) * 12 + (todayDate.getMonth() - lastPaid.getMonth());
      return monthsSincePaid > 1 || (monthsSincePaid === 1 && dayOfMonth > b.due_date);
    });
    if (overdueBills.length > 0) {
      observations.push({
        observation_type: "money_stress",
        title: "Potential overdue bills",
        description: `${overdueBills.length} bill(s) may be overdue. Financial stress drains mental energy.`,
        source: "money",
        confidence: 0.6,
        supporting_refs: overdueBills.slice(0, 3).map((b: any) => ({
          table: "recurring_bills",
          id: b.id,
          context: b.bill_name,
        })),
      });
    }

    // 9. Circle/Show-up Patterns
    if (challengeProgress.length >= 5) {
      const completedCheckins = challengeProgress.filter((c: any) => c.completed);
      const showUpRate = completedCheckins.length / challengeProgress.length;
      if (showUpRate >= 0.8) {
        observations.push({
          observation_type: "circle_pattern",
          title: "Strong circle show-up rate",
          description: `You showed up ${Math.round(showUpRate * 100)}% of the time in your circles. Community matters.`,
          source: "circle",
          confidence: 0.75,
          supporting_refs: [{ table: "challenge_progress", id: "aggregate", context: `${completedCheckins.length}/${challengeProgress.length}` }],
        });
      }
    }

    // Upsert observations
    const upsertedObservations: string[] = [];
    for (const obs of observations) {
      // Check if similar observation exists
      const { data: existing } = await admin
        .from("user_observations")
        .select("id, occurrences")
        .eq("user_id", userId)
        .eq("observation_type", obs.observation_type)
        .neq("status", "dismissed")
        .maybeSingle();

      if (existing) {
        // Update existing
        await admin
          .from("user_observations")
          .update({
            title: obs.title,
            description: obs.description,
            confidence: obs.confidence,
            supporting_refs: obs.supporting_refs,
            last_seen_at: new Date().toISOString(),
            occurrences: existing.occurrences + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        upsertedObservations.push(existing.id);
      } else {
        // Insert new
        const { data: inserted } = await admin
          .from("user_observations")
          .insert({
            user_id: userId,
            ...obs,
          })
          .select("id")
          .single();
        if (inserted) upsertedObservations.push(inserted.id);
      }
    }

    // Upsert inferred preferences
    for (const pref of inferredPreferences) {
      await admin
        .from("user_preferences_inferred")
        .upsert({
          user_id: userId,
          preference_key: pref.preference_key,
          preference_value: pref.preference_value,
          confidence: pref.confidence,
          source_observations: pref.source_observations,
          last_updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,preference_key",
        });
    }

    // Fetch current observations to return
    const { data: currentObservations } = await admin
      .from("user_observations")
      .select("*")
      .eq("user_id", userId)
      .neq("status", "dismissed")
      .order("last_seen_at", { ascending: false });

    const { data: currentPreferences } = await admin
      .from("user_preferences_inferred")
      .select("*")
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        observations_updated: upsertedObservations.length,
        observations: currentObservations || [],
        preferences: currentPreferences || [],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in derive-observations:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
