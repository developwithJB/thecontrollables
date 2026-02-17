import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const OBJECTIVES = ["traffic", "signups", "paid_conversions", "full_funnel"] as const;
const CHANNELS = [
  "x",
  "linkedin",
  "email",
  "facebook_ads",
  "google_ads",
  "reddit",
  "instagram",
  "youtube",
  "tiktok",
  "landing_page",
] as const;
const BUDGET_LEVELS = ["low", "medium", "high"] as const;

type Objective = (typeof OBJECTIVES)[number];
type Channel = (typeof CHANNELS)[number];
type BudgetLevel = (typeof BUDGET_LEVELS)[number];

interface MarketingRequest {
  objective?: Objective;
  channel?: Channel;
  audience?: string;
  offer?: string;
  landingPageUrl?: string;
  tone?: string;
  productName?: string;
  productDescription?: string;
  keyBenefits?: string[];
  proofPoints?: string[];
  constraints?: string[];
  budgetLevel?: BudgetLevel;
  variationCount?: number;
}

interface NormalizedMarketingRequest {
  objective: Objective;
  channel: Channel;
  audience: string;
  offer: string;
  landingPageUrl: string;
  tone: string;
  productName: string;
  productDescription: string;
  keyBenefits: string[];
  proofPoints: string[];
  constraints: string[];
  budgetLevel: BudgetLevel;
  variationCount: number;
}

const DEFAULT_PRODUCT_NAME = "The Dashboard";
const DEFAULT_PRODUCT_DESCRIPTION =
  "The Dashboard by The Controllables helps users build consistency through daily actions, AI guidance, and a clear path from intention to execution.";
const DEFAULT_AUDIENCE =
  "Adults who want structure and accountability to improve their habits and follow-through.";
const DEFAULT_OFFER = "Start a free trial and complete your first 7-day snapshot.";
const DEFAULT_LANDING_URL = "https://thecontrollables.lovable.app";
const DEFAULT_TONE = "direct, practical, confident";
const DEFAULT_BUDGET: BudgetLevel = "medium";
const MAX_TEXT_LENGTH = 1000;
const MAX_ARRAY_ITEMS = 8;
const MAX_ARRAY_ITEM_LENGTH = 220;
const DEFAULT_VARIATION_COUNT = 3;

function sanitizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}

function sanitizeArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_ARRAY_ITEMS)
    .map((item) => item.slice(0, MAX_ARRAY_ITEM_LENGTH));
}

function toEnum<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number]
): T[number] {
  if (typeof value !== "string") return fallback;
  return allowed.includes(value as T[number]) ? (value as T[number]) : fallback;
}

function normalizeVariationCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_VARIATION_COUNT;
  return Math.min(5, Math.max(1, Math.round(value)));
}

function normalizeRequest(body: MarketingRequest | null): NormalizedMarketingRequest {
  const input = body ?? {};

  return {
    objective: toEnum(input.objective, OBJECTIVES, "full_funnel"),
    channel: toEnum(input.channel, CHANNELS, "linkedin"),
    audience: sanitizeText(input.audience, DEFAULT_AUDIENCE),
    offer: sanitizeText(input.offer, DEFAULT_OFFER),
    landingPageUrl: sanitizeText(input.landingPageUrl, DEFAULT_LANDING_URL),
    tone: sanitizeText(input.tone, DEFAULT_TONE),
    productName: sanitizeText(input.productName, DEFAULT_PRODUCT_NAME),
    productDescription: sanitizeText(input.productDescription, DEFAULT_PRODUCT_DESCRIPTION),
    keyBenefits: sanitizeArray(input.keyBenefits),
    proofPoints: sanitizeArray(input.proofPoints),
    constraints: sanitizeArray(input.constraints),
    budgetLevel: toEnum(input.budgetLevel, BUDGET_LEVELS, DEFAULT_BUDGET),
    variationCount: normalizeVariationCount(input.variationCount),
  };
}

function getObjectiveDirective(objective: Objective): string {
  switch (objective) {
    case "traffic":
      return "Bias toward top-of-funnel reach and click-through rate while still connecting to signup intent.";
    case "signups":
      return "Bias toward lead capture and onboarding starts with minimal friction.";
    case "paid_conversions":
      return "Bias toward trial-to-paid conversion with stronger upgrade positioning and objection handling.";
    default:
      return "Balance the full funnel: traffic first, then signup conversion, then paid conversion.";
  }
}

function getChannelDirective(channel: Channel): string {
  const directives: Record<Channel, string> = {
    x: "Write short, sharp copy with strong hooks and direct CTAs.",
    linkedin: "Use founder-led, insight-heavy copy with practical credibility.",
    email: "Focus on lifecycle messaging with subject lines, value-first body, and one clear CTA.",
    facebook_ads: "Write performance ad variants with quick clarity and clear benefit framing.",
    google_ads: "Prioritize intent match, offer clarity, and concise CTA language.",
    reddit: "Use community-native tone, transparent value, and anti-hype positioning.",
    instagram: "Use visual-first hooks, concise captions, and curiosity-driven CTAs.",
    youtube: "Use script-style hooks with watch intent and retention-focused structure.",
    tiktok: "Use punchy hooks in plain language with a clear behavior ask.",
    landing_page: "Focus on above-the-fold clarity, conversion flow, and objection handling.",
  };

  return directives[channel];
}

