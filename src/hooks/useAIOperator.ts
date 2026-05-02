import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  type AIDepthLevel,
  type AIConsentKey,
  type AIMemoryDomain,
  type AIProposalType,
  type AIControllablePlanFields,
  type AIGuideLensId,
  buildAIAdjustmentRequestBody,
  normalizeAIDailyPlanData,
  normalizeAIConsents,
} from "@/lib/aiOperator";

export interface AIConsents extends Record<AIConsentKey, boolean> {
  user_id?: string;
  updated_at?: string;
}

export interface AIMemory {
  id: string;
  domain: AIMemoryDomain;
  content: string;
  confidence: number;
  source: string;
  created_at: string;
  last_used_at: string | null;
  archived_at: string | null;
}

export interface AIDailyPlanData extends AIControllablePlanFields {
  day_type: string;
  summary: string;
  matters_most: string;
  protect: string;
  next_move: string;
  fallback: string;
  weekly_prompt?: string | null;
  sources_used: string[];
  generated_by: "ai" | "rules";
}

export interface AIDailyPlan {
  id: string;
  plan_date: string;
  plan_data: AIDailyPlanData;
  context_digest: Record<string, unknown>;
  status: "draft" | "accepted" | "completed" | "archived";
  provider: string;
  model: string | null;
  ai_depth?: AIDepthLevel;
  model_tier?: "rules" | "cheap" | "standard" | "premium";
  generated_by: string;
  created_at: string;
  updated_at: string;
}

export interface AIActionProposal {
  id: string;
  daily_plan_id: string | null;
  proposal_type: AIProposalType;
  title: string;
  rationale: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "executed" | "failed" | "archived";
  confirmation_required: boolean;
  display_order: number;
  created_at: string;
}

export interface AIOperatorResponse {
  daily_plan: AIDailyPlan | null;
  proposals: AIActionProposal[];
  consents: AIConsents;
  cached: boolean;
  usage_limited?: boolean;
  limit_message?: string;
  upgrade_required?: boolean;
  usage_limits?: {
    plan_tier: string;
    mode: "daily_brief" | "adjust" | "weekly_plan" | "memory";
    limit: number | null;
    used: number;
    remaining: number | null;
    period_start?: string;
    period_end?: string;
  };
  usage_policy?: {
    requested_depth: AIDepthLevel;
    ai_depth: AIDepthLevel;
    model_tier: "rules" | "cheap" | "standard" | "premium";
    downgraded: boolean;
    reason: string;
  };
}

export type AIFeedbackType = "thumbs_up" | "not_useful" | "too_much" | "do_more";

const getLocalDate = () => new Date().toLocaleDateString("sv-SE");
const getTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const normalizeAIOperatorResponse = (data: unknown): AIOperatorResponse => {
  const response = (data || {}) as AIOperatorResponse;
  const dailyPlan = response.daily_plan
    ? {
        ...response.daily_plan,
        plan_data: normalizeAIDailyPlanData(response.daily_plan.plan_data as unknown as Record<string, unknown>) as AIDailyPlanData,
      }
    : null;

  return {
    ...response,
    daily_plan: dailyPlan,
    consents: normalizeAIConsents(response.consents) as AIConsents,
    proposals: response.proposals || [],
    cached: response.cached === true,
  };
};

