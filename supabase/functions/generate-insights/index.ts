import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InsightRequest {
  userId: string;
}

interface DayOfWeekCount {
  [key: string]: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("[INSIGHTS] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get userId from auth header or request body
    let userId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id ?? null;
    }

    if (!userId) {
      // Fallback: try request body
      try {
        const body = await req.json();
        userId = body.userId || null;
      } catch {
        // no body
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INSIGHTS] Generating insights for user ${userId}`);

    // Calculate date range (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateThreshold = thirtyDaysAgo.toISOString().split("T")[0];

    // Fetch user data in parallel
    const [checkinsResult, timeLogsResult, integrityResult, xpResult, buildResult, profileResult] =
      await Promise.all([
        // Daily check-ins (consistency)
        supabase
          .from("daily_checkins")
          .select("check_in_date, completed")
          .eq("user_id", userId)
          .gte("check_in_date", dateThreshold)
          .order("check_in_date", { ascending: true }),

        // Time logs (intentionality)
        supabase
          .from("time_logs")
          .select("log_date, time_invested_minutes, time_wasted_minutes")
          .eq("user_id", userId)
          .gte("log_date", dateThreshold)
          .order("log_date", { ascending: true }),

        // Integrity logs (promise keeping)
        supabase
          .from("integrity_logs")
          .select("promise_text, promised_at, kept, kept_at")
          .eq("user_id", userId)
          .gte("promised_at", thirtyDaysAgo.toISOString()),

        // XP logs (activity)
        supabase
          .from("xp_logs")
          .select("amount, source, created_at")
          .eq("user_id", userId)
          .gte("created_at", thirtyDaysAgo.toISOString()),

        // Build scores (strengths/weaknesses)
        supabase
          .from("user_build_current")
          .select("awareness, perspective, habit, wellness, environment, overall")
          .eq("user_id", userId)
          .maybeSingle(),

        // Display name for personalization
        supabase
          .from("profiles")
          .select("display_name")
          .eq("id", userId)
          .maybeSingle(),
      ]);

    // Analyze data
    const checkins = checkinsResult.data || [];
    const timeLogs = timeLogsResult.data || [];
    const integrityLogs = integrityResult.data || [];
    const xpLogs = xpResult.data || [];
    const build = buildResult.data;
    const displayName = profileResult.data?.display_name || null;

    // Calculate metrics
    const totalCheckins = checkins.length;
    const completedCheckins = checkins.filter((c) => c.completed).length;
    const consistencyRate = totalCheckins > 0 ? Math.round((completedCheckins / totalCheckins) * 100) : 0;

    // Best day of week for check-ins
    const dayOfWeekCounts: DayOfWeekCount = {};
    checkins.forEach((c) => {
      const date = new Date(c.check_in_date + "T00:00:00");
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      dayOfWeekCounts[dayName] = (dayOfWeekCounts[dayName] || 0) + 1;
    });
    const bestDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Time intentionality
    const totalInvested = timeLogs.reduce((sum, t) => sum + (t.time_invested_minutes || 0), 0);
    const totalWasted = timeLogs.reduce((sum, t) => sum + (t.time_wasted_minutes || 0), 0);
    const intentionalityRate =
      totalInvested + totalWasted > 0
        ? Math.round((totalInvested / (totalInvested + totalWasted)) * 100)
        : null;

    // Promise keeping
    const totalPromises = integrityLogs.length;
    const keptPromises = integrityLogs.filter((p) => p.kept === true).length;
    const promiseRate = totalPromises > 0 ? Math.round((keptPromises / totalPromises) * 100) : null;

    // XP and activity
    const totalXp = xpLogs.reduce((sum, x) => sum + x.amount, 0);
    const actionsCompleted = xpLogs.filter((x) => x.source === "action_completed").length;

    // Build strengths/weaknesses
    let strongestControllable: string | null = null;
    let weakestControllable: string | null = null;
    if (build) {
      const scores: [string, number][] = [
        ["Awareness", Number(build.awareness) || 0],
        ["Perspective", Number(build.perspective) || 0],
        ["Habit", Number(build.habit) || 0],
        ["Wellness", Number(build.wellness) || 0],
        ["Environment", Number(build.environment) || 0],
      ];
      const validScores = scores.filter(([_, s]) => s > 0);
      if (validScores.length > 0) {
        strongestControllable = validScores.sort((a, b) => b[1] - a[1])[0][0];
        weakestControllable = validScores.sort((a, b) => a[1] - b[1])[0][0];
      }
    }

    // Build context for AI
    const context = {
      displayName,
      totalCheckins,
      consistencyRate,
      bestDay,
      intentionalityRate,
      promiseRate,
      keptPromises,
      totalPromises,
      totalXp,
      actionsCompleted,
      strongestControllable,
      weakestControllable,
      daysOfData: Math.min(30, checkins.length),
    };

    console.log(`[INSIGHTS] Context for ${userId}:`, JSON.stringify(context));

    // Generate insight with Lovable AI
    const prompt = `You are a calm, supportive coach analyzing behavioral data for a personal development app called "The Controllables."

Based on the following 30-day user data, generate ONE personalized insight (2-3 sentences max). Be warm but grounded—no hype, no pressure, no false positivity.

User Data:
- Name: ${context.displayName || "User"}
- Check-in consistency: ${context.consistencyRate}% (${context.totalCheckins} days tracked)
- Best check-in day: ${context.bestDay || "Not enough data"}
- Time intentionality: ${context.intentionalityRate !== null ? context.intentionalityRate + "%" : "Not tracked"}
- Promise-keeping: ${context.promiseRate !== null ? context.promiseRate + "% (" + context.keptPromises + "/" + context.totalPromises + ")" : "No promises tracked"}
- Total XP: ${context.totalXp}
- Actions completed: ${context.actionsCompleted}
- Strongest Controllable: ${context.strongestControllable || "Not assessed"}
- Area to focus: ${context.weakestControllable || "Not assessed"}

Guidelines:
- Reference specific data (e.g., "You showed up 85% of the time" or "Thursday is your most consistent day")
- Be encouraging without being pushy
- If data is limited, acknowledge it gently and focus on what IS there
- Never use hustle culture language
- End with a subtle forward-looking note, not a command

Example tones:
- "You've checked in 12 of the last 14 days—Thursday seems to be your anchor day. That consistency is quietly building something."
- "Your promise-keeping rate jumped to 80% this month. Small kept promises are rebuilding self-trust."
- "Not much data yet, but you're here. That's the first step. Keep showing up."

Generate the insight now:`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[INSIGHTS] AI gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insight = aiData.choices?.[0]?.message?.content?.trim() || null;

    if (!insight) {
      console.warn("[INSIGHTS] No insight generated for user", userId);
      return new Response(
        JSON.stringify({ insight: null, generated_at: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[INSIGHTS] Generated for ${userId}:`, insight);

    return new Response(
      JSON.stringify({
        insight,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[INSIGHTS] Error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