function buildSystemPrompt(input: NormalizedMarketingRequest): string {
  const benefits = input.keyBenefits.length > 0
    ? input.keyBenefits.map((item) => `- ${item}`).join("\n")
    : "- Daily structure that turns intentions into action\n- Built-in accountability through guided check-ins\n- Clear momentum tracking users can feel";
  const proof = input.proofPoints.length > 0
    ? input.proofPoints.map((item) => `- ${item}`).join("\n")
    : "- Habit and behavior framework grounded in The Controllables model\n- Includes daily action flow, AI guidance, and progress feedback";
  const constraints = input.constraints.length > 0
    ? input.constraints.map((item) => `- ${item}`).join("\n")
    : "- No fake testimonials\n- No fake urgency\n- No unrealistic guarantees";

  return `[IDENTITY]
You are Open Claw, a growth operator for ${input.productName}.
Your single job is growth through:
1) Website traffic
2) New user sign-ups
3) New paying customers

[WORKING STYLE]
- Direct, practical, conversion-oriented
- No fluff, no generic motivational language
- Use specific copy and measurable funnel moves
- Respect the requested tone: "${input.tone}"

[BUSINESS CONTEXT]
- Product: ${input.productName}
- Description: ${input.productDescription}
- Audience: ${input.audience}
- Offer: ${input.offer}
- Landing page: ${input.landingPageUrl}
- Objective: ${input.objective}
- Primary channel: ${input.channel}
- Budget level: ${input.budgetLevel}

[PRODUCT BENEFITS]
${benefits}

[PROOF POINTS]
${proof}

[CONSTRAINTS]
${constraints}

[OBJECTIVE DIRECTIVE]
${getObjectiveDirective(input.objective)}

[CHANNEL DIRECTIVE]
${getChannelDirective(input.channel)}

[NON-NEGOTIABLE RULES]
- Never fabricate data, metrics, awards, testimonials, or customer quotes
- Never make medical, legal, or financial guarantees
- Focus on qualified traffic, conversion quality, and retention-aware growth
- Every recommendation must tie to at least one KPI

[OUTPUT]
Return ONLY valid JSON (no markdown, no backticks) with this exact shape:
{
  "campaignSummary": {
    "northStar": "string",
    "icpHypothesis": "string",
    "positioningAngle": "string",
    "coreOffer": "string"
  },
  "funnelPlan": {
    "traffic": {
      "goal": "string",
      "strategy": "string",
      "kpi": "string",
      "tactics": ["string", "string", "string"]
    },
    "signup": {
      "goal": "string",
      "strategy": "string",
      "kpi": "string",
      "landingCta": "string",
      "frictionFixes": ["string", "string", "string"]
    },
    "paidConversion": {
      "goal": "string",
      "strategy": "string",
      "kpi": "string",
      "upgradeAngle": "string",
      "objectionsToHandle": ["string", "string", "string"]
    }
  },
  "copyAssets": {
    "socialPosts": [
      { "hook": "string", "body": "string", "cta": "string" }
    ],
    "adVariants": [
      { "headline": "string", "body": "string", "cta": "string" }
    ],
    "emails": [
      { "subject": "string", "previewText": "string", "body": "string", "cta": "string" }
    ]
  },
  "experiments": [
    {
      "name": "string",
      "hypothesis": "string",
      "primaryMetric": "string",
      "successCriteria": "string",
      "effort": "low|medium|high",
      "impact": "low|medium|high"
    }
  ],
  "next7Days": ["string", "string", "string", "string", "string", "string", "string"]
}

For "socialPosts" and "adVariants", include exactly ${input.variationCount} variants each.
For "emails", include exactly 3 variants.
For "experiments", include exactly 5 experiments ranked from highest expected impact to lowest.`;
}

function tryParseJson(content: string): Record<string, unknown> | null {
  if (!content) return null;

  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    // continue
  }

  const fenced = content.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]) as Record<string, unknown>;
    } catch {
      // continue
    }
  }

  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const slice = content.slice(start, end + 1);
    try {
      return JSON.parse(slice) as Record<string, unknown>;
    } catch {
      // continue
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user?.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let requestBody: MarketingRequest | null = null;
    try {
      requestBody = await req.json() as MarketingRequest;
    } catch {
      requestBody = null;
    }

    const normalized = normalizeRequest(requestBody);
    const prompt = buildSystemPrompt(normalized);
    const apiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "Generate the growth campaign JSON now." },
        ],
        max_tokens: 1800,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[OPEN_CLAW_MARKETING] AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData?.choices?.[0]?.message?.content?.trim() || "";
    const parsed = tryParseJson(rawContent);

    return new Response(
      JSON.stringify({
        bot: "open-claw-marketing",
        objective: normalized.objective,
        channel: normalized.channel,
        generatedAt: new Date().toISOString(),
        content: parsed ?? { raw: rawContent },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[OPEN_CLAW_MARKETING] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
