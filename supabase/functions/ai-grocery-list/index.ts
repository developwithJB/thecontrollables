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
    const userId = claimsData.claims.sub;

    const { start_date, end_date } = await req.json();

    // Fetch meal plans for the date range
    const { data: plans, error: plansError } = await supabase
      .from("meal_plans")
      .select("plan_date, meals")
      .eq("user_id", userId)
      .gte("plan_date", start_date)
      .lte("plan_date", end_date);

    if (plansError) throw plansError;

    if (!plans || plans.length === 0) {
      return new Response(JSON.stringify({
        categories: [],
        summary: "No meal plans found for this week. Generate a week plan first!",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Compile all meals
    const allMeals: string[] = [];
    for (const plan of plans) {
      const meals = plan.meals as any[];
      for (const m of meals) {
        allMeals.push(`${m.name}: ${m.description || ""}`);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are 🛰️ Satellite, the Wellness Controllable. Given a list of meals for a week, compile a consolidated grocery list.
Group items by category. Combine duplicates and estimate quantities for one person.
Return a JSON object:
{
  "categories": [
    {
      "name": "Produce",
      "items": [
        { "name": "Spinach", "quantity": "2 bags", "note": "" }
      ]
    }
  ],
  "summary": "Brief one-line summary, e.g. '32 items across 6 categories'"
}
Common categories: Produce, Protein, Dairy & Eggs, Grains & Bread, Pantry Staples, Oils & Condiments, Frozen, Beverages.
Only include items actually needed. Return valid JSON only.`;

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
          { role: "user", content: `Here are the meals for ${plans.length} days:\n${allMeals.join("\n")}\n\nGenerate the grocery list.` },
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
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || "";
    const jsonMatch = rawContent.match(/```json\s*([\s\S]*?)```/) || rawContent.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : rawContent;

    let groceryList;
    try {
      groceryList = JSON.parse(jsonStr.trim());
    } catch {
      groceryList = {
        categories: [],
        summary: "Couldn't generate grocery list right now. Try again.",
      };
    }

    return new Response(JSON.stringify(groceryList), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-grocery-list error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
