import {
  CONTROLLABLE_GUIDE_IDS,
  ORDERED_CONTROLLABLE_GUIDES,
  getControllableGuide,
  isControllableGuideId,
  type ControllableGuideId,
} from "@/lib/controllables";

export const AI_CONSENT_KEYS = [
  "calendar_context",
  "body_context",
  "money_context",
  "email_summary_context",
  "memory_enabled",
  "push_nudges_enabled",
  "email_nudges_enabled",
] as const;

export type AIConsentKey = (typeof AI_CONSENT_KEYS)[number];

export const AI_DEPTH_LEVELS = ["quick", "balanced", "deep"] as const;

export type AIDepthLevel = (typeof AI_DEPTH_LEVELS)[number];

export type AIProposalType =
  | "planner_create_item"
  | "planner_reschedule_item"
  | "planner_simplify_day"
  | "meal_plan_generate"
  | "money_attention_item"
  | "daily_checkin_prompt"
  | "weekly_plan_generate"
  | "nudge_schedule";

export const EXECUTABLE_AI_PROPOSALS: AIProposalType[] = [
  "planner_create_item",
  "daily_checkin_prompt",
];

export const AI_MEMORY_DOMAINS = [
  "planner",
  "body",
  "money",
  "growth",
  "communication",
  "general",
] as const;

export type AIMemoryDomain = (typeof AI_MEMORY_DOMAINS)[number];

export type AIPlanConfidence = "Low" | "Medium" | "High";

export const AI_CONTROLLABLE_GUIDES = CONTROLLABLE_GUIDE_IDS;

export type AIControllableGuideId = ControllableGuideId;
export type AIGuideLensId = "full_dashboard" | AIControllableGuideId;

export interface AIGuideLensOption {
  id: AIGuideLensId;
  label: string;
  emoji?: string;
  example: string;
}

export const AI_GUIDE_LENS_OPTIONS: AIGuideLensOption[] = [
  {
    id: "full_dashboard",
    label: "Full Dashboard",
    example: "Replan my afternoon.",
  },
  ...ORDERED_CONTROLLABLE_GUIDES.map((guide) => ({
    id: guide.id,
    label: guide.name,
    emoji: guide.emoji,
    example: {
      awareness: "What am I not seeing clearly?",
      perspective: "Help me reframe this.",
      habit: "What is the smallest next action?",
      wellness: "Make this day lighter.",
      environment: "What should I change around me?",
    }[guide.id],
  })),
];

export interface AIGuideInsight {
  guide_id: AIControllableGuideId;
  guide_name: string;
  guide_emoji: string;
  role_label: string;
  insight: string;
  recommended_action: string;
  confidence: AIPlanConfidence;
  source_context_optional?: string | null;
}

export interface AIEgoWarning {
  signal: string;
  recommended_response: string;
  confidence?: AIPlanConfidence;
  source_context_optional?: string | null;
}

export interface AIControllablePlanFields {
  day_signal: string;
  main_priority: string;
  protect_this: string;
  next_actions: string[];
  guide_insights: AIGuideInsight[];
  ego_warning_optional?: AIEgoWarning | null;
  fully_charged_focus: string;
  confidence: AIPlanConfidence;
}

export interface DeeperPassSignal {
  shouldSuggest: boolean;
  reasons: string[];
}

const getGuideInsightMeta = (
  guideId: AIControllableGuideId,
): Omit<AIGuideInsight, "insight" | "recommended_action" | "confidence" | "source_context_optional"> => {
  const guide = getControllableGuide(guideId);
  return {
    guide_id: guide.id,
    guide_name: guide.name,
    guide_emoji: guide.emoji,
    role_label: guide.role,
  };
};

export const isExecutableAIProposal = (type: string): type is AIProposalType => {
  return EXECUTABLE_AI_PROPOSALS.includes(type as AIProposalType);
};

export const normalizeAIGuideLens = (value: unknown): AIGuideLensId => {
  if (value === "full_dashboard" || isControllableGuideId(value)) {
    return value as AIGuideLensId;
  }
  return "full_dashboard";
};