export function useDailyOperatorBrief(userId: string | null) {
  return useQuery({
    queryKey: ["ai-daily-operator-brief", userId, getLocalDate()],
    queryFn: async (): Promise<AIOperatorResponse> => {
      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: {
          mode: "daily_brief",
          localDate: getLocalDate(),
          timezone: getTimezone(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return normalizeAIOperatorResponse(data);
    },
    enabled: !!userId,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useAIOperatorActions(userId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["ai-daily-operator-brief", userId] });
    queryClient.invalidateQueries({ queryKey: ["planner-items"] });
    queryClient.invalidateQueries({ queryKey: ["planner-items-today"] });
  };

  const confirmProposal = useMutation({
    mutationFn: async ({
      proposalId,
      decision,
      editedPayload,
      feedback,
    }: {
      proposalId: string;
      decision: "approved" | "rejected";
      editedPayload?: Record<string, unknown>;
      feedback?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-action-confirm", {
        body: { proposalId, decision, editedPayload, feedback },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { status: string; result?: Record<string, unknown>; nextPath?: string | null };
    },
    onSuccess: (result, variables) => {
      invalidate();
      toast({
        title: variables.decision === "approved" ? "Added to your operating plan" : "Suggestion dismissed",
        description: variables.decision === "approved" ? "The Operator will use that signal going forward." : "Good call. The day stays yours.",
      });
      return result;
    },
    onError: (error) => {
      toast({
        title: "Could not update suggestion",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const requestAdjustment = useMutation({
    mutationFn: async ({
      prompt,
      aiDepth = "quick",
      selectedGuide = "full_dashboard",
    }: {
      prompt: string;
      aiDepth?: AIDepthLevel;
      selectedGuide?: AIGuideLensId;
    }): Promise<AIOperatorResponse> => {
      const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
        body: buildAIAdjustmentRequestBody({
          prompt,
          aiDepth,
          selectedGuide,
          localDate: getLocalDate(),
          timezone: getTimezone(),
        }),
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return normalizeAIOperatorResponse(data);
    },
    onSuccess: (result) => {
      invalidate();
      toast({
        title: result.usage_limited ? "Kept the current brief" : result.cached ? "Reused a recent answer" : "Operator adjusted today",
        description: result.limit_message || (result.cached ? "No extra AI call was needed." : "Review the new suggestions before anything changes."),
      });
    },
    onError: (error) => {
      toast({
        title: "Could not adjust today",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateConsents = useMutation({
    mutationFn: async (patch: Partial<Record<AIConsentKey, boolean>>) => {
      const { data, error } = await supabase.functions.invoke("ai-consent-update", {
        body: { patch },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return normalizeAIConsents(data?.consents) as AIConsents;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-consents", userId] });
      invalidate();
    },
  });

  const archiveMemory = useMutation({
    mutationFn: async (memoryId: string) => {
      const { data, error } = await supabase.functions.invoke("ai-memory-update", {
        body: { action: "archive", memoryId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-memories", userId] });
      invalidate();
    },
  });

  const submitFeedback = useMutation({
    mutationFn: async ({
      feedbackType,
      dailyPlanId,
      proposalId,
      feedbackText,
      metadata,
      showToast = true,
    }: {
      feedbackType: AIFeedbackType;
      dailyPlanId?: string | null;
      proposalId?: string | null;
      feedbackText?: string;
      metadata?: Record<string, unknown>;
      showToast?: boolean;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ai_feedback_events" as never)
        .insert({
          user_id: userId,
          daily_plan_id: dailyPlanId || null,
          proposal_id: proposalId || null,
          feedback_type: feedbackType,
          feedback_text: feedbackText || null,
          metadata: metadata || {},
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_result, variables) => {
      if (variables.showToast === false) return;
      toast({
        title: "Feedback saved",
        description: "The Operator will use that signal going forward.",
      });
    },
  });

  return {
    confirmProposal,
    requestAdjustment,
    updateConsents,
    archiveMemory,
    submitFeedback,
  };
}

export function useAIConsents(userId: string | null) {
  return useQuery({
    queryKey: ["ai-consents", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_consents" as never)
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return normalizeAIConsents(data) as AIConsents;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useAIMemories(userId: string | null) {
  return useQuery({
    queryKey: ["ai-memories", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_memories" as never)
        .select("id, domain, content, confidence, source, created_at, last_used_at, archived_at")
        .eq("user_id", userId!)
        .is("archived_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as AIMemory[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
