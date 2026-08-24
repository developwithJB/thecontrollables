import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SnapshotInsightRequest {
  sessionId: string;
  journeyId?: string | null;
  journeyName?: string | null;
  journeyFocus?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();

    if (authError || !authData.user) {
      console.warn("[SNAPSHOT-INSIGHT] Rejected an invalid authorization token");
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = authData.user.id;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      console.error("[SNAPSHOT-INSIGHT] LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: SnapshotInsightRequest = await req.json();
    const { sessionId, journeyId, journeyName, journeyFocus } = body;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: "sessionId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[SNAPSHOT-INSIGHT] Generating for session ${sessionId}`);

    // Fetch the session to get date range
    const { data: session, error: sessionError } = await supabase
      .from("reset_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .single();

    if (sessionError || !session) {
      console.error("[SNAPSHOT-INSIGHT] Session not found:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate end date (7 days from start)
    const startDate = session.start_date;
    const endDateObj = new Date(startDate + "T00:00:00");
    endDateObj.setDate(endDateObj.getDate() + 6);
    const endDate = endDateObj.toISOString().split("T")[0];

    console.log(`[SNAPSHOT-INSIGHT] Date range: ${startDate} to ${endDate}`);

    // Fetch ALL data within this snapshot's date range ONLY
    const [
      dailyResetsResult,
      checkinsResult,
      integrityResult,
      xpResult,
      actionsResult,
      profileResult,
      buildResult,
    ] = await Promise.all([
      // Daily resets for this specific session
      supabase
        .from("daily_resets")
        .select("day_number, reflection, commitment, completed_at")
        .eq("session_id", sessionId)
        .order("day_number", { ascending: true }),

      // Daily check-ins in date range
      supabase
        .from("daily_checkins")
        .select("check_in_date, completed, daily_focus")
        .eq("user_id", userId)
        .gte("check_in_date", startDate)
        .lte("check_in_date", endDate),

      // Promises made during snapshot
      supabase
        .from("integrity_logs")
        .select("promise_text, promised_at, kept, kept_at")
        .eq("user_id", userId)
        .gte("promised_at", `${startDate}T00:00:00`)
        .lte("promised_at", `${endDate}T23:59:59`),

      // XP earned during snapshot
      supabase
        .from("xp_logs")
        .select("amount, source, description")
        .eq("user_id", userId)
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`),

      // Actions completed during snapshot
      supabase
        .from("completed_actions")
        .select("action_text, controllable, xp_awarded")
        .eq("user_id", userId)
        .gte("completed_at", `${startDate}T00:00:00`)
        .lte("completed_at", `${endDate}T23:59:59`),

      // Display name
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle(),

      // Build scores for context
      supabase
        .from("user_build_current")
        .select("awareness, perspective, habit, wellness, environment, overall, build_archetype_key")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    // Calculate metrics from THIS SNAPSHOT ONLY
    const dailyResets = dailyResetsResult.data || [];
    const checkins = checkinsResult.data || [];
    const integrityLogs = integrityResult.data || [];
    const xpLogs = xpResult.data || [];
    const completedActions = actionsResult.data || [];
    const displayName = profileResult.data?.display_name || null;
    const build = buildResult.data;

    const daysCompleted = dailyResets.length;
    const totalXp = xpLogs.reduce((sum, x) => sum + x.amount, 0);
    const totalPromises = integrityLogs.length;
    const keptPromises = integrityLogs.filter((p) => p.kept === true).length;
    const promiseRate = totalPromises > 0 ? Math.round((keptPromises / totalPromises) * 100) : null;
    const actionsCount = completedActions.length;

    // Extract reflections and commitments from the week
    const reflections = dailyResets
      .filter((r) => r.reflection)
      .map((r) => r.reflection)
      .slice(0, 3);

    const commitments = dailyResets
      .filter((r) => r.commitment)
      .map((r) => r.commitment)
      .slice(0, 3);

    // Determine strongest controllable from build
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

    console.log(`[SNAPSHOT-INSIGHT] Metrics: ${daysCompleted}/7 days, ${totalXp} XP, ${promiseRate}% promises`);

    // Build the prompt - ONLY referencing completed snapshot data
    const prompt = `You are a warm, supportive guide from "The Controllables" reviewing a user's COMPLETED 7-day snapshot.

CRITICAL: This is a COMPLETED snapshot review. Do NOT:
- Reference anything about "starting" or "beginning"
- Mention daily check-ins they haven't done (they completed ${daysCompleted}/7 days)
- Look forward to actions not yet taken
- Suggest they need to do more this week

CONTEXT - THIS COMPLETED SNAPSHOT:
- User: ${displayName || "User"}
- Days checked in: ${daysCompleted} out of 7
- Total XP earned this week: ${totalXp}
- Actions completed: ${actionsCount}
- Promises made: ${totalPromises}, kept: ${keptPromises} (${promiseRate !== null ? promiseRate + "%" : "N/A"})
${journeyName ? `- Journey focus: "${journeyName}" (${journeyFocus || "general"} focus)` : "- General snapshot (no specific journey)"}
${reflections.length > 0 ? `- Sample reflections: "${reflections.join('", "')}"` : ""}
${commitments.length > 0 ? `- Sample commitments: "${commitments.join('", "')}"` : ""}
${strongestControllable ? `- Strongest area: ${strongestControllable}` : ""}
${weakestControllable && weakestControllable !== strongestControllable ? `- Growth area: ${weakestControllable}` : ""}

TASK: Write a 2-3 sentence personalized reflection on what they ACCOMPLISHED this week. 

Guidelines:
- Celebrate what they DID, not what they didn't
- Reference specific data (e.g., "You showed up ${daysCompleted} of 7 days" or "${promiseRate}% of promises kept")
- If they had a journey focus, connect their actions to that theme
- Be warm and grounded, no toxic positivity
- End with a subtle acknowledgment of their growth, not a command to do more
- This is a private Snapshot Review moment - make them feel good about their record

Example tone:
- "You showed up 7 of 7 days—not because it was easy, but because you decided to. ${promiseRate !== null && promiseRate >= 80 ? `Your ${promiseRate}% promise-keeping rate says something about who you're becoming.` : ""}"
- "This week you earned ${totalXp} XP through ${actionsCount} actions. Small reps. Quiet proof."

Generate the insight now (2-3 sentences max):`;

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
      console.error("[SNAPSHOT-INSIGHT] AI gateway error:", aiResponse.status, errorText);

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
      console.warn("[SNAPSHOT-INSIGHT] No insight generated");
      return new Response(
        JSON.stringify({ insight: null, generated_at: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[SNAPSHOT-INSIGHT] Generated:`, insight);

    return new Response(
      JSON.stringify({
        insight,
        generated_at: new Date().toISOString(),
        metrics: {
          daysCompleted,
          totalXp,
          promiseRate,
          actionsCount,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[SNAPSHOT-INSIGHT] Error:", errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
