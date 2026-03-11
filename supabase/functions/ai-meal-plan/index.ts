import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { date, preferences, calorie_target, exclude_meals, snack_count, macro_targets, dietary_style, dietary_restrictions, exclude_names, context_tags, body_context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const targetInfo = calorie_target ? `Target: ~${calorie_target} calories/day.` : "Target: ~2000 calories/day.";
    const prefInfo = preferences ? `Preferences: ${preferences}.` : "";
    const styleInfo = dietary_style ? `Dietary style: ${dietary_style}. All meals should follow this style.` : "";
    const restrictionsInfo = Array.isArray(dietary_restrictions) && dietary_restrictions.length > 0
      ? `STRICT dietary restrictions (never include these): ${dietary_restrictions.join(", ")}.`
      : "";
    const excludeNamesInfo = Array.isArray(exclude_names) && exclude_names.length > 0
      ? `Do NOT suggest any of these meals (already rejected by the user): ${exclude_names.join(", ")}. Suggest something completely different.`
      : "";

    // Build macro instructions
    const macroLines: string[] = [];
    if (macro_targets?.proteinTarget) macroLines.push(`Protein: ~${macro_targets.proteinTarget}g/day`);
    if (macro_targets?.carbsTarget) macroLines.push(`Carbs: ~${macro_targets.carbsTarget}g/day`);
    if (macro_targets?.fatTarget) macroLines.push(`Fat: ~${macro_targets.fatTarget}g/day`);
    const macroInfo = macroLines.length > 0 ? `Macro targets: ${macroLines.join(", ")}.` : "";

    // Build meal list based on exclusions and snack count
    const excludeSet = new Set((exclude_meals || []).map((m: string) => m.toLowerCase()));
    const numSnacks = typeof snack_count === "number" ? Math.max(0, Math.min(5, snack_count)) : 1;

    const requestedMeals: string[] = [];
    if (!excludeSet.has("breakfast")) requestedMeals.push("breakfast");
    if (!excludeSet.has("lunch")) requestedMeals.push("lunch");
    if (!excludeSet.has("dinner")) requestedMeals.push("dinner");
    for (let i = 1; i <= numSnacks; i++) {
      requestedMeals.push(numSnacks === 1 ? "snack" : `snack_${i}`);
    }

    const mealsExample = requestedMeals
      .map((m) => `    { "meal_type": "${m}", "name": string, "description": string (brief, 1 line), "est_calories": number, "est_protein": number, "est_carbs": number, "est_fat": number }`)
      .join(",\n");

    // Build body/calendar context line
    const contextLines: string[] = [];
    if (Array.isArray(context_tags) && context_tags.length > 0) {
      contextLines.push(`Body/calendar context tags: ${context_tags.join(", ")}. Prioritize meals matching these tags.`);
    }
    if (body_context) {
      contextLines.push(`Body context: ${body_context}`);
    }
    const contextInfo = contextLines.length > 0 ? contextLines.join("\n") : "";

    const systemPrompt = `You are 🛰️ Satellite, the Wellness Controllable. Generate a simple, practical meal plan.
${targetInfo} ${macroInfo} ${prefInfo}
${styleInfo}
${restrictionsInfo}
${excludeNamesInfo}
${contextInfo}
Generate ONLY these meals: ${requestedMeals.join(", ")}.
Return a JSON object:
{
  "meals": [
${mealsExample}
  ],
  "satellite_tip": string (1-sentence wellness insight)
}
Keep meals simple, whole-food focused, and easy to prepare. Return valid JSON only.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a meal plan for ${date || "today"}.` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) || rawContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawContent;

    let plan;
    try {
      plan = JSON.parse(jsonStr.trim());
    } catch {
      plan = {
        meals: [],
        satellite_tip: "Couldn't generate a plan right now. Try again in a moment.",
      };
    }

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-meal-plan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