export const getAIGuideLensOption = (guide: AIGuideLensId): AIGuideLensOption => {
  return AI_GUIDE_LENS_OPTIONS.find((option) => option.id === guide) || AI_GUIDE_LENS_OPTIONS[0];
};

export const buildAIAdjustmentRequestBody = ({
  prompt,
  aiDepth = "quick",
  selectedGuide,
  localDate,
  timezone,
}: {
  prompt: string;
  aiDepth?: AIDepthLevel;
  selectedGuide?: AIGuideLensId;
  localDate: string;
  timezone: string;
}) => ({
  mode: "adjust" as const,
  prompt,
  aiDepth: normalizeAIDepth(aiDepth),
  selectedGuide: normalizeAIGuideLens(selectedGuide),
  localDate,
  timezone,
  forceRefresh: true,
});

export const getAIPlanConfidence = (sources: string[] = []): AIPlanConfidence => {
  const uniqueSources = new Set(sources.filter(Boolean));
  if (uniqueSources.size >= 5) return "High";
  if (uniqueSources.size >= 3) return "Medium";
  return "Low";
};

const normalizeConfidence = (value: unknown, fallback: AIPlanConfidence): AIPlanConfidence => {
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
};

const asString = (value: unknown, fallback = ""): string => {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const normalizeGuideInsight = (value: unknown, fallbackConfidence: AIPlanConfidence): AIGuideInsight | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const guideId = source.guide_id;
  if (!isControllableGuideId(guideId)) return null;
  const meta = getGuideInsightMeta(guideId);
  const insight = asString(source.insight);
  const recommendedAction = asString(source.recommended_action);
  if (!insight || !recommendedAction) return null;

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
};

const normalizeEgoWarning = (value: unknown, fallbackConfidence: AIPlanConfidence): AIEgoWarning | null => {
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
};

export const deriveSafeEgoCheck = (
  plan: Record<string, unknown>,
  fallbackConfidence: AIPlanConfidence,
): AIEgoWarning | null => {
  const signalText = [
    plan.day_signal,
    plan.day_type,
    plan.summary,
    plan.user_adjustment_request,
    plan.adjustment_prompt,
  ]
    .map((value) => (typeof value === "string" ? value.toLowerCase() : ""))
    .join(" ");

  if (!signalText.trim()) return null;

  if (/\b(compare|comparison|prove|proving)\b/.test(signalText)) {
    return {
      signal: "Watch for comparison or proving energy.",
      recommended_response: "Pause before turning today into a scorecard.",
      confidence: fallbackConfidence,
      source_context_optional: "day signal",
    };
  }

  if (/\b(overwhelm|overwhelmed|busy|chaotic|back-to-back|survival|overload|crowded)\b/.test(signalText)) {
    return {
      signal: "Watch for overcommitting to catch up.",
      recommended_response: "Pause before adding more. Choose the next useful action.",
      confidence: fallbackConfidence,
      source_context_optional: "day signal",
    };
  }

  if (/\b(low energy|low charge|recovery|exhausted|burnout|burned out)\b/.test(signalText)) {
    return {
      signal: "Watch for treating low charge as failure.",
      recommended_response: "Pause before forcing a full-strength plan.",
      confidence: fallbackConfidence,
      source_context_optional: "day signal",
    };
  }

  if (/\b(avoid|avoidance|stuck|perfect|planning)\b/.test(signalText)) {
    return {
      signal: "Notice avoidance disguised as planning.",
      recommended_response: "Pause before refining the plan again. Start one small rep.",
      confidence: fallbackConfidence,
      source_context_optional: "day signal",
    };
  }

  if (/\b(pressure|react|reacting|urgent|impulsive)\b/.test(signalText)) {
    return {
      signal: "Pause before reacting to pressure.",
      recommended_response: "Create one breath of space before choosing the next move.",
      confidence: fallbackConfidence,
      source_context_optional: "day signal",
    };
  }

  if (/\b(big opportunity|opportunity)\b/.test(signalText)) {
    return {
      signal: "Watch for overcommitting to prove something.",
      recommended_response: "Pause before making the plan bigger than the moment requires.",
      confidence: fallbackConfidence,
      source_context_optional: "day signal",
    };
  }

  return null;
};

