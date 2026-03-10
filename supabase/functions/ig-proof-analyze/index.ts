import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the IG Proof analyzer for The Controllables Dashboard. Your job is to classify Instagram content (captions or screenshot descriptions) into one of 5 daily rings:

RINGS:
- notice (Awareness) — emotional check-ins, self-awareness, mood tracking, introspection, mindfulness
- choose (Perspective) — reframing challenges, gratitude, choosing love over fear, growth mindset, reflection
- prove (Habit) — follow-through on commitments, discipline evidence, consistency, identity-based actions
- charge (Wellness) — workouts, meals, hydration, sleep, movement, recovery, physical self-care
- align (Environment) — room resets, organizing spaces, digital detox, curating surroundings, social boundaries

TAGS (pick 1-3 that apply):
workout, meal, hydration, gratitude, setback, growth, discipline, recovery, clean_space, social_support, digital_detox, sunlight, walk, reflection

Respond with the classification.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { caption, imageDescription } = await req.json();
    const content = caption || imageDescription;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return new Response(JSON.stringify({ error: "No content provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Classify this Instagram content:\n\n"${content.slice(0, 2000)}"`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_content",
              description: "Classify Instagram content into a ring with tags and interpretation",
              parameters: {
                type: "object",
                properties: {
                  primary_ring: {
                    type: "string",
                    enum: ["notice", "choose", "prove", "charge", "align"],
                    description: "The main ring this content belongs to",
                  },
                  secondary_ring: {
                    type: "string",
                    enum: ["notice", "choose", "prove", "charge", "align", "none"],
                    description: "Optional secondary ring, or 'none'",
                  },
                  tags: {
                    type: "array",
                    items: {
                      type: "string",
                      enum: [
                        "workout", "meal", "hydration", "gratitude", "setback",
                        "growth", "discipline", "recovery", "clean_space",
                        "social_support", "digital_detox", "sunlight", "walk", "reflection",
                      ],
                    },
                    description: "1-3 relevant tags",
                  },
                  interpretation: {
                    type: "string",
                    description: "One sentence explaining why this maps to the chosen ring. Start with 'This looks like...' or 'This reads like...' or 'This is strong...'",
                  },
                },
                required: ["primary_ring", "tags", "interpretation"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "classify_content" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits required." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return classification" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ig-proof-analyze error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
