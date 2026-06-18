/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type OrchestratorMode = "daily_brief" | "adjust" | "weekly_plan";
type AIDepth = "quick" | "balanced" | "deep";
type ModelTier = "rules" | "cheap" | "standard" | "premium";
type PlanTier = "free" | "plus" | "pro" | "premium" | "lifetime";
type AIConfidence = "Low" | "Medium" | "High";
type GuideId = "awareness" | "perspective" | "habit" | "wellness" | "environment";
type GuideLens = "full_dashboard" | GuideId;
type ProposalType =
  | "planner_create_item"
  | "planner_reschedule_item"
  | "planner_simplify_day"
  | "meal_plan_generate"
  | "money_attention_item"
  | "daily_checkin_prompt"
  | "weekly_plan_generate"
  | "nudge_schedule";

interface GuideInsight {
  guide_id: GuideId;
  guide_name: string;
  guide_emoji: string;
  role_label: string;
  insight: string;
  recommended_action: string;
  confidence: AIConfidence;
  source_context_optional?: string | null;
}

interface EgoWarning {
  signal: string;
  recommended_response: string;
  confidence?: AIConfidence;
  source_context_optional?: string | null;
}

interface DailyPlan {
  day_type: string;
  summary: string;
  matters_most: string;
  protect: string;
  next_move: string;
  fallback: string;
  weekly_prompt?: string | null;
  sources_used: string[];
  generated_by: "ai" | "rules";
  day_signal?: string;
  main_priority?: string;
  protect_this?: string;
  next_actions?: string[];
  guide_insights?: GuideInsight[];
  ego_warning_optional?: EgoWarning | null;
  fully_charged_focus?: string;
  confidence?: AIConfidence;
}

interface ProposalInput {
  proposal_type: ProposalType;
  title: string;
  rationale: string;
  payload: Record<string, unknown>;
  display_order?: number;
}

interface StructuredResponse {
  daily_plan: DailyPlan;
  proposals: ProposalInput[];
  memory_candidates?: Array<{ domain: string; content: string; confidence?: number; source?: string }>;
}

interface AIProvider {
  name: string;
  model: string;
  modelTier: ModelTier;
  generateStructuredResponse: (systemPrompt: string, userPrompt: string) => Promise<ProviderResult>;
  streamResponse?: never;
  proposeActions?: never;
  summarizeMemory?: never;
}

interface ProviderResult {
  structured: StructuredResponse;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

interface ModelPolicy {
  aiDepth: AIDepth;
  requestedDepth: AIDepth;
  modelTier: ModelTier;
  model: string | null;
  reason: string;
  downgraded: boolean;
}

interface EntitlementStatus {
  planTier: PlanTier;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

interface AIPlanLimits {
  dailyBriefsPerMonth: number | null;
  adjustmentsPerMonth: number | null;
  weeklyDeepReview: boolean;
  memoryItems: number;
  deeperMoments: boolean;
}

interface UsageLimitStatus {
  allowed: boolean;
  used: number;
  limit: number | null;
  remaining: number | null;
  periodStart: Date;
  periodEnd: Date;
  message?: string;
}

const EXECUTABLE_TYPES = new Set<ProposalType>(["planner_create_item", "daily_checkin_prompt"]);
const MODEL_BY_TIER: Record<Exclude<ModelTier, "rules">, string> = {
  cheap: "google/gemini-2.5-flash-lite",
  standard: "google/gemini-2.5-flash",
  premium: "google/gemini-3-flash-preview",
};
const TOKEN_PRICING_PER_MILLION: Record<Exclude<ModelTier, "rules">, { input: number; output: number }> = {
  cheap: { input: 0.10, output: 0.40 },
  standard: { input: 0.30, output: 2.50 },
  premium: { input: 0.50, output: 3.00 },
};
const AI_PLAN_LIMITS: Record<PlanTier, AIPlanLimits> = {
  free: {
    dailyBriefsPerMonth: 5,
    adjustmentsPerMonth: 10,
    weeklyDeepReview: false,
    memoryItems: 0,
    deeperMoments: false,
  },
  plus: {
    dailyBriefsPerMonth: 20,
    adjustmentsPerMonth: 50,
    weeklyDeepReview: false,
    memoryItems: 5,
    deeperMoments: false,
  },
  pro: {
    dailyBriefsPerMonth: null,
    adjustmentsPerMonth: 300,
    weeklyDeepReview: true,
    memoryItems: 200,
    deeperMoments: true,
  },
  premium: {
    dailyBriefsPerMonth: null,
    adjustmentsPerMonth: null,
    weeklyDeepReview: true,
    memoryItems: 1000,
    deeperMoments: true,
  },
  lifetime: {
    dailyBriefsPerMonth: null,
    adjustmentsPerMonth: null,
    weeklyDeepReview: true,
    memoryItems: 1000,
    deeperMoments: true,
  },
};
const AI_LIMIT_MESSAGE = "You've used your free AI plans for this month. Upgrade to keep your AI learning you.";
const GUIDE_META: Record<GuideId, Omit<GuideInsight, "insight" | "recommended_action" | "confidence" | "source_context_optional">> = {
  awareness: {
    guide_id: "awareness",
    guide_name: "Awareness",
    guide_emoji: "🦉",
    role_label: "See clearly",
  },
  perspective: {
    guide_id: "perspective",
    guide_name: "Perspective",
    guide_emoji: "🐢",
    role_label: "Reframe the story",
  },
  habit: {
    guide_id: "habit",
    guide_name: "Habit",
    guide_emoji: "🦈",
    role_label: "Build the next repeat",
  },
  wellness: {
    guide_id: "wellness",
    guide_name: "Wellness",
    guide_emoji: "🛰️",
    role_label: "Protect your charge",
  },
  environment: {
    guide_id: "environment",
    guide_name: "Environment",
    guide_emoji: "🚀",
    role_label: "Shape the space",
  },
};
const GUIDE_LENSES = new Set<GuideLens>(["full_dashboard", "awareness", "perspective", "habit", "wellness", "environment"]);

const toJson = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function stripCodeFence(value: string): string {
  return value.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

function normalizeDate(input: unknown): string {
  return typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? input
    : new Date().toISOString().slice(0, 10);
}

function normalizeDepth(input: unknown, mode: OrchestratorMode): AIDepth {
  if (input === "balanced" || input === "deep" || input === "quick") return input;
  return mode === "weekly_plan" ? "balanced" : "quick";
}

function normalizeGuideLens(input: unknown): GuideLens {
  return GUIDE_LENSES.has(input as GuideLens) ? (input as GuideLens) : "full_dashboard";
}

function estimateTokens(value: string): number {
  return Math.max(1, Math.ceil(value.length / 4));
}

function estimateCost(modelTier: ModelTier, inputTokens: number, outputTokens: number): number {
  if (modelTier === "rules") return 0;
  const pricing = TOKEN_PRICING_PER_MILLION[modelTier];
  return ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1_000_000;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function confidenceFromSources(sources: string[] = []): AIConfidence {
  const uniqueSources = new Set(sources.filter(Boolean));
  if (uniqueSources.size >= 5) return "High";
  if (uniqueSources.size >= 3) return "Medium";
  return "Low";
}

function normalizeConfidence(value: unknown, fallback: AIConfidence): AIConfidence {
  if (value === "Low" || value === "Medium" || value === "High") return value;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    if (normalized === "low") return "Low";
    if (normalized === "medium") return "Medium";
    if (normalized === "high") return "High";
  }
  if (typeof value === "number") {
    if (value >= 0.75) return "High";
    if (value >= 0.45) return "Medium";
    return "Low";
  }
  return fallback;
}

function normalizeGuideInsight(value: unknown, fallbackConfidence: AIConfidence): GuideInsight | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const guideId = source.guide_id as GuideId;
  if (!GUIDE_META[guideId]) return null;
  const insight = asString(source.insight);
  const recommendedAction = asString(source.recommended_action);
  if (!insight || !recommendedAction) return null;
  const meta = GUIDE_META[guideId];

  return {
    ...meta,
    guide_name: asString(source.guide_name, meta.guide_name),
    guide_emoji: asString(source.guide_emoji, meta.guide_emoji),
    role_label: asString(source.role_label, meta.role_label),
    insight,
    recommended_action: recommendedAction,
    confidence: normalizeConfidence(source.confidence, fallbackConfidence),
    source_context_optional: asString(source.source_context_optional) || null,
  };
}

function normalizeEgoWarning(value: unknown, fallbackConfidence: AIConfidence): EgoWarning | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const signal = asString(source.signal);
  const recommendedResponse = asString(source.recommended_response || source.recommended_action);
  if (!signal || !recommendedResponse) return null;