const buildFallbackGuideInsights = (
  plan: Record<string, unknown>,
  confidence: AIPlanConfidence,
): AIGuideInsight[] => {
  const summary = asString(plan.summary, "Name what is true about today before adding more.");
  const mattersMost = asString(plan.matters_most || plan.main_priority, "Choose one priority before the day fills itself.");
  const nextMove = asString(plan.next_move, "Start with one small, visible action.");
  const protect = asString(plan.protect || plan.protect_this, "Protect your energy and decision quality.");
  const fallback = asString(plan.fallback, "Reduce friction and return to one clean next step.");

  return [
    {
      ...getGuideInsightMeta("awareness"),
      insight: summary,
      recommended_action: "Name the real shape of the day before you add more.",
      confidence,
      source_context_optional: null,
    },
    {
      ...getGuideInsightMeta("perspective"),
      insight: mattersMost,
      recommended_action: "Keep the day centered on the priority that changes the most.",
      confidence,
      source_context_optional: null,
    },
    {
      ...getGuideInsightMeta("habit"),
      insight: nextMove,
      recommended_action: nextMove,
      confidence,
      source_context_optional: null,
    },
    {
      ...getGuideInsightMeta("wellness"),
      insight: protect,
      recommended_action: protect,
      confidence,
      source_context_optional: null,
    },
    {
      ...getGuideInsightMeta("environment"),
      insight: fallback,
      recommended_action: "Remove one source of friction before the next action.",
      confidence,
      source_context_optional: null,
    },
  ];
};

export const normalizeAIDailyPlanData = <T extends Record<string, unknown>>(planData: T): T & AIControllablePlanFields => {
  const sources = Array.isArray(planData.sources_used)
    ? planData.sources_used.filter((source): source is string => typeof source === "string")
    : [];
  const fallbackConfidence = getAIPlanConfidence(sources);
  const confidence = normalizeConfidence(planData.confidence, fallbackConfidence);
  const nextActions = Array.isArray(planData.next_actions)
    ? planData.next_actions.filter((action): action is string => typeof action === "string" && action.trim().length > 0).slice(0, 5)
    : [];
  const normalizedGuideInsights = Array.isArray(planData.guide_insights)
    ? planData.guide_insights
        .map((insight) => normalizeGuideInsight(insight, confidence))
        .filter((insight): insight is AIGuideInsight => Boolean(insight))
        .slice(0, 5)
    : [];

  const explicitEgoWarning = normalizeEgoWarning(planData.ego_warning_optional, confidence);

  return {
    ...planData,
    day_signal: asString(planData.day_signal, asString(planData.day_type, "Today needs a simple, executable plan.")),
    main_priority: asString(planData.main_priority, asString(planData.matters_most, "Choose one priority before the day fills itself.")),
    protect_this: asString(planData.protect_this, asString(planData.protect, "Protect focus and decision quality.")),
    next_actions: nextActions.length > 0 ? nextActions : [asString(planData.next_move, "Start with one small, visible action.")],
    guide_insights: normalizedGuideInsights.length > 0 ? normalizedGuideInsights : buildFallbackGuideInsights(planData, confidence),
    ego_warning_optional: explicitEgoWarning || deriveSafeEgoCheck(planData, confidence),
    fully_charged_focus: asString(
      planData.fully_charged_focus,
      "End the day with one kept promise and enough energy to recover cleanly.",
    ),
    confidence,
  };
};

