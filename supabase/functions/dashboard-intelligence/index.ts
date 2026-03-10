import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { completedCount, rings } = await req.json();
    const userId = user.id;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Gather context data in parallel
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const [ringsHistory, wellnessLogs, noticeEntries, proofActions, activeSession, plannerItems] = await Promise.all([
      supabase.from("daily_rings").select("*").eq("user_id", userId).gte("ring_date", sevenDaysAgo).order("ring_date", { ascending: false }).limit(7),
      supabase.from("wellness_logs" as any).select("*").eq("user_id", userId).gte("log_date", sevenDaysAgo).order("log_date", { ascending: false }).limit(7),
      supabase.from("notice_entries" as any).select("mood, energy_level, stress_level").eq("user_id", userId).gte("entry_date", sevenDaysAgo).limit(7),
      supabase.from("proof_actions").select("completed, category").eq("user_id", userId).gte("action_date", sevenDaysAgo).limit(14),
      supabase.from("reset_sessions").select("start_date, current_day, journey_id, status").eq("user_id", userId).eq("status", "active").limit(1).maybeSingle(),
      supabase.from("planner_items").select("title, scheduled_date, status, item_type").eq("user_id", userId).gte("scheduled_date", todayStr).order("scheduled_date").limit(10),
    ]);

    // Build context summary
    const historyData = ringsHistory.data || [];
    const weeklyCompletions = historyData.map((d: any) => ({
      date: d.ring_date,
      notice: d.notice_completed,
      choose: d.choose_completed,
      prove: d.prove_completed,
      charge: d.charge_completed,
      align: d.align_completed,
    }));

    const fullyChargedDays = historyData.filter((d: any) =>
      d.notice_completed && d.choose_completed && d.prove_completed && d.charge_completed && d.align_completed
    ).length;

    // Ring completion rates over the week
    const ringCounts: Record<string, number> = { notice: 0, choose: 0, prove: 0, charge: 0, align: 0 };
    historyData.forEach((d: any) => {
      if (d.notice_completed) ringCounts.notice++;
      if (d.choose_completed) ringCounts.choose++;
      if (d.prove_completed) ringCounts.prove++;
      if (d.charge_completed) ringCounts.charge++;
      if (d.align_completed) ringCounts.align++;
    });

    const strongest = Object.entries(ringCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "notice";
    const weakest = Object.entries(ringCounts).sort((a, b) => a[1] - b[1])[0]?.[0] || "align";

    const todayRingsSummary = Object.entries(rings || {})
      .filter(([k, v]) => k.endsWith("_completed") && v)
      .map(([k]) => k.replace("_completed", ""))
      .join(", ");

    const responses = Object.entries(rings || {})
      .filter(([k, v]) => k.endsWith("_response") && v)
      .map(([k, v]) => `${k.replace("_response", "")}: ${v}`)
      .join("; ");

    const noticeData = noticeEntries.data || [];
    const avgEnergy = noticeData.length > 0
      ? (noticeData.reduce((s: number, e: any) => s + (e.energy_level || 3), 0) / noticeData.length).toFixed(1)
      : "unknown";
    const avgStress = noticeData.length > 0
      ? (noticeData.reduce((s: number, e: any) => s + (e.stress_level || 3), 0) / noticeData.length).toFixed(1)
      : "unknown";

    const proofData = proofActions.data || [];
    const proofCompletionRate = proofData.length > 0
      ? Math.round((proofData.filter((p: any) => p.completed).length / proofData.length) * 100)
      : 0;

    const contextPrompt = `
Today's date: ${todayStr}
Rings completed today: ${completedCount}/5 (${todayRingsSummary})
Today's responses: ${responses || "none"}
7-day ring history: ${JSON.stringify(weeklyCompletions)}
Fully charged days this week: ${fullyChargedDays}
Strongest ring this week: ${strongest} (${ringCounts[strongest]}/7)
Weakest ring this week: ${weakest} (${ringCounts[weakest]}/7)
Average energy (7d): ${avgEnergy}/5
Average stress (7d): ${avgStress}/5
Proof action completion rate (7d): ${proofCompletionRate}%
`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an intelligent behavioral analysis system for a self-leadership app called The Controllables. The 5 rings are: Notice (awareness/emotional scanning), Choose (perspective/reframing), Prove (habit/proof actions), Charge (wellness/physical recharge), Align (environment/space optimization).

Analyze the user's data and return a structured intelligence report. Be specific, grounded in data, and use system-intelligence language. Never be cheesy. Be concise — each field should be 1-2 sentences max. Use terms like "pattern detected", "signal", "primary driver", "forecast", "drift risk".

The ring names map to controllables: Notice=Awareness, Choose=Perspective, Prove=Habit, Charge=Wellness, Align=Environment.`
          },
          {
            role: "user",
            content: contextPrompt,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "dashboard_intelligence_report",
              description: "Return a structured intelligence report for the dashboard.",
              parameters: {
                type: "object",
                properties: {
                  pattern_detected: { type: "string", description: "A behavioral pattern observed from today's data and recent history. 1-2 sentences." },
                  why_it_matters: { type: "string", description: "Why this pattern matters for the user's growth. 1-2 sentences." },
                  best_next_move: { type: "string", description: "A specific recommended action for tonight or tomorrow morning. 1 sentence." },
                  tomorrow_forecast: { type: "string", description: "A predictive statement about tomorrow's likely challenges or opportunities. 1-2 sentences." },
                  signals: {
                    type: "object",
                    properties: {
                      energy_trend: { type: "object", properties: { label: { type: "string" }, direction: { type: "string", enum: ["up", "down", "neutral"] } }, required: ["label", "direction"] },
                      confidence_signal: { type: "object", properties: { label: { type: "string" }, direction: { type: "string", enum: ["up", "down", "neutral"] } }, required: ["label", "direction"] },
                      stress_load: { type: "object", properties: { label: { type: "string" }, direction: { type: "string", enum: ["up", "down", "neutral"] } }, required: ["label", "direction"] },
                      drift_risk: { type: "object", properties: { label: { type: "string" }, direction: { type: "string", enum: ["up", "down", "neutral"] } }, required: ["label", "direction"] },
                      strongest_today: { type: "string" },
                      most_neglected_week: { type: "string" },
                    },
                    required: ["energy_trend", "confidence_signal", "stress_load", "drift_risk", "strongest_today", "most_neglected_week"],
                  },
                  why_fully_charged: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 concise reasons explaining why the user earned Fully Charged status today. Each reason should be specific and data-grounded.",
                  },
                  recommended_actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        ring: { type: "string", enum: ["notice", "choose", "prove", "charge", "align"] },
                      },
                      required: ["text", "ring"],
                    },
                    description: "3-4 personalized recommended next actions with associated ring.",
                  },
                  memory_comparisons: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 comparison insights that show awareness of historical behavior patterns.",
                  },
                  center_rotations: {
                    type: "array",
                    items: { type: "string" },
                    description: "4-5 short labels to rotate in the ring center display. Max 5 words each.",
                  },
                },
                required: ["pattern_detected", "why_it_matters", "best_next_move", "tomorrow_forecast", "signals", "why_fully_charged", "recommended_actions", "memory_comparisons", "center_rotations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "dashboard_intelligence_report" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call response");
    }

    const report = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dashboard-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