  return {
    signal,
    recommended_response: recommendedResponse,
    confidence: normalizeConfidence(source.confidence, fallbackConfidence),
    source_context_optional: asString(source.source_context_optional) || null,
  };
}

function buildGuideInsights({
  summary,
  mattersMost,
  protect,
  nextMove,
  fallback,
  confidence,
  mode,
}: {
  summary: string;
  mattersMost: string;
  protect: string;
  nextMove: string;
  fallback: string;
  confidence: AIConfidence;
  mode: OrchestratorMode;
}): GuideInsight[] {
  const all: GuideInsight[] = [
    {
      ...GUIDE_META.awareness,
      insight: summary,
      recommended_action: "Name the real shape of the day before you add more.",
      confidence,
      source_context_optional: "day signal",
    },
    {
      ...GUIDE_META.perspective,
      insight: mattersMost,
      recommended_action: "Keep the day centered on the priority that changes the most.",
      confidence,
      source_context_optional: "priority",
    },
    {
      ...GUIDE_META.habit,
      insight: nextMove,
      recommended_action: nextMove,
      confidence,
      source_context_optional: "next action",
    },
    {
      ...GUIDE_META.wellness,
      insight: protect,
      recommended_action: protect,
      confidence,
      source_context_optional: "energy protection",
    },
    {
      ...GUIDE_META.environment,
      insight: fallback,
      recommended_action: "Remove one source of friction before the next action.",
      confidence,
      source_context_optional: "fallback plan",
    },
  ];

  return mode === "daily_brief" ? all : all.filter((guide) => ["awareness", "habit", "wellness"].includes(guide.guide_id));
}

function normalizeDailyPlanShape(plan: Partial<DailyPlan>, context: any, mode: OrchestratorMode): DailyPlan {
  const sources = Array.isArray(plan.sources_used) ? plan.sources_used.filter((source): source is string => typeof source === "string") : context.sourcesUsed || [];
  const confidence = normalizeConfidence(plan.confidence, confidenceFromSources(sources));
  const dayType = asString(plan.day_type, asString(plan.day_signal, "steady execution"));
  const summary = asString(plan.summary, `Today looks like a ${dayType}. Keep the plan narrow and executable.`);
  const mattersMost = asString(plan.matters_most, asString(plan.main_priority, "Choose one business-critical win before the day fills itself."));
  const protect = asString(plan.protect, asString(plan.protect_this, "Protect one uninterrupted focus block."));
  const nextMove = asString(plan.next_move, Array.isArray(plan.next_actions) ? asString(plan.next_actions[0]) : "Add one 25-minute focus block to your plan.");
  const fallback = asString(plan.fallback, "If the day gets noisy, return to one task and one close-out.");
  const nextActions = Array.isArray(plan.next_actions)
    ? plan.next_actions.filter((action): action is string => typeof action === "string" && action.trim().length > 0).slice(0, 5)
    : [];
  const guideInsights = Array.isArray(plan.guide_insights)
    ? plan.guide_insights
        .map((insight) => normalizeGuideInsight(insight, confidence))
        .filter((insight): insight is GuideInsight => Boolean(insight))
        .slice(0, 5)
    : [];

  return {
    day_type: dayType,
    summary,
    matters_most: mattersMost,
    protect,
    next_move: nextMove,
    fallback,
    weekly_prompt: typeof plan.weekly_prompt === "string" ? plan.weekly_prompt : null,
    sources_used: sources,
    generated_by: plan.generated_by === "ai" ? "ai" : "rules",
    day_signal: asString(plan.day_signal, dayType),
    main_priority: asString(plan.main_priority, mattersMost),
    protect_this: asString(plan.protect_this, protect),
    next_actions: nextActions.length > 0 ? nextActions : [nextMove],
    guide_insights: guideInsights.length > 0
      ? guideInsights
      : buildGuideInsights({ summary, mattersMost, protect, nextMove, fallback, confidence, mode }),
    ego_warning_optional: normalizeEgoWarning(plan.ego_warning_optional, confidence),
    fully_charged_focus: asString(plan.fully_charged_focus, "End the day with one kept promise and enough energy to recover cleanly."),
    confidence,
  };
}

function normalizeStructuredResponse(structured: StructuredResponse, context: any, mode: OrchestratorMode): StructuredResponse {
  return {
    ...structured,
    daily_plan: normalizeDailyPlanShape(structured.daily_plan || {}, context, mode),
    proposals: Array.isArray(structured.proposals) ? structured.proposals : [],
  };
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hasInsightIntent(prompt?: string): boolean {
  if (!prompt) return false;
  return /\b(pattern|insight|why|review|synthesi[sz]e|analy[sz]e|trend|recurring|next week|weekly)\b/i.test(prompt);
}

function isTodayReplayPrompt(prompt?: string): boolean {
  if (!prompt) return false;
  return /\b(what should i do today|today'?s plan|daily brief|what matters most|what do i do next)\b/i.test(prompt);
}

function chooseModelPolicy(mode: OrchestratorMode, requestedDepth: AIDepth, prompt: string | undefined, planTier: PlanTier): ModelPolicy {
  const paid = planTier !== "free";
  const pro = planTier === "pro" || planTier === "premium" || planTier === "lifetime";
  const insightIntent = hasInsightIntent(prompt);

  if (mode === "daily_brief") {
    return {
      requestedDepth,
      aiDepth: "quick",
      modelTier: "cheap",
      model: MODEL_BY_TIER.cheap,
      reason: "daily briefs stay on the default low-cost lane",
      downgraded: requestedDepth !== "quick",
    };
  }

  if (mode === "weekly_plan") {
    if (requestedDepth === "deep" && pro) {
      return {
        requestedDepth,
        aiDepth: "deep",
        modelTier: "premium",
        model: MODEL_BY_TIER.premium,
        reason: "deep weekly synthesis for pro/lifetime users",
        downgraded: false,
      };
    }

    return {
      requestedDepth,
      aiDepth: "balanced",
      modelTier: "standard",
      model: MODEL_BY_TIER.standard,
      reason: requestedDepth === "deep" && !pro ? "deep weekly synthesis requires pro access" : "weekly planning earns the standard lane",
      downgraded: requestedDepth === "quick" || (requestedDepth === "deep" && !pro),
    };
  }

  if (requestedDepth === "deep" && insightIntent && pro) {
    return {
      requestedDepth,
      aiDepth: "deep",
      modelTier: "premium",
      model: MODEL_BY_TIER.premium,
      reason: "deep insight prompt from a pro/lifetime user",
      downgraded: false,
    };
  }

  if ((requestedDepth === "balanced" && paid) || (requestedDepth === "deep" && paid) || insightIntent) {
    return {
      requestedDepth,
      aiDepth: requestedDepth === "quick" ? "balanced" : requestedDepth === "deep" ? "balanced" : requestedDepth,
      modelTier: "standard",
      model: MODEL_BY_TIER.standard,
      reason: requestedDepth === "deep" ? "deep daily adjustments are capped at balanced unless they are pro insight moments" : "balanced adjustment lane",
      downgraded: requestedDepth === "deep",
    };
  }

  return {
    requestedDepth,
    aiDepth: "quick",
    modelTier: "cheap",
    model: MODEL_BY_TIER.cheap,
    reason: "normal adjustments stay on the low-cost lane",
    downgraded: requestedDepth !== "quick",
  };
}

function ensureProposalShape(proposal: Partial<ProposalInput>, fallbackDate: string, index: number): ProposalInput | null {
  if (!proposal.proposal_type || !proposal.title) return null;
  const allowed: ProposalType[] = [
    "planner_create_item",
    "planner_reschedule_item",
    "planner_simplify_day",
    "meal_plan_generate",
    "money_attention_item",
    "daily_checkin_prompt",
    "weekly_plan_generate",
    "nudge_schedule",
  ];
  if (!allowed.includes(proposal.proposal_type)) return null;

  const payload = proposal.payload && typeof proposal.payload === "object" ? proposal.payload : {};
  if (proposal.proposal_type === "planner_create_item") {
    return {
      proposal_type: proposal.proposal_type,
      title: proposal.title,
      rationale: proposal.rationale || "This gives today one clear next action.",
      display_order: proposal.display_order ?? index,
      payload: {
        title: String((payload as any).title || proposal.title).slice(0, 120),
        scheduled_date: String((payload as any).scheduled_date || fallbackDate),
        item_type: (payload as any).item_type === "time_block" ? "time_block" : "task",
        start_time: typeof (payload as any).start_time === "string" ? (payload as any).start_time : null,
        end_time: typeof (payload as any).end_time === "string" ? (payload as any).end_time : null,
        energy_level: ["low", "medium", "high"].includes((payload as any).energy_level) ? (payload as any).energy_level : "medium",
        description: typeof (payload as any).description === "string" ? (payload as any).description.slice(0, 500) : null,
        guide_id: GUIDE_META[(payload as any).guide_id as GuideId] ? (payload as any).guide_id : "habit",
        controllable: GUIDE_META[(payload as any).controllable as GuideId] ? (payload as any).controllable : "habit",
      },
    };
  }

  return {
    proposal_type: proposal.proposal_type,
    title: proposal.title,
    rationale: proposal.rationale || "Suggested by your Dashboard.",
    display_order: proposal.display_order ?? index,
    payload,
  };
}

function buildRulesResponse(context: any, today: string, mode: OrchestratorMode, prompt?: string): StructuredResponse {
  const plannerItems = context.plannerItems || [];
  const operatorOnboarding = context.operatorOnboarding || {};
  const health = context.healthLatest;
  const money = context.moneySummary;
  const hasHeavyDay = plannerItems.length >= 5;
  const lowRecovery = typeof health?.recovery_score === "number" && health.recovery_score < 45;
  const openTasks = plannerItems.filter((item: any) => item.status !== "done");
  const firstTask = openTasks[0];

  let dayType = operatorOnboarding.dayType ? String(operatorOnboarding.dayType).toLowerCase() : "steady execution";
  if (!operatorOnboarding.dayType) {
    if (lowRecovery && hasHeavyDay) dayType = "protected full schedule day";
    else if (hasHeavyDay) dayType = "full schedule day";
    else if (lowRecovery) dayType = "recovery-aware day";
    else if (plannerItems.length <= 2) dayType = "focus opportunity";
  }

  const mattersMost = operatorOnboarding.mattersToday
    ? `Protect progress on "${String(operatorOnboarding.mattersToday).slice(0, 120)}".`
    : firstTask?.title
    ? `Protect progress on "${firstTask.title}".`
    : "Choose one business-critical win before the day fills itself.";
  let protect = "Protect one uninterrupted focus block.";
  if (operatorOnboarding.protectFocus) {
    protect = `Protect ${String(operatorOnboarding.protectFocus).toLowerCase()} so the plan matches the life you are actually living today.`;
  } else if (operatorOnboarding.controlLevel === "Survival mode") {
    protect = "Protect the smallest useful version. Do not build a fantasy plan.";
  } else if (operatorOnboarding.controlLevel === "Back-to-back") {
    protect = "Protect transitions and one clean close-out.";
  } else if (lowRecovery) {
    protect = "Protect recovery and decision quality. Reduce optional commitments.";
  } else if (hasHeavyDay) {
    protect = "Protect transition space between commitments.";
  }
  const nextMove = mode === "adjust" && prompt
    ? `Use this adjustment: ${prompt.slice(0, 120)}`
    : firstTask?.title
      ? `Start with "${firstTask.title}" before opening new loops.`
      : "Add one 25-minute focus block to your plan.";

  const proposals: ProposalInput[] = [];
  if (!firstTask || mode === "adjust") {
    proposals.push({
      proposal_type: "planner_create_item",
      title: mode === "adjust" ? "Add an adjusted focus block" : "Add one focus block",
      rationale: "A visible block makes the day executable instead of aspirational.",
      display_order: 0,
      payload: {
        title: mode === "adjust" && prompt
          ? `Adjusted focus: ${prompt.slice(0, 72)}`
          : operatorOnboarding.mattersToday
            ? String(operatorOnboarding.mattersToday).slice(0, 120)
            : "Focus block: one important win",
        scheduled_date: today,
        item_type: "task",
        energy_level: lowRecovery ? "low" : "medium",
        description: "Created from Mission of the Day.",
        guide_id: "habit",
        controllable: "habit",
      },
    });
  }

  proposals.push({
    proposal_type: "daily_checkin_prompt",
    title: "Close today with one win",
    rationale: "The daily loop gets stronger when the day ends with a clear outcome.",
    display_order: 1,
    payload: {
      prompt: "What moved today, what drained you, and what should be lighter tomorrow?",
      deep_link: "/growth",
      guide_id: "awareness",
      controllable: "awareness",
    },
  });

  if (money?.billsDueCount > 0) {
    proposals.push({
      proposal_type: "money_attention_item",
      title: `${money.billsDueCount} money item${money.billsDueCount === 1 ? "" : "s"} need attention`,
      rationale: "Money pressure is easier to handle before it becomes background stress.",
      display_order: 2,
      payload: { deep_link: "/wealth", billsDueCount: money.billsDueCount, guide_id: "environment", controllable: "environment" },
    });
  }

  const summary = `Today looks like a ${dayType}. Keep the plan narrow and executable.`;
  const fallback = lowRecovery ? "If the day slips, do the smallest useful version and stop cleanly." : "If the day gets noisy, return to one task and one close-out.";
  const confidence = confidenceFromSources(context.sourcesUsed);
  const egoWarning = hasHeavyDay || lowRecovery || operatorOnboarding.controlLevel === "Survival mode"
    ? {
        signal: hasHeavyDay
          ? "Watch for overcommitting to catch up."
          : "Watch for treating low charge as failure.",
        recommended_response: "Pause before adding more. Shrink the plan before the day starts making decisions for you.",
        confidence,
        source_context_optional: "planner and energy signals",
      }
    : null;

  return {
    daily_plan: {
      day_type: dayType,
      summary,
      matters_most: mattersMost,
      protect,
      next_move: nextMove,
      fallback,
      weekly_prompt: new Date(`${today}T12:00:00`).getDay() === 1 ? "Set one weekly win before the week starts moving." : null,
      sources_used: context.sourcesUsed,
      generated_by: "rules",
      day_signal: dayType,
      main_priority: mattersMost,
      protect_this: protect,
      next_actions: [nextMove],
      guide_insights: buildGuideInsights({ summary, mattersMost, protect, nextMove, fallback, confidence, mode }),
      ego_warning_optional: egoWarning,
      fully_charged_focus: "End the day with one kept promise and enough energy to recover cleanly.",
      confidence,
    },
    proposals,
  };
}

function createLovableProvider(policy: ModelPolicy): AIProvider | null {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey || !policy.model || policy.modelTier === "rules") return null;

  return {
    name: "lovable",
    model: policy.model,
    modelTier: policy.modelTier,
    generateStructuredResponse: async (systemPrompt: string, userPrompt: string) => {
      const inputTokens = estimateTokens(`${systemPrompt}\n${userPrompt}`);
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: policy.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.35,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI provider returned ${response.status}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content;
      if (typeof raw !== "string") throw new Error("AI provider returned no content");
      const outputTokens = typeof data.usage?.completion_tokens === "number"
        ? data.usage.completion_tokens
        : estimateTokens(raw);
      const resolvedInputTokens = typeof data.usage?.prompt_tokens === "number"
        ? data.usage.prompt_tokens
        : inputTokens;

      return {
        structured: JSON.parse(stripCodeFence(raw)) as StructuredResponse,
        inputTokens: resolvedInputTokens,
        outputTokens,
        estimatedCostUsd: estimateCost(policy.modelTier, resolvedInputTokens, outputTokens),
      };
    },
  };
}

async function getOrCreateConsents(admin: any, userId: string) {
  const { data: existing } = await admin
    .from("ai_consents")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) return existing;

  const { data } = await admin
    .from("ai_consents")
    .insert({ user_id: userId })
    .select("*")
    .single();
  return data;
}

const getCalendarMonthPeriod = (now = new Date()) => {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
};

const normalizePlanTier = (value: unknown): PlanTier => {
  if (value === "plus" || value === "pro" || value === "premium" || value === "lifetime") return value;
  return "free";
};

async function getEntitlementStatus(admin: any, userId: string): Promise<EntitlementStatus> {
  const { data } = await admin
    .from("user_entitlements")
    .select("plan_tier, expires_at, current_period_start, current_period_end")
    .eq("user_id", userId)
    .eq("entitlement_type", "full_access")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const monthlyPeriod = getCalendarMonthPeriod();
  if (!data) {
    return { planTier: "free", currentPeriodStart: monthlyPeriod.start, currentPeriodEnd: monthlyPeriod.end };
  }

  const expiresAt = data.expires_at || data.current_period_end;
  if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
    return { planTier: "free", currentPeriodStart: monthlyPeriod.start, currentPeriodEnd: monthlyPeriod.end };
  }