export const getAIPlanContextLine = (sources: string[] = []): string => {
  const uniqueSources = new Set(sources.filter(Boolean));
  if (uniqueSources.size >= 3) {
    return "This plan is based on your priorities, energy, and recent patterns.";
  }
  if (uniqueSources.has("first-day setup")) {
    return "This plan is based on your first-day setup and today's priorities.";
  }
  return "This plan is based on the signals available today.";
};

export const normalizeAIDepth = (value: unknown): AIDepthLevel => {
  return AI_DEPTH_LEVELS.includes(value as AIDepthLevel) ? (value as AIDepthLevel) : "quick";
};

export const getAIDepthCopy = (depth: AIDepthLevel): { label: string; description: string } => {
  switch (depth) {
    case "quick":
      return {
        label: "Quick answer",
        description: "Fast, simple adjustment.",
      };
    case "balanced":
      return {
        label: "Think it through",
        description: "More context for planning decisions.",
      };
    case "deep":
      return {
        label: "Go deeper",
        description: "For weekly reviews, patterns, and bigger decisions.",
      };
  }
};

export const shouldSuggestDeeperPass = ({
  prompt,
  currentDepth,
  confidence,
  adjustmentCount,
}: {
  prompt: string;
  currentDepth: AIDepthLevel;
  confidence: AIPlanConfidence;
  adjustmentCount: number;
}): DeeperPassSignal => {
  const normalized = prompt.trim().toLowerCase();
  if (!normalized || currentDepth === "deep") return { shouldSuggest: false, reasons: [] };

  const reasons: string[] = [];
  const complexTerms = [
    /\bweekly review\b/,
    /\bpatterns?\b/,
    /\bbig decision\b/,
    /\bburn(?:ed)?out\b/,
    /\boverwhelm(?:ed|ing)?\b/,
    /\bwhat should i drop\b/,
    /\bwhat do i drop\b/,
    /\btrade[- ]?off\b/,
    /\bprioriti[sz]e\b/,
    /\bdecide between\b/,
    /\breschedule\b/,
    /\brework\b/,
    /\bsequence\b/,
  ];

  if (adjustmentCount >= 2) reasons.push("repeated adjustment loop");
  if (confidence === "Low") reasons.push("low confidence");
  if (complexTerms.some((pattern) => pattern.test(normalized))) reasons.push("complex planning request");
  if (currentDepth === "quick" && reasons.includes("complex planning request")) {
    reasons.push("quick mode may be too light");
  }

  return { shouldSuggest: reasons.length > 0, reasons };
};

export const normalizeAIConsents = (value: unknown): Record<AIConsentKey, boolean> => {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return AI_CONSENT_KEYS.reduce(
    (acc, key) => {
      acc[key] = source[key] === true;
      return acc;
    },
    {} as Record<AIConsentKey, boolean>,
  );
};

export const getConsentCopy = (key: AIConsentKey): { label: string; description: string } => {
  switch (key) {
    case "calendar_context":
      return {
        label: "Calendar context",
        description: "Let AI use connected calendar events when shaping your day.",
      };
    case "body_context":
      return {
        label: "Body context",
        description: "Let AI use wearable and wellness signals like sleep, recovery, and strain.",
      };
    case "money_context":
      return {
        label: "Money context",
        description: "Let AI notice bills, subscriptions, savings goals, and money pressure.",
      };
    case "email_summary_context":
      return {
        label: "Email summary context",
        description: "Let AI use Gmail summary counts, not message contents.",
      };
    case "memory_enabled":
      return {
        label: "Memory",
        description: "Let AI remember preferences and recurring constraints you can review or delete.",
      };
    case "push_nudges_enabled":
      return {
        label: "Push nudges",
        description: "Allow proactive device nudges for approved daily guidance.",
      };
    case "email_nudges_enabled":
      return {
        label: "Email nudges",
        description: "Allow proactive email nudges for approved daily or weekly guidance.",
      };
  }
};
import {
  CONTROLLABLE_GUIDE_IDS,
  ORDERED_CONTROLLABLE_GUIDES,
  getControllableGuide,
  isControllableGuideId,
  type ControllableGuideId,
} from "@/lib/controllables";
