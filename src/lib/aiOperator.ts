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

export interface DeeperPassSignal {
  shouldSuggest: boolean;
  reasons: string[];
}

export const isExecutableAIProposal = (type: string): type is AIProposalType => {
  return EXECUTABLE_AI_PROPOSALS.includes(type as AIProposalType);
};

export const getAIPlanConfidence = (sources: string[] = []): AIPlanConfidence => {
  const uniqueSources = new Set(sources.filter(Boolean));
  if (uniqueSources.size >= 5) return "High";
  if (uniqueSources.size >= 3) return "Medium";
  return "Low";
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