  const planTier = normalizePlanTier(data.plan_tier);
  if (planTier === "free") {
    return { planTier: "free", currentPeriodStart: monthlyPeriod.start, currentPeriodEnd: monthlyPeriod.end };
  }

  return {
    planTier,
    currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : monthlyPeriod.start,
    currentPeriodEnd: data.current_period_end || data.expires_at ? new Date(data.current_period_end || data.expires_at) : monthlyPeriod.end,
  };
}

async function getPlanTier(admin: any, userId: string): Promise<PlanTier> {
  return (await getEntitlementStatus(admin, userId)).planTier;
}

async function getRecentUsageCount(admin: any, userId: string, mode: OrchestratorMode, since: Date) {
  const { count } = await admin
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("mode", mode)
    .eq("cache_hit", false)
    .gte("created_at", since.toISOString());

  return count || 0;
}

function getSoftLimit(mode: OrchestratorMode, policy: ModelPolicy, planTier: PlanTier) {
  if (mode === "daily_brief") return 24;
  if (mode === "weekly_plan") return planTier === "free" ? 1 : 3;
  if (policy.modelTier === "premium") return 2;
  if (policy.modelTier === "standard") return planTier === "free" ? 4 : 8;
  return planTier === "free" ? 8 : 16;
}

const getMonthlyLimit = (mode: OrchestratorMode, planTier: PlanTier): number | null => {
  const limits = AI_PLAN_LIMITS[planTier];
  if (mode === "daily_brief") return limits.dailyBriefsPerMonth;
  if (mode === "adjust") return limits.adjustmentsPerMonth;
  if (mode === "weekly_plan") return limits.weeklyDeepReview ? null : 0;
  return null;
};

async function getBillingPeriodUsageCount(
  admin: any,
  userId: string,
  mode: OrchestratorMode,
  periodStart: Date,
  periodEnd: Date,
) {
  const { count } = await admin
    .from("ai_usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("mode", mode)
    .eq("cache_hit", false)
    .neq("provider", "limit")
    .gte("created_at", periodStart.toISOString())
    .lt("created_at", periodEnd.toISOString());

  return count || 0;
}

async function getUsageLimitStatus(
  admin: any,
  userId: string,
  mode: OrchestratorMode,
  entitlement: EntitlementStatus,
): Promise<UsageLimitStatus> {
  const limit = getMonthlyLimit(mode, entitlement.planTier);
  if (limit === null) {
    return {
      allowed: true,
      used: 0,
      limit,
      remaining: null,
      periodStart: entitlement.currentPeriodStart,
      periodEnd: entitlement.currentPeriodEnd,
    };
  }

  const used = await getBillingPeriodUsageCount(
    admin,
    userId,
    mode,
    entitlement.currentPeriodStart,
    entitlement.currentPeriodEnd,
  );

  return {
    allowed: used < limit,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    periodStart: entitlement.currentPeriodStart,
    periodEnd: entitlement.currentPeriodEnd,
    message: used < limit ? undefined : AI_LIMIT_MESSAGE,
  };
}

async function readCachedStructuredResponse(admin: any, userId: string, cacheKey: string): Promise<StructuredResponse | null> {
  const { data } = await admin
    .from("ai_response_cache")
    .select("response_payload, expires_at")
    .eq("user_id", userId)
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  return data?.response_payload || null;
}

async function writeCachedStructuredResponse(
  admin: any,
  userId: string,
  cacheKey: string,
  mode: OrchestratorMode,
  policy: ModelPolicy,
  structured: StructuredResponse,
) {
  const expires = new Date();
  expires.setHours(expires.getHours() + (mode === "weekly_plan" ? 24 : 6));

  await admin
    .from("ai_response_cache")
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      mode,
      ai_depth: policy.aiDepth,
      model_tier: policy.modelTier,
      response_payload: structured,
      expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,cache_key" });
}

async function logUsageEvent(
  admin: any,
  userId: string,
  mode: OrchestratorMode,
  policy: ModelPolicy,
  provider: string,
  model: string | null,
  promptHash: string,
  cacheHit: boolean,
  usage: Pick<ProviderResult, "inputTokens" | "outputTokens" | "estimatedCostUsd">,
  metadata: Record<string, unknown>,
) {
  await admin.from("ai_usage_events").insert({
    user_id: userId,
    surface: "daily_operator",
    mode,
    ai_depth: policy.aiDepth,
    model_tier: provider === "rules" || provider === "limit" ? "rules" : policy.modelTier,
    provider,
    model,
    prompt_hash: promptHash,
    cache_hit: cacheHit,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    estimated_cost_usd: usage.estimatedCostUsd,
    metadata,
  });
}

async function gatherContext(admin: any, userId: string, today: string, consents: any) {
  const sevenDaysAgo = new Date(`${today}T12:00:00`);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

  const [sessionRes, onboardingRes, plannerRes, ringsRes, weeklyRes, actionsRes, healthRes, billsRes, subsRes, goalsRes, memoriesRes] =
    await Promise.all([
      admin
        .from("reset_sessions")
        .select("id, current_day, journey_id, start_date, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("user_onboarding")
        .select("operator_onboarding_answers")
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("planner_items")
        .select("id, title, description, item_type, status, scheduled_date, start_time, end_time, energy_level, connection_id, external_event_id")
        .eq("user_id", userId)
        .eq("scheduled_date", today)
        .order("sort_order", { ascending: true }),
      admin
        .from("daily_rings")
        .select("notice_completed, choose_completed, prove_completed, charge_completed, align_completed")
        .eq("user_id", userId)
        .eq("ring_date", today)
        .maybeSingle(),
      admin
        .from("weekly_tracking")
        .select("*")
        .eq("user_id", userId)
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from("completed_actions")
        .select("action_text, controllable, xp_awarded, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", sevenDaysAgo.toISOString())
        .order("completed_at", { ascending: false })
        .limit(12),
      consents.body_context
        ? admin
            .from("health_sync_data")
            .select("sync_date, recovery_score, sleep_minutes, active_minutes, hrv_ms, strain_score")
            .eq("user_id", userId)
            .order("sync_date", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      consents.money_context
        ? admin.from("recurring_bills").select("id, bill_name, amount, due_date, frequency").eq("user_id", userId).eq("is_active", true)
        : Promise.resolve({ data: [] }),
      consents.money_context
        ? admin.from("subscriptions").select("id, service_name, amount, next_billing_date").eq("user_id", userId).eq("is_active", true)
        : Promise.resolve({ data: [] }),
      consents.money_context
        ? admin.from("savings_goals").select("id, goal_name, target_amount, current_amount").eq("user_id", userId).eq("is_completed", false)
        : Promise.resolve({ data: [] }),
      consents.memory_enabled
        ? admin
            .from("ai_memories")
            .select("id, domain, content, confidence")
            .eq("user_id", userId)
            .is("archived_at", null)
            .order("created_at", { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [] }),
    ]);

  const plannerItems = (plannerRes.data || []).filter((item: any) => {
    if (consents.calendar_context) return true;
    return !item.connection_id && !item.external_event_id;
  });

  const bills = billsRes.data || [];
  const moneySummary = {
    billsDueCount: bills.length,
    subscriptionsCount: (subsRes.data || []).length,
    savingsGoalsCount: (goalsRes.data || []).length,
  };

  const sourcesUsed = ["planner", "growth"];
  if (onboardingRes.data?.operator_onboarding_answers?.mattersToday) sourcesUsed.push("first-day setup");
  if (consents.calendar_context) sourcesUsed.push("calendar");
  if (consents.body_context) sourcesUsed.push("body");
  if (consents.money_context) sourcesUsed.push("money");
  if (consents.email_summary_context) sourcesUsed.push("email summary");
  if (consents.memory_enabled) sourcesUsed.push("memory");

  return {
    activeSession: sessionRes.data,
    operatorOnboarding: onboardingRes.data?.operator_onboarding_answers || null,
    plannerItems,
    rings: ringsRes.data,
    weekly: weeklyRes.data,
    recentActions: actionsRes.data || [],
    healthLatest: healthRes.data,
    moneySummary,
    memories: memoriesRes.data || [],
    sourcesUsed,
    contextDigest: {
      planner_count: plannerItems.length,
      has_active_snapshot: !!sessionRes.data,
      body_included: !!consents.body_context,
      money_included: !!consents.money_context,
      memory_count: (memoriesRes.data || []).length,
      has_operator_onboarding: !!onboardingRes.data?.operator_onboarding_answers,
      sources_used: sourcesUsed,
    },
  };
}

function buildPrompts(context: any, mode: OrchestratorMode, today: string, prompt?: string, selectedGuide: GuideLens = "full_dashboard") {
  const systemPrompt = `You are the Mission of the Day engine for The Dashboard, the companion app to The Controllables book.
The book introduced The Dashboard as an inner operating system. The app helps the user use it in real life.

Voice:
- Practical first.
- Calm, direct, and encouraging.
- Short, actionable insights. No motivational filler.
- No cheesy roleplay, fake mystical language, or overuse of character names.
- Never say you know more than the user has shared. Use "based on the available signals" when needed.
- Never shame the user. Treat overload, avoidance, low energy, and missed plans as signals to work with.
- Never over-prescribe wellness, mental health, finance, medical, or relationship advice.
- Do not diagnose. Do not imply certainty from limited data.

The five Controllables are guidance lenses:
- Awareness identifies the signal.
- Perspective reframes the situation.
- Habit chooses the smallest useful action.
- Wellness protects energy.
- Environment reduces friction.

The Ego appears only as a subtle warning around fear, comparison, overcommitment, reactivity, impulsive reaction, or avoidance.
Use "Ego Check" energy: helpful, neutral, never dramatic. It is a gentle awareness tool, not a diagnosis, villain, or blocker.

Return ONLY valid JSON with this exact shape:
{
  "daily_plan": {
    "day_type": string,
    "summary": string,
    "matters_most": string,
    "protect": string,
    "next_move": string,
    "fallback": string,
    "weekly_prompt": string | null,
    "sources_used": string[],
    "generated_by": "ai",
    "day_signal": string,
    "main_priority": string,
    "protect_this": string,
    "next_actions": string[],
    "guide_insights": [{
      "guide_id": "awareness" | "perspective" | "habit" | "wellness" | "environment",
      "guide_name": "Awareness" | "Perspective" | "Habit" | "Wellness" | "Environment",
      "guide_emoji": string,
      "role_label": "See clearly" | "Reframe the story" | "Build the next repeat" | "Protect your charge" | "Shape the space",
      "insight": string,
      "recommended_action": string,
      "confidence": "Low" | "Medium" | "High",
      "source_context_optional": string | null
    }],
    "ego_warning_optional": {
      "signal": string,
      "recommended_response": string,
      "confidence": "Low" | "Medium" | "High",
      "source_context_optional": string | null
    } | null,
    "fully_charged_focus": string,
    "confidence": "Low" | "Medium" | "High"
  },
  "proposals": [{
    "proposal_type": "planner_create_item" | "planner_reschedule_item" | "planner_simplify_day" | "meal_plan_generate" | "money_attention_item" | "daily_checkin_prompt" | "weekly_plan_generate" | "nudge_schedule",
    "title": string,
    "rationale": string,
    "payload": object,
    "display_order": number
  }],
  "memory_candidates": [{"domain": "planner" | "body" | "money" | "growth" | "communication" | "general", "content": string, "confidence": number, "source": string}]
}
Rules:
- Be specific, calm, and practical.
- The user must approve actions before anything mutates.
- Only include proposals that are clearly useful today.
- Daily briefs should prefer all five guide_insights. Ask/Adjust can include only the relevant guides.
- Daily brief output must include one clear day_signal, one main_priority, one protect_this, max five next_actions, guide_insights, optional ego_warning_optional, and a fully_charged_focus phrase.
- Ask/Adjust output must respond to the user's actual request, include only relevant guides, and propose structured actions only when useful.
- selected_guide is a lens, not a separate mode. If selected_guide is "full_dashboard", use the full Dashboard view. If it is one Controllable, use that guide as the primary lens while still respecting the full context and safety rules.
- Use ego_warning_optional sparingly. It should never be the main focus, never shame the user, never diagnose, and never trigger autonomous actions.
- ego_warning_optional is a subtle signal for overwhelm, fear, comparison, avoidance, overcommitment, impulsive reaction, or reactive autopilot. Use neutral "Watch for..." or "Pause before..." language. If there is no safe signal, return null.
- next_actions must contain no more than 5 short actions.
- For planner_create_item payload use: title, scheduled_date, item_type ("task" or "time_block"), start_time, end_time, energy_level ("low"|"medium"|"high"), description.
- Proposal payload may also include guide_id and controllable when a guide lens is relevant. It still must not mutate anything without approval.
- Keep the plan concise enough to read in under 30 seconds.
- Respect sources_used. Do not mention data sources not listed.

Examples of the voice:
- day_signal: "This is a focus + recovery day. Win early, then protect your charge."
- Awareness insight: "Your day has more inputs than open space."
- Perspective insight: "This is not a catch-up day. It is a choose-well day."
- Habit insight: "Start with the smallest action that creates momentum."
- Wellness insight: "Protect energy after the highest-pressure block."
- Environment insight: "Remove one distraction before your first work block."
- Ego warning signal: "Watch for all-or-nothing thinking."
- Ego warning signal: "Watch for overcommitting to prove something."
- Ego warning signal: "Pause before reacting to pressure."
- Ego warning signal: "Notice avoidance disguised as planning."`;

  const userPrompt = JSON.stringify({
    mode,
    today,
    user_adjustment_request: prompt || null,
    selected_guide: selectedGuide,
    context,
  });

  return { systemPrompt, userPrompt };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return toJson({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) return toJson({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const mode = (body.mode || "daily_brief") as OrchestratorMode;
    if (!["daily_brief", "adjust", "weekly_plan"].includes(mode)) return toJson({ error: "Invalid mode" }, 400);

    const userId = user.id;
    const today = normalizeDate(body.localDate);
    const forceRefresh = body.forceRefresh === true;
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 1000) : undefined;
    const requestedDepth = normalizeDepth(body.aiDepth, mode);
    const selectedGuide = normalizeGuideLens(body.selectedGuide);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const consents = await getOrCreateConsents(admin, userId);
    const entitlement = await getEntitlementStatus(admin, userId);
    const planTier = entitlement.planTier;
    const policy = chooseModelPolicy(mode, requestedDepth, prompt, planTier);

    const { data: existingPlan } = await admin
      .from("ai_daily_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", today)
      .maybeSingle();

    if (mode === "daily_brief" && existingPlan && !forceRefresh) {
      const { data: proposals } = await admin
        .from("ai_action_proposals")
        .select("*")
        .eq("user_id", userId)
        .eq("daily_plan_id", existingPlan.id)
        .order("display_order", { ascending: true });
      return toJson({ daily_plan: existingPlan, proposals: proposals || [], consents, cached: true });
    }

    if (mode === "adjust" && existingPlan && isTodayReplayPrompt(prompt)) {
      const { data: proposals } = await admin
        .from("ai_action_proposals")
        .select("*")
        .eq("user_id", userId)
        .eq("daily_plan_id", existingPlan.id)
        .order("display_order", { ascending: true });
      return toJson({
        daily_plan: existingPlan,
        proposals: proposals || [],
        consents,
        cached: true,
        cache_reason: "reused_daily_brief",
      });
    }

    const usageLimit = await getUsageLimitStatus(admin, userId, mode, entitlement);
    if (!usageLimit.allowed) {
      const limitPromptHash = await sha256(JSON.stringify({
        mode,
        today,
        prompt: (prompt || "").trim().toLowerCase(),
        selectedGuide,
        aiDepth: policy.aiDepth,
        modelTier: policy.modelTier,
        limit: usageLimit.limit,
        periodStart: usageLimit.periodStart.toISOString(),
      }));

      await logUsageEvent(admin, userId, mode, policy, "limit", null, limitPromptHash, true, {
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
      }, {
        plan_tier: planTier,
        monthly_limit: usageLimit.limit,
        monthly_used: usageLimit.used,
        period_start: usageLimit.periodStart.toISOString(),
        period_end: usageLimit.periodEnd.toISOString(),
        policy_reason: "monthly entitlement limit reached",
        selected_guide: selectedGuide,
      });

      const proposals = existingPlan
        ? (await admin
            .from("ai_action_proposals")
            .select("*")
            .eq("user_id", userId)
            .eq("daily_plan_id", existingPlan.id)
            .order("display_order", { ascending: true })).data || []
        : [];

      return toJson({
        daily_plan: existingPlan || null,
        proposals,
        consents,
        cached: Boolean(existingPlan),
        usage_limited: true,
        limit_message: usageLimit.message || AI_LIMIT_MESSAGE,
        upgrade_required: planTier === "free",
        usage_limits: {
          plan_tier: planTier,
          mode,
          limit: usageLimit.limit,
          used: usageLimit.used,
          remaining: usageLimit.remaining,
          period_start: usageLimit.periodStart.toISOString(),
          period_end: usageLimit.periodEnd.toISOString(),
        },
      });
    }

    const context = await gatherContext(admin, userId, today, consents);
    const promptHash = await sha256(JSON.stringify({
      mode,
      today,
      prompt: (prompt || "").trim().toLowerCase(),
      selectedGuide,
      aiDepth: policy.aiDepth,
      modelTier: policy.modelTier,
      sources: context.sourcesUsed,
      digest: context.contextDigest,
    }));
    const cacheKey = `${mode}:${today}:${policy.aiDepth}:${policy.modelTier}:${promptHash}`;
    const cachedStructured = await readCachedStructuredResponse(admin, userId, cacheKey);
    const provider = createLovableProvider(policy);
    let structured: StructuredResponse | null = null;
    let providerName = "rules";
    let model: string | null = null;
    let cacheHit = false;
    let usage = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };

    if (cachedStructured) {
      structured = cachedStructured;
      providerName = "cache";
      model = policy.model;
      cacheHit = true;
    }

    if (!structured && mode !== "daily_brief") {
      const since = new Date();
      since.setHours(since.getHours() - 1);
      const recentUsageCount = await getRecentUsageCount(admin, userId, mode, since);
      const softLimit = getSoftLimit(mode, policy, planTier);
      if (recentUsageCount >= softLimit && existingPlan) {
        const { data: proposals } = await admin
          .from("ai_action_proposals")
          .select("*")
          .eq("user_id", userId)
          .eq("daily_plan_id", existingPlan.id)
          .order("display_order", { ascending: true });

        await logUsageEvent(admin, userId, mode, policy, "limit", null, promptHash, true, usage, {
          plan_tier: planTier,
          soft_limit: softLimit,
          recent_usage_count: recentUsageCount,
          policy_reason: policy.reason,
          selected_guide: selectedGuide,
        });

        return toJson({
          daily_plan: existingPlan,
          proposals: proposals || [],
          consents,
          cached: true,
          usage_limited: true,
          limit_message: "You have adjusted this plan a few times already, so the Operator kept the current brief instead of spending another AI call.",
        });
      }
    }

    if (!structured && provider) {
      try {
        const prompts = buildPrompts(context, mode, today, prompt, selectedGuide);
        const result = await provider.generateStructuredResponse(prompts.systemPrompt, prompts.userPrompt);
        structured = normalizeStructuredResponse(result.structured, context, mode);
        usage = {
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          estimatedCostUsd: result.estimatedCostUsd,
        };
        providerName = provider.name;
        model = provider.model;
        structured.daily_plan.generated_by = "ai";
        await writeCachedStructuredResponse(admin, userId, cacheKey, mode, policy, structured);
      } catch (error) {
        console.error("ai-orchestrator provider failed, using rules:", error);
      }
    }

    if (!structured) {
      structured = buildRulesResponse(context, today, mode, prompt);
    }

    structured = normalizeStructuredResponse(structured, context, mode);
    structured.daily_plan.sources_used = context.sourcesUsed;
    structured.daily_plan.generated_by = providerName === "cache" ? "ai" : structured.daily_plan.generated_by;
    const normalizedProposals = (structured.proposals || [])
      .map((proposal, index) => ensureProposalShape(proposal, today, index))
      .filter(Boolean) as ProposalInput[];

    const { data: savedPlan, error: planError } = await admin
      .from("ai_daily_plans")
      .upsert({
        user_id: userId,
        plan_date: today,
        plan_data: structured.daily_plan,
        context_digest: context.contextDigest,
        status: "draft",
        generated_by: structured.daily_plan.generated_by,
        provider: providerName,
        model,
        ai_depth: policy.aiDepth,
        model_tier: cacheHit ? policy.modelTier : providerName === "rules" ? "rules" : policy.modelTier,
        cache_key: cacheKey,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,plan_date" })
      .select("*")
      .single();

    if (planError || !savedPlan) {
      console.error("ai-orchestrator plan save failed:", planError);
      return toJson({ error: "Could not save daily plan" }, 500);
    }

    if (mode !== "daily_brief" || forceRefresh) {
      await admin
        .from("ai_action_proposals")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("daily_plan_id", savedPlan.id)
        .eq("status", "pending");
    }

    const proposalRows = normalizedProposals.slice(0, 5).map((proposal, index) => ({
      user_id: userId,
      daily_plan_id: savedPlan.id,
      proposal_type: proposal.proposal_type,
      title: proposal.title,
      rationale: proposal.rationale,
      payload: proposal.payload,
      status: "pending",
      confirmation_required: EXECUTABLE_TYPES.has(proposal.proposal_type),
      display_order: proposal.display_order ?? index,
    }));

    let savedProposals: any[] = [];
    if (proposalRows.length > 0) {
      const { data, error } = await admin
        .from("ai_action_proposals")
        .insert(proposalRows)
        .select("*")
        .order("display_order", { ascending: true });
      if (error) console.error("ai-orchestrator proposal save failed:", error);
      savedProposals = data || [];
    }

    await logUsageEvent(admin, userId, mode, policy, providerName, model, promptHash, cacheHit, usage, {
      plan_tier: planTier,
      billing_period_start: entitlement.currentPeriodStart.toISOString(),
      billing_period_end: entitlement.currentPeriodEnd.toISOString(),
      requested_depth: policy.requestedDepth,
      downgraded: policy.downgraded,
      policy_reason: policy.reason,
      proposal_count: savedProposals.length,
      selected_guide: selectedGuide,
    });

    return toJson({
      daily_plan: savedPlan,
      proposals: savedProposals,
      consents,
      cached: cacheHit,
      usage_policy: {
        requested_depth: policy.requestedDepth,
        ai_depth: policy.aiDepth,
        model_tier: savedPlan.model_tier,
        downgraded: policy.downgraded,
        reason: policy.reason,
      },
      usage_limits: {
        plan_tier: planTier,
        mode,
        limit: usageLimit.limit,
        used: usageLimit.used + (cacheHit ? 0 : 1),
        remaining: usageLimit.remaining === null ? null : Math.max(0, usageLimit.remaining - (cacheHit ? 0 : 1)),
        period_start: usageLimit.periodStart.toISOString(),
        period_end: usageLimit.periodEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error("ai-orchestrator error:", error);
    return toJson({ error: "Internal server error" }, 500);
  }
});
